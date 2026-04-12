/**
 * app-topbar.js — Shared App Navbar Component
 * 
 * Features:
 *  - Global client selector dropdown (persists across all modules)
 *  - User profile menu with logout
 *  - Navigation links
 * 
 * Usage: Place <div id="app-topbar" data-active="dashboard|ai-gpt|settings"></div>
 *        at the top of <body>, then include this script.
 */
(function () {
  const container = document.getElementById('app-topbar');
  if (!container) return;

  const active = (container.getAttribute('data-active') || '').toLowerCase();

  // ── Client Context Detection ──
  const _urlParams = new URLSearchParams(window.location.search);
  const _clientId = _urlParams.get('clientId') || '';
  let _clientName = '';
  let _clientGstin = '';
  let _isCorporate = false;
  try {
    const sc = JSON.parse(localStorage.getItem('selectedClient') || '{}');
    if (sc && sc.name) {
      _clientName = sc.name;
      _clientGstin = (sc.gstins && sc.gstins.length > 0) ? sc.gstins[0] : (sc.pan || '');
    }
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    _isCorporate = u.account_type === 'corporate';
  } catch (_) { }

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
        <a href="${_isCorporate ? 'services-dashboard.html' : 'clients.html'}" class="${cls('dashboard')}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          Dashboard
        </a>

        <a href="tool-gstin-validator.html" class="${cls('tools')}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Quick Tools
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

        ${_isCorporate ? `
        <!-- Corporate: show company name badge instead of client dropdown -->
        <div class="app-corp-badge" title="Corporate Account">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
          </svg>
          <span>${_clientName || 'Company'}</span>
        </div>
        ` : `
        <!-- CA Firm: full client selector dropdown -->
        <div class="app-client-selector" id="app-client-selector">
          <button class="app-client-btn" id="app-client-btn" onclick="window.__toggleClientDD(event)" title="Select Client">
            <span class="app-client-ctx-dot"></span>
            <svg class="app-client-ctx-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
            </svg>
            <span class="app-client-btn-name" id="app-client-btn-name">${_clientName || 'Select Client'}</span>
            <svg class="app-client-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>
          <div class="app-client-dropdown" id="app-client-dropdown">
            <div class="app-client-dd-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" id="app-client-search" placeholder="Search clients..." autocomplete="off">
            </div>
            <div class="app-client-dd-list" id="app-client-dd-list">
              <div class="app-client-dd-loading">Loading clients…</div>
            </div>
            <div class="app-client-dd-actions">
              <a href="#" onclick="localStorage.removeItem('selectedClient');window.location.href='clients.html'" class="app-client-dd-footer" style="flex:1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
                </svg>
                All Clients
              </a>
              <a href="#" onclick="localStorage.removeItem('selectedClient');window.location.href='clients.html#add-client'" class="app-client-dd-footer app-client-dd-add" style="flex:1">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>
                </svg>
                Add Client
              </a>
            </div>
          </div>
        </div>
        `}

        <div class="app-nav-divider"></div>

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
            <a href="gst-deadlines.html" class="app-dd-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              GST Deadlines
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
  </nav>

  <style>
    /* ── Global Client Selector ── */
    .app-client-selector { position: relative; }
    .app-client-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 10px;
      background: linear-gradient(135deg, #1E293B, #0F172A);
      border: 1.5px solid rgba(99,102,241,0.3);
      color: #F1F5F9; font-size: 0.8rem; font-weight: 600;
      font-family: inherit; cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap; max-width: 200px;
    }
    .app-client-btn:hover {
      border-color: rgba(99,102,241,0.6);
      box-shadow: 0 0 12px rgba(99,102,241,0.15);
    }
    .app-client-btn-name {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      max-width: 120px; display: inline-block;
    }
    .app-client-chevron { flex-shrink: 0; opacity: 0.5; transition: transform 0.2s; }
    .app-client-selector.open .app-client-chevron { transform: rotate(180deg); }

    .app-client-dropdown {
      display: none; position: absolute; top: calc(100% + 8px); right: 0;
      width: 300px; max-height: 420px;
      background: #fff; border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
      z-index: 9999; overflow: hidden;
      animation: clientDDSlide 0.2s ease;
    }
    @keyframes clientDDSlide { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
    .app-client-selector.open .app-client-dropdown { display: block; }

    .app-client-dd-search {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-bottom: 1px solid #F1F5F9;
    }
    .app-client-dd-search input {
      flex: 1; border: none; outline: none; font-size: 0.82rem;
      font-family: inherit; color: #1E293B; background: transparent;
    }
    .app-client-dd-search input::placeholder { color: #CBD5E1; }

    .app-client-dd-list {
      max-height: 280px; overflow-y: auto; padding: 6px;
    }
    .app-client-dd-list::-webkit-scrollbar { width: 4px; }
    .app-client-dd-list::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }

    .app-client-dd-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 8px;
      cursor: pointer; transition: all 0.15s;
      border: 1.5px solid transparent;
    }
    .app-client-dd-item:hover { background: #F8FAFC; }
    .app-client-dd-item.selected {
      background: #EEF2FF; border-color: #818CF8;
    }
    .app-client-dd-item-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #6366F1, #818CF8);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 0.75rem; font-weight: 700;
      flex-shrink: 0;
    }
    .app-client-dd-item.selected .app-client-dd-item-avatar {
      background: linear-gradient(135deg, #4338CA, #6366F1);
    }
    .app-client-dd-item-info { flex: 1; min-width: 0; }
    .app-client-dd-item-name {
      font-size: 0.82rem; font-weight: 600; color: #1E293B;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .app-client-dd-item-detail {
      font-size: 0.72rem; color: #94A3B8;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .app-client-dd-check {
      width: 18px; height: 18px; border-radius: 50%;
      background: #6366F1; display: none;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .app-client-dd-item.selected .app-client-dd-check { display: flex; }

    .app-client-dd-loading, .app-client-dd-empty {
      padding: 20px; text-align: center; font-size: 0.8rem; color: #94A3B8;
    }

    .app-client-dd-footer {
      display: flex; align-items: center; gap: 8px; justify-content: center;
      padding: 10px 14px; border-top: 1px solid #F1F5F9;
      font-size: 0.78rem; font-weight: 500; color: #6366F1;
      text-decoration: none; transition: background 0.15s;
    }
    .app-client-dd-footer:hover { background: #F8FAFC; }

    .app-client-dd-actions {
      display: flex; border-top: 1px solid #F1F5F9;
    }
    .app-client-dd-actions .app-client-dd-footer {
      border-top: none; border-radius: 0;
    }
    .app-client-dd-actions .app-client-dd-footer:first-child {
      border-right: 1px solid #F1F5F9; border-radius: 0 0 0 14px;
    }
    .app-client-dd-actions .app-client-dd-footer:last-child {
      border-radius: 0 0 14px 0;
    }
    .app-client-dd-add { color: #059669 !important; font-weight: 600 !important; }
    .app-client-dd-add:hover { background: #ecfdf5 !important; }

    /* Corporate badge (replaces client selector) */
    .app-corp-badge {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 10px;
      background: linear-gradient(135deg, #1E293B, #0F172A);
      border: 1.5px solid rgba(16,185,129,0.35);
      color: #6EE7B7; font-size: 0.8rem; font-weight: 600;
      white-space: nowrap; max-width: 220px;
    }
    .app-corp-badge span {
      overflow: hidden; text-overflow: ellipsis;
      max-width: 140px; display: inline-block;
    }
  </style>
  `;

  // ── Dropdown Logic ──
  window.__toggleProfileDD = function (e) {
    e.stopPropagation();
    document.getElementById('profile-dropdown').classList.toggle('app-dd-open');
    // Close client dropdown if open
    document.getElementById('app-client-selector').classList.remove('open');
  };
  window.__appLogout = function () {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedClient');
    window.location.href = 'index.html';
  };

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#profile-wrap'))
      document.getElementById('profile-dropdown').classList.remove('app-dd-open');
    if (!e.target.closest('#app-client-selector'))
      document.getElementById('app-client-selector').classList.remove('open');
  });

  // ── Client Selector Toggle ──
  window.__toggleClientDD = function (e) {
    e.stopPropagation();
    const sel = document.getElementById('app-client-selector');
    const wasOpen = sel.classList.contains('open');
    sel.classList.toggle('open');
    // Close profile dropdown
    document.getElementById('profile-dropdown').classList.remove('app-dd-open');
    // Show cached clients instantly, refresh in background
    if (!wasOpen) {
      if (_cachedClients) {
        window.__renderClientList(_cachedClients);
      }
      // Background refresh (non-blocking)
      window.__loadClientsForDropdown(true);
      setTimeout(() => {
        const input = document.getElementById('app-client-search');
        if (input) { input.value = ''; input.focus(); }
      }, 50);
    }
  };

  // ── Load Clients ──
  let _cachedClients = null;

  // Try to load from sessionStorage instantly
  try {
    const cached = sessionStorage.getItem('__topbar_clients');
    if (cached) {
      _cachedClients = JSON.parse(cached);
    }
  } catch (_) { }

  window.__loadClientsForDropdown = function (silent = false) {
    const listEl = document.getElementById('app-client-dd-list');
    if (!listEl) return;

    // Show cached immediately
    if (_cachedClients && _cachedClients.length > 0) {
      window.__renderClientList(_cachedClients);
    } else if (!silent) {
      listEl.innerHTML = '<div class="app-client-dd-loading">Loading clients…</div>';
    }

    // Fetch fresh data
    const tryLoad = () => {
      if (typeof authFetch !== 'function') {
        setTimeout(tryLoad, 200);
        return;
      }
      authFetch('/clients/').then(r => r.ok ? r.json() : []).then(clients => {
        _cachedClients = clients || [];
        // Cache to sessionStorage for instant load on next page
        try { sessionStorage.setItem('__topbar_clients', JSON.stringify(_cachedClients)); } catch (_) { }
        window.__renderClientList(_cachedClients);
      }).catch(() => {
        if (!_cachedClients || _cachedClients.length === 0) {
          listEl.innerHTML = '<div class="app-client-dd-empty">Failed to load clients</div>';
        }
      });
    };
    tryLoad();
  };

  // ── Pre-fetch clients on page load (background, after 300ms) ──
  setTimeout(() => {
    window.__loadClientsForDropdown(true);
  }, 300);

  // ── Render Client List ──
  window.__renderClientList = function (clients, filter = '') {
    const listEl = document.getElementById('app-client-dd-list');
    if (!listEl) return;

    const currentClient = JSON.parse(localStorage.getItem('selectedClient') || '{}');
    const currentId = currentClient.id || _clientId || '';
    const query = filter.toLowerCase();

    const filtered = clients.filter(c => {
      if (!query) return true;
      const name = (c.name || '').toLowerCase();
      const pan = (c.pan || '').toLowerCase();
      const gstin = ((c.gstins && c.gstins[0]) || '').toLowerCase();
      return name.includes(query) || pan.includes(query) || gstin.includes(query);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = query
        ? '<div class="app-client-dd-empty">No clients match your search</div>'
        : '<div class="app-client-dd-empty">No clients yet. <a href="clients.html" style="color:#6366F1">Add one →</a></div>';
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const initial = (c.name || 'C').charAt(0).toUpperCase();
      const detail = (c.gstins && c.gstins.length > 0) ? c.gstins[0] : (c.pan || '—');
      const isSelected = c.id === currentId;
      return `
        <div class="app-client-dd-item ${isSelected ? 'selected' : ''}" 
             data-id="${c.id}" onclick="window.__selectGlobalClient('${c.id}', this)">
          <div class="app-client-dd-item-avatar">${initial}</div>
          <div class="app-client-dd-item-info">
            <div class="app-client-dd-item-name">${c.name || 'Unnamed'}</div>
            <div class="app-client-dd-item-detail">${detail}</div>
          </div>
          <div class="app-client-dd-check">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>
      `;
    }).join('');
  };

  // ── Select Client Globally ──
  window.__selectGlobalClient = function (clientId, el) {
    if (!_cachedClients) return;
    const client = _cachedClients.find(c => c.id === clientId);
    if (!client) return;

    // Save to localStorage
    localStorage.setItem('selectedClient', JSON.stringify(client));

    // Update the button text
    const nameEl = document.getElementById('app-client-btn-name');
    if (nameEl) nameEl.textContent = client.name || 'Client';

    // Close dropdown
    document.getElementById('app-client-selector').classList.remove('open');

    // Update URL if we're on a client-specific page
    const url = new URL(window.location.href);
    if (url.searchParams.has('clientId') || _clientId) {
      url.searchParams.set('clientId', clientId);
      window.location.href = url.toString();
    } else {
      // Dispatch event so modules can react without page reload
      window.dispatchEvent(new CustomEvent('clientChanged', { detail: client }));
      // Re-render the dropdown to show new selection
      window.__renderClientList(_cachedClients);
    }
  };

  // ── Search Handler (only for CA firm) ──
  const _searchEl = document.getElementById('app-client-search');
  if (_searchEl) {
    _searchEl.addEventListener('input', function () {
      if (_cachedClients) {
        window.__renderClientList(_cachedClients, this.value);
      }
    });
  }

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

  // ── Expose helper so other modules can update topbar ──
  window.__updateTopbarClientCtx = function (name) {
    const nameEl = document.getElementById('app-client-btn-name');
    if (nameEl && name) nameEl.textContent = name;
  };
})();

