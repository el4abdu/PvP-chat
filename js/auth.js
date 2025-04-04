// Clerk Authentication Setup
const CLERK_PUBLISHABLE_KEY = 'pk_test_bm92ZWwtc3RhZy05LmNsZXJrLmFjY291bnRzLmRldiQ'; // Clerk publishable key
const USE_DEMO_MODE = true; // Set to true to use demo mode without Clerk authentication

// Create a global auth client for use throughout the application
window.authClient = null;

// Initialize Clerk
function initializeClerk() {
    try {
        console.log('Initializing Clerk...');
        
        // Check if we're in demo mode
        if (USE_DEMO_MODE) {
            console.log('Running in demo mode - setting up demo authentication');
            setupDemoMode();
            return;
        }
        
        // Only try to use Clerk if available and we have a key
        if (typeof window.Clerk !== 'undefined' && CLERK_PUBLISHABLE_KEY) {
            console.log('Attempting to initialize Clerk with key');
            
            // Initialize Clerk with a key
            window.Clerk.load({
                publishableKey: CLERK_PUBLISHABLE_KEY
            }).then(() => {
                console.log('Clerk initialized successfully');
                
                // Check if user is already signed in
                if (window.Clerk.user) {
                    console.log('User is signed in:', window.Clerk.user.id);
                    
                    // User is signed in, redirect to dashboard if on landing page
                    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                        window.location.href = '/dashboard.html';
                    }
                } else {
                    console.log('User is not signed in');
                    // User is not signed in, redirect to home if on protected page
                    if (window.location.pathname !== '/' && 
                        window.location.pathname !== '/index.html' && 
                        !window.location.pathname.includes('chat.html')) {
                        window.location.href = '/';
                    }
                }
                
                setupAuthClient();
                setupAuthButtons();
                setupClerkListeners();
                
            }).catch(error => {
                console.error('Error initializing Clerk:', error);
                showErrorMessage('Error initializing authentication: ' + error.message);
                setupDemoMode();
            });
        } else {
            console.warn('Clerk not available or missing publishable key, using demo mode');
            setupDemoMode();
        }
    } catch (error) {
        console.error('Unexpected error initializing Clerk:', error);
        showErrorMessage('Authentication error: ' + error.message);
        setupDemoMode();
    }
}

// Setup demo mode for testing without Clerk
function setupDemoMode() {
    console.log('Setting up demo mode');
    
    // Create a mock user
    const demoUser = {
        id: 'demo-user-' + Math.floor(Math.random() * 100000),
        username: 'DemoUser',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com',
        imageUrl: null,
        publicMetadata: {
            interests: ['technology', 'music', 'movies']
        }
    };
    
    // Set up the auth client with demo methods
    window.authClient = {
        getUserProfile: () => {
            console.log('Demo: getUserProfile called');
            return {
                id: demoUser.id,
                username: demoUser.username,
                email: demoUser.email,
                avatar: demoUser.imageUrl
            };
        },
        
        getUserMetadata: async () => {
            console.log('Demo: getUserMetadata called');
            // Simulate async behavior
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        interests: demoUser.publicMetadata.interests
                    });
                }, 100);
            });
        },
        
        saveUserMetadata: async (metadata) => {
            console.log('Demo: saveUserMetadata called', metadata);
            // Simulate async behavior
            return new Promise(resolve => {
                setTimeout(() => {
                    // Update demo user metadata
                    if (metadata.interests) {
                        demoUser.publicMetadata.interests = metadata.interests;
                    }
                    resolve(true);
                }, 300);
            });
        },
        
        handleSignOut: () => {
            console.log('Demo: handleSignOut called');
            setTimeout(() => {
                window.location.href = '/';
            }, 300);
        }
    };
    
    // Hook up auth buttons
    setupAuthButtons();
    
    console.log('Demo mode setup complete');
    showSuccessMessage('Demo mode active. No authentication required.');
}

// Set up the auth client wrapper around Clerk
function setupAuthClient() {
    window.authClient = {
        getUserProfile: () => {
            if (!window.Clerk || !window.Clerk.user) return null;
            
            return {
                id: window.Clerk.user.id,
                username: window.Clerk.user.username || window.Clerk.user.firstName || 'User',
                email: window.Clerk.user.primaryEmailAddress?.emailAddress,
                avatar: window.Clerk.user.imageUrl
            };
        },
        
        getUserMetadata: async () => {
            if (!window.Clerk || !window.Clerk.user) return null;
            
            // Get metadata from Clerk
            try {
                const metadata = window.Clerk.user.publicMetadata;
                return metadata || {};
            } catch (error) {
                console.error('Error getting user metadata:', error);
                return {};
            }
        },
        
        saveUserMetadata: async (metadata) => {
            if (!window.Clerk || !window.Clerk.user) return false;
            
            try {
                await window.Clerk.user.update({
                    publicMetadata: {
                        ...window.Clerk.user.publicMetadata,
                        ...metadata
                    }
                });
                return true;
            } catch (error) {
                console.error('Error saving user metadata:', error);
                return false;
            }
        },
        
        handleSignOut: () => {
            if (window.Clerk) {
                window.Clerk.signOut().then(() => {
                    window.location.href = '/';
                });
            } else {
                window.location.href = '/';
            }
        }
    };
}

// Show an error message to the user
function showErrorMessage(message) {
    console.error(message);
    
    // Create error message element
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = 'position: fixed; top: 10px; right: 10px; background-color: #e74c3c; color: white; padding: 15px; border-radius: 5px; z-index: 9999; max-width: 300px;';
    errorMessage.textContent = message;
    document.body.appendChild(errorMessage);
    
    // Remove after 5 seconds
    setTimeout(() => {
        document.body.removeChild(errorMessage);
    }, 5000);
}

// Show a success message to the user
function showSuccessMessage(message) {
    console.log(message);
    
    // Create success message element
    const successMessage = document.createElement('div');
    successMessage.style.cssText = 'position: fixed; top: 10px; right: 10px; background-color: #2ecc71; color: white; padding: 15px; border-radius: 5px; z-index: 9999; max-width: 300px;';
    successMessage.textContent = message;
    document.body.appendChild(successMessage);
    
    // Remove after 3 seconds
    setTimeout(() => {
        document.body.removeChild(successMessage);
    }, 3000);
}

// Set up auth buttons
function setupAuthButtons() {
    console.log('Setting up auth buttons');
    const signInBtn = document.getElementById('sign-in-btn');
    const signUpBtn = document.getElementById('sign-up-btn');
    const getStartedBtn = document.getElementById('get-started-btn');
    const clerkModal = document.getElementById('clerk-modal');
    const closeModal = document.querySelector('.close-modal');
    const clerkAuthContainer = document.getElementById('clerk-auth-container');
    const signOutBtn = document.getElementById('sign-out-btn');

    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            console.log('Sign in button clicked');
            if (USE_DEMO_MODE) {
                // In demo mode, just redirect to dashboard
                showSuccessMessage('Demo login successful');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
                return;
            }
            
            if (clerkModal) clerkModal.style.display = 'flex';
            if (window.Clerk && window.Clerk.openSignIn) {
                window.Clerk.openSignIn({
                    containerEl: clerkAuthContainer
                });
            } else {
                if (clerkAuthContainer) {
                    clerkAuthContainer.innerHTML = '<div style="text-align: center;"><p>Sign In is not available right now.</p><p>Please try again later.</p></div>';
                }
            }
        });
    }

    if (signUpBtn) {
        signUpBtn.addEventListener('click', () => {
            console.log('Sign up button clicked');
            if (USE_DEMO_MODE) {
                // In demo mode, just redirect to dashboard
                showSuccessMessage('Demo account created successfully');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
                return;
            }
            
            if (clerkModal) clerkModal.style.display = 'flex';
            if (window.Clerk && window.Clerk.openSignUp) {
                window.Clerk.openSignUp({
                    containerEl: clerkAuthContainer
                });
            } else {
                if (clerkAuthContainer) {
                    clerkAuthContainer.innerHTML = '<div style="text-align: center;"><p>Sign Up is not available right now.</p><p>Please try again later.</p></div>';
                }
            }
        });
    }

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            console.log('Get started button clicked');
            if (USE_DEMO_MODE) {
                // In demo mode, just redirect to dashboard
                showSuccessMessage('Welcome to PvP Chat!');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
                return;
            }
            
            if (clerkModal) clerkModal.style.display = 'flex';
            if (window.Clerk && window.Clerk.openSignUp) {
                window.Clerk.openSignUp({
                    containerEl: clerkAuthContainer
                });
            } else {
                if (clerkAuthContainer) {
                    clerkAuthContainer.innerHTML = '<div style="text-align: center;"><p>Sign Up is not available right now.</p><p>Please try again later.</p></div>';
                }
            }
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            console.log('Close modal clicked');
            if (clerkModal) clerkModal.style.display = 'none';
            if (clerkAuthContainer) clerkAuthContainer.innerHTML = '';
        });
    }

    // Close modal when clicking outside the content
    if (clerkModal) {
        clerkModal.addEventListener('click', (e) => {
            if (e.target === clerkModal) {
                console.log('Clicked outside modal content');
                clerkModal.style.display = 'none';
                if (clerkAuthContainer) clerkAuthContainer.innerHTML = '';
            }
        });
    }
    
    // Handle sign out
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Sign out button clicked');
            
            if (window.authClient) {
                window.authClient.handleSignOut();
            } else {
                window.location.href = '/';
            }
        });
    }
}

// Set up Clerk event listeners
function setupClerkListeners() {
    console.log('Setting up Clerk listeners');
    if (window.Clerk && window.Clerk.addListener) {
        window.Clerk.addListener({
            signedIn: () => {
                console.log('User signed in, redirecting to dashboard');
                // User just signed in, redirect to dashboard
                window.location.href = '/dashboard.html';
            },
            signedOut: () => {
                console.log('User signed out, redirecting to home');
                // User just signed out, redirect to home
                window.location.href = '/';
            }
        });
    }
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Clerk');
    initializeClerk();
}); 