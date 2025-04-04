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
        
        // Add Clerk script if not already present
        if (typeof window.Clerk === 'undefined') {
            console.log('Loading Clerk script');
            const script = document.createElement('script');
            script.src = 'https://cdn.clerk.dev/v1/clerk.js';
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                console.log('Clerk script loaded, initializing');
                initializeClerkWithKey();
            };
            script.onerror = (error) => {
                console.error('Error loading Clerk script:', error);
                setupDemoMode();
            };
            document.head.appendChild(script);
        } else {
            // Clerk already loaded
            initializeClerkWithKey();
        }
    } catch (error) {
        console.error('Unexpected error initializing Clerk:', error);
        showErrorMessage('Authentication error: ' + error.message);
        setupDemoMode();
    }
}

// Initialize Clerk with key
function initializeClerkWithKey() {
    try {
        if (CLERK_PUBLISHABLE_KEY) {
            console.log('Attempting to initialize Clerk with key');
            
            // Initialize Clerk with a key
            window.Clerk.load({
                publishableKey: CLERK_PUBLISHABLE_KEY
            }).then(() => {
                console.log('Clerk initialized successfully');
                
                // Check if user is already signed in
                if (window.Clerk.user) {
                    console.log('User is signed in:', window.Clerk.user.id);
                    
                    // Check if user has completed profile
                    checkProfileCompletion(window.Clerk.user).then(isComplete => {
                        if (isComplete) {
                            // User has completed profile, redirect to chat directly
                            if (window.location.pathname === '/' || 
                                window.location.pathname === '/index.html') {
                                redirectToChatPage();
                            }
                        } else {
                            // User hasn't completed profile, show onboarding modal
                            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                                showOnboardingModal();
                            }
                        }
                    });
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
            console.warn('Missing Clerk publishable key, using demo mode');
            setupDemoMode();
        }
    } catch (error) {
        console.error('Error in initializeClerkWithKey:', error);
        setupDemoMode();
    }
}

// Redirect to chat page
function redirectToChatPage() {
    // Redirect to chat page
    window.location.href = `/chat.html?action=start-new`;
}

// Check if user has completed profile
async function checkProfileCompletion(user) {
    if (!user) return false;
    
    try {
        // Get metadata from Clerk
        const metadata = user.publicMetadata || {};
        
        // Check if user has completed profile
        return !!(metadata.username && metadata.age && metadata.gender && metadata.interests?.length >= 3);
    } catch (error) {
        console.error('Error checking profile completion:', error);
        return false;
    }
}

// Show onboarding modal
function showOnboardingModal() {
    const onboardingModal = document.getElementById('onboarding-modal');
    if (onboardingModal) {
        onboardingModal.style.display = 'flex';
    }
}

// Setup demo mode for testing without Clerk
function setupDemoMode() {
    console.log('Setting up demo mode');
    
    // Create a mock user
    const demoUser = {
        id: 'demo-user-' + Math.floor(Math.random() * 100000),
        username: '',
        firstName: '',
        lastName: '',
        email: 'demo@example.com',
        imageUrl: null,
        publicMetadata: {
            interests: []
        }
    };
    
    // Set up the auth client with demo methods
    window.authClient = {
        getUserProfile: () => {
            console.log('Demo: getUserProfile called');
            return {
                id: demoUser.id,
                username: demoUser.username || 'Anonymous',
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
                        username: demoUser.username,
                        age: demoUser.publicMetadata.age,
                        gender: demoUser.publicMetadata.gender,
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
                    if (metadata.username) demoUser.username = metadata.username;
                    if (metadata.interests) demoUser.publicMetadata.interests = metadata.interests;
                    if (metadata.age) demoUser.publicMetadata.age = metadata.age;
                    if (metadata.gender) demoUser.publicMetadata.gender = metadata.gender;
                    
                    // Save to Firebase if available
                    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                        try {
                            const db = firebase.firestore();
                            db.collection('users').doc(demoUser.id).set({
                                id: demoUser.id,
                                username: demoUser.username,
                                email: demoUser.email,
                                age: demoUser.publicMetadata.age,
                                gender: demoUser.publicMetadata.gender,
                                interests: demoUser.publicMetadata.interests,
                                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                                updated_at: firebase.firestore.FieldValue.serverTimestamp()
                            }, { merge: true });
                        } catch (error) {
                            console.error('Error saving to Firebase:', error);
                        }
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
        },
        
        getUser: () => {
            return demoUser;
        }
    };
    
    // Hook up auth buttons
    setupAuthButtons();
    
    console.log('Demo mode setup complete');
    
    // Check if we need profile completion
    const needsProfile = !(demoUser.username && demoUser.publicMetadata.age && 
                         demoUser.publicMetadata.gender && demoUser.publicMetadata.interests?.length >= 3);
                         
    // Show onboarding if needed
    if (needsProfile) {
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            // On homepage - Let the DOM load fully before showing modal
            setTimeout(() => {
                showOnboardingModal();
            }, 1000);
        } else if (!window.location.pathname.includes('chat.html')) {
            // Redirect to index if not on chat page
            window.location.href = '/';
        }
    } else {
        // Profile complete, redirect to chat if not already on chat page
        if (!window.location.pathname.includes('chat.html')) {
            redirectToChatPage();
        }
    }
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
                // Update Clerk metadata
                await window.Clerk.user.update({
                    publicMetadata: {
                        ...window.Clerk.user.publicMetadata,
                        ...metadata
                    }
                });
                
                // Also save to Firebase if available
                if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                    try {
                        const db = firebase.firestore();
                        const userProfile = this.getUserProfile();
                        
                        db.collection('users').doc(userProfile.id).set({
                            id: userProfile.id,
                            username: metadata.username || userProfile.username,
                            email: userProfile.email,
                            age: metadata.age || window.Clerk.user.publicMetadata.age,
                            gender: metadata.gender || window.Clerk.user.publicMetadata.gender,
                            interests: metadata.interests || window.Clerk.user.publicMetadata.interests || [],
                            updated_at: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    } catch (error) {
                        console.error('Error saving to Firebase:', error);
                    }
                }
                
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
        },
        
        getUser: () => {
            return window.Clerk?.user || null;
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
    const getStartedBtn = document.getElementById('get-started-btn');
    const ctaBtn = document.getElementById('cta-btn');
    const signOutBtn = document.getElementById('sign-out-btn');

    // Get Started button
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            console.log('Get started button clicked');
            
            // Show the onboarding modal directly, skip Clerk
            const onboardingModal = document.getElementById('onboarding-modal');
            if (onboardingModal) {
                onboardingModal.style.display = 'flex';
            }
        });
    }
    
    // CTA button
    if (ctaBtn) {
        ctaBtn.addEventListener('click', () => {
            console.log('CTA button clicked');
            if (getStartedBtn) {
                getStartedBtn.click();
            }
        });
    }
    
    // Sign out button
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
                console.log('User signed in');
                // Check if user has completed profile
                checkProfileCompletion(window.Clerk.user).then(isComplete => {
                    if (isComplete) {
                        // User has completed profile, redirect to chat
                        showSuccessMessage('Signed in successfully!');
                        
                        // Redirect to chat after a short delay
                        setTimeout(() => {
                            redirectToChatPage();
                        }, 1000);
                    } else {
                        // User hasn't completed profile, show onboarding modal
                        showOnboardingModal();
                    }
                });
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

// Update the onboarding form to redirect to chat.html instead of dashboard
document.addEventListener('DOMContentLoaded', () => {
    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) {
        // Skip to step-2 if interests are required, otherwise remove step-2
        const step1 = document.getElementById('step-1');
        const step2 = document.getElementById('step-2');
        const nextToInterests = document.getElementById('next-to-interests');
        
        // Remove interests step (step-2) and update button
        if (step1 && step2 && nextToInterests) {
            // Hide step-2 completely as we don't need interests
            step2.style.display = 'none';
            
            // Change next button to complete button
            nextToInterests.textContent = 'Complete Profile';
            nextToInterests.classList.add('btn-primary');
            
            // Change next button functionality to submit the form
            nextToInterests.addEventListener('click', async function(e) {
                e.preventDefault();
                
                const username = document.getElementById('username').value;
                const age = document.getElementById('age').value;
                const gender = document.querySelector('input[name="gender"]:checked');
                
                if (!username || !age || !gender) {
                    alert('Please fill in all fields');
                    return;
                }
                
                if (parseInt(age) < 18) {
                    alert('You must be 18 or older to use this platform');
                    return;
                }
                
                // Save user data without interests
                if (window.authClient) {
                    try {
                        // Show loading state
                        nextToInterests.textContent = 'Saving...';
                        nextToInterests.disabled = true;
                        
                        // Save metadata without interests
                        await window.authClient.saveUserMetadata({
                            username: username,
                            age: parseInt(age),
                            gender: gender.value,
                            interests: ['chat'] // Add at least one default interest
                        });
                        
                        // Close modal
                        const onboardingModal = document.getElementById('onboarding-modal');
                        if (onboardingModal) {
                            onboardingModal.style.display = 'none';
                        }
                        
                        // Show success message
                        const successMessage = document.createElement('div');
                        successMessage.style.cssText = 'position: fixed; top: 10px; right: 10px; background-color: #2ecc71; color: white; padding: 15px; border-radius: 5px; z-index: 9999; max-width: 300px;';
                        successMessage.textContent = 'Profile created successfully! Redirecting...';
                        document.body.appendChild(successMessage);
                        
                        // Redirect after 1.5 seconds to chat page
                        setTimeout(() => {
                            document.body.removeChild(successMessage);
                            redirectToChatPage();
                        }, 1500);
                    } catch (error) {
                        console.error('Error saving profile:', error);
                        alert('Error saving profile. Please try again.');
                        
                        nextToInterests.textContent = 'Complete Profile';
                        nextToInterests.disabled = false;
                    }
                } else {
                    console.error('Auth client not available');
                    alert('Authentication error. Please refresh the page and try again.');
                }
            });
        }
        
        // Keep the original submit event for backward compatibility
        onboardingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const age = document.getElementById('age').value;
            const gender = document.querySelector('input[name="gender"]:checked').value;
            
            // Save user data
            if (window.authClient) {
                try {
                    // Show loading state
                    const completeOnboarding = document.getElementById('complete-onboarding');
                    if (completeOnboarding) {
                        completeOnboarding.textContent = 'Saving...';
                        completeOnboarding.disabled = true;
                    }
                    
                    // Save metadata
                    await window.authClient.saveUserMetadata({
                        username: username,
                        age: parseInt(age),
                        gender: gender,
                        interests: ['chat'] // Add at least one default interest
                    });
                    
                    // Close modal
                    const onboardingModal = document.getElementById('onboarding-modal');
                    if (onboardingModal) {
                        onboardingModal.style.display = 'none';
                    }
                    
                    // Show success message
                    const successMessage = document.createElement('div');
                    successMessage.style.cssText = 'position: fixed; top: 10px; right: 10px; background-color: #2ecc71; color: white; padding: 15px; border-radius: 5px; z-index: 9999; max-width: 300px;';
                    successMessage.textContent = 'Profile created successfully! Redirecting...';
                    document.body.appendChild(successMessage);
                    
                    // Redirect after 1.5 seconds
                    setTimeout(() => {
                        document.body.removeChild(successMessage);
                        redirectToChatPage();
                    }, 1500);
                } catch (error) {
                    console.error('Error saving profile:', error);
                    alert('Error saving profile. Please try again.');
                    
                    const completeOnboarding = document.getElementById('complete-onboarding');
                    if (completeOnboarding) {
                        completeOnboarding.textContent = 'Complete Profile';
                        completeOnboarding.disabled = false;
                    }
                }
            } else {
                console.error('Auth client not available');
                alert('Authentication error. Please refresh the page and try again.');
            }
        });
    }
}); 