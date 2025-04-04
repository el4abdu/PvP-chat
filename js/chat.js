// Initialize Firebase only if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    try {
        // Use the config from index.html if available
        if (window.firebaseConfig) {
            firebase.initializeApp(window.firebaseConfig);
        } else {
            // Fallback config
            firebase.initializeApp({
                apiKey: "AIzaSyCbDDimyxwhKaXon4IQwZTpgP2Twb8bHMo",
                authDomain: "pvp-chat-fe5ab.firebaseapp.com",
                projectId: "pvp-chat-fe5ab",
                storageBucket: "pvp-chat-fe5ab.firebasestorage.app",
                messagingSenderId: "387500645051",
                appId: "1:387500645051:web:4a4428e53c637ec2e9a79e",
                measurementId: "G-90LCQ3SF9X"
            });
        }
        console.log('Firebase initialized from chat.js');
    } catch (error) {
        console.error('Firebase initialization failed', error);
    }
} else {
    console.log('Firebase already initialized, using existing instance');
}

const db = firebase.firestore();
const rtdb = firebase.database();

// Demo mode flag - should match auth.js
const USE_DEMO_MODE = true;

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

// Demo mode variables
let demoStrangerProfile = {
    id: 'demo-stranger',
    username: 'Stranger',
    interests: ['music', 'movies', 'gaming', 'technology', 'sports']
};

// Initialize chat
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Chat page loaded');
    
    // Wait for Clerk to be initialized
    if (typeof window.authClient === 'undefined') {
        console.log('Auth client not found, waiting...');
        const checkAuthClient = setInterval(() => {
            if (typeof window.authClient !== 'undefined') {
                console.log('Auth client found');
                clearInterval(checkAuthClient);
                initChat();
            }
        }, 100);
    } else {
        console.log('Auth client already available');
        initChat();
    }
});

// Initialize the chat
async function initChat() {
    try {
        console.log('Initializing chat');
        
        // Load user profile
        userProfile = window.authClient.getUserProfile();
        if (!userProfile) {
            console.error('No user profile found');
            // Redirect to home if not authenticated
            window.location.href = '/';
            return;
        }

        userId = userProfile.id;
        console.log('User profile loaded:', userProfile);

        // Get room ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        roomId = urlParams.get('room');

        if (!roomId) {
            console.error('No room ID provided');
            // No room ID provided, redirect to dashboard
            window.location.href = '/dashboard.html';
            return;
        }
        
        console.log('Room ID:', roomId);

        // Set up event listeners
        setupEventListeners();
        
        // Check if we're in demo mode with a demo room
        if (USE_DEMO_MODE && roomId.startsWith('demo-')) {
            console.log('Demo mode - setting up demo chat');
            setupDemoChat();
            return;
        }

        // Load chat room data
        await loadChatRoom();
    } catch (error) {
        console.error('Error initializing chat:', error);
        alert('Error initializing chat. Please try again.');
        window.location.href = '/dashboard.html';
    }
}

// Set up a demo chat for testing
function setupDemoChat() {
    console.log('Setting up demo chat');
    
    // Set up stranger profile
    strangerProfile = demoStrangerProfile;
    strangerId = demoStrangerProfile.id;
    
    // Update UI
    if (strangerUsername) {
        strangerUsername.textContent = strangerProfile.username;
    }
    
    // Update connection status
    if (connectionStatus) {
        connectionStatus.textContent = 'Connected';
        connectionStatus.classList.add('connected');
    }
    
    // Set up common interests
    setupDemoCommonInterests();
    
    // Add welcome message
    const welcomeMessage = {
        text: 'Hi there! This is a demo chat. Type a message to see how it works!',
        senderId: strangerId,
        timestamp: new Date()
    };
    
    addMessageToUI(welcomeMessage);
}

// Set up demo common interests
async function setupDemoCommonInterests() {
    try {
        // Get user metadata
        const userMetadata = await window.authClient.getUserMetadata();
        
        if (userMetadata && userMetadata.interests) {
            // Calculate common interests
            commonInterests = userMetadata.interests.filter(interest => 
                strangerProfile.interests.includes(interest)
            );
        } else {
            // No user interests, just use a few random ones
            commonInterests = ['music', 'technology'];
        }
        
        // Update common interests UI
        updateCommonInterestsUI();
    } catch (error) {
        console.error('Error setting up demo common interests:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Send message
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    } else {
        console.warn('Send button not found');
    }

    // Send message on Enter key
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    } else {
        console.warn('Message input not found');
    }

    // Back button
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            console.log('Back button clicked');
            window.location.href = '/dashboard.html';
        });
    } else {
        console.warn('Back button not found');
    }

    // Skip button
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            console.log('Skip button clicked');
            if (skipModal) skipModal.style.display = 'flex';
        });
    } else {
        console.warn('Skip button not found');
    }

    // Confirm skip
    if (confirmSkipBtn) {
        confirmSkipBtn.addEventListener('click', skipChat);
    } else {
        console.warn('Confirm skip button not found');
    }

    // Cancel skip
    if (cancelSkipBtn) {
        cancelSkipBtn.addEventListener('click', () => {
            console.log('Cancel skip clicked');
            if (skipModal) skipModal.style.display = 'none';
        });
    } else {
        console.warn('Cancel skip button not found');
    }

    // Toggle interests panel
    if (toggleInterestsBtn) {
        toggleInterestsBtn.addEventListener('click', toggleInterestsPanel);
    } else {
        console.warn('Toggle interests button not found');
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
        console.log('Loading chat room data');
        
        // Get room data
        const roomDoc = await db.collection('chat_rooms').doc(roomId).get();
        
        if (!roomDoc.exists) {
            console.error('Chat room not found');
            // Room doesn't exist, redirect to dashboard
            alert('Chat room not found');
            window.location.href = '/dashboard.html';
            return;
        }
        
        const roomData = roomDoc.data();
        console.log('Room data:', roomData);
        
        // Check if user is a participant
        if (!roomData.participants.includes(userId)) {
            console.error('User is not a participant in this chat');
            // User is not a participant, redirect to dashboard
            alert('You are not a participant in this chat');
            window.location.href = '/dashboard.html';
            return;
        }
        
        // Get stranger ID
        strangerId = roomData.participants.find(id => id !== userId);
        console.log('Stranger ID:', strangerId);
        
        // Set up room listener
        setupRoomListener();
        
        // Load stranger profile
        await loadStrangerProfile();
        
        // Load messages
        setupMessagesListener();
        
        // Update connection status
        if (connectionStatus) {
            connectionStatus.textContent = 'Connected';
            connectionStatus.classList.add('connected');
        }
    } catch (error) {
        console.error('Error loading chat room:', error);
        alert('Error loading chat room. Please try again.');
        window.location.href = '/dashboard.html';
    }
}

// Set up room listener
function setupRoomListener() {
    console.log('Setting up room listener');
    
    // Listen for changes to the room
    roomListener = db.collection('chat_rooms').doc(roomId)
        .onSnapshot(doc => {
            if (!doc.exists) {
                console.error('Room was deleted');
                // Room was deleted
                alert('This chat has ended');
                window.location.href = '/dashboard.html';
                return;
            }
            
            const data = doc.data();
            
            // Check if room is still active
            if (!data.active) {
                console.log('Chat ended by other user');
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
        console.log('Loading stranger profile');
        
        // Get stranger's basic info
        const strangerDoc = await db.collection('waiting_users').doc(strangerId).get();
        
        if (strangerDoc.exists) {
            console.log('Stranger found in waiting pool');
            // Stranger is still in waiting pool
            strangerProfile = strangerDoc.data();
        } else {
            console.log('Stranger not in waiting pool, checking users collection');
            // Get from users collection or create basic profile
            const userDoc = await db.collection('users').doc(strangerId).get();
            
            if (userDoc.exists) {
                console.log('Stranger found in users collection');
                strangerProfile = userDoc.data();
            } else {
                console.log('Creating basic profile for stranger');
                // Create basic profile
                strangerProfile = {
                    id: strangerId,
                    username: 'Anonymous',
                    interests: []
                };
            }
        }
        
        console.log('Stranger profile:', strangerProfile);
        
        // Update UI
        if (strangerUsername) {
            strangerUsername.textContent = strangerProfile.username;
        }
        
        // Calculate common interests
        const userMetadata = await window.authClient.getUserMetadata();
        if (userMetadata && userMetadata.interests && strangerProfile.interests) {
            commonInterests = userMetadata.interests.filter(interest => 
                strangerProfile.interests.includes(interest)
            );
            
            console.log('Common interests:', commonInterests);
            
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
        if (strangerUsername) {
            strangerUsername.textContent = strangerProfile.username;
        }
    }
}

// Update common interests UI
function updateCommonInterestsUI() {
    console.log('Updating common interests UI');
    
    // Clear container
    if (!commonInterestsContainer) {
        console.warn('Common interests container not found');
        return;
    }
    
    commonInterestsContainer.innerHTML = '';
    
    if (commonInterests.length === 0) {
        console.log('No common interests found');
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
    console.log('Toggling interests panel');
    
    isCommonInterestsPanelOpen = !isCommonInterestsPanelOpen;
    
    if (!commonInterestsPanel) {
        console.warn('Common interests panel not found');
        return;
    }
    
    if (isCommonInterestsPanelOpen) {
        commonInterestsPanel.classList.add('open');
    } else {
        commonInterestsPanel.classList.remove('open');
    }
}

// Set up messages listener
function setupMessagesListener() {
    console.log('Setting up messages listener');
    
    // Listen for new messages
    messagesListener = db.collection('chat_rooms').doc(roomId)
        .collection('messages')
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    // New message added
                    const message = change.doc.data();
                    console.log('New message:', message);
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
    console.log('Adding message to UI:', message);
    
    if (!chatMessages) {
        console.warn('Chat messages container not found');
        return;
    }
    
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
    
    // Scroll to bottom
    scrollToBottom();
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
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Send message
async function sendMessage() {
    console.log('Sending message');
    
    if (!messageInput) {
        console.warn('Message input not found');
        return;
    }
    
    const text = messageInput.value.trim();
    
    if (!text) return;
    
    try {
        // Clear input
        messageInput.value = '';
        
        // Check if we're in demo mode
        if (USE_DEMO_MODE && roomId.startsWith('demo-')) {
            console.log('Demo mode - handling demo message');
            handleDemoMessage(text);
            return;
        }
        
        // Add message to database
        await db.collection('chat_rooms').doc(roomId)
            .collection('messages')
            .add({
                text: text,
                senderId: userId,
                senderName: userProfile.username,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
        console.log('Message sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
    }
}

// Handle demo message
function handleDemoMessage(text) {
    console.log('Handling demo message:', text);
    
    // Add outgoing message to UI
    const outgoingMessage = {
        text: text,
        senderId: userId,
        timestamp: new Date()
    };
    
    addMessageToUI(outgoingMessage);
    
    // Generate a response after a short delay
    setTimeout(() => {
        const responses = [
            "That's interesting! Tell me more.",
            "I've been thinking about that too!",
            "I see what you mean. What do you think about...",
            "That's cool! Have you always been interested in that?",
            "I totally agree with you!",
            "Interesting perspective. I hadn't thought of it that way.",
            "What made you think of that?",
            "I'm curious to hear more about your thoughts on this.",
            "That reminds me of something I read recently.",
            "I've had a similar experience!"
        ];
        
        // Pick a random response
        const responseIndex = Math.floor(Math.random() * responses.length);
        const responseText = responses[responseIndex];
        
        // Add incoming message to UI
        const incomingMessage = {
            text: responseText,
            senderId: strangerId,
            timestamp: new Date()
        };
        
        addMessageToUI(incomingMessage);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
}

// Skip chat
async function skipChat() {
    console.log('Skipping chat');
    
    try {
        // Close modal
        if (skipModal) {
            skipModal.style.display = 'none';
        }
        
        // If in demo mode, just redirect to dashboard
        if (USE_DEMO_MODE && roomId.startsWith('demo-')) {
            console.log('Demo mode - ending demo chat');
            window.location.href = '/dashboard.html';
            return;
        }
        
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
        console.log('Ending chat');
        
        // If in demo mode, just return
        if (USE_DEMO_MODE && roomId.startsWith('demo-')) {
            console.log('Demo mode - no need to end chat in database');
            return true;
        }
        
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
        
        console.log('Chat ended successfully');
        return true;
    } catch (error) {
        console.error('Error ending chat:', error);
        return false;
    }
} 