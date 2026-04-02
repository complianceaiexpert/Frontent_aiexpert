// ══════════════════════════════════════════════════════
// Client Picker Overlay — shared across service pages
// Shows a professional client selection view when
// no clientId is provided in the URL.
// ══════════════════════════════════════════════════════

/**
 * initClientPicker(options)
 *   options.serviceName — e.g. "Financial Instruments"
 *   options.serviceIcon — emoji or SVG
 *   options.serviceDesc — tagline for the service
 *   options.serviceSlug — URL-safe slug e.g. "financial-instruments"
 *   options.containerId — ID of the element to overlay (default: body)
 *   options.pagePath    — current page path for redirect
 */
function initClientPicker(options = {}) {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('clientId');
    if (clientId) return null; // has client, no overlay needed

    const {
        serviceName = 'Service',
        serviceIcon = '📊',
        serviceDesc = 'Select a client to continue',
        pagePath = window.location.pathname.split('/').pop(),
    } = options;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'cp-overlay';
    overlay.innerHTML = `
    <style>
        #cp-overlay {
            position: fixed; inset: 0; z-index: 10000;
            background: linear-gradient(135deg, #07080d 0%, #0f172a 50%, #1e1b4b 100%);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
            animation: cpFadeIn .4s ease;
        }
        @keyframes cpFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cpSlideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }

        .cp-container {
            width: 100%; max-width: 880px; padding: 2rem;
            animation: cpSlideUp .5s ease .1s backwards;
        }

        /* ── Header ── */
        .cp-header {
            text-align: center; margin-bottom: 2.5rem;
        }
        .cp-icon {
            font-size: 3rem; margin-bottom: .75rem;
            display: inline-block;
            animation: cpSlideUp .5s ease .15s backwards;
        }
        .cp-title {
            font-family: 'Outfit', sans-serif;
            font-size: 2rem; font-weight: 800;
            color: #fff; margin-bottom: .5rem;
            animation: cpSlideUp .5s ease .2s backwards;
        }
        .cp-title span {
            background: linear-gradient(135deg, #60a5fa, #a78bfa);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .cp-subtitle {
            font-size: .92rem; color: rgba(255,255,255,.45);
            animation: cpSlideUp .5s ease .25s backwards;
        }

        /* ── Search ── */
        .cp-search-wrap {
            position: relative; max-width: 440px; margin: 0 auto 1.75rem;
            animation: cpSlideUp .5s ease .3s backwards;
        }
        .cp-search {
            width: 100%; padding: .75rem 1rem .75rem 2.75rem;
            border: 1.5px solid rgba(255,255,255,.12);
            border-radius: 12px; font-size: .88rem;
            font-family: 'Inter', sans-serif; color: #fff;
            background: rgba(255,255,255,.06);
            backdrop-filter: blur(8px);
            outline: none; transition: all .2s;
        }
        .cp-search::placeholder { color: rgba(255,255,255,.3) }
        .cp-search:focus {
            border-color: rgba(99,102,241,.5);
            box-shadow: 0 0 0 4px rgba(99,102,241,.12);
            background: rgba(255,255,255,.08);
        }
        .cp-search-icon {
            position: absolute; left: .85rem; top: 50%;
            transform: translateY(-50%); color: rgba(255,255,255,.3);
        }

        /* ── Grid ── */
        .cp-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: .85rem; max-height: 420px; overflow-y: auto;
            padding-right: .35rem;
        }
        .cp-grid::-webkit-scrollbar { width: 5px }
        .cp-grid::-webkit-scrollbar-track { background: transparent }
        .cp-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 3px }

        /* ── Client Card ── */
        .cp-card {
            background: rgba(255,255,255,.04);
            border: 1px solid rgba(255,255,255,.08);
            border-radius: 14px; padding: 1.15rem 1.25rem;
            cursor: pointer; transition: all .25s;
            position: relative; overflow: hidden;
        }
        .cp-card::before {
            content: ''; position: absolute; inset: 0;
            background: linear-gradient(135deg, rgba(99,102,241,.06) 0%, transparent 60%);
            opacity: 0; transition: opacity .25s;
        }
        .cp-card:hover {
            transform: translateY(-3px);
            border-color: rgba(99,102,241,.35);
            background: rgba(255,255,255,.07);
            box-shadow: 0 8px 24px rgba(0,0,0,.2);
        }
        .cp-card:hover::before { opacity: 1 }
        .cp-card:active { transform: translateY(-1px) }

        .cp-card-inner { position: relative; z-index: 1 }

        .cp-card-avatar {
            width: 38px; height: 38px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: .82rem; color: #fff;
            margin-bottom: .65rem; flex-shrink: 0;
        }

        .cp-card-name {
            font-weight: 700; font-size: .88rem; color: #fff;
            margin-bottom: .25rem;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cp-card-meta {
            font-size: .68rem; color: rgba(255,255,255,.35);
            display: flex; flex-direction: column; gap: .15rem;
        }
        .cp-card-meta span {
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cp-card-arrow {
            position: absolute; right: 1rem; top: 50%;
            transform: translateY(-50%); color: rgba(255,255,255,.15);
            transition: all .25s;
        }
        .cp-card:hover .cp-card-arrow {
            color: #6366f1; transform: translateY(-50%) translateX(3px);
        }

        /* ── Empty ── */
        .cp-empty {
            text-align: center; padding: 3rem 1rem; color: rgba(255,255,255,.3);
        }
        .cp-empty-icon { font-size: 2.5rem; margin-bottom: .75rem }
        .cp-empty h3 { color: rgba(255,255,255,.5); font-weight: 700; margin-bottom: .35rem }
        .cp-empty p { font-size: .82rem }

        .cp-back {
            display: inline-flex; align-items: center; gap: .4rem;
            margin-top: 1.25rem; font-size: .78rem; color: rgba(255,255,255,.35);
            text-decoration: none; transition: color .2s;
        }
        .cp-back:hover { color: #6366f1 }

        /* ── Loading ── */
        .cp-loading {
            text-align: center; padding: 3rem;
        }
        .cp-spinner {
            width: 36px; height: 36px; border: 3px solid rgba(255,255,255,.1);
            border-top-color: #6366f1; border-radius: 50%;
            animation: cpSpin .8s linear infinite;
            margin: 0 auto .75rem;
        }
        @keyframes cpSpin { to { transform: rotate(360deg) } }
        .cp-loading-text { color: rgba(255,255,255,.4); font-size: .82rem }

        @media (max-width: 600px) {
            .cp-grid { grid-template-columns: 1fr }
            .cp-title { font-size: 1.5rem }
        }
    </style>

    <div class="cp-container">
        <div class="cp-header">
            <div class="cp-icon">${serviceIcon}</div>
            <h1 class="cp-title">${serviceName.replace(/(.*?)$/, '<span>$1</span>')}</h1>
            <p class="cp-subtitle">${serviceDesc}</p>
        </div>

        <div class="cp-search-wrap">
            <svg class="cp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="cp-search" id="cp-search" placeholder="Search clients by name, GSTIN, or PAN…" autocomplete="off">
        </div>

        <div class="cp-grid" id="cp-grid">
            <div class="cp-loading">
                <div class="cp-spinner"></div>
                <div class="cp-loading-text">Loading your clients…</div>
            </div>
        </div>

        <div style="text-align:center">
            <a href="clients.html" class="cp-back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                Back to All Clients
            </a>
        </div>
    </div>`;

    document.body.appendChild(overlay);

    // ── Fetch clients ──
    const avatarColors = [
        'linear-gradient(135deg, #6366f1, #8b5cf6)',
        'linear-gradient(135deg, #EB6711, #f5841a)',
        'linear-gradient(135deg, #059669, #10b981)',
        'linear-gradient(135deg, #1e3a8a, #3b82f6)',
        'linear-gradient(135deg, #dc2626, #f87171)',
        'linear-gradient(135deg, #d97706, #fbbf24)',
        'linear-gradient(135deg, #7c3aed, #a78bfa)',
        'linear-gradient(135deg, #0891b2, #06b6d4)',
    ];

    let allClients = [];

    async function loadClients() {
        try {
            const res = await authFetch('/clients/');
            if (!res || !res.ok) throw new Error('Failed');
            allClients = await res.json();
            renderClients(allClients);
        } catch (e) {
            document.getElementById('cp-grid').innerHTML = `
                <div class="cp-empty">
                    <div class="cp-empty-icon">⚠️</div>
                    <h3>Unable to load clients</h3>
                    <p>Check if the backend server is running and you are logged in.</p>
                </div>`;
        }
    }

    function renderClients(clients) {
        const grid = document.getElementById('cp-grid');
        if (!clients || clients.length === 0) {
            grid.innerHTML = `
                <div class="cp-empty" style="grid-column:1/-1">
                    <div class="cp-empty-icon">👥</div>
                    <h3>No clients found</h3>
                    <p>Add clients from the <a href="clients.html" style="color:#6366f1">Clients page</a> first.</p>
                </div>`;
            return;
        }

        grid.innerHTML = clients.map((c, i) => {
            const name = c.name || c.company_name || 'Unnamed Client';
            const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const bg = avatarColors[i % avatarColors.length];
            const gstins = c.gstins || [];
            const gstin = Array.isArray(gstins) && gstins.length > 0
                ? (typeof gstins[0] === 'object' ? gstins[0].gstin : gstins[0])
                : (c.gstin || '');
            const pan = c.pan || '';
            const id = c.id || c.client_id || '';

            return `<div class="cp-card" onclick="cpSelectClient('${id}', '${name.replace(/'/g, "\\'")}')">
                <div class="cp-card-inner">
                    <div class="cp-card-avatar" style="background:${bg}">${initials}</div>
                    <div class="cp-card-name">${name}</div>
                    <div class="cp-card-meta">
                        ${gstin ? `<span>GSTIN: ${gstin}</span>` : ''}
                        ${pan ? `<span>PAN: ${pan}</span>` : ''}
                        ${!gstin && !pan ? '<span style="font-style:italic">No GSTIN / PAN</span>' : ''}
                    </div>
                </div>
                <svg class="cp-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </div>`;
        }).join('');
    }

    // ── Search ──
    document.getElementById('cp-search').addEventListener('input', function() {
        const q = this.value.toLowerCase().trim();
        if (!q) { renderClients(allClients); return; }
        const filtered = allClients.filter(c => {
            const name = (c.name || c.company_name || '').toLowerCase();
            const pan = (c.pan || '').toLowerCase();
            const gstins = c.gstins || [];
            const gstinStr = gstins.map(g => typeof g === 'object' ? g.gstin : g).join(' ').toLowerCase();
            const gstin = (c.gstin || '').toLowerCase();
            return name.includes(q) || pan.includes(q) || gstinStr.includes(q) || gstin.includes(q);
        });
        renderClients(filtered);
    });

    // ── Select ──
    window.cpSelectClient = function(id, name) {
        // Animate out
        overlay.style.transition = 'opacity .3s';
        overlay.style.opacity = '0';
        setTimeout(() => {
            const url = new URL(window.location.href);
            url.searchParams.set('clientId', id);
            window.location.href = url.toString();
        }, 250);
    };

    loadClients();
    return overlay;
}
