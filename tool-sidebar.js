/**
 * GST Tool Sidebar — Shared sidebar component for all GST tool pages
 * Usage: Include this script and call renderToolSidebar('tool-id') 
 */

const GST_TOOLS = [
    {
        section: 'Reconciliation', items: [
            { id: 'ims-vs-pr', icon: '⚖️', name: 'IMS vs PR', page: 'tool-ims-vs-pr.html' },
            { id: 'gstr2b-vs-pr', icon: '🔄', name: 'GSTR-2B vs PR', page: 'tool-gstr2b-vs-pr.html' },
            { id: 'gstr2b-vs-3b', icon: '📊', name: 'GSTR-2B vs 3B', page: 'tool-gstr2b-vs-3b.html' },
            { id: 'einv-vs-sr', icon: '🧾', name: 'E-Inv vs SR', page: 'tool-einv-vs-sr.html' },
            { id: 'gstr1-vs-einv', icon: '📑', name: 'GSTR-1 vs E-Inv', page: 'tool-gstr1-vs-einv.html' },
            { id: 'gstr1-vs-3b', icon: '📋', name: 'GSTR-1 vs 3B', page: 'tool-gstr1-vs-3b.html' },
        ]
    },
    {
        section: 'Returns & Filing', items: [
            { id: 'statement3', icon: '📝', name: 'Statement 3', page: 'tool-statement3.html' },
            { id: 'annexure-b', icon: '📎', name: 'Annexure B', page: 'tool-annexure-b.html' },
            { id: 'arn-status', icon: '🔔', name: 'ARN Status', page: 'tool-arn-status.html', badge: 'SOON', badgeType: 'orange' },
            { id: 'gstr9-json', icon: '📦', name: 'GSTR-9 JSON', page: 'tool-gstr9-json.html', badge: 'SOON', badgeType: 'orange' },
        ]
    },
    {
        section: 'Utilities', items: [
            { id: 'document-reader', icon: '📖', name: 'Document Reader', page: 'tool-document-reader.html' },
            { id: 'gstin-validator', icon: '🔍', name: 'GSTIN Validator', page: 'tool-gstin-validator.html' },
            { id: 'ai-block-credit', icon: '🚫', name: 'AI Block Credit', page: 'tool-ai-block-credit.html' },
            { id: 'hsn-locator', icon: '🔎', name: 'HSN Locator', page: 'tool-hsn-locator.html' },
            { id: 'hsn-plotter', icon: '📈', name: 'HSN Plotter', page: 'tool-hsn-plotter.html' },
        ]
    }
];

function renderToolSidebar(activeToolId) {
    const params = new URLSearchParams(window.location.search);
    const qStr = params.toString();
    const sidebar = document.getElementById('tool-sidebar');
    if (!sidebar) return;

    // ═══ Common Main Navigation (matches app-sidebar.js) ═══
    const mainNavItems = [
        { id: 'home', label: 'Home', href: 'clients.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
        { id: 'clients', label: 'Clients', href: 'clients.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
        { id: 'ai-agents', label: 'AI Agents', href: 'ai-agents.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 18h.01"/><path d="M10 18h.01"/></svg>', badge: 'NEW', badgeStyle: 'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:0.55rem;padding:1px 5px;' }
    ];

    let html = '<div class="sb-section">';
    html += '<div class="sb-section-label" style="display:flex;align-items:center;gap:0.35rem;">';
    html += '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
    html += 'Main';
    html += '</div>';

    mainNavItems.forEach(item => {
        const activeClass = item.id === 'tools' ? ' active' : '';
        let badgeHtml = '';
        if (item.badge) {
            badgeHtml = `<span class="sb-badge" style="${item.badgeStyle || ''}">${item.badge}</span>`;
        }
        html += `<a href="${item.href}" class="sb-item${activeClass}">
            ${item.icon}
            ${item.label}
            ${badgeHtml}
        </a>`;
    });

    html += '</div>';
    html += '<div class="sb-divider" style="height:1px;background:#f1f5f9;margin:0.4rem 1rem"></div>';

    // ═══ Tool-Specific Sections ═══
    GST_TOOLS.forEach(section => {
        html += `<div class="tsb-section"><div class="tsb-label">${section.section}</div>`;
        section.items.forEach(tool => {
            const isActive = tool.id === activeToolId;
            const badgeHtml = tool.badge
                ? `<span class="tsb-badge tsb-badge-${tool.badgeType || 'blue'}">${tool.badge}</span>`
                : '';
            const href = `${tool.page}${qStr ? '?' + qStr : ''}`;
            html += `<a href="${href}" class="tsb-item${isActive ? ' active' : ''}">${tool.icon} ${tool.name}${badgeHtml}</a>`;
        });
        html += '</div><div class="tsb-divider"></div>';
    });

    // Back link
    html += `<a href="javascript:goBackToWebView()" class="tsb-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        Back to GST Workspace
    </a>`;

    sidebar.innerHTML = html;
}

function goBackToWebView() {
    const params = new URLSearchParams(window.location.search);
    params.set('section', 'tools');
    window.location.href = 'service-gst-refund-webview.html?' + params.toString();
}

/**
 * Render a "📁 Saved to Drive" badge for a job card.
 * Usage in renderJobs: ${renderDriveBadge(job)}
 * Returns empty string if job wasn't saved to drive.
 */
function renderDriveBadge(job) {
    if (!job.drive_folder_name) return '';
    return `<span class="tool-drive-badge">📁 ${job.drive_folder_name}</span>`;
}
