// Session Management Utility
// Handles authentication, auto-redirect, and session timeout

const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
const TOKEN_KEY = 'access_token';
const LAST_ACTIVITY_KEY = 'lastActivity';

// Check if user is logged in
function isLoggedIn() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token !== null && token !== '';
}

// Update last activity timestamp
function updateLastActivity() {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

// Check if session has expired
function isSessionExpired() {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return true;

    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
    return timeSinceLastActivity > SESSION_TIMEOUT;
}

// Logout user
function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem('user');
    window.location.href = 'sign-in.html';
}

// Auto-redirect if logged in (for public pages)
function redirectIfLoggedIn() {
    if (isLoggedIn() && !isSessionExpired()) {
        window.location.href = 'clients.html';
    }
}

// Require authentication (for protected pages)
function requireAuth() {
    if (!isLoggedIn() || isSessionExpired()) {
        logout();
        return false;
    }
    updateLastActivity();
    return true;
}

// Initialize session monitoring
function initSessionMonitoring() {
    // Update activity on user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, updateLastActivity, { passive: true });
    });

    // Check session every minute
    setInterval(() => {
        if (isLoggedIn() && isSessionExpired()) {
            alert('Your session has expired due to inactivity. Please log in again.');
            logout();
        }
    }, 60000); // Check every minute
}

// Initialize on page load
if (typeof window !== 'undefined') {
    initSessionMonitoring();
}
