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
        console.log('Firebase initialized from dashboard.js');
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
const username = document.getElementById('username');
const userAvatar = document.getElementById('user-avatar');
const userEmail = document.getElementById('user-email');
const userId = document.getElementById('user-id');
const userJoined = document.getElementById('user-joined');
const interestsContainer = document.getElementById('interests-container');
const saveInterestsBtn = document.getElementById('save-interests-btn');
const randomChatBtn = document.getElementById('random-chat-btn');
const interestsChatBtn = document.getElementById('interests-chat-btn');
const waitingScreen = document.getElementById('waiting-screen');
const waitingTime = document.getElementById('waiting-time');
const cancelWaitingBtn = document.getElementById('cancel-waiting-btn');
const signOutBtn = document.getElementById('sign-out-btn');

// Selected interests
let selectedInterests = [];
const MIN_INTERESTS = 3;
let waitingInterval = null;
let waitingSeconds = 0;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard page loaded');
    
    // Wait for Clerk to be initialized
    if (typeof window.authClient === 'undefined') {
        console.log('Auth client not found, waiting...');
        const checkAuthClient = setInterval(() => {
            if (typeof window.authClient !== 'undefined') {
                console.log('Auth client found');
                clearInterval(checkAuthClient);
                initDashboard();
            }
        }, 100);
    } else {
        console.log('Auth client already available');
        initDashboard();
    }
});

// Initialize the dashboard
async function initDashboard() {
    try {
        console.log('Initializing dashboard');
        
        // Load user profile
        const profile = window.authClient.getUserProfile();
        if (!profile) {
            console.error('No user profile found');
            // Redirect to home if not authenticated
            window.location.href = '/';
            return;
        }
        
        console.log('User profile loaded:', profile);

        // Update profile UI
        updateProfileUI(profile);

        // Get user metadata
        const metadata = await window.authClient.getUserMetadata();
        if (metadata) {
            console.log('User metadata loaded:', metadata);
            // Update metadata UI
            updateMetadataUI(metadata);
        } else {
            console.warn('No user metadata found');
        }

        // Set up interest tags
        setupInterestTags();

        // Set up event listeners
        setupEventListeners();
        
        console.log('Dashboard initialization complete');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        
        // Show error to user
        showErrorMessage('Error loading dashboard: ' + error.message);
    }
}

// Update profile UI
function updateProfileUI(profile) {
    console.log('Updating profile UI');
    if (username) {
        username.textContent = profile.username || 'Anonymous';
    }
    
    if (userAvatar) {
        if (profile.avatar) {
            userAvatar.src = profile.avatar;
        } else {
            // Use DiceBear API to generate avatar based on username
            userAvatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username || 'anonymous'}`;
        }
    }
    
    if (userEmail) {
        userEmail.textContent = profile.email || '';
    }
    
    if (userId) {
        userId.textContent = 'ID: ' + profile.id;
    }
    
    if (userJoined) {
        userJoined.textContent = 'Joined: Today';
    }
}

// Update metadata UI
function updateMetadataUI(metadata) {
    console.log('Updating metadata UI');
    
    if (metadata.interests && metadata.interests.length > 0) {
        selectedInterests = metadata.interests;
        updateInterestTags();
    }
}

// Set up interest tags
function setupInterestTags() {
    console.log('Setting up interest tags');
    const interestTags = document.querySelectorAll('.interest-tag');
    
    if (!interestTags || interestTags.length === 0) {
        console.warn('No interest tags found in the document');
        return;
    }
    
    interestTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const interest = tag.getAttribute('data-interest');
            
            if (tag.classList.contains('active')) {
                // Remove interest
                selectedInterests = selectedInterests.filter(i => i !== interest);
                tag.classList.remove('active');
            } else {
                // Add interest
                selectedInterests.push(interest);
                tag.classList.add('active');
            }
            
            console.log('Updated interests:', selectedInterests);
            
            // Save interests to user metadata
            saveInterests();
            
            // Update buttons state
            updateButtonsState();
        });
    });
    
    // Initial update of interest tags
    updateInterestTags();
}

// Save interests to user metadata
async function saveInterests() {
    if (saveInterestsBtn) {
        saveInterestsBtn.textContent = 'Saving...';
        saveInterestsBtn.disabled = true;
    }
    
    try {
        await window.authClient.saveUserMetadata({ interests: selectedInterests });
        console.log('Interests saved successfully');
        
        if (saveInterestsBtn) {
            saveInterestsBtn.textContent = 'Saved!';
            setTimeout(() => {
                saveInterestsBtn.textContent = 'Save Interests';
                saveInterestsBtn.disabled = false;
            }, 1500);
        }
    } catch (error) {
        console.error('Error saving interests:', error);
        
        if (saveInterestsBtn) {
            saveInterestsBtn.textContent = 'Error';
            setTimeout(() => {
                saveInterestsBtn.textContent = 'Save Interests';
                saveInterestsBtn.disabled = false;
            }, 1500);
        }
    }
}

// Update interest tags UI
function updateInterestTags() {
    console.log('Updating interest tags UI');
    const interestTags = document.querySelectorAll('.interest-tag');
    
    if (!interestTags || interestTags.length === 0) {
        console.warn('No interest tags found when updating');
        return;
    }
    
    interestTags.forEach(tag => {
        const interest = tag.getAttribute('data-interest');
        
        if (selectedInterests.includes(interest)) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
    
    // Update buttons state
    updateButtonsState();
}

// Update buttons state
function updateButtonsState() {
    // Update start chat buttons
    if (randomChatBtn) {
        randomChatBtn.disabled = false;
    }
    
    if (interestsChatBtn) {
        if (selectedInterests.length >= MIN_INTERESTS) {
            interestsChatBtn.disabled = false;
        } else {
            interestsChatBtn.disabled = true;
            interestsChatBtn.title = `Select at least ${MIN_INTERESTS} interests`;
        }
    }
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Sign out button
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Sign out button clicked');
            window.authClient.handleSignOut();
        });
    } else {
        console.warn('Sign out button not found');
    }
    
    // Save interests button
    if (saveInterestsBtn) {
        saveInterestsBtn.addEventListener('click', saveInterests);
    }
    
    // Random chat button
    if (randomChatBtn) {
        randomChatBtn.addEventListener('click', startRandomChat);
    }
    
    // Interests chat button
    if (interestsChatBtn) {
        interestsChatBtn.addEventListener('click', startInterestsChat);
    }
    
    // Cancel waiting button
    if (cancelWaitingBtn) {
        cancelWaitingBtn.addEventListener('click', cancelWaiting);
    }
}

// Start random chat
function startRandomChat() {
    console.log('Starting random chat');
    startChat(false);
}

// Start interests chat
function startInterestsChat() {
    console.log('Starting interests chat');
    
    if (selectedInterests.length < MIN_INTERESTS) {
        showErrorMessage(`Please select at least ${MIN_INTERESTS} interests first`);
        return;
    }
    
    startChat(true);
}

// Start a chat
async function startChat(useInterests) {
    try {
        // Disable buttons
        if (randomChatBtn) randomChatBtn.disabled = true;
        if (interestsChatBtn) interestsChatBtn.disabled = true;
        
        // Show waiting screen
        if (waitingScreen) waitingScreen.style.display = 'block';
        
        // Start timer
        waitingSeconds = 0;
        if (waitingTime) waitingTime.textContent = 'Time elapsed: 0s';
        waitingInterval = setInterval(() => {
            waitingSeconds++;
            if (waitingTime) waitingTime.textContent = `Time elapsed: ${waitingSeconds}s`;
        }, 1000);
        
        // In demo mode, just redirect to a demo chat after a short delay
        if (USE_DEMO_MODE) {
            console.log('Demo mode - generating mock chat room');
            // Create a fake room ID
            const roomId = 'demo-' + Math.random().toString(36).substring(2, 15);
            
            // Show searching animation for a moment to enhance the experience
            setTimeout(() => {
                console.log('Redirecting to demo chat room:', roomId);
                window.location.href = `/chat.html?room=${roomId}`;
            }, 2000);
            return;
        }
        
        // Get user profile
        const profile = window.authClient.getUserProfile();
        const metadata = await window.authClient.getUserMetadata();
        
        if (!profile || !metadata) {
            console.error('Could not retrieve profile or metadata');
            showErrorMessage('Could not retrieve your profile data');
            resetChatButtons();
            return;
        }
        
        console.log('Creating chat with profile:', profile);
        console.log('and metadata:', metadata);
        
        // Create user data object
        const userData = {
            id: profile.id,
            username: profile.username || 'Anonymous',
            interests: selectedInterests,
            useInterests: useInterests,
            status: 'searching',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add user to waiting pool
        await addToWaitingPool(userData);
        
        // Find a match
        const match = await findMatch(userData);
        
        if (match) {
            // Create a chat room
            const roomId = await createChatRoom(profile.id, match.id);
            
            // Redirect to chat page
            window.location.href = `/chat.html?room=${roomId}`;
        } else {
            // No match found yet, wait for someone to match with us
            await waitForMatch(profile.id);
        }
    } catch (error) {
        console.error('Error starting chat:', error);
        showErrorMessage('Error finding a chat partner. Please try again.');
        resetChatButtons();
    }
}

// Reset chat buttons
function resetChatButtons() {
    if (randomChatBtn) randomChatBtn.disabled = false;
    if (interestsChatBtn) interestsChatBtn.disabled = selectedInterests.length < MIN_INTERESTS;
    if (waitingScreen) waitingScreen.style.display = 'none';
    if (waitingInterval) clearInterval(waitingInterval);
}

// Cancel waiting
async function cancelWaiting() {
    console.log('Canceling waiting');
    
    // Reset UI
    resetChatButtons();
    
    // In demo mode, no need to clean up database
    if (USE_DEMO_MODE) return;
    
    // Get user profile
    const profile = window.authClient.getUserProfile();
    if (!profile) return;
    
    try {
        // Remove from waiting pool
        await db.collection('waiting_users').doc(profile.id).delete();
    } catch (error) {
        console.error('Error canceling waiting:', error);
    }
}

// Add user to waiting pool
async function addToWaitingPool(userData) {
    try {
        console.log('Adding user to waiting pool:', userData);
        
        // Add to waiting_users collection
        await db.collection('waiting_users').doc(userData.id).set(userData);
        
        // Set up cleanup on disconnect
        const userStatusRef = rtdb.ref(`/status/${userData.id}`);
        userStatusRef.onDisconnect().remove();
        userStatusRef.set(true);
        
        return true;
    } catch (error) {
        console.error('Error adding to waiting pool:', error);
        throw error;
    }
}

// Find a match from waiting pool
async function findMatch(userData) {
    try {
        console.log('Finding match for user:', userData.id);
        
        // Query for potential matches
        let query = db.collection('waiting_users')
            .where('id', '!=', userData.id)
            .where('status', '==', 'searching');
            
        // If using interests, prioritize those who also want interest matching
        if (userData.useInterests) {
            query = query.where('useInterests', '==', true);
        }
        
        const snapshot = await query.limit(10).get();
        
        if (snapshot.empty) {
            console.log('No users in waiting pool');
            return null;
        }
        
        // Find best match based on common interests
        let bestMatch = null;
        let maxCommonInterests = 0;
        
        snapshot.forEach(doc => {
            const potentialMatch = doc.data();
            
            // Calculate common interests
            const commonInterests = userData.interests.filter(interest => 
                potentialMatch.interests.includes(interest)
            );
            
            if (commonInterests.length > maxCommonInterests) {
                maxCommonInterests = commonInterests.length;
                bestMatch = potentialMatch;
            }
        });
        
        if (bestMatch) {
            console.log(`Found match: ${bestMatch.username} with ${maxCommonInterests} common interests`);
            
            // Remove best match from waiting pool
            await db.collection('waiting_users').doc(bestMatch.id).delete();
            
            // Remove self from waiting pool
            await db.collection('waiting_users').doc(userData.id).delete();
            
            console.log(`Matched with ${bestMatch.username} (${maxCommonInterests} common interests)`);
            return bestMatch;
        }
        
        return null;
    } catch (error) {
        console.error('Error finding match:', error);
        throw error;
    }
}

// Create a chat room
async function createChatRoom(user1Id, user2Id) {
    try {
        console.log(`Creating chat room between ${user1Id} and ${user2Id}`);
        
        // Create a unique room ID
        const roomId = generateRoomId();
        
        // Create room in database
        await db.collection('chat_rooms').doc(roomId).set({
            participants: [user1Id, user2Id],
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            active: true
        });
        
        console.log('Created chat room with ID:', roomId);
        return roomId;
    } catch (error) {
        console.error('Error creating chat room:', error);
        throw error;
    }
}

// Generate a random room ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Wait for someone to match with us
async function waitForMatch(userId) {
    try {
        console.log('Waiting for match for user:', userId);
        
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 30 seconds
        
        while (attempts < maxAttempts) {
            console.log(`Waiting for match... attempt ${attempts + 1}/${maxAttempts}`);
            
            // Check if we've been matched
            const roomSnapshot = await db.collection('chat_rooms')
                .where('participants', 'array-contains', userId)
                .where('active', '==', true)
                .orderBy('created_at', 'desc')
                .limit(1)
                .get();
            
            if (!roomSnapshot.empty) {
                // We've been matched, redirect to chat room
                const roomDoc = roomSnapshot.docs[0];
                const roomId = roomDoc.id;
                
                console.log('Match found! Room ID:', roomId);
                
                // Clean up waiting status
                await db.collection('waiting_users').doc(userId).delete();
                
                // Redirect to chat page
                window.location.href = `/chat.html?room=${roomId}`;
                return;
            }
            
            // Wait 1 second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        console.log('No match found after maximum attempts');
        
        // If we've waited too long, give up and show error
        await db.collection('waiting_users').doc(userId).delete();
        showErrorMessage('Could not find a match at this time. Please try again later.');
        resetChatButtons();
    } catch (error) {
        console.error('Error waiting for match:', error);
        throw error;
    }
}

// Show error message
function showErrorMessage(message) {
    // Show toast notification if available
    if (window.appUtils && window.appUtils.showToast) {
        window.appUtils.showToast(message, 'error');
        return;
    }
    
    // Fallback to alert
    alert(message);
} 