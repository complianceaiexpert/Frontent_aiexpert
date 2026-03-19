/**
 * tool-jobs.js — Shared "Recent Jobs" module for all GST tool pages
 *
 * Usage:
 *   1. Include this file after api_config.js, session-manager.js, and tool-sidebar.js
 *   2. Call: initToolJobs({ jobType, jobLabel, filePrefix })
 *
 * Config options:
 *   jobType    — string or array of strings, e.g. 'ims_vs_pr' or ['statement3', 'statement3_firc']
 *   jobLabel   — display name, e.g. 'IMS vs PR Reconciliation'
 *   filePrefix — download file prefix, e.g. 'IMS_vs_PR_Report'
 */

let _tjPollingInterval = null;
let _tjConfig = {};

function initToolJobs(config) {
    _tjConfig = config;
    _checkClientContext();
    _loadToolJobs();
}

/**
 * Show a warning banner + disable generate buttons if no clientId in URL.
 */
function _checkClientContext() {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('clientId');
    if (clientId) return; // All good

    // Inject warning banner at top of .tool-main-inner
    const container = document.querySelector('.tool-main-inner');
    if (!container) return;

    const banner = document.createElement('div');
    banner.id = 'no-client-banner';
    banner.style.cssText = 'background:#FEF3C7;border:1.5px solid #F59E0B;border-radius:10px;padding:0.75rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:0.6rem;';
    banner.innerHTML = `
        <span style="font-size:1.3rem">⚠️</span>
        <div>
            <div style="font-weight:700;font-size:0.85rem;color:#92400E">No client selected</div>
            <div style="font-size:0.75rem;color:#78350F">Navigate to this tool from a <strong>client's GST workspace</strong> to generate reports. Reports are saved per client.</div>
        </div>
    `;
    container.insertBefore(banner, container.firstChild);

    // Disable all primary action buttons
    document.querySelectorAll('.tbtn-primary').forEach(btn => {
        btn.disabled = true;
        btn.title = 'Select a client first';
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });

    // Prevent file-upload handlers from re-enabling buttons
    window._noClientMode = true;
    const observer = new MutationObserver(() => {
        if (!window._noClientMode) return;
        document.querySelectorAll('.tbtn-primary').forEach(btn => {
            if (!btn.disabled) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });
    });
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['disabled'] });
}

function _timeAgo(dateStr) {
    const now = new Date();
    // Backend stores UTC but without 'Z' suffix — append it so JS parses as UTC
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay} days ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function _loadToolJobs() {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('clientId');

    try {
        const url = clientId
            ? `/jobs/?skip=0&limit=50&client_id=${clientId}`
            : `/jobs/?skip=0&limit=50`;
        const res = await authFetch(url);
        if (res && res.ok) {
            const jobs = await res.json();
            const types = Array.isArray(_tjConfig.jobType)
                ? _tjConfig.jobType
                : [_tjConfig.jobType];
            const taskJobs = jobs.filter(j => types.includes(j.job_type));

            _renderToolJobs(taskJobs);

            const hasInProgress = taskJobs.some(j => j.status === 'QUEUED' || j.status === 'PROCESSING');
            if (hasInProgress && !_tjPollingInterval) {
                _tjPollingInterval = setInterval(_loadToolJobs, 5000);
            } else if (!hasInProgress && _tjPollingInterval) {
                clearInterval(_tjPollingInterval);
                _tjPollingInterval = null;
            }
        }
    } catch (e) {
        console.error('Error loading jobs:', e);
    }
}

// Alias for external use
function loadJobs() { _loadToolJobs(); }

function _renderToolJobs(jobs) {
    const container = document.getElementById('recent-jobs-container');
    const list = document.getElementById('jobs-list');
    if (!container || !list) return;

    // Always show the container — even with "no jobs yet" message
    container.style.display = 'block';

    if (!jobs || jobs.length === 0) {
        list.innerHTML = `
            <div style="text-align:center;padding:2.5rem 1rem;color:#9ca3af">
                <div style="font-size:2.5rem;margin-bottom:0.75rem;opacity:0.4">📂</div>
                <p style="font-size:0.82rem;margin:0">No jobs yet. Start a task above to see results here.</p>
            </div>`;
        // Update count badge
        const countEl = document.getElementById('jobs-count');
        if (countEl) countEl.textContent = '0';
        return;
    }

    // Update the count badge
    const countEl = document.getElementById('jobs-count');
    if (countEl) countEl.textContent = jobs.length;

    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('clientId');

    list.innerHTML = jobs.map(job => {
        const relTime = _timeAgo(job.created_at);
        const fullDate = new Date(job.created_at.endsWith('Z') ? job.created_at : job.created_at + 'Z').toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const statusClass = job.status.toLowerCase();
        const statusIcon = {
            'QUEUED': '⏳', 'PROCESSING': '⚙️', 'COMPLETED': '✅', 'FAILED': '❌'
        }[job.status] || '📄';

        const hasDrive = !!job.drive_folder_name;
        const driveTag = hasDrive
            ? `<span class="job-drive-tag">📁 Saved to ${job.drive_folder_name}</span>`
            : '';

        // Job label — use the configured label or derive from job_type
        const label = _tjConfig.jobLabel || job.job_type.toUpperCase().replaceAll('_', ' ');

        // Input files
        const files = (job.input_files || []).map(f => {
            const name = typeof f === 'string' ? f.split('/').pop() : 'file';
            return `<span class="job-file-tag">📄 ${name}</span>`;
        }).join(' ');

        // Drive view button
        const driveBtn = hasDrive && clientId
            ? `<a href="drive.html?clientId=${clientId}" class="job-view-drive">📁 Drive</a>`
            : '';

        // Error message
        let errorMsg = '';
        if (job.status === 'FAILED' && job.events && job.events.length) {
            const msg = job.events[job.events.length - 1].message || '';
            errorMsg = `<span style="font-size:0.65rem;color:#dc2626;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${msg}">❌ ${msg.substring(0, 50)}</span>`;
        }

        return `
            <div class="job-row${hasDrive ? ' has-drive' : ''}">
                <div class="job-icon">${statusIcon}</div>
                <div class="job-details">
                    <div class="job-name">${label} ${driveTag}</div>
                    <div class="job-meta">
                        <span class="job-time" title="${fullDate}">🕐 ${relTime}</span>
                        <span class="job-meta-sep">•</span>
                        <span>ID: ${job.id.substring(0, 8)}</span>
                        ${files ? `<span class="job-meta-sep">•</span> ${files}` : ''}
                    </div>
                </div>
                <div class="job-actions">
                    <span class="job-status ${statusClass}">${job.status}</span>
                    ${driveBtn}
                    ${job.status === 'COMPLETED'
                ? `<button class="job-download" onclick="downloadJobFile('${job.id}')">⬇ Download</button>`
                : errorMsg}
                </div>
            </div>
        `;
    }).join('');
}

async function downloadJobFile(jobId) {
    try {
        const response = await authFetch(`/jobs/${jobId}/download`);
        if (!response || !response.ok) { alert('Download failed'); return; }

        // Try to extract filename from Content-Disposition header
        const cd = response.headers.get('Content-Disposition');
        let filename = `${_tjConfig.filePrefix || 'Report'}_${jobId.substring(0, 8)}.xlsx`;
        if (cd) {
            const m = cd.match(/filename="?(.+)"?/);
            if (m && m[1]) filename = m[1];
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (e) {
        console.error('Download error:', e);
        alert('Error downloading file');
    }
}
