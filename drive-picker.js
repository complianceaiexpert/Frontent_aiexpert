/**
 * drive-picker.js — Reusable Drive File Picker Component
 * 
 * Usage:
 *   1. Include this script on any page: <script src="drive-picker.js"></script>
 *   2. Call openDrivePicker({ clientId, accept, onSelect }) to open the picker modal.
 *   3. The onSelect callback receives the selected File object (fetched from Drive).
 *
 * Auto-injects the modal HTML + CSS on first call.
 */

(function () {
    let _injected = false;
    let _onSelect = null;
    let _accept = [];
    let _clientId = null;
    let _pickerFolders = [];

    // ── CSS ──
    const PICKER_CSS = `
    .dp-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,.4);backdrop-filter:blur(3px);z-index:9999;align-items:center;justify-content:center;padding:1rem}
    .dp-overlay.active{display:flex;animation:dpFadeIn .2s ease-out}
    @keyframes dpFadeIn{from{opacity:0}to{opacity:1}}
    .dp-modal{background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 25px 60px -12px rgba(0,0,0,.25);overflow:hidden}
    .dp-header{padding:1.25rem 1.5rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between}
    .dp-header h2{font-family:'Outfit',sans-serif;font-size:1.05rem;font-weight:800;color:#111827;margin:0;display:flex;align-items:center;gap:0.5rem}
    .dp-close{background:none;border:none;font-size:1.3rem;cursor:pointer;color:#94a3b8;padding:0.25rem}
    .dp-close:hover{color:#374151}
    .dp-body{flex:1;overflow-y:auto;padding:0}
    .dp-section-title{font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;padding:0.75rem 1.5rem 0.4rem;margin:0;background:#f9fafb;border-bottom:1px solid #f1f5f9;position:sticky;top:0;z-index:1}
    .dp-folder-item{display:flex;align-items:center;gap:0.75rem;padding:0.7rem 1.5rem;cursor:pointer;transition:background .15s;border-bottom:1px solid #f8fafc}
    .dp-folder-item:hover{background:#f1f5f9}
    .dp-folder-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0}
    .dp-folder-name{font-size:0.85rem;font-weight:600;color:#111827}
    .dp-folder-meta{font-size:0.7rem;color:#94a3b8}
    .dp-folder-arrow{margin-left:auto;color:#cbd5e1;font-size:0.9rem}
    .dp-back-btn{display:flex;align-items:center;gap:0.5rem;padding:0.65rem 1.5rem;font-size:0.8rem;font-weight:600;color:#3b82f6;cursor:pointer;border-bottom:1px solid #f1f5f9;background:#f9fafb}
    .dp-back-btn:hover{background:#eff6ff}
    .dp-back-btn svg{width:14px;height:14px}
    .dp-file-item{display:flex;align-items:center;gap:0.75rem;padding:0.65rem 1.5rem;cursor:pointer;transition:all .15s;border-bottom:1px solid #f8fafc}
    .dp-file-item:hover{background:#eff6ff}
    .dp-file-item.disabled{opacity:0.4;cursor:not-allowed}
    .dp-file-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.9rem;flex-shrink:0}
    .dp-file-name{font-size:0.82rem;font-weight:600;color:#111827;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dp-file-size{font-size:0.68rem;color:#94a3b8;flex-shrink:0}
    .dp-empty{text-align:center;padding:2.5rem 1.5rem;color:#94a3b8;font-size:0.85rem}
    .dp-empty span{font-size:2rem;display:block;margin-bottom:0.5rem}
    .dp-loading{display:flex;align-items:center;justify-content:center;padding:2rem;gap:0.75rem;color:#94a3b8;font-size:0.85rem}
    .dp-spin{width:22px;height:22px;border:2.5px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:dpSpin .6s linear infinite}
    @keyframes dpSpin{to{transform:rotate(360deg)}}
    .dp-footer{padding:0.75rem 1.5rem;border-top:1px solid #f1f5f9;background:#f9fafb;font-size:0.7rem;color:#94a3b8;text-align:center}
    `;

    // File type → icon/bg
    function fileIcon(type) {
        if (type === 'pdf') return { emoji: '📕', bg: '#fef2f2' };
        if (type === 'image') return { emoji: '🖼️', bg: '#fffbeb' };
        if (type === 'spreadsheet') return { emoji: '📊', bg: '#ecfdf5' };
        if (type === 'doc') return { emoji: '📝', bg: '#eff6ff' };
        return { emoji: '📄', bg: '#f1f5f9' };
    }

    function formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function isAccepted(fileName) {
        if (!_accept || _accept.length === 0) return true;
        const ext = '.' + fileName.split('.').pop().toLowerCase();
        return _accept.some(a => a.toLowerCase() === ext);
    }

    function inject() {
        if (_injected) return;
        _injected = true;

        // Inject CSS
        const style = document.createElement('style');
        style.textContent = PICKER_CSS;
        document.head.appendChild(style);

        // Inject modal HTML
        const div = document.createElement('div');
        div.innerHTML = `
        <div class="dp-overlay" id="dp-overlay" onclick="if(event.target===this)closeDrivePicker()">
            <div class="dp-modal">
                <div class="dp-header">
                    <h2>📁 Pick from Client Drive</h2>
                    <button class="dp-close" onclick="closeDrivePicker()">✕</button>
                </div>
                <div class="dp-body" id="dp-body"></div>
                <div class="dp-footer">Files are loaded from the client's ComplianceAI Drive</div>
            </div>
        </div>`;
        document.body.appendChild(div.firstElementChild);
    }
    let _breadcrumbs = []; // [{id, name}]

    // ── Render folder list ──
    async function renderFolderList(parentId, parentName) {
        const body = document.getElementById('dp-body');
        body.innerHTML = '<div class="dp-loading"><div class="dp-spin"></div>Loading folders…</div>';

        try {
            const token = localStorage.getItem('access_token');
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const BASE = isLocal ? 'http://localhost:8000/api/v1' : 'https://ca-copilot-api.onrender.com/api/v1';

            let url;
            if (parentId) {
                url = `${BASE}/drive/${_clientId}/folders/${parentId}/subfolders`;
            } else {
                url = `${BASE}/drive/${_clientId}/folders`;
            }

            const r = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!r.ok) throw new Error('Failed to load folders');
            _pickerFolders = await r.json();
        } catch (e) {
            body.innerHTML = '<div class="dp-empty"><span>⚠️</span>Failed to load Drive folders</div>';
            return;
        }

        if (_pickerFolders.length === 0 && !parentId) {
            body.innerHTML = '<div class="dp-empty"><span>📂</span>No folders in this client\'s Drive yet</div>';
            return;
        }

        let html = '';

        // Back button if inside a sub-folder
        if (parentId) {
            html += `<div class="dp-back-btn" onclick="dpBackFromSubfolder()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                Back${_breadcrumbs.length > 0 ? ' to ' + (_breadcrumbs.length > 1 ? _breadcrumbs[_breadcrumbs.length - 1].name : 'folders') : ''}
            </div>`;
        }

        const sectionTitle = parentName || 'Select a folder';
        html += `<div class="dp-section-title">${sectionTitle}</div>`;

        if (_pickerFolders.length === 0) {
            html += '<div class="dp-empty"><span>📂</span>No sub-folders here</div>';
        } else {
            _pickerFolders.forEach(f => {
                const meta = f.has_children
                    ? `${f.file_count || 0} file${f.file_count !== 1 ? 's' : ''}`
                    : `${f.file_count} file${f.file_count !== 1 ? 's' : ''}`;
                html += `<div class="dp-folder-item" onclick="dpClickFolder('${f.id}','${f.name.replace(/'/g, "\\'")}','${f.icon}','${f.bg}','${f.color}',${f.has_children})">
                    <div class="dp-folder-icon" style="background:${f.bg};color:${f.color}">${f.icon}</div>
                    <div>
                        <div class="dp-folder-name">${f.name}</div>
                        <div class="dp-folder-meta">${meta}</div>
                    </div>
                    <div class="dp-folder-arrow">›</div>
                </div>`;
            });
        }
        body.innerHTML = html;
    }

    // ── Click handler: folder or sub-folder? ──
    window.dpClickFolder = function(id, name, icon, bg, color, hasChildren) {
        if (hasChildren) {
            // Navigate into sub-folder
            _breadcrumbs.push({ id, name });
            renderFolderList(id, name);
        } else {
            // Open file list
            window.dpOpenFolder(id, name, icon, bg, color);
        }
    };

    window.dpBackFromSubfolder = function() {
        _breadcrumbs.pop();
        if (_breadcrumbs.length > 0) {
            const parent = _breadcrumbs[_breadcrumbs.length - 1];
            renderFolderList(parent.id, parent.name);
        } else {
            renderFolderList(null, null);
        }
    };

    // ── Render file list inside a folder ──
    window.dpOpenFolder = async function (folderId, folderName, icon, bg, color) {
        const body = document.getElementById('dp-body');
        body.innerHTML = '<div class="dp-loading"><div class="dp-spin"></div>Loading files…</div>';

        let files = [];
        try {
            const token = localStorage.getItem('access_token');
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const BASE = isLocal ? 'http://localhost:8000/api/v1' : 'https://ca-copilot-api.onrender.com/api/v1';

            const r = await fetch(`${BASE}/drive/${_clientId}/folders/${folderId}/files`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (r.ok) files = await r.json();
        } catch (e) { console.error(e); }

        let html = `<div class="dp-back-btn" onclick="dpBackToFolders()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
            Back to folders
        </div>`;
        html += `<div class="dp-section-title">${icon} ${folderName}</div>`;

        if (files.length === 0) {
            html += '<div class="dp-empty"><span>📂</span>No files in this folder</div>';
        } else {
            files.forEach(f => {
                const fi = fileIcon(f.file_type);
                const accepted = isAccepted(f.name);
                html += `<div class="dp-file-item ${accepted ? '' : 'disabled'}" 
                    ${accepted ? `onclick="dpSelectFile('${f.id}','${f.name.replace(/'/g, "\\'")}')"` : `title="File type not accepted"`}>
                    <div class="dp-file-icon" style="background:${fi.bg}">${fi.emoji}</div>
                    <div class="dp-file-name">${f.name}</div>
                    <div class="dp-file-size">${formatSize(f.size_bytes)}</div>
                </div>`;
            });
        }
        body.innerHTML = html;
    };

    window.dpBackToFolders = function () {
        if (_breadcrumbs.length > 0) {
            const parent = _breadcrumbs[_breadcrumbs.length - 1];
            renderFolderList(parent.id, parent.name);
        } else {
            renderFolderList(null, null);
        }
    };

    // ── Select a file: download it and return as File object ──
    window.dpSelectFile = async function (fileId, fileName) {
        const body = document.getElementById('dp-body');
        body.innerHTML = '<div class="dp-loading"><div class="dp-spin"></div>Fetching file…</div>';

        try {
            const token = localStorage.getItem('access_token');
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const BASE = isLocal ? 'http://localhost:8000/api/v1' : 'https://ca-copilot-api.onrender.com/api/v1';

            const r = await fetch(`${BASE}/drive/${_clientId}/files/${fileId}/download`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!r.ok) throw new Error('Download failed');
            const blob = await r.blob();
            const file = new File([blob], fileName, { type: blob.type });

            closeDrivePicker();
            if (_onSelect) _onSelect(file);
        } catch (e) {
            console.error(e);
            body.innerHTML = '<div class="dp-empty"><span>⚠️</span>Failed to fetch file. Please try again.</div>';
        }
    };

    // ── Public API ──
    window.openDrivePicker = function ({ clientId, accept, onSelect }) {
        inject();
        _clientId = clientId;
        _accept = accept || [];
        _onSelect = onSelect;
        _breadcrumbs = [];
        document.getElementById('dp-overlay').classList.add('active');
        renderFolderList(null, null);
    };

    window.closeDrivePicker = function () {
        const overlay = document.getElementById('dp-overlay');
        if (overlay) overlay.classList.remove('active');
    };
})();
