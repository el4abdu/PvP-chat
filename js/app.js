// Common App Functions
const APP_VERSION = '1.0.0';
const DEBUG_MODE = true;

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
    logInfo(`PvP Chat v${APP_VERSION} started`);

    // Initialize Firebase only if not already initialized
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        try {
            // Use the config from index.html if available, otherwise use default
            const config = window.firebaseConfig || {
                apiKey: "AIzaSyCbDDimyxwhKaXon4IQwZTpgP2Twb8bHMo",
                authDomain: "pvp-chat-fe5ab.firebaseapp.com",
                projectId: "pvp-chat-fe5ab",
                storageBucket: "pvp-chat-fe5ab.firebasestorage.app",
                messagingSenderId: "387500645051",
                appId: "1:387500645051:web:4a4428e53c637ec2e9a79e",
                measurementId: "G-90LCQ3SF9X"
            };
            
            firebase.initializeApp(config);
            logInfo('Firebase initialized from app.js');
        } catch (error) {
            logError('Firebase initialization failed', error);
        }
    } else {
        logInfo('Firebase already initialized');
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

// Demo mode flag - should match auth.js
const USE_DEMO_MODE = true;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    
    // Register service worker for PWA support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
    
    // Set up debug panel (Ctrl+Shift+D)
    setupDebugPanel();
    
    // Add theme toggle functionality
    setupThemeToggle();
    
    // Set up notification system
    setupNotifications();
});

// Setup debug panel
function setupDebugPanel() {
    // Create debug panel
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.classList.add('debug-panel');
    debugPanel.style.display = 'none';
    
    // Add content to debug panel
    debugPanel.innerHTML = `
        <div class="debug-header">
            <h3>Debug Panel</h3>
            <button id="close-debug">Close</button>
        </div>
        <div class="debug-content">
            <div class="debug-section">
                <h4>Authentication</h4>
                <div id="auth-status">Checking...</div>
            </div>
            <div class="debug-section">
                <h4>Firebase</h4>
                <div id="firebase-status">Checking...</div>
            </div>
            <div class="debug-section">
                <h4>Environment</h4>
                <div id="env-info"></div>
            </div>
            <div class="debug-section">
                <h4>Console Log</h4>
                <div id="console-log" class="console-log"></div>
            </div>
            <div class="debug-actions">
                <button id="clear-log">Clear Log</button>
                <button id="test-firebase">Test Firebase</button>
                <button id="start-demo-chat">Start Demo Chat</button>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(debugPanel);
    
    // Override console methods to capture logs
    setupConsoleOverride();
    
    // Add keyboard shortcut (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            toggleDebugPanel();
        }
    });
    
    // Add event listeners
    document.getElementById('close-debug')?.addEventListener('click', toggleDebugPanel);
    document.getElementById('clear-log')?.addEventListener('click', clearDebugLog);
    document.getElementById('test-firebase')?.addEventListener('click', testFirebaseConnection);
    document.getElementById('start-demo-chat')?.addEventListener('click', startDemoChat);
    
    // Update debug info
    updateDebugInfo();
}

// Update debug info
function updateDebugInfo() {
    // Update auth status
    const authStatus = document.getElementById('auth-status');
    if (authStatus) {
        if (typeof window.authClient !== 'undefined') {
            const user = window.authClient.getUserProfile();
            if (user) {
                authStatus.innerHTML = `
                    <span class="status-success">✓ Authenticated</span>
                    <p>User: ${user.username || 'Anonymous'}</p>
                    <p>ID: ${user.id || 'Unknown'}</p>
                `;
            } else {
                authStatus.innerHTML = `
                    <span class="status-warning">⚠ Not authenticated</span>
                    <p>Demo mode: ${USE_DEMO_MODE ? 'Enabled' : 'Disabled'}</p>
                `;
            }
        } else {
            authStatus.innerHTML = `
                <span class="status-error">✗ Auth client not initialized</span>
                <p>Demo mode: ${USE_DEMO_MODE ? 'Enabled' : 'Disabled'}</p>
            `;
        }
    }
    
    // Update Firebase status
    const firebaseStatus = document.getElementById('firebase-status');
    if (firebaseStatus) {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            firebaseStatus.innerHTML = `
                <span class="status-success">✓ Firebase initialized</span>
                <p>Project ID: ${firebase.app().options.projectId}</p>
            `;
        } else {
            firebaseStatus.innerHTML = `
                <span class="status-error">✗ Firebase not initialized</span>
            `;
        }
    }
    
    // Update environment info
    const envInfo = document.getElementById('env-info');
    if (envInfo) {
        envInfo.innerHTML = `
            <p>User Agent: ${navigator.userAgent}</p>
            <p>Screen: ${window.innerWidth}x${window.innerHeight}</p>
            <p>Demo Mode: ${USE_DEMO_MODE ? 'Enabled' : 'Disabled'}</p>
        `;
    }
}

// Toggle debug panel
function toggleDebugPanel() {
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
        const isVisible = debugPanel.style.display !== 'none';
        debugPanel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            // Update debug info when opening
            updateDebugInfo();
        }
    }
}

// Clear debug log
function clearDebugLog() {
    const consoleLog = document.getElementById('console-log');
    if (consoleLog) {
        consoleLog.innerHTML = '';
    }
}

// Setup console override
function setupConsoleOverride() {
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };
    
    // Override console.log
    console.log = function() {
        originalConsole.log.apply(console, arguments);
        logToDebugPanel('log', arguments);
    };
    
    // Override console.warn
    console.warn = function() {
        originalConsole.warn.apply(console, arguments);
        logToDebugPanel('warn', arguments);
    };
    
    // Override console.error
    console.error = function() {
        originalConsole.error.apply(console, arguments);
        logToDebugPanel('error', arguments);
    };
}

// Log to debug panel
function logToDebugPanel(type, args) {
    const consoleLog = document.getElementById('console-log');
    if (!consoleLog) return;
    
    const logItem = document.createElement('div');
    logItem.classList.add('log-item', `log-${type}`);
    
    // Create timestamp
    const timestamp = new Date();
    const timeStr = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}:${timestamp.getSeconds().toString().padStart(2, '0')}`;
    
    // Create log content
    let content = '';
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg === 'object') {
            try {
                content += JSON.stringify(arg, null, 2);
            } catch (e) {
                content += '[Object]';
            }
        } else {
            content += arg;
        }
        
        if (i < args.length - 1) {
            content += ' ';
        }
    }
    
    // Set log item HTML
    logItem.innerHTML = `
        <span class="log-time">${timeStr}</span>
        <span class="log-type">${type}</span>
        <span class="log-content">${escapeHtml(content)}</span>
    `;
    
    // Add to log
    consoleLog.appendChild(logItem);
    
    // Scroll to bottom
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Test Firebase connection
function testFirebaseConnection() {
    console.log('Testing Firebase connection...');
    
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error('Firebase not initialized');
        return;
    }
    
    // Try to read a document from Firestore
    const db = firebase.firestore();
    db.collection('test').doc('connection')
        .set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            client: 'web',
            demoMode: USE_DEMO_MODE
        })
        .then(() => {
            console.log('Firebase connection successful');
            alert('Firebase connection successful!');
        })
        .catch(error => {
            console.error('Firebase connection failed', error);
            alert('Firebase connection failed: ' + error.message);
        });
}

// Start demo chat
function startDemoChat() {
    // Generate a random demo room ID
    const demoRoomId = 'demo-' + Math.random().toString(36).substring(2, 15);
    
    // Redirect to chat page with demo room ID
    window.location.href = '/chat.html?room=' + demoRoomId;
}

// Setup theme toggle
function setupThemeToggle() {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
        // Check for system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
    
    // Add theme toggle button if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            // Update theme
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

// Setup notifications
function setupNotifications() {
    // Check if notifications are supported
    if (!('Notification' in window)) {
        console.log('Notifications not supported');
        return;
    }
    
    // Request permission if needed
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        // Add notification permission button
        const notificationBtn = document.createElement('button');
        notificationBtn.id = 'notification-permission';
        notificationBtn.classList.add('notification-btn');
        notificationBtn.textContent = 'Enable Notifications';
        notificationBtn.addEventListener('click', requestNotificationPermission);
        
        // Add to body
        const container = document.querySelector('.container') || document.body;
        container.appendChild(notificationBtn);
    }
}

// Request notification permission
function requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
        
        // Remove button if permission granted
        if (permission === 'granted') {
            const notificationBtn = document.getElementById('notification-permission');
            if (notificationBtn) {
                notificationBtn.remove();
            }
        }
    });
}

// Show notification
function showNotification(title, options = {}) {
    // Check if notifications are supported and permission granted
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('Notifications not supported or permission not granted');
        return;
    }
    
    // Show notification
    const notification = new Notification(title, options);
    
    // Add click event
    notification.onclick = function() {
        window.focus();
        if (options.url) {
            window.location.href = options.url;
        }
        notification.close();
    };
    
    return notification;
} 