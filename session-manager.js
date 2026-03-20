// Session Management Utility
// Handles authentication, auto-redirect, session timeout, and trial expiry

const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
const TOKEN_KEY = 'access_token';
const LAST_ACTIVITY_KEY = 'lastActivity';

// Pages expired-trial users can still access
const TRIAL_ALLOWED_PAGES = ['pricing.html', 'payment.html', 'profile.html', 'contact-us.html', 'sign-in.html', 'sign-up.html', 'index.html'];

function isLoggedIn() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token !== null && token !== '';
}

function updateLastActivity() {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

function isSessionExpired() {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return true;
    return (Date.now() - parseInt(lastActivity)) > SESSION_TIMEOUT;
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem('user');
    localStorage.removeItem('trial_expired');
    window.location.href = 'index.html';
}

function redirectIfLoggedIn() {
    if (isLoggedIn() && !isSessionExpired()) {
        window.location.href = 'clients.html';
    }
}

function requireAuth() {
    if (!isLoggedIn() || isSessionExpired()) {
        logout();
        return false;
    }
    updateLastActivity();
    return true;
}

// ═══════════════════════════════════
// TRIAL EXPIRY GUARD (localStorage only — no API calls)
// ═══════════════════════════════════
function checkTrialExpiry() {
    if (!isLoggedIn()) return;
    if (localStorage.getItem('trial_expired') !== 'true') return;

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (TRIAL_ALLOWED_PAGES.includes(currentPage)) return;

    // Blocked — send to pricing
    window.location.href = 'pricing.html?expired=1';
}

function initSessionMonitoring() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
        document.addEventListener(event, updateLastActivity, { passive: true });
    });

    setInterval(() => {
        if (isLoggedIn() && isSessionExpired()) {
            alert('Your session has expired due to inactivity. Please log in again.');
            logout();
        }
    }, 60000);
}

if (typeof window !== 'undefined') {
    initSessionMonitoring();
    checkTrialExpiry();
}
