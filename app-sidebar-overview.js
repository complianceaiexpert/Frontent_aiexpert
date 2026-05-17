/**
 * app-sidebar-overview.js — Shared Sidebar Component for Overview Pages
 *
 * This component renders a sidebar with links to all service overview pages.
 *
 * Usage:
 *   1. Add <div id="app-sidebar-overview" data-active="gst|data-entry|financial-statements|financial-instruments|statutory-reporting"></div>
 *      inside your page's <aside> sidebar element.
 *   2. Include this script: <script src="app-sidebar-overview.js"></script>
 */
(function () {
    const container = document.getElementById('app-sidebar-overview');
    if (!container) return;

    // Inject CSS if not present
    if (!document.getElementById('app-sidebar-overview-css')) {
        const style = document.createElement('style');
        style.id = 'app-sidebar-overview-css';
        style.textContent = `
            .sb-section { padding: 0.25rem 0.65rem; }
            .sb-section-label {
                font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
                letter-spacing: 0.1em; color: #94a3b8;
                padding: 0.25rem 0.75rem 0.15rem; margin-bottom: 0.05rem;
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

    const items = [
        {
            id: 'gst',
            label: 'GST Filing',
            href: 'service-gst-overview.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
        },
        {
            id: 'data-entry',
            label: 'Data Entry',
            href: 'service-data-entry-overview.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
        },
        {
            id: 'financial-statements',
            label: 'Financial Statements',
            href: 'service-financial-statements-overview.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>'
        },
        {
            id: 'financial-instruments',
            label: 'Financial Instruments',
            href: 'service-financial-instruments-overview.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>'
        },
        {
            id: 'statutory-reporting',
            label: 'Statutory Reporting',
            href: 'service-statutory-reporting-overview.html',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
        }
    ];

    let html = '';
    html += '<div class="sb-section">';
    html += '<div class="sb-section-label">Services</div>';
    items.forEach(item => {
        html += `<a href="${item.href}" class="sb-item${isActive(item.id)}">
            ${item.icon}
            ${item.label}
        </a>`;
    });
    html += '</div>';

    html += '<div class="sb-divider"></div>';
    html += '<div class="sb-section">';
    html += `<a href="Home.html" class="sb-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Back to Dashboard
    </a>`;
    html += '</div>';

    container.innerHTML = html;
})();
