/**
 * app-client-nav.js — Shared Client-Level Navigation Component
 *
 * Injects a consistent "Client" navigation section at the top of every
 * service page's sidebar. This gives the user a quick way to jump between
 * client-level views (Overview, Services, Drive) and major services
 * (GST Refund, Data Entry) regardless of which
 * service page they are currently on.
 *
 * Usage:
 *   1. Add <div id="app-client-nav" data-active="overview|services|drive|gst-refund|data-entry|income-tax|audit"></div>
 *      as the FIRST child inside your page's <aside> sidebar element.
 *   2. Include this script: <script src="app-client-nav.js"></script>
 *
 * The "data-active" attribute highlights the current view in the nav.
 * The clientId is automatically read from the URL query parameter.
 */
(function () {
    const container = document.getElementById('app-client-nav');
    if (!container) return;

    const active = (container.getAttribute('data-active') || '').toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('clientId') || '';

    function isActive(id) {
        return active === id ? ' active' : '';
    }

    function buildHref(page) {
        return clientId ? `${page}?clientId=${clientId}` : page;
    }

    // ═══ Client-Level Navigation Items ═══
    const clientNavItems = [
        {
            id: 'overview',
            label: 'Overview',
            href: buildHref('services-dashboard.html'),
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
        },
        {
            id: 'drive',
            label: 'Drive',
            href: buildHref('drive.html'),
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
        }
    ];

    // ═══ Service name → sidebar config mapping ═══
    // Keys are LOWERCASE versions of service.name from DB
    const SERVICE_MAP = {
        'gst refund':      { id: 'gst-refund',      label: 'GST Refund',      href: buildHref('service-gst-refund-webview.html'), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
        'gst filing':      { id: 'gst-refund',      label: 'GST Filing',      href: buildHref('service-gst-refund-webview.html'), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
        'data entry':      { id: 'data-entry',      label: 'Data Entry',      href: buildHref('service-data-entry.html'),          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' },
        'ca certificates': { id: 'ca-certificates', label: 'CA Certificates', href: buildHref('ca-certificates.html'),         icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h4"/></svg>' },
        'income tax':      { id: 'income-tax',      label: 'Income Tax',      href: buildHref('service-income-tax.html'),           icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
        'audit':           { id: 'audit',           label: 'Audit',           href: buildHref('service-audit.html'),                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
        'taxation':        { id: 'taxation',        label: 'Taxation',        href: buildHref('service-taxation.html'),             icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
        'payroll':         { id: 'payroll',         label: 'Payroll',         href: buildHref('service-payroll.html'),              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' },
        'company law':     { id: 'company-law',     label: 'Company Law',     href: buildHref('service-company-law.html'),          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h4"/></svg>' },
        'accounting':      { id: 'accounting',      label: 'Accounting',      href: buildHref('service-data-entry.html'),           icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
        'compliance':      { id: 'compliance',      label: 'Compliance',      href: buildHref('service-compliance.html'),           icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
        'bookkeeping':     { id: 'bookkeeping',     label: 'Bookkeeping',     href: buildHref('service-data-entry.html'),           icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
        'invoice':         { id: 'invoice',         label: 'Invoice',         href: buildHref('service-invoice.html'),              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
    };

    // ═══ Build Client Header (mini card) ═══
    let html = '';

    // Client card placeholder — will be populated by page JS if needed
    html += '<div class="cn-client-card" id="cn-client-card" style="display:none">';
    html += '  <div class="cn-avatar" id="cn-avatar">C</div>';
    html += '  <div class="cn-client-info">';
    html += '    <div class="cn-client-name" id="cn-client-name">Client</div>';
    html += '    <div class="cn-client-type" id="cn-client-type">Loading…</div>';
    html += '  </div>';
    html += '</div>';

    // ═══ Client Level section ═══
    html += '<div class="cn-section">';
    html += '<div class="cn-section-label">';
    html += '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
    html += 'Client';
    html += '</div>';

    clientNavItems.forEach(item => {
        const activeClass = isActive(item.id);
        html += `<a href="${item.href}" class="cn-item${activeClass}">
            ${item.icon}
            ${item.label}
        </a>`;
    });

    html += '</div>';

    // ═══ Services section — now hardcoded with the 3 active services ═══
    // Beta feedback: show services directly instead of loading from client.services
    const HARDCODED_SERVICES = [
        { key: 'gst filing', id: 'gst-refund' },
        { key: 'ca certificates', id: 'ca-certificates' },
        { key: 'data entry', id: 'data-entry' }
    ];

    html += '<div id="cn-services-section">';
    html += '<div class="cn-divider"></div>';
    html += '<div class="cn-section">';
    html += '<div class="cn-section-label">';
    html += '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
    html += 'Services';
    html += '</div>';
    // Render hardcoded service links directly
    let svcLinksHtml = '';
    HARDCODED_SERVICES.forEach(svc => {
        const mapped = SERVICE_MAP[svc.key];
        if (mapped) {
            const activeClass = isActive(svc.id);
            svcLinksHtml += `<a href="${mapped.href}" class="cn-item${activeClass}">
                ${mapped.icon}
                ${mapped.label}
            </a>`;
        }
    });
    html += svcLinksHtml;
    html += '<div id="cn-service-links"></div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="cn-divider"></div>';

    container.innerHTML = html;

    // ═══ Load client info + services if clientId is present ═══
    if (clientId) {
        const tryLoadClient = () => {
            if (typeof authFetch === 'function') {
                // Load client details
                authFetch(`/clients/${clientId}`).then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Not ok');
                }).then(client => {
                    const card = document.getElementById('cn-client-card');
                    const avatar = document.getElementById('cn-avatar');
                    const name = document.getElementById('cn-client-name');
                    const type = document.getElementById('cn-client-type');
                    if (card) card.style.display = 'flex';
                    if (avatar) avatar.textContent = (client.name || 'C').charAt(0).toUpperCase();
                    if (name) name.textContent = client.name || 'Client';
                    const gstin = client.gstins && client.gstins.length > 0 ? client.gstins[0] : (client.pan || '');
                    if (type) {
                        type.textContent = gstin ? gstin : (client.entity_type || 'Client');
                    }

                    // Also update the topbar client context badge
                    if (typeof window.__updateTopbarClientCtx === 'function') {
                        window.__updateTopbarClientCtx(client.name || 'Client');
                    }


                    /* [COMMENTED OUT] Dynamic services from client.services — now hardcoded above
                    // Render services from client.services array
                    const services = client.services || [];
                    const linksEl = document.getElementById('cn-service-links');
                    const sectionEl = document.getElementById('cn-services-section');

                    if (services.length > 0 && linksEl && sectionEl) {
                        let svcHtml = '';
                        services.forEach(svc => {
                            const key = (svc.name || '').toLowerCase().trim();
                            const mapped = SERVICE_MAP[key];
                            if (mapped) {
                                const activeClass = isActive(mapped.id);
                                svcHtml += `<a href="${mapped.href}" class="cn-item${activeClass}">
                                    ${mapped.icon}
                                    ${mapped.label}
                                </a>`;
                            } else {
                                // Generic fallback for unmapped services
                                svcHtml += `<a href="#" class="cn-item">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                                    ${svc.name}
                                </a>`;
                            }
                        });
                        linksEl.innerHTML = svcHtml;
                        sectionEl.style.display = 'block';
                    }
                    */
                }).catch(() => { });
            } else {
                setTimeout(tryLoadClient, 200);
            }
        };
        tryLoadClient();
    }

    // ═══ Inject Styles ═══
    if (!document.getElementById('cn-styles')) {
        const style = document.createElement('style');
        style.id = 'cn-styles';
        style.textContent = `
            .cn-client-card {
                padding: 0.9rem 1rem;
                border-bottom: 1px solid #f1f5f9;
                display: flex;
                align-items: center;
                gap: 0.65rem;
            }
            .cn-avatar {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                background: linear-gradient(135deg, #1e3a8a, #3b82f6);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                font-weight: 800;
                font-family: 'Outfit', sans-serif;
                color: #fff;
                flex-shrink: 0;
            }
            .cn-client-info { flex:1; min-width:0; }
            .cn-client-name {
                font-size: 0.82rem;
                font-weight: 700;
                color: #111827;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .cn-client-type {
                font-size: 0.62rem;
                color: #9ca3af;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .cn-section { padding: 0.5rem 0.75rem; }
            .cn-section-label {
                font-size: 0.6rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: #9ca3af;
                padding: 0.4rem 0.75rem;
                margin-bottom: 0.1rem;
                display: flex;
                align-items: center;
                gap: 0.35rem;
            }
            .cn-item {
                display: flex;
                align-items: center;
                gap: 0.6rem;
                padding: 0.45rem 0.75rem;
                border-radius: 8px;
                font-size: 0.78rem;
                font-weight: 500;
                color: #4b5563;
                cursor: pointer;
                transition: all .2s;
                text-decoration: none;
                margin-bottom: 1px;
            }
            .cn-item:hover {
                background: #f1f5f9;
                color: #1e3a8a;
            }
            .cn-item.active {
                background: #eff6ff;
                color: #1e3a8a;
                font-weight: 600;
            }
            .cn-item svg {
                flex-shrink: 0;
                width: 15px;
                height: 15px;
            }
            .cn-divider {
                height: 1px;
                background: #f1f5f9;
                margin: 0.3rem 0.75rem;
            }
        `;
        document.head.appendChild(style);
    }
})();
