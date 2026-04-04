/**
 * app-sidebar.js — Shared Sidebar "Main" Navigation Component
 *
 * ISS-022/041: Reorganized with consistent grouping:
 *   - Dashboard: Home, Clients
 *   - Services: Certificates, Agreements
 *   - Tools: GSTIN Validator, Rule 42 ITC, GST Refund Calc
 *   - System: Integrations
 *
 * Usage:
 *   1. Add <div id="app-sidebar-main" data-active="home|clients|certificates|agreements|integrations|tools"></div>
 *      as the FIRST child inside your page's <aside> sidebar element.
 *   2. Include this script: <script src="app-sidebar.js"></script>
 *
 * The "data-active" attribute highlights the current page in the main nav.
 */
(function () {
    const container = document.getElementById('app-sidebar-main');
    if (!container) return;

    const active = (container.getAttribute('data-active') || '').toLowerCase();

    function isActive(id) {
        return active === id ? ' active' : '';
    }

    // ═══ SECTION 1: Dashboard ═══
    const dashboardItems = [
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

    // ═══ SECTION 2: Services ═══
    const serviceItems = [
        {
            id: 'certificates',
            label: 'Certificates',
            href: 'ca-certificates.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>'
        },
        {
            id: 'agreements',
            label: 'Agreements',
            href: 'agreements.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
        }
    ];

    // ═══ SECTION 3: Quick Tools ═══
    const toolItems = [
        {
            id: 'gstin-validator',
            label: 'GSTIN Validator',
            href: 'tool-gstin-validator.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'
        },
        {
            id: 'rule42',
            label: 'Rule 42 ITC',
            href: 'tool-rule42-itc.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>'
        }
    ];

    // ═══ SECTION 4: System ═══
    const systemItems = [
        {
            id: 'integrations',
            label: 'Integrations',
            href: 'integrations.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>'
        }
    ];

    // ═══ Render helper ═══
    function renderSection(label, items, iconSvg) {
        let html = '<div class="sb-section">';
        html += '<div class="sb-section-label" style="display:flex;align-items:center;gap:0.35rem;">';
        html += iconSvg;
        html += label;
        html += '</div>';

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

        html += '</div>';
        return html;
    }

    const dotIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
    const svcIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
    const toolIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
    const sysIcon = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06"/></svg>';

    // ISS-016: Role-based sidebar filtering (TC-026, TC-027, TC-029, TC-030)
    let accountType = 'ca_firm';
    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        accountType = u.account_type || 'ca_firm';
    } catch(_) {}

    // Corporate users: remove "Clients" link (they auto-scope to their own company)
    const filteredDashItems = accountType === 'corporate'
        ? dashboardItems.filter(i => i.id !== 'clients')
        : dashboardItems;

    let html = '';
    html += renderSection('Dashboard', filteredDashItems, dotIcon);
    html += '<div class="sb-divider"></div>';
    html += renderSection('Services', serviceItems, svcIcon);
    html += '<div class="sb-divider"></div>';
    html += renderSection('Quick Tools', toolItems, toolIcon);
    html += '<div class="sb-divider"></div>';
    html += renderSection('System', systemItems, sysIcon);
    html += '<div class="sb-divider"></div>';

    container.innerHTML = html;

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
