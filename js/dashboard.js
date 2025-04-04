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
const profileAvatar = document.getElementById('profile-avatar');
const profileUsername = document.getElementById('profile-username');
const profileAge = document.getElementById('profile-age');
const profileGender = document.getElementById('profile-gender');
const interestsContainer = document.getElementById('interests-container');
const startChatBtn = document.getElementById('start-chat-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const profileModal = document.getElementById('profile-modal');
const profileForm = document.getElementById('profile-form');

// Selected interests
let selectedInterests = [];
const MIN_INTERESTS = 3;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Clerk to be initialized
    if (typeof window.authClient === 'undefined') {
        const checkAuthClient = setInterval(() => {
            if (typeof window.authClient !== 'undefined') {
                clearInterval(checkAuthClient);
                initDashboard();
            }
        }, 100);
    } else {
        initDashboard();
    }
});

// Initialize the dashboard
async function initDashboard() {
    try {
        // Load user profile
        const profile = window.authClient.getUserProfile();
        if (!profile) {
            // Redirect to home if not authenticated
            window.location.href = '/';
            return;
        }

        // Update profile UI
        updateProfileUI(profile);

        // Get user metadata
        const metadata = await window.authClient.getUserMetadata();
        if (metadata) {
            // Update metadata UI
            updateMetadataUI(metadata);
        }

        // Set up interest tags
        setupInterestTags();

        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Update profile UI
function updateProfileUI(profile) {
    profileUsername.textContent = profile.username;
    
    if (profile.avatar) {
        profileAvatar.src = profile.avatar;
    } else {
        // Use DiceBear API to generate avatar based on username
        profileAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`;
    }
}

// Update metadata UI
function updateMetadataUI(metadata) {
    if (metadata.age) {
        profileAge.textContent = `${metadata.age}`;
    }
    
    if (metadata.gender) {
        profileGender.textContent = metadata.gender.charAt(0).toUpperCase() + metadata.gender.slice(1);
    }
    
    if (metadata.interests && metadata.interests.length > 0) {
        selectedInterests = metadata.interests;
        updateInterestTags();
    }
}

// Set up interest tags
function setupInterestTags() {
    const interestTags = document.querySelectorAll('.interest-tag');
    
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
            
            // Save interests to user metadata
            window.authClient.saveUserMetadata({ interests: selectedInterests });
            
            // Update start chat button state
            updateStartChatButton();
        });
    });
    
    // Initial update of interest tags
    updateInterestTags();
}

// Update interest tags UI
function updateInterestTags() {
    const interestTags = document.querySelectorAll('.interest-tag');
    
    interestTags.forEach(tag => {
        const interest = tag.getAttribute('data-interest');
        
        if (selectedInterests.includes(interest)) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
    
    // Update start chat button state
    updateStartChatButton();
}

// Update start chat button state
function updateStartChatButton() {
    if (selectedInterests.length >= MIN_INTERESTS) {
        startChatBtn.disabled = false;
        startChatBtn.classList.remove('disabled');
    } else {
        startChatBtn.disabled = true;
        startChatBtn.classList.add('disabled');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Sign out button
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.authClient.handleSignOut();
        });
    }
    
    // Start chat button
    if (startChatBtn) {
        startChatBtn.addEventListener('click', startRandomChat);
    }
    
    // Profile form
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfileData);
    }
}

// Save profile data
async function saveProfileData(e) {
    e.preventDefault();
    
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    
    if (!age || !gender) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate age
    if (parseInt(age) < 18) {
        alert('You must be 18 or older to use this platform');
        return;
    }
    
    try {
        // Save metadata
        const success = await window.authClient.saveUserMetadata({
            age: parseInt(age),
            gender: gender
        });
        
        if (success) {
            // Close modal
            profileModal.style.display = 'none';
            
            // Update UI
            profileAge.textContent = age;
            profileGender.textContent = gender.charAt(0).toUpperCase() + gender.slice(1);
        } else {
            alert('An error occurred. Please try again.');
        }
    } catch (error) {
        console.error('Error saving profile data:', error);
        alert('An error occurred. Please try again.');
    }
}

// Start random chat
async function startRandomChat() {
    if (selectedInterests.length < MIN_INTERESTS) {
        alert(`Please select at least ${MIN_INTERESTS} interests first`);
        return;
    }
    
    try {
        startChatBtn.disabled = true;
        startChatBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finding someone...';
        
        // Get user profile
        const profile = window.authClient.getUserProfile();
        const metadata = await window.authClient.getUserMetadata();
        
        if (!profile || !metadata) {
            alert('Could not retrieve your profile data');
            resetStartChatButton();
            return;
        }
        
        // Create user data object
        const userData = {
            id: profile.id,
            username: profile.username,
            age: metadata.age,
            gender: metadata.gender,
            interests: selectedInterests,
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
        alert('Error finding a chat partner. Please try again.');
        resetStartChatButton();
    }
}

// Reset start chat button
function resetStartChatButton() {
    startChatBtn.disabled = false;
    startChatBtn.innerHTML = '<i class="fas fa-comments"></i> Start Random Chat';
}

// Add user to waiting pool
async function addToWaitingPool(userData) {
    try {
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
        // Query for potential matches
        const snapshot = await db.collection('waiting_users')
            .where('id', '!=', userData.id)
            .where('status', '==', 'searching')
            .orderBy('id')
            .orderBy('timestamp')
            .limit(10)
            .get();
        
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
        // Create a unique room ID
        const roomId = generateRoomId();
        
        // Create room in database
        await db.collection('chat_rooms').doc(roomId).set({
            participants: [user1Id, user2Id],
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            active: true
        });
        
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
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 30 seconds
        
        while (attempts < maxAttempts) {
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
        
        // If we've waited too long, give up and show error
        await db.collection('waiting_users').doc(userId).delete();
        alert('Could not find a match at this time. Please try again later.');
        resetStartChatButton();
    } catch (error) {
        console.error('Error waiting for match:', error);
        throw error;
    }
} 