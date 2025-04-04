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
const userUsername = document.getElementById('user-username');
const userAvatar = document.getElementById('user-avatar');
const strangerUsername = document.getElementById('stranger-username');
const profileUsername = document.getElementById('profile-username');
const profileAvatar = document.getElementById('profile-avatar');
const profileAge = document.getElementById('profile-age');
const profileGender = document.getElementById('profile-gender');
const profileInterests = document.getElementById('profile-interests');
const strangerAvatar = document.getElementById('stranger-avatar');
const connectionStatus = document.getElementById('connection-status');
const chatMessages = document.getElementById('chat-messages');
const chatList = document.getElementById('chat-list');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const skipBtn = document.getElementById('skip-btn');
const interestsBtn = document.getElementById('interests-btn');
const editProfileBtn = document.getElementById('edit-profile-btn');
const reportBtn = document.getElementById('report-btn');
const muteBtn = document.getElementById('mute-btn');
const voiceChatBtn = document.getElementById('voice-chat-btn');
const videoChatBtn = document.getElementById('video-chat-btn');
const blockUserBtn = document.getElementById('block-user-btn');
const closeSidebarBtn = document.getElementById('close-profile-sidebar');
const profileSidebar = document.getElementById('profile-sidebar');
const themeToggle = document.getElementById('theme-toggle');
const chatSearchInput = document.getElementById('chat-search-input');
const filterButtons = document.querySelectorAll('.filter-button');

// New Chat Modal Elements
const newChatModal = document.getElementById('new-chat-modal');
const closeNewChatBtn = document.getElementById('close-new-chat');
const randomChatOption = document.getElementById('random-chat-option');
const interestsChatOption = document.getElementById('interests-chat-option');
const genderChatOption = document.getElementById('gender-chat-option');
const genderFilterOptions = document.getElementById('gender-filter-options');
const genderPreferences = document.querySelectorAll('input[name="gender-preference"]');
const startNewChatBtn = document.getElementById('start-new-chat-btn');

// Skip Modal Elements
const skipModal = document.getElementById('skip-modal');
const confirmSkipBtn = document.getElementById('confirm-skip-btn');
const cancelSkipBtn = document.getElementById('cancel-skip-btn');

// Report Modal Elements
const reportModal = document.getElementById('report-modal');
const submitReportBtn = document.getElementById('submit-report-btn');
const cancelReportBtn = document.getElementById('cancel-report-btn');
const reportForm = document.getElementById('report-form');

// Waiting Modal Elements
const waitingModal = document.getElementById('waiting-modal');
const cancelWaitingBtn = document.getElementById('cancel-waiting-btn');
const waitingTime = document.getElementById('waiting-time');

// Chat state
let roomId = null;
let userId = null;
let strangerId = null;
let userProfile = null;
let strangerProfile = null;
let activeChats = [];
let currentChatType = 'random'; // 'random', 'interests', or 'gender'
let selectedGender = 'any';
let commonInterests = [];
let messagesListener = null;
let roomListener = null;
let waitingInterval = null;
let waitingSeconds = 0;
let isProfileSidebarOpen = false;
let layoutElement = document.querySelector('.chitchat-layout');

// Demo mode variables
const demoActiveChats = [
    {
        id: 'demo-chat-1',
        username: 'John Doe',
        lastMessage: 'Hey, how are you doing?',
        timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
        unread: 2,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=john',
        isActive: true
    },
    {
        id: 'demo-chat-2',
        username: 'Alice Smith',
        lastMessage: 'Did you watch that movie?',
        timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
        unread: 0,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice',
        isActive: true
    },
    {
        id: 'demo-chat-3',
        username: 'Bob Johnson',
        lastMessage: 'That sounds interesting!',
        timestamp: new Date(Date.now() - 2 * 3600000), // 2 hours ago
        unread: 0,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob',
        isActive: false
    }
];

const demoStrangerProfiles = [
    {
        id: 'demo-stranger-1',
        username: 'John Doe',
        age: 25,
        gender: 'Male',
        interests: ['music', 'movies', 'gaming', 'technology']
    },
    {
        id: 'demo-stranger-2',
        username: 'Alice Smith',
        age: 28,
        gender: 'Female',
        interests: ['books', 'travel', 'photography', 'music']
    },
    {
        id: 'demo-stranger-3',
        username: 'Bob Johnson',
        age: 23,
        gender: 'Male',
        interests: ['sports', 'fitness', 'gaming', 'food']
    }
];

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
        
        // Update user UI in the sidebar
        updateUserUI();

        // Check if we need to start a new chat or join an existing one
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        roomId = urlParams.get('room');

        // Set up event listeners
        setupEventListeners();
        
        if (action === 'start-new') {
            // User wants to start a new chat - show the new chat modal
            console.log('Starting new chat flow');
            showNewChatModal();
        } else if (roomId) {
            // Join existing room
            console.log('Joining existing room:', roomId);
            
            if (USE_DEMO_MODE && roomId.startsWith('demo-')) {
                console.log('Demo mode - setting up demo chat');
                setupDemoChat();
            } else {
                // Load actual chat room data
                await loadChatRoom();
            }
        } else {
            // No action or room specified, go to new chat flow
            console.log('No action or room specified, showing new chat modal');
            showNewChatModal();
        }
        
        // In demo mode, populate active chats
        if (USE_DEMO_MODE) {
            populateDemoChats();
        } else {
            // TODO: Load actual active chats from Firebase
            loadActiveChats();
        }
    } catch (error) {
        console.error('Error initializing chat:', error);
        showErrorToast('Error initializing chat. Please try again.');
    }
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Send message
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // Send message on Enter key (without Shift)
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // New Chat button
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            showNewChatModal();
        });
    }

    // Close New Chat Modal
    if (closeNewChatBtn) {
        closeNewChatBtn.addEventListener('click', () => {
            if (newChatModal) newChatModal.style.display = 'none';
        });
    }

    // Chat Type Option Selection
    if (randomChatOption) {
        randomChatOption.addEventListener('click', () => {
            selectChatOption('random');
        });
    }

    if (interestsChatOption) {
        interestsChatOption.addEventListener('click', () => {
            selectChatOption('interests');
        });
    }

    if (genderChatOption) {
        genderChatOption.addEventListener('click', () => {
            selectChatOption('gender');
        });
    }

    // Start New Chat Button
    if (startNewChatBtn) {
        startNewChatBtn.addEventListener('click', startNewChat);
    }

    // Gender Preference Selection
    if (genderPreferences) {
        genderPreferences.forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedGender = e.target.value;
                console.log('Selected gender preference:', selectedGender);
            });
        });
    }

    // Skip button
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            if (skipModal) skipModal.style.display = 'flex';
        });
    }

    // Confirm skip
    if (confirmSkipBtn) {
        confirmSkipBtn.addEventListener('click', skipChat);
    }

    // Cancel skip
    if (cancelSkipBtn) {
        cancelSkipBtn.addEventListener('click', () => {
            if (skipModal) skipModal.style.display = 'none';
        });
    }

    // Report button
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            if (reportModal) reportModal.style.display = 'flex';
        });
    }

    // Submit report
    if (reportForm) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitReport();
        });
    }

    // Cancel report
    if (cancelReportBtn) {
        cancelReportBtn.addEventListener('click', () => {
            if (reportModal) reportModal.style.display = 'none';
        });
    }

    // Cancel waiting
    if (cancelWaitingBtn) {
        cancelWaitingBtn.addEventListener('click', cancelWaiting);
    }

    // Profile sidebar toggle
    if (interestsBtn) {
        interestsBtn.addEventListener('click', toggleProfileSidebar);
    }

    // Close profile sidebar
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeProfileSidebar);
    }

    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Handle filter buttons
    if (filterButtons) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');
                
                const filter = button.getAttribute('data-filter');
                filterChats(filter);
            });
        });
    }

    // Search functionality
    if (chatSearchInput) {
        chatSearchInput.addEventListener('input', () => {
            const searchText = chatSearchInput.value.toLowerCase();
            searchChats(searchText);
        });
    }

    // Voice and video chat buttons (demo only - show toast)
    if (voiceChatBtn) {
        voiceChatBtn.addEventListener('click', () => {
            showInfoToast('Voice chat feature coming soon!');
        });
    }

    if (videoChatBtn) {
        videoChatBtn.addEventListener('click', () => {
            showInfoToast('Video chat feature coming soon!');
        });
    }

    // Block user button (demo only)
    if (blockUserBtn) {
        blockUserBtn.addEventListener('click', () => {
            showConfirmDialog(
                'Block User', 
                'Are you sure you want to block this user? You will no longer be able to receive messages from them.', 
                () => {
                    showSuccessToast('User blocked successfully');
                    setTimeout(() => skipChat(), 1000);
                }
            );
        });
    }

    // When clicking outside modal, close it
    window.addEventListener('click', (e) => {
        if (e.target === newChatModal) newChatModal.style.display = 'none';
        if (e.target === skipModal) skipModal.style.display = 'none';
        if (e.target === reportModal) reportModal.style.display = 'none';
        if (e.target === waitingModal) waitingModal.style.display = 'none';
    });
}

// Set up a demo chat for testing
function setupDemoChat() {
    console.log('Setting up demo chat');
    
    // Set up stranger profile
    strangerProfile = demoStrangerProfiles[Math.floor(Math.random() * demoStrangerProfiles.length)];
    strangerId = strangerProfile.id;
    
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

// Update User UI in the sidebar
function updateUserUI() {
    if (!userProfile) return;
    
    if (userUsername) {
        userUsername.textContent = userProfile.username || 'Anonymous';
    }
    
    if (userAvatar) {
        if (userProfile.avatar) {
            userAvatar.src = userProfile.avatar;
        } else {
            // Use dicebear API for avatar
            userAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile.username || 'anonymous'}`;
        }
    }
}

// Show New Chat Modal
function showNewChatModal() {
    if (newChatModal) {
        newChatModal.style.display = 'flex';
        
        // Reset selection
        selectChatOption('random');
        
        // Hide gender filter options
        if (genderFilterOptions) {
            genderFilterOptions.classList.add('hidden');
        }
        
        // Reset gender preference
        if (genderPreferences) {
            const anyOption = Array.from(genderPreferences).find(radio => radio.value === 'any');
            if (anyOption) anyOption.checked = true;
            selectedGender = 'any';
        }
    }
}

// Select Chat Option
function selectChatOption(type) {
    currentChatType = type;
    
    // Reset all options
    if (randomChatOption) randomChatOption.classList.remove('selected');
    if (interestsChatOption) interestsChatOption.classList.remove('selected');
    if (genderChatOption) genderChatOption.classList.remove('selected');
    
    // Add selected class to chosen option
    if (type === 'random' && randomChatOption) {
        randomChatOption.classList.add('selected');
        if (genderFilterOptions) genderFilterOptions.classList.add('hidden');
    } else if (type === 'interests' && interestsChatOption) {
        interestsChatOption.classList.add('selected');
        if (genderFilterOptions) genderFilterOptions.classList.add('hidden');
    } else if (type === 'gender' && genderChatOption) {
        genderChatOption.classList.add('selected');
        if (genderFilterOptions) genderFilterOptions.classList.remove('hidden');
    }
    
    console.log('Selected chat type:', type);
}

// Start New Chat
function startNewChat() {
    // Hide the modal
    if (newChatModal) {
        newChatModal.style.display = 'none';
    }
    
    // Show waiting modal
    showWaitingModal();
    
    // In demo mode, simulate waiting and then show a demo chat
    if (USE_DEMO_MODE) {
        setTimeout(() => {
            // Hide waiting modal
            hideWaitingModal();
            
            // Set up demo chat
            setupDemoChat();
        }, 2000);
    } else {
        // TODO: Implement actual chat matching logic with Firebase
        findChatPartner();
    }
}

// Show Waiting Modal
function showWaitingModal() {
    if (waitingModal) {
        waitingModal.style.display = 'flex';
        
        // Reset waiting time
        waitingSeconds = 0;
        if (waitingTime) waitingTime.textContent = 'Time elapsed: 0s';
        
        // Start timer
        waitingInterval = setInterval(() => {
            waitingSeconds++;
            if (waitingTime) waitingTime.textContent = `Time elapsed: ${waitingSeconds}s`;
        }, 1000);
    }
}

// Hide Waiting Modal
function hideWaitingModal() {
    if (waitingModal) {
        waitingModal.style.display = 'none';
    }
    
    // Clear timer
    if (waitingInterval) {
        clearInterval(waitingInterval);
        waitingInterval = null;
    }
}

// Cancel Waiting
function cancelWaiting() {
    hideWaitingModal();
    
    // TODO: Cancel any pending match requests
    console.log('Matching canceled by user');
}

// Setup Demo Chat
function setupDemoChat() {
    console.log('Setting up demo chat');
    
    // Generate a room ID if not already set
    if (!roomId) {
        roomId = 'demo-' + Math.random().toString(36).substring(2, 10);
        
        // Update URL without reloading the page
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('room', roomId);
        window.history.pushState({}, '', newUrl);
    }
    
    // Select a random stranger profile
    const randomIndex = Math.floor(Math.random() * demoStrangerProfiles.length);
    strangerProfile = demoStrangerProfiles[randomIndex];
    strangerId = strangerProfile.id;
    
    // Update stranger UI
    updateStrangerUI();
    
    // Set up common interests
    setupDemoCommonInterests();
    
    // Add welcome message
    const welcomeMessage = {
        id: 'welcome-msg',
        text: 'Hi there! This is a demo chat. Type a message to see how it works!',
        senderId: strangerId,
        senderName: strangerProfile.username,
        timestamp: new Date(),
        isRead: true
    };
    
    addMessageToUI(welcomeMessage);
    
    // Add chat to active chats list if not already there
    const existingChatIndex = activeChats.findIndex(chat => chat.id === roomId);
    if (existingChatIndex === -1) {
        activeChats.push({
            id: roomId,
            username: strangerProfile.username,
            lastMessage: welcomeMessage.text,
            timestamp: welcomeMessage.timestamp,
            unread: 0,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${strangerProfile.id}`,
            isActive: true
        });
        
        // Update chat list UI
        updateChatListUI();
    }
}

// Set up demo common interests
async function setupDemoCommonInterests() {
    try {
        // Get user metadata
        const userMetadata = await window.authClient.getUserMetadata();
        
        if (userMetadata && userMetadata.interests && userMetadata.interests.length > 0) {
            // Calculate common interests
            commonInterests = userMetadata.interests.filter(interest => 
                strangerProfile.interests.includes(interest)
            );
        } else {
            // No user interests, just use a few random ones
            commonInterests = strangerProfile.interests.slice(0, 2);
        }
        
        // Update common interests UI in profile sidebar
        updateProfileUI();
    } catch (error) {
        console.error('Error setting up demo common interests:', error);
    }
}

// Update Stranger UI
function updateStrangerUI() {
    if (!strangerProfile) return;
    
    if (strangerUsername) {
        strangerUsername.textContent = strangerProfile.username;
    }
    
    if (strangerAvatar) {
        strangerAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${strangerProfile.id}`;
    }
    
    if (connectionStatus) {
        connectionStatus.textContent = 'Online';
    }
    
    // Update profile sidebar
    updateProfileUI();
}

// Update Profile UI in sidebar
function updateProfileUI() {
    if (!strangerProfile) return;
    
    if (profileUsername) {
        profileUsername.textContent = strangerProfile.username;
    }
    
    if (profileAvatar) {
        profileAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${strangerProfile.id}`;
    }
    
    if (profileAge) {
        profileAge.textContent = `${strangerProfile.age} years old`;
    }
    
    if (profileGender) {
        profileGender.textContent = strangerProfile.gender;
    }
    
    // Update interests
    if (profileInterests) {
        profileInterests.innerHTML = '';
        
        strangerProfile.interests.forEach(interest => {
            const interestTag = document.createElement('div');
            interestTag.className = 'interest-tag';
            interestTag.textContent = interest.charAt(0).toUpperCase() + interest.slice(1);
            
            // Highlight common interests
            if (commonInterests.includes(interest)) {
                interestTag.classList.add('active');
            }
            
            profileInterests.appendChild(interestTag);
        });
    }
}

// Toggle Profile Sidebar
function toggleProfileSidebar() {
    if (layoutElement && profileSidebar) {
        if (isProfileSidebarOpen) {
            closeProfileSidebar();
        } else {
            layoutElement.classList.add('show-profile');
            isProfileSidebarOpen = true;
            updateProfileUI();
        }
    }
}

// Close Profile Sidebar
function closeProfileSidebar() {
    if (layoutElement) {
        layoutElement.classList.remove('show-profile');
        isProfileSidebarOpen = false;
    }
}

// Populate Demo Chats
function populateDemoChats() {
    // Only populate if the chat list is empty
    if (activeChats.length === 0) {
        activeChats = [...demoActiveChats];
        updateChatListUI();
    }
}

// Update Chat List UI
function updateChatListUI() {
    if (!chatList) return;
    
    // Clear existing content
    chatList.innerHTML = '';
    
    if (activeChats.length === 0) {
        // Show placeholder
        chatList.innerHTML = `
            <div class="chat-list-placeholder">
                <p>No active conversations.</p>
                <p>Start a new chat to begin!</p>
            </div>
        `;
        return;
    }
    
    // Sort chats by timestamp (most recent first)
    const sortedChats = [...activeChats].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Create chat list items
    sortedChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-list-item';
        
        // Add active class if this is the current chat
        if (roomId === chat.id) {
            chatItem.classList.add('active');
        }
        
        // Format time
        const formattedTime = formatTimestamp(chat.timestamp);
        
        chatItem.innerHTML = `
            <div class="avatar-container">
                <img src="${chat.avatar}" alt="${chat.username}'s avatar">
                <span class="status-indicator ${chat.isActive ? 'online' : 'offline'}"></span>
            </div>
            <div class="chat-info">
                <h4 class="chat-name">${chat.username}</h4>
                <p class="chat-preview">${chat.lastMessage}</p>
            </div>
            <div class="chat-meta">
                <div class="chat-time">${formattedTime}</div>
                ${chat.unread ? `<div class="unread-badge">${chat.unread}</div>` : ''}
            </div>
        `;
        
        // Add click event to load chat
        chatItem.addEventListener('click', () => {
            // If it's the current chat, do nothing
            if (roomId === chat.id) return;
            
            // Load the chat
            window.location.href = `/chat.html?room=${chat.id}`;
        });
        
        chatList.appendChild(chatItem);
    });
}

// Filter Chats
function filterChats(filter) {
    // No need to filter if no chat list
    if (!chatList) return;
    
    // Show all chats first
    const chatItems = chatList.querySelectorAll('.chat-list-item');
    chatItems.forEach(item => item.style.display = 'flex');
    
    // Apply filter
    if (filter === 'active') {
        // Show only active chats
        chatItems.forEach(item => {
            const isActive = item.querySelector('.status-indicator.online');
            if (!isActive) {
                item.style.display = 'none';
            }
        });
    } else if (filter === 'unread') {
        // Show only unread chats
        chatItems.forEach(item => {
            const hasUnread = item.querySelector('.unread-badge');
            if (!hasUnread) {
                item.style.display = 'none';
            }
        });
    }
}

// Search Chats
function searchChats(searchText) {
    // No need to search if no chat list or empty search
    if (!chatList) return;
    
    if (!searchText.trim()) {
        // Show all chats if search is empty
        const chatItems = chatList.querySelectorAll('.chat-list-item');
        chatItems.forEach(item => item.style.display = 'flex');
        return;
    }
    
    // Filter by search text
    const chatItems = chatList.querySelectorAll('.chat-list-item');
    chatItems.forEach(item => {
        const name = item.querySelector('.chat-name').textContent.toLowerCase();
        const preview = item.querySelector('.chat-preview').textContent.toLowerCase();
        
        if (name.includes(searchText) || preview.includes(searchText)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Toggle Theme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            if (newTheme === 'dark') {
                icon.className = 'fas fa-moon';
            } else {
                icon.className = 'fas fa-sun';
            }
        }
    }
}

// Add Message to UI
function addMessageToUI(message) {
    if (!chatMessages) return;
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.dataset.id = message.id;
    
    // Determine if message is incoming or outgoing
    if (message.senderId === userId) {
        messageElement.classList.add('outgoing');
    } else {
        messageElement.classList.add('incoming');
    }
    
    // Format time
    const formattedTime = formatTimestamp(message.timestamp);
    
    // Create message content
    messageElement.innerHTML = `
        <div class="message-bubble">
            <div class="message-content">${message.text}</div>
            <div class="message-meta">
                <span class="message-time">${formattedTime}</span>
                ${message.senderId === userId ? '<i class="fas fa-check-double"></i>' : ''}
            </div>
        </div>
    `;
    
    // Check if we should add a date divider
    const needsDateDivider = shouldAddDateDivider(message.timestamp);
    if (needsDateDivider) {
        const dateDiv = createDateDivider(message.timestamp);
        chatMessages.appendChild(dateDiv);
    }
    
    // Add message to chat
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    scrollToBottom();
}

// Check if we need to add a date divider
function shouldAddDateDivider(timestamp) {
    // Get all existing date dividers
    const dividers = chatMessages.querySelectorAll('.message-date-divider');
    
    if (dividers.length === 0) {
        return true;
    }
    
    // Get date of the timestamp
    const date = new Date(timestamp);
    const dateString = date.toDateString();
    
    // Check if we already have a divider for this date
    for (const divider of dividers) {
        const dividerDate = divider.dataset.date;
        if (dividerDate === dateString) {
            return false;
        }
    }
    
    return true;
}

// Create Date Divider
function createDateDivider(timestamp) {
    const date = new Date(timestamp);
    const dateString = date.toDateString();
    
    // Format the date nicely
    const formattedDate = formatDateForDivider(date);
    
    const divider = document.createElement('div');
    divider.className = 'message-date-divider';
    divider.dataset.date = dateString;
    divider.innerHTML = `<span>${formattedDate}</span>`;
    
    return divider;
}

// Format Date for Divider
function formatDateForDivider(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if date is today
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    }
    
    // Check if date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    
    // Otherwise, return formatted date
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Send Message
function sendMessage() {
    if (!messageInput || !messageInput.value.trim()) return;
    
    const text = messageInput.value.trim();
    console.log('Sending message:', text);
    
    // Clear input
    messageInput.value = '';
    
    // If in demo mode, simulate receiving a message
    if (USE_DEMO_MODE) {
        // Create message object
        const message = {
            id: 'out-' + Date.now(),
            text: text,
            senderId: userId,
            senderName: userProfile.username,
            timestamp: new Date(),
            isRead: false
        };
        
        // Add to UI
        addMessageToUI(message);
        
        // Update chat list
        const chatIndex = activeChats.findIndex(chat => chat.id === roomId);
        if (chatIndex !== -1) {
            activeChats[chatIndex].lastMessage = text;
            activeChats[chatIndex].timestamp = new Date();
            updateChatListUI();
        }
        
        // Simulate response after a delay
        setTimeout(() => {
            handleDemoResponse(text);
        }, 1000 + Math.random() * 2000);
    } else {
        // TODO: Implement actual message sending with Firebase
        sendMessageToFirebase(text);
    }
}

// Handle Demo Response
function handleDemoResponse(userMessage) {
    if (!strangerProfile) return;
    
    // Generate a demo response based on the user's message
    const responses = [
        "That's interesting! Tell me more.",
        "I see what you mean.",
        "That's great! I had a similar experience.",
        "Really? I didn't know that.",
        "That's cool! What else do you like?",
        "Haha, that's funny!",
        "I agree with you on that.",
        "I'm not sure about that, but I respect your opinion.",
        "Interesting perspective! I've never thought about it that way.",
        "Yeah, that makes sense."
    ];
    
    // Choose a random response
    const randomIndex = Math.floor(Math.random() * responses.length);
    const responseText = responses[randomIndex];
    
    // Create message object
    const message = {
        id: 'in-' + Date.now(),
        text: responseText,
        senderId: strangerId,
        senderName: strangerProfile.username,
        timestamp: new Date(),
        isRead: true
    };
    
    // Add to UI
    addMessageToUI(message);
    
    // Update chat list
    const chatIndex = activeChats.findIndex(chat => chat.id === roomId);
    if (chatIndex !== -1) {
        activeChats[chatIndex].lastMessage = responseText;
        activeChats[chatIndex].timestamp = new Date();
        updateChatListUI();
    }
}

// Submit Report
function submitReport() {
    // Get report reason
    const reason = document.querySelector('input[name="report-reason"]:checked');
    const details = document.getElementById('report-details');
    
    if (!reason) {
        showErrorToast('Please select a reason for reporting');
        return;
    }
    
    const reportReason = reason.value;
    const reportDetails = details ? details.value : '';
    
    console.log('Submitting report:', reportReason, reportDetails);
    
    // Hide report modal
    if (reportModal) {
        reportModal.style.display = 'none';
    }
    
    // Show success message
    showSuccessToast('Report submitted successfully');
    
    // In demo mode, just skip the chat after reporting
    if (USE_DEMO_MODE) {
        setTimeout(() => {
            skipChat();
        }, 1500);
    } else {
        // TODO: Implement actual report submission to Firebase
        submitReportToFirebase(reportReason, reportDetails);
    }
}

// Skip Chat
function skipChat() {
    console.log('Skipping chat');
    
    // Hide the skip modal
    if (skipModal) {
        skipModal.style.display = 'none';
    }
    
    // End the current chat
    endChat();
    
    // Start a new chat
    showNewChatModal();
}

// End Chat
function endChat() {
    console.log('Ending chat');
    
    // Clear messages
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    // Reset state
    roomId = null;
    strangerId = null;
    strangerProfile = null;
    commonInterests = [];
    
    // Update URL
    const newUrl = new URL(window.location);
    newUrl.searchParams.delete('room');
    newUrl.searchParams.set('action', 'start-new');
    window.history.pushState({}, '', newUrl);
    
    // Clean up listeners
    if (messagesListener) {
        messagesListener();
        messagesListener = null;
    }
    
    if (roomListener) {
        roomListener();
        roomListener = null;
    }
}

// Format Timestamp
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Check if the timestamp is from today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (date >= startOfDay) {
        // Today, show time only
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date >= new Date(startOfDay - 86400000)) {
        // Yesterday
        return 'Yesterday';
    } else if (date >= new Date(startOfDay - 6 * 86400000)) {
        // Within last week, show day name
        return date.toLocaleDateString([], { weekday: 'short' });
    } else {
        // Older, show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

// Scroll To Bottom
function scrollToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Show Info Toast
function showInfoToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast info-toast';
    toast.textContent = message;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide and remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Show Success Toast
function showSuccessToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast success-toast';
    toast.textContent = message;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide and remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Show Error Toast
function showErrorToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast error-toast';
    toast.textContent = message;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide and remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Show Confirm Dialog
function showConfirmDialog(title, message, onConfirm) {
    // Create dialog element
    const dialog = document.createElement('div');
    dialog.className = 'modal';
    dialog.style.display = 'flex';
    
    dialog.innerHTML = `
        <div class="modal-content glass-container">
            <div class="modal-header">
                <h3>${title}</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn-secondary cancel-btn">Cancel</button>
                    <button class="btn-modern confirm-btn">Confirm</button>
                </div>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(dialog);
    
    // Handle button clicks
    const closeBtn = dialog.querySelector('.close-modal');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const confirmBtn = dialog.querySelector('.confirm-btn');
    
    // Close functions
    const closeDialog = () => {
        dialog.style.display = 'none';
        setTimeout(() => {
            document.body.removeChild(dialog);
        }, 300);
    };
    
    // Event listeners
    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    confirmBtn.addEventListener('click', () => {
        closeDialog();
        if (onConfirm) onConfirm();
    });
    
    // Close when clicking outside
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            closeDialog();
        }
    });
} 