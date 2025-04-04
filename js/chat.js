// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rtdb = firebase.database();

// DOM Elements
const strangerUsername = document.getElementById('stranger-username');
const connectionStatus = document.getElementById('connection-status');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const backBtn = document.getElementById('back-btn');
const skipBtn = document.getElementById('skip-btn');
const toggleInterestsBtn = document.getElementById('toggle-interests-btn');
const commonInterestsPanel = document.getElementById('common-interests-panel');
const commonInterestsContainer = document.getElementById('common-interests-container');
const skipModal = document.getElementById('skip-modal');
const confirmSkipBtn = document.getElementById('confirm-skip-btn');
const cancelSkipBtn = document.getElementById('cancel-skip-btn');

// Chat state
let roomId = null;
let userId = null;
let strangerId = null;
let userProfile = null;
let strangerProfile = null;
let commonInterests = [];
let messagesListener = null;
let roomListener = null;
let isCommonInterestsPanelOpen = false;

// Initialize chat
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Clerk to be initialized
    if (typeof window.authClient === 'undefined') {
        const checkAuthClient = setInterval(() => {
            if (typeof window.authClient !== 'undefined') {
                clearInterval(checkAuthClient);
                initChat();
            }
        }, 100);
    } else {
        initChat();
    }
});

// Initialize the chat
async function initChat() {
    try {
        // Load user profile
        userProfile = window.authClient.getUserProfile();
        if (!userProfile) {
            // Redirect to home if not authenticated
            window.location.href = '/';
            return;
        }

        userId = userProfile.id;

        // Get room ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        roomId = urlParams.get('room');

        if (!roomId) {
            // No room ID provided, redirect to dashboard
            window.location.href = '/dashboard.html';
            return;
        }

        // Set up event listeners
        setupEventListeners();

        // Load chat room data
        await loadChatRoom();
    } catch (error) {
        console.error('Error initializing chat:', error);
        alert('Error initializing chat. Please try again.');
        window.location.href = '/dashboard.html';
    }
}

// Set up event listeners
function setupEventListeners() {
    // Send message
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // Send message on Enter key
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Back button
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/dashboard.html';
        });
    }

    // Skip button
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            skipModal.style.display = 'flex';
        });
    }

    // Confirm skip
    if (confirmSkipBtn) {
        confirmSkipBtn.addEventListener('click', skipChat);
    }

    // Cancel skip
    if (cancelSkipBtn) {
        cancelSkipBtn.addEventListener('click', () => {
            skipModal.style.display = 'none';
        });
    }

    // Toggle interests panel
    if (toggleInterestsBtn) {
        toggleInterestsBtn.addEventListener('click', toggleInterestsPanel);
    }

    // Set up beforeunload event to handle user leaving
    window.addEventListener('beforeunload', (e) => {
        // Only trigger if in an active chat
        if (roomId && strangerId) {
            endChat();
            
            // Modern browsers don't show custom messages, but we'll set one anyway
            e.returnValue = 'Are you sure you want to leave this chat? The other person will not be able to message you anymore.';
            return e.returnValue;
        }
    });
}

// Load chat room data
async function loadChatRoom() {
    try {
        // Get room data
        const roomDoc = await db.collection('chat_rooms').doc(roomId).get();
        
        if (!roomDoc.exists) {
            // Room doesn't exist, redirect to dashboard
            alert('Chat room not found');
            window.location.href = '/dashboard.html';
            return;
        }
        
        const roomData = roomDoc.data();
        
        // Check if user is a participant
        if (!roomData.participants.includes(userId)) {
            // User is not a participant, redirect to dashboard
            alert('You are not a participant in this chat');
            window.location.href = '/dashboard.html';
            return;
        }
        
        // Get stranger ID
        strangerId = roomData.participants.find(id => id !== userId);
        
        // Set up room listener
        setupRoomListener();
        
        // Load stranger profile
        await loadStrangerProfile();
        
        // Load messages
        setupMessagesListener();
        
        // Update connection status
        connectionStatus.textContent = 'Connected';
        connectionStatus.classList.add('connected');
    } catch (error) {
        console.error('Error loading chat room:', error);
        alert('Error loading chat room. Please try again.');
        window.location.href = '/dashboard.html';
    }
}

// Set up room listener
function setupRoomListener() {
    // Listen for changes to the room
    roomListener = db.collection('chat_rooms').doc(roomId)
        .onSnapshot(doc => {
            if (!doc.exists) {
                // Room was deleted
                alert('This chat has ended');
                window.location.href = '/dashboard.html';
                return;
            }
            
            const data = doc.data();
            
            // Check if room is still active
            if (!data.active) {
                // Chat ended, redirect to dashboard
                alert('This chat has ended');
                window.location.href = '/dashboard.html';
                return;
            }
        }, error => {
            console.error('Error listening to room:', error);
        });
}

// Load stranger profile
async function loadStrangerProfile() {
    try {
        // Get stranger's basic info
        const strangerDoc = await db.collection('waiting_users').doc(strangerId).get();
        
        if (strangerDoc.exists) {
            // Stranger is still in waiting pool
            strangerProfile = strangerDoc.data();
        } else {
            // Get from users collection or create basic profile
            const userDoc = await db.collection('users').doc(strangerId).get();
            
            if (userDoc.exists) {
                strangerProfile = userDoc.data();
            } else {
                // Create basic profile
                strangerProfile = {
                    id: strangerId,
                    username: 'Anonymous',
                    interests: []
                };
            }
        }
        
        // Update UI
        strangerUsername.textContent = strangerProfile.username;
        
        // Calculate common interests
        const userMetadata = await window.authClient.getUserMetadata();
        if (userMetadata && userMetadata.interests && strangerProfile.interests) {
            commonInterests = userMetadata.interests.filter(interest => 
                strangerProfile.interests.includes(interest)
            );
            
            // Update common interests UI
            updateCommonInterestsUI();
        }
    } catch (error) {
        console.error('Error loading stranger profile:', error);
        // Use default profile
        strangerProfile = {
            id: strangerId,
            username: 'Anonymous',
            interests: []
        };
        strangerUsername.textContent = strangerProfile.username;
    }
}

// Update common interests UI
function updateCommonInterestsUI() {
    // Clear container
    commonInterestsContainer.innerHTML = '';
    
    if (commonInterests.length === 0) {
        // No common interests
        const noInterests = document.createElement('p');
        noInterests.textContent = 'No common interests found';
        commonInterestsContainer.appendChild(noInterests);
        return;
    }
    
    // Add each interest
    commonInterests.forEach(interest => {
        const interestTag = document.createElement('div');
        interestTag.classList.add('interest-tag');
        interestTag.textContent = interest.charAt(0).toUpperCase() + interest.slice(1);
        commonInterestsContainer.appendChild(interestTag);
    });
}

// Toggle interests panel
function toggleInterestsPanel() {
    isCommonInterestsPanelOpen = !isCommonInterestsPanelOpen;
    
    if (isCommonInterestsPanelOpen) {
        commonInterestsPanel.classList.add('open');
    } else {
        commonInterestsPanel.classList.remove('open');
    }
}

// Set up messages listener
function setupMessagesListener() {
    // Listen for new messages
    messagesListener = db.collection('chat_rooms').doc(roomId)
        .collection('messages')
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    // New message added
                    const message = change.doc.data();
                    addMessageToUI(message);
                }
            });
            
            // Scroll to bottom
            scrollToBottom();
        }, error => {
            console.error('Error listening to messages:', error);
        });
}

// Add message to UI
function addMessageToUI(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    if (message.senderId === userId) {
        // Outgoing message
        messageElement.classList.add('outgoing');
    } else {
        // Incoming message
        messageElement.classList.add('incoming');
    }
    
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    messageBubble.textContent = message.text;
    
    const messageTime = document.createElement('div');
    messageTime.classList.add('message-time');
    messageTime.textContent = formatTimestamp(message.timestamp);
    
    messageBubble.appendChild(messageTime);
    messageElement.appendChild(messageBubble);
    
    chatMessages.appendChild(messageElement);
}

// Format timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Scroll to bottom of chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send message
async function sendMessage() {
    const text = messageInput.value.trim();
    
    if (!text) return;
    
    try {
        // Clear input
        messageInput.value = '';
        
        // Add message to database
        await db.collection('chat_rooms').doc(roomId)
            .collection('messages')
            .add({
                text: text,
                senderId: userId,
                senderName: userProfile.username,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    }
}

// Skip chat
async function skipChat() {
    try {
        // Close modal
        skipModal.style.display = 'none';
        
        // End current chat
        await endChat();
        
        // Redirect to dashboard
        window.location.href = '/dashboard.html';
    } catch (error) {
        console.error('Error skipping chat:', error);
        alert('Error ending chat. Please try again.');
    }
}

// End chat
async function endChat() {
    try {
        // Clean up listeners
        if (messagesListener) {
            messagesListener();
        }
        
        if (roomListener) {
            roomListener();
        }
        
        // Update room status
        await db.collection('chat_rooms').doc(roomId).update({
            active: false,
            ended_at: firebase.firestore.FieldValue.serverTimestamp(),
            ended_by: userId
        });
        
        // Add system message
        await db.collection('chat_rooms').doc(roomId)
            .collection('messages')
            .add({
                text: `${userProfile.username} has left the chat`,
                senderId: 'system',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        return true;
    } catch (error) {
        console.error('Error ending chat:', error);
        return false;
    }
} 