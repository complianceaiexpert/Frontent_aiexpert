const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' || window.location.hostname === '';
const API_BASE_URL = isLocal ? 'http://localhost:8000/api/v1' : 'https://ca-copilot-mrwj.onrender.com/api/v1';
const STATEMENT3_WEBHOOK_URL = 'https://rahul250192.app.n8n.cloud/webhook/Statement3-Generated';

async function authFetch(endpoint, options = {}) {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('access_token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Add timeout — 15s for mutations, 20s for reads
    const timeoutMs = (options.method && options.method !== 'GET') ? 15000 : 20000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('user');
            localStorage.removeItem('access_token');
            window.location.href = 'index.html';
            return;
        }

        return response;
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            throw new Error('Server took too long to respond. The backend may be starting up — please try again in 30 seconds.');
        }
        throw new Error('Cannot reach the server. Please check if the backend is running.' + (isLocal ? ' (localhost:8000)' : ' (Render may be sleeping)'));
    }
}
