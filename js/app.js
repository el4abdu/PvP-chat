// Common App Functions
const APP_VERSION = '1.0.0';
const DEBUG_MODE = false;

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

// Initialize common app functions
document.addEventListener('DOMContentLoaded', () => {
    // Initialize app
    initApp();
});

// Initialize app
function initApp() {
    // Set active page link
    setActivePage();

    // Log app start
    logInfo(`ChatConnect v${APP_VERSION} started`);

    // Initialize Firebase
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
            logInfo('Firebase initialized');
        } catch (error) {
            logError('Firebase initialization failed', error);
        }
    }
}

// Set active page in navigation
function setActivePage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav ul li a');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        
        // Check if current path includes the link path
        // or if we're on index and the link is to home
        if ((currentPath.includes(linkPath) && linkPath !== '/') || 
            (currentPath === '/' && linkPath === '#')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Check if user is on mobile
function isMobileDevice() {
    return (window.innerWidth <= 768);
}

// Generate a random ID
function generateRandomId(length = 20) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
}

// Format date and time
function formatDateTime(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    };
    
    return d.toLocaleDateString('en-US', options);
}

// Truncate text with ellipsis
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substr(0, maxLength) + '...';
}

// Escape HTML to prevent XSS
function escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

// Logging functions
function logInfo(message) {
    if (DEBUG_MODE) {
        console.log(`[INFO] ${message}`);
    }
}

function logWarning(message) {
    if (DEBUG_MODE) {
        console.warn(`[WARN] ${message}`);
    }
}

function logError(message, error) {
    if (DEBUG_MODE) {
        console.error(`[ERROR] ${message}`, error);
    }
}

// Show a toast notification
function showToast(message, type = 'info', duration = 3000) {
    // Check if toast container exists
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
        // Create toast container
        toastContainer = document.createElement('div');
        toastContainer.classList.add('toast-container');
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);
    toast.textContent = message;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Hide and remove toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
        
        // Remove toast from DOM after animation
        setTimeout(() => {
            toastContainer.removeChild(toast);
            
            // Remove container if empty
            if (toastContainer.children.length === 0) {
                document.body.removeChild(toastContainer);
            }
        }, 300);
    }, duration);
}

// Add CSS for toast notifications
(function addToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
        }
        
        .toast {
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            color: white;
            max-width: 300px;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .toast.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .toast-info {
            background-color: #3498db;
        }
        
        .toast-success {
            background-color: #2ecc71;
        }
        
        .toast-warning {
            background-color: #f39c12;
        }
        
        .toast-error {
            background-color: #e74c3c;
        }
    `;
    document.head.appendChild(style);
})();

// Export common functions to window object
window.appUtils = {
    isMobileDevice,
    generateRandomId,
    formatDateTime,
    truncateText,
    escapeHtml,
    showToast
}; 