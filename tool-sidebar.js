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
        section: 'Returns & Utilities', items: [
            { id: 'statement3', icon: '📝', name: 'Statement 3', page: 'tool-statement3.html' },
            { id: 'annexure-b', icon: '📎', name: 'Annexure B', page: 'tool-annexure-b.html' },
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

    // ═══ Inject shared app-sidebar-main ═══
    let html = '<div id="app-sidebar-main" data-active="gst-filing"></div>';

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
        html += '</div>';
    });

    // Back link
    html += `<a href="javascript:goBackToWebView()" class="tsb-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        Back to GST Workspace
    </a>`;

    sidebar.innerHTML = html;

    // ═══ Load shared sidebar script ═══
    const script = document.createElement('script');
    script.src = 'app-sidebar.js';
    sidebar.appendChild(script);
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
