const API_BASE_URL = 'https://ca-copilot-api.onrender.com/api/v1';

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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        window.location.href = 'sign-in.html';
        return;
    }

    return response;
}
