/**
 * app-sidebar.js — Shared Sidebar "Main" Navigation Component
 *
 * Reorganized with clean grouping:
 *   - Main: Home, Clients
 *   - Services: All 6 service names
 *
 * Usage:
 *   1. Add <div id="app-sidebar-main" data-active="home|clients|gst-filing|data-entry|ca-certificates|financial-statements|financial-instruments|statutory-reporting"></div>
 *      as the FIRST child inside your page's <aside> sidebar element.
 *   2. Include this script: <script src="app-sidebar.js"></script>
 *
 * The "data-active" attribute highlights the current page in the main nav.
 */
(function () {
    const container = document.getElementById('app-sidebar-main');
    if (!container) return;

    // ═══ Inject critical sidebar CSS if not already present ═══
    if (!document.getElementById('app-sidebar-css')) {
        const style = document.createElement('style');
        style.id = 'app-sidebar-css';
        style.textContent = `
            .sb-section { padding: 0.25rem 0.65rem; }
            .sb-section-label {
                font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
                letter-spacing: 0.1em; color: #94a3b8;
                padding: 0.25rem 0.75rem 0.15rem; margin-bottom: 0.05rem;
            }
            .sb-section-label svg { opacity: 0.5; }
            .sb-section-label.sb-collapsible {
                cursor: pointer; user-select: none;
                display: flex; align-items: center; gap: 0.35rem;
                border-radius: 6px; transition: background 0.15s;
            }
            .sb-section-label.sb-collapsible:hover {
                background: rgba(30,58,138,0.04);
            }
            .sb-collapse-arrow {
                margin-left: auto; transition: transform 0.2s ease;
                opacity: 0.4; flex-shrink: 0;
            }
            .sb-collapse-arrow.sb-collapsed {
                transform: rotate(-90deg);
            }
            .sb-collapse-body {
                overflow: hidden; transition: max-height 0.25s ease, opacity 0.2s ease;
                max-height: 500px; opacity: 1;
            }
            .sb-collapse-body.sb-hidden {
                max-height: 0; opacity: 0;
            }
            .sb-item {
                display: flex; align-items: center; gap: 0.65rem;
                padding: 0.45rem 0.75rem; border-radius: 10px;
                font-size: 0.82rem; font-weight: 550; color: #1e293b;
                cursor: pointer; transition: all 0.2s ease;
                text-decoration: none; margin-bottom: 1px;
                border: 1.5px solid transparent; position: relative;
            }
            .sb-item:hover {
                background: #ffffff; color: #1e3a8a;
                border-color: #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
                transform: translateX(2px);
            }
            .sb-item.active {
                background: #ffffff; color: #1e3a8a; font-weight: 600;
                border-color: #bfdbfe;
                box-shadow: 0 2px 8px rgba(30,58,138,0.08), inset 0 0 0 1px rgba(59,130,246,0.05);
            }
            .sb-item.active::before {
                content: ''; position: absolute; left: -0.65rem; top: 50%;
                transform: translateY(-50%); width: 3px; height: 60%;
                background: linear-gradient(180deg, #1e3a8a, #3b82f6);
                border-radius: 0 3px 3px 0;
            }
            .sb-item svg {
                flex-shrink: 0; width: 16px; height: 16px;
                opacity: 0.7; transition: opacity 0.15s;
            }
            .sb-item:hover svg, .sb-item.active svg { opacity: 1; }
            .sb-badge {
                margin-left: auto; font-size: 0.56rem; font-weight: 700;
                background: #e0e7ff; color: #3730a3;
                padding: 2px 7px; border-radius: 6px;
                letter-spacing: 0.02em; border: 1px solid rgba(99,102,241,0.1);
            }
            .sb-divider {
                height: 1px;
                background: linear-gradient(90deg, transparent, #e2e8f0 30%, #e2e8f0 70%, transparent);
                margin: 0.15rem 0.85rem;
            }
        `;
        document.head.appendChild(style);
    }

    const active = (container.getAttribute('data-active') || '').toLowerCase();

    function isActive(id) {
        return active === id ? ' active' : '';
    }

    // Build href with clientId if available (URL first, then localStorage fallback)
    const urlParams = new URLSearchParams(window.location.search);
    let clientId = urlParams.get('clientId') || '';
    if (!clientId) {
        try {
            const sc = JSON.parse(localStorage.getItem('selectedClient') || '{}');
            if (sc.id) clientId = sc.id;
        } catch(_) {}
    }
    function buildHref(page) {
        return clientId ? `${page}?clientId=${clientId}` : page;
    }

    // ═══ SECTION 1: Main ═══
    const mainItems = [
        {
            id: 'home',
            label: 'Home',
            href: 'clients.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
        },
        {
            id: 'clients',
            label: 'Clients',
            href: 'client-list.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            badgeId: 'sb-main-client-count'
        }
    ];

    // ═══ SECTION 2: Services (all 6) ═══
    const serviceItems = [
        {
            id: 'gst-filing',
            label: 'GST Filing',
            href: buildHref('service-gst-refund-webview.html'),
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
        },
        {
            id: 'data-entry',
            label: 'Data Entry',
            href: buildHref('service-data-entry.html'),
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
        },
        {
            id: 'ca-certificates',
            label: 'CA Certificates',
            href: buildHref('ca-certificates.html'),
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>'
        },
        {
            id: 'financial-statements',
            label: 'Financial Statements',
            href: buildHref('service-financial-statements.html'),
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>'
        },
        {
            id: 'financial-instruments',
            label: 'Financial Instruments',
            href: buildHref('service-financial-instruments.html'),
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>'
        },
        {
            id: 'statutory-reporting',
            label: 'Statutory Reporting',
            href: buildHref('service-statutory-reporting.html'),
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
        }
    ];

    // ═══ Render helper ═══
    const chevronSvg = '<svg class="sb-collapse-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>';

    function renderSection(label, items, iconSvg, opts = {}) {
        const collapsible = opts.collapsible || false;
        const sectionId = opts.sectionId || '';

        let html = '<div class="sb-section">';
        if (collapsible && sectionId) {
            html += `<div class="sb-section-label sb-collapsible" style="display:flex;align-items:center;gap:0.35rem;" onclick="window.__sbToggle('${sectionId}')">`;  
            html += iconSvg;
            html += label;
            html += `<span class="sb-badge" style="margin-left:auto;font-size:0.5rem">${items.length}</span>`;
            html += `${chevronSvg.replace('sb-collapse-arrow', 'sb-collapse-arrow" id="' + sectionId + '-arrow')}`;
            html += '</div>';
            html += `<div class="sb-collapse-body" id="${sectionId}-body">`;
        } else {
            html += '<div class="sb-section-label" style="display:flex;align-items:center;gap:0.35rem;">';
            html += iconSvg;
            html += label;
            html += '</div>';
        }

        items.forEach(item => {
            const activeClass = isActive(item.id);
            const onclickAttr = item.onclick ? ` onclick="${item.onclick}"` : '';
            const hrefAttr = item.onclick ? '#' : item.href;

            let badgeHtml = '';
            if (item.badge) {
                badgeHtml = `<span class="sb-badge" style="${item.badgeStyle || ''}">${item.badge}</span>`;
            }
            if (item.badgeId) {
                badgeHtml = `<span class="sb-badge" id="${item.badgeId}"></span>`;
            }

            html += `<a href="${hrefAttr}" class="sb-item${activeClass}"${onclickAttr}>
                ${item.icon}
                ${item.label}
                ${badgeHtml}
            </a>`;
        });

        if (collapsible && sectionId) {
            html += '</div>'; // close sb-collapse-body
        }
        html += '</div>';
        return html;
    }

    const dotIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
    const svcIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';

    // ISS-016: Role-based sidebar filtering (TC-026, TC-027, TC-029, TC-030)
    let accountType = 'ca_firm';
    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        accountType = u.account_type || 'ca_firm';
    } catch(_) {}

    // Corporate users: remove "Clients" link (they auto-scope to their own company)
    const filteredMainItems = accountType === 'corporate'
        ? mainItems.filter(i => i.id !== 'clients')
        : mainItems;

    // Check if any service is active
    const serviceIds = serviceItems.map(s => s.id);
    const isServiceActive = serviceIds.includes(active);
    const activeService = serviceItems.find(s => s.id === active);
    const otherServices = serviceItems.filter(s => s.id !== active);

    let html = '';
    html += renderSection('Main', filteredMainItems, dotIcon);
    html += '<div class="sb-divider"></div>';

    // Show active service always visible, rest inside collapsible
    if (activeService) {
        // Active service pinned directly (no header)
        html += '<div class="sb-section">';
        html += `<a href="${activeService.href}" class="sb-item active">
            ${activeService.icon}
            ${activeService.label}
        </a>`;
        html += '</div>';
        html += renderSection('Other Services', otherServices, svcIcon, { collapsible: true, sectionId: 'sb-svc' });
    } else {
        html += renderSection('Services', serviceItems, svcIcon, { collapsible: true, sectionId: 'sb-svc' });
    }
    html += '<div class="sb-divider"></div>';

    container.innerHTML = html;

    // ═══ Collapse/Expand toggle logic ═══
    const COLLAPSE_KEY = 'sb_svc_collapsed';
    window.__sbToggle = function(sectionId) {
        const body = document.getElementById(sectionId + '-body');
        const arrow = document.getElementById(sectionId + '-arrow');
        if (!body) return;
        const isHidden = body.classList.contains('sb-hidden');
        if (isHidden) {
            body.classList.remove('sb-hidden');
            if (arrow) arrow.classList.remove('sb-collapsed');
            sessionStorage.removeItem(COLLAPSE_KEY);
        } else {
            body.classList.add('sb-hidden');
            if (arrow) arrow.classList.add('sb-collapsed');
            sessionStorage.setItem(COLLAPSE_KEY, '1');
        }
    };

    // Apply default collapse state — always start collapsed
    {
        const body = document.getElementById('sb-svc-body');
        const arrow = document.getElementById('sb-svc-arrow');
        if (body) body.classList.add('sb-hidden');
        if (arrow) arrow.classList.add('sb-collapsed');
    }

    // Sync client count badge if on clients page
    const mainCountBadge = document.getElementById('sb-main-client-count');
    if (mainCountBadge) {
        const originalBadge = document.getElementById('sb-client-count');
        if (originalBadge) {
            const observer = new MutationObserver(() => {
                mainCountBadge.textContent = originalBadge.textContent;
            });
            observer.observe(originalBadge, { childList: true, characterData: true, subtree: true });
            mainCountBadge.textContent = originalBadge.textContent;
        }
    }
})();
