/**
 * app-topbar.js — Shared App Navbar Component
 * 
 * Usage: Place <div id="app-topbar" data-active="dashboard|ai-gpt|settings"></div>
 *        at the top of <body>, then include this script.
 */
(function () {
  const container = document.getElementById('app-topbar');
  if (!container) return;

  const active = (container.getAttribute('data-active') || '').toLowerCase();

  function cls(id) {
    return active === id ? 'app-nav-link app-nav-active' : 'app-nav-link';
  }

  container.innerHTML = `
  <nav class="app-navbar" id="app-navbar">
    <div class="app-navbar-inner">
      <!-- Logo -->
      <a href="clients.html" class="app-logo">
        <div class="app-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="app-logo-text">
          <span class="app-logo-name">Suvidha AI</span>
          <span class="app-logo-sub">Expert Platform</span>
        </div>
      </a>

      <!-- Center Nav -->
      <div class="app-nav-center">
        <a href="clients.html" class="${cls('dashboard')}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          Dashboard
        </a>

        <a href="ai-gpt.html" class="${cls('ai-gpt')}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          AI Assistant
          <span class="app-badge-ai">AI</span>
        </a>

        <a href="ai-agents.html" class="${cls('ai-agents')}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 8V4H8"/><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/>
          </svg>
          AI Agents
          <span class="app-badge-ai">NEW</span>
        </a>
      </div>

      <!-- Right -->
      <div class="app-nav-right">
        <a href="integrations.html" class="app-icon-btn ${active === 'settings' ? 'app-icon-active' : ''}" title="Integrations">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </a>

        <div class="app-nav-divider"></div>

        <div class="app-profile-wrap" id="profile-wrap">
          <button class="app-profile-btn" onclick="window.__toggleProfileDD(event)">
            <div class="app-avatar" id="nav-avatar">U</div>
            <div class="app-profile-info">
              <span class="app-profile-name" id="nav-user-name">User</span>
              <span class="app-profile-role" id="nav-user-role">Free Plan</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <div class="app-profile-dropdown" id="profile-dropdown">
            <div class="app-dd-header" id="dd-header">
              <div class="app-dd-avatar" id="dd-avatar">U</div>
              <div>
                <div class="app-dd-name" id="dd-name">User</div>
                <div class="app-dd-email" id="dd-email">user@company.com</div>
              </div>
            </div>
            <div class="app-dd-divider"></div>
            <a href="profile.html" class="app-dd-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              My Profile
            </a>
            <a href="integrations.html" class="app-dd-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Integrations
            </a>
            <a href="notice-management.html" class="app-dd-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              Notice Management
            </a>
            <div class="app-dd-divider"></div>
            <div class="app-dd-item app-dd-danger" onclick="window.__appLogout()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>`;

  // ── Dropdown Logic ──
  window.__toggleProfileDD = function (e) {
    e.stopPropagation();
    document.getElementById('profile-dropdown').classList.toggle('app-dd-open');
  };
  window.__appLogout = function () {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  };

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#profile-wrap'))
      document.getElementById('profile-dropdown').classList.remove('app-dd-open');
  });

  // ── User Info Init ──
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const initial = (user.firm_name || user.full_name || user.name || 'U').charAt(0).toUpperCase();
    const name = user.firm_name || user.full_name || user.name || 'User';
    const email = user.email || '';
    const role = user.subscription_plan || user.role || 'Free Plan';

    // Nav avatar & info
    const av = document.getElementById('nav-avatar');
    if (av) av.textContent = initial;
    const un = document.getElementById('nav-user-name');
    if (un) un.textContent = name;
    const ur = document.getElementById('nav-user-role');
    if (ur) ur.textContent = role;

    // Dropdown header
    const da = document.getElementById('dd-avatar');
    if (da) da.textContent = initial;
    const dn = document.getElementById('dd-name');
    if (dn) dn.textContent = name;
    const de = document.getElementById('dd-email');
    if (de) de.textContent = email;
  } catch (_) { }
})();
