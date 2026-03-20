/**
 * app-sidebar.js — Shared Sidebar "Main" Navigation Component
 *
 * This injects a consistent "Main" navigation section at the top of every page's sidebar.
 * Users always know where they are and can quickly jump to any top-level section.
 *
 * Usage:
 *   1. Add <div id="app-sidebar-main" data-active="home|clients|certificates|agreements|ai-gpt|tools|services|data-entry"></div>
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

    // Build the main navigation items
    const mainNavItems = [
        {
            id: 'home',
            label: 'Home',
            href: 'clients.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
        },
        {
            id: 'clients',
            label: 'Clients',
            href: 'clients.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            onclick: "event.preventDefault();if(typeof window.toggleClientListPanel==='function')window.toggleClientListPanel();else window.location.href='clients.html';",
            badgeId: 'sb-main-client-count'
        },
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

    let html = '<div class="sb-section">';
    html += '<div class="sb-section-label" style="display:flex;align-items:center;gap:0.35rem;">';
    html += '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
    html += 'Main';
    html += '</div>';

    mainNavItems.forEach(item => {
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
    html += '<div class="sb-divider"></div>';

    container.innerHTML = html;

    // Sync client count badge if on clients page
    const mainCountBadge = document.getElementById('sb-main-client-count');
    if (mainCountBadge) {
        // Watch for changes on the original badge
        const originalBadge = document.getElementById('sb-client-count');
        if (originalBadge) {
            const observer = new MutationObserver(() => {
                mainCountBadge.textContent = originalBadge.textContent;
            });
            observer.observe(originalBadge, { childList: true, characterData: true, subtree: true });
            // Initial sync
            mainCountBadge.textContent = originalBadge.textContent;
        }
    }
})();
