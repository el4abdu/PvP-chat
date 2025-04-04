// Clerk Authentication Setup
const CLERK_PUBLISHABLE_KEY = 'YOUR_CLERK_PUBLISHABLE_KEY'; // Replace with your actual Clerk publishable key

// Initialize Clerk
async function initializeClerk() {
    try {
        const Clerk = window.Clerk;
        await Clerk.load({
            publishableKey: CLERK_PUBLISHABLE_KEY
        });

        // Check if user is already signed in
        if (Clerk.user) {
            // User is signed in, redirect to dashboard if on landing page
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                window.location.href = '/dashboard.html';
            }
        } else {
            // User is not signed in, but allow them to stay on landing page
            if (window.location.pathname !== '/' && 
                window.location.pathname !== '/index.html' && 
                !window.location.pathname.includes('chat')) {
                window.location.href = '/';
            }
        }

        setupAuthButtons();
        setupClerkListeners();
    } catch (error) {
        console.error('Error initializing Clerk:', error);
    }
}

// Set up auth buttons
function setupAuthButtons() {
    const signInBtn = document.getElementById('sign-in-btn');
    const signUpBtn = document.getElementById('sign-up-btn');
    const getStartedBtn = document.getElementById('get-started-btn');
    const clerkModal = document.getElementById('clerk-modal');
    const closeModal = document.querySelector('.close-modal');
    const clerkAuthContainer = document.getElementById('clerk-auth-container');

    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            clerkModal.style.display = 'flex';
            Clerk.openSignIn({
                containerEl: clerkAuthContainer
            });
        });
    }

    if (signUpBtn) {
        signUpBtn.addEventListener('click', () => {
            clerkModal.style.display = 'flex';
            Clerk.openSignUp({
                containerEl: clerkAuthContainer
            });
        });
    }

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            clerkModal.style.display = 'flex';
            Clerk.openSignUp({
                containerEl: clerkAuthContainer
            });
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            clerkModal.style.display = 'none';
            clerkAuthContainer.innerHTML = '';
        });
    }

    // Close modal when clicking outside the content
    if (clerkModal) {
        clerkModal.addEventListener('click', (e) => {
            if (e.target === clerkModal) {
                clerkModal.style.display = 'none';
                clerkAuthContainer.innerHTML = '';
            }
        });
    }
}

// Set up Clerk event listeners
function setupClerkListeners() {
    Clerk.addListener({
        signedIn: () => {
            // User just signed in, redirect to dashboard
            window.location.href = '/dashboard.html';
        },
        signedOut: () => {
            // User just signed out, redirect to home
            window.location.href = '/';
        }
    });
}

// Handle sign out
function handleSignOut() {
    if (Clerk.user) {
        Clerk.signOut();
    }
}

// Get user data for profile
function getUserProfile() {
    if (!Clerk.user) return null;
    
    return {
        id: Clerk.user.id,
        username: Clerk.user.username || Clerk.user.firstName || 'User',
        email: Clerk.user.primaryEmailAddress?.emailAddress,
        avatar: Clerk.user.imageUrl,
        firstName: Clerk.user.firstName,
        lastName: Clerk.user.lastName
    };
}

// Get user metadata (age, gender)
async function getUserMetadata() {
    if (!Clerk.user) return null;
    
    try {
        // Get user metadata from Clerk
        const metadata = Clerk.user.publicMetadata || {};
        
        // If first login, we need to collect additional data
        if (!metadata.age || !metadata.gender) {
            // Redirect to profile completion page
            window.location.href = '/complete-profile.html';
            return null;
        }
        
        return {
            age: metadata.age,
            gender: metadata.gender,
            interests: metadata.interests || []
        };
    } catch (error) {
        console.error('Error getting user metadata:', error);
        return null;
    }
}

// Save user metadata
async function saveUserMetadata(metadata) {
    if (!Clerk.user) return false;
    
    try {
        await Clerk.user.update({
            publicMetadata: {
                ...Clerk.user.publicMetadata,
                ...metadata
            }
        });
        return true;
    } catch (error) {
        console.error('Error saving user metadata:', error);
        return false;
    }
}

// Initialize Clerk when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeClerk);

// Export functions for use in other files
window.authClient = {
    handleSignOut,
    getUserProfile,
    getUserMetadata,
    saveUserMetadata
}; 