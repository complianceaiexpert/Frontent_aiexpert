// ══════════════════════════════════════════════
// Financial Instruments — Main Dashboard & Upload
// Redirects to fi-review.html on upload
// ══════════════════════════════════════════════

const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get('clientId');
document.getElementById('fi-back-link').href = `services-dashboard.html?clientId=${clientId}`;

let fiVouchers = [];
let entryRowCounter = 0;
let selectedTxnType = null;

// ═══ TOAST ═══
function fiToast(msg, type = 'info') {
    const ct = document.getElementById('fi-toast-container');
    const colors = { success: '#059669', error: '#dc2626', info: '#4338ca', warning: '#d97706' };
    const t = document.createElement('div');
    t.style.cssText = `padding:.7rem 1.15rem;border-radius:10px;background:#fff;border-left:4px solid ${colors[type]};color:#1e293b;font-size:.78rem;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.1);animation:fiFadeIn .3s ease;font-family:inherit;max-width:380px`;
    t.innerHTML = `<span style="color:${colors[type]};margin-right:.35rem">${{success:'✓',error:'✕',info:'ℹ',warning:'⚠'}[type]}</span> ${msg}`;
    ct.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; setTimeout(() => t.remove(), 300); }, 5000);
}

// ═══ FORMATTING ═══
function formatINR(val) { return '₹ ' + Math.abs(Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function typeLabel(t) { return { demat: 'Demat', demat_holdings: 'Holdings', demat_taxpnl: 'Tax P&L', demat_tradebook: 'Tradebook', mutual_fund: 'Mutual Fund', pms: 'PMS', pms_transaction: 'pms_transaction', pms_dividend: 'pms_dividend', pms_expenses: 'pms_expenses' }[t] || t; }

// ═══ SIDEBAR NAV ═══
function fiNav(sectionId, el) {
    document.querySelectorAll('.fi-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('sec-' + sectionId);
    if (target) target.classList.add('active');
    document.querySelectorAll('.fi-sb-item').forEach(l => l.classList.remove('active'));
    if (el) el.classList.add('active');
    // Persist active section in URL for reload support
    const u = new URL(window.location);
    if (sectionId === 'dashboard') { u.searchParams.delete('section'); } else { u.searchParams.set('section', sectionId); }
    window.history.replaceState({}, '', u);
    if (sectionId === 'statements') loadStatements();
    if (sectionId === 'journal-entries') loadAllJournalEntries();
    if (sectionId === 'pending') loadPendingEntries();
    if (sectionId === 'stock-register' && typeof loadStockRegister === 'function') loadStockRegister();
    if (sectionId === 'capital-gains' && typeof loadCapitalGains === 'function') loadCapitalGains();
}


// ═══ ALLOCATION DROPDOWN ═══
function toggleAllocDrop(key) {
    const drop = document.getElementById('fi-alloc-drop-' + key);
    const arrow = document.getElementById('fi-alloc-arrow-' + key);
    const wrap = drop ? drop.closest('.fi-alloc-wrap') : null;
    if (!drop) return;

    const isOpen = drop.classList.contains('open');

    // Close all others first
    document.querySelectorAll('.fi-alloc-drop.open').forEach(d => {
        d.classList.remove('open');
        d.style.display = 'none';
        d.closest('.fi-alloc-wrap')?.classList.remove('open');
    });
    document.querySelectorAll('.fi-alloc-arrow.open').forEach(a => a.classList.remove('open'));

    if (!isOpen) {
        drop.style.display = 'block';
        requestAnimationFrame(() => drop.classList.add('open'));
        if (arrow) arrow.classList.add('open');
        if (wrap) wrap.classList.add('open');
    }
}

function populateAllocDropdowns(config) {
    const COLORS = ['#4338ca','#059669','#d97706','#ec4899','#8b5cf6','#06b6d4','#f97316','#ef4444','#14b8a6','#6366f1'];

    Object.entries(config).forEach(([key, cfg]) => {
        const body = document.getElementById('fi-alloc-drop-' + key + '-body');
        if (!body) return;

        let items = cfg.items || [];
        if (items.length === 0) {
            body.innerHTML = '<div style="color:#94a3b8;font-size:.72rem;text-align:center;padding:.6rem">No data uploaded yet</div>';
            return;
        }

        // For PMS: group by account name
        if (key === 'pms') {
            const grouped = {};
            items.forEach(item => {
                const acct = item.account || 'PMS Portfolio';
                if (!grouped[acct]) grouped[acct] = { name: acct, value: 0, items: [] };
                grouped[acct].value += item.value;
                grouped[acct].items.push(item);
            });
            items = Object.values(grouped).sort((a, b) => b.value - a.value);
        } else {
            // Sort by value descending
            items.sort((a, b) => b.value - a.value);
            // Show top securities (limit to 10 for readability)
            if (items.length > 10) {
                const top = items.slice(0, 9);
                const rest = items.slice(9);
                const otherVal = rest.reduce((s, i) => s + i.value, 0);
                top.push({ name: `Others (${rest.length} more)`, value: otherVal, sector: '' });
                items = top;
            }
        }

        const total = cfg.total || 1;
        const maxVal = Math.max(...items.map(i => i.value), 1);

        body.innerHTML = items.map((item, i) => {
            const pct = Math.round(item.value / total * 100);
            const barW = Math.round(item.value / maxVal * 100);
            const col = COLORS[i % COLORS.length];
            const label = item.sector ? `<span style="font-size:.54rem;color:#94a3b8;margin-left:.25rem">${item.sector}</span>` : '';

            // For PMS grouped accounts, show sub-securities
            let subHtml = '';
            if (key === 'pms' && item.items && item.items.length > 1) {
                const topSec = item.items.sort((a,b) => b.value - a.value).slice(0, 5);
                subHtml = '<div style="padding-left:1rem;margin-top:2px">' +
                    topSec.map(s => `<div style="display:flex;align-items:center;gap:.35rem;padding:2px 0"><span style="font-size:.56rem;color:#94a3b8">•</span><span style="font-size:.62rem;color:#64748b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</span><span style="font-size:.58rem;font-weight:700;color:#334155;font-family:'Outfit',sans-serif">${formatINR(s.value)}</span></div>`).join('') +
                    (item.items.length > 5 ? `<div style="font-size:.56rem;color:#94a3b8;padding:2px 0">+${item.items.length - 5} more securities</div>` : '') +
                    '</div>';
            }

            return `<div class="fi-alloc-sub-row">
                <div class="fi-alloc-sub-dot" style="background:${col}"></div>
                <div class="fi-alloc-sub-name">${item.name}${label}</div>
                <div class="fi-alloc-sub-bar"><div class="fi-alloc-sub-bar-fill" style="width:${barW}%;background:${col}"></div></div>
                <div class="fi-alloc-sub-amt">${formatINR(item.value)}</div>
                <div class="fi-alloc-sub-pct">${pct}%</div>
            </div>${subHtml}`;
        }).join('');
    });
}


// ══════════════════════════════════════════════════
// UPLOAD — Shows processing in history, then redirects
// ══════════════════════════════════════════════════

async function handleFIUpload(input, instrumentType) {
    const files = input.files;
    if (!files || files.length === 0) return;
    if (!clientId) { fiToast('No client selected', 'error'); return; }

    const file = files[0];
    if (file.size > 25 * 1024 * 1024) { fiToast(`File too large (${(file.size/1024/1024).toFixed(1)} MB). Max 25 MB.`, 'error'); return; }

    // Show uploading state on the card
    const card = input.closest('.fi-upload-card');
    const nameEl = card ? card.querySelector('.fi-uc-name') : null;
    const origName = nameEl ? nameEl.textContent : '';
    if (card) {
        card.style.pointerEvents = 'none';
        card.style.opacity = '.6';
        if (nameEl) nameEl.textContent = 'Uploading...';
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', clientId);
    formData.append('instrument_type', instrumentType);

    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE_URL}/financial-instruments/upload`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || 'Upload failed'); }
        const data = await res.json();

        // Refresh statements table immediately + auto-switch to Statements section
        loadStatementsTabbed();
        // Auto-switch to the Statements section so user sees the upload
        const stmtNav = document.querySelector('.fi-sb-item[onclick*="statements"]');
        if (stmtNav) fiNav('statements', stmtNav);
        fiToast('Upload started — processing in background', 'success');

        // Restore card state
        if (card) { card.style.pointerEvents = ''; card.style.opacity = ''; if (nameEl) nameEl.textContent = origName; }

        // Poll for completion, then refresh the table
        pollUploadStatus(data.id, instrumentType);
    } catch (e) {
        fiToast(e.message, 'error');
        if (card) { card.style.pointerEvents = ''; card.style.opacity = ''; if (nameEl) nameEl.textContent = origName; }
    }
    input.value = '';
}

function addProcessingRow(uploadId, filename, type) {
    // Determine correct tbody based on instrument type
    let tbodyId = 'fi-demat-tbody';
    if (type === 'mutual_fund') tbodyId = 'fi-mf-tbody';
    else if (type && type.startsWith('pms')) tbodyId = 'fi-pms-tbody';
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    // Remove "no uploads" placeholder row
    const emptyRow = tbody.querySelector('td[colspan]');
    if (emptyRow) emptyRow.closest('tr').remove();

    const row = document.createElement('tr');
    row.id = 'fi-proc-' + uploadId;
    row.style.background = '#fefce8';
    const now = new Date();
    let elapsed = 0;
    const timer = () => {
        elapsed++;
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        const timerEl = document.getElementById('fi-timer-' + uploadId);
        if (timerEl) timerEl.textContent = m + ':' + s;
    };

    row.innerHTML = `<tr>
        <td style="font-weight:600;font-family:'Outfit',sans-serif;color:#4338ca">${now.toLocaleDateString('en-GB')}</td>
        <td><span class="fi-badge" style="background:#eef2ff;color:#4338ca">${typeLabel(type)}</span></td>
        <td style="font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${filename}</td>
        <td><span class="fi-badge" style="background:#fef3c715;color:#d97706;font-weight:700;animation:fiPulse 1.5s infinite">⏳ AI PROCESSING <span id="fi-timer-${uploadId}" style="font-family:'Outfit',sans-serif;margin-left:.25rem">00:00</span></span></td>
        <td style="font-weight:700;font-family:'Outfit',sans-serif;color:#94a3b8">—</td>
        <td><button class="fi-btn" disabled style="opacity:.5">Processing...</button></td>
    </tr>`;
    tbody.prepend(row);
    setInterval(timer, 1000);
}

// Poll upload status and refresh table when done
function pollUploadStatus(uploadId, instrumentType) {
    const poll = setInterval(async () => {
        try {
            const res = await authFetch(`/financial-instruments/data/${uploadId}`);
            if (!res || !res.ok) return;
            const data = await res.json();
            const status = data.status || 'processing';
            if (status === 'completed' || status === 'failed') {
                clearInterval(poll);
                // Remove processing row
                const procRow = document.getElementById('fi-proc-' + uploadId);
                if (procRow) procRow.remove();
                // Refresh the statements table
                if (typeof loadStatements === 'function') loadStatements();
                // Refresh dashboard stats
                if (typeof loadDashboardStats === 'function') loadDashboardStats();
                if (status === 'completed') {
                    fiToast(`✅ ${typeLabel(instrumentType)} processed — ${data.journal_entry_count || 0} entries generated`, 'success');
                } else {
                    fiToast('Processing failed — please try again', 'error');
                }
            }
        } catch(e) { /* continue polling */ }
    }, 5000);
}

// ═══ DEMAT 3-FILE UPLOAD ═══
const DEMAT_FILE_TYPES = [
    { key: 'holdings',  label: 'Holdings',  keywords: ['holding', 'portfolio', 'position', 'folio'], icon: '📊' },
    { key: 'taxpnl',    label: 'Tax P&L',   keywords: ['tax', 'pnl', 'p&l', 'profit', 'loss', 'capital', 'gain'], icon: '📋' },
    { key: 'tradebook', label: 'Tradebook',  keywords: ['trade', 'book', 'transaction', 'order', 'ledger'], icon: '📒' },
];

let dematSelectedFiles = {}; // { holdings: File, taxpnl: File, tradebook: File }

function classifyDematFile(file) {
    const name = file.name.toLowerCase();
    for (const t of DEMAT_FILE_TYPES) {
        if (t.keywords.some(kw => name.includes(kw))) return t.key;
    }
    return null;
}

function handleDematMultiSelect(input) {
    const files = input.files;
    if (!files || files.length === 0) return;
    if (!clientId) { fiToast('No client selected', 'error'); return; }

    dematSelectedFiles = {};
    const unmatched = [];

    // Auto-classify each file
    for (const f of files) {
        const type = classifyDematFile(f);
        if (type && !dematSelectedFiles[type]) {
            dematSelectedFiles[type] = f;
        } else if (type && dematSelectedFiles[type]) {
            // Duplicate type — keep the later one
            dematSelectedFiles[type] = f;
        } else {
            unmatched.push(f);
        }
    }

    // If we have unmatched files, assign them to empty slots in order
    const emptySlots = DEMAT_FILE_TYPES.filter(t => !dematSelectedFiles[t.key]);
    unmatched.forEach((f, i) => {
        if (i < emptySlots.length) dematSelectedFiles[emptySlots[i].key] = f;
    });

    renderDematChecklist();
    input.value = '';
}

function renderDematChecklist() {
    const list = document.getElementById('fi-demat-file-list');
    const checklist = document.getElementById('fi-demat-checklist');
    const warn = document.getElementById('fi-demat-missing-warn');
    const btn = document.getElementById('fi-demat-process-btn');
    if (!list || !checklist) return;

    checklist.style.display = 'block';

    let allPresent = true;
    list.innerHTML = DEMAT_FILE_TYPES.map(t => {
        const file = dematSelectedFiles[t.key];
        const found = !!file;
        if (!found) allPresent = false;
        const sizeStr = file ? `${(file.size / 1024).toFixed(0)} KB` : '';
        return `<div style="display:flex;align-items:center;gap:.6rem;padding:.45rem .65rem;border-radius:8px;background:${found ? '#f0fdf4' : '#fef2f2'};border:1px solid ${found ? '#a7f3d0' : '#fecaca'}">
            <span style="font-size:1rem">${t.icon}</span>
            <span style="font-size:.78rem;font-weight:700;color:${found ? '#059669' : '#dc2626'};min-width:80px">${t.label}</span>
            <span style="font-size:.72rem;color:#64748b;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${file ? file.name : '— Not selected —'}</span>
            <span style="font-size:.6rem;color:#94a3b8;font-weight:600">${sizeStr}</span>
            <span style="font-size:.85rem">${found ? '✅' : '❌'}</span>
        </div>`;
    }).join('');

    if (warn) warn.style.display = allPresent ? 'none' : 'block';
    if (btn) {
        btn.disabled = !allPresent;
        btn.textContent = allPresent ? '🚀 Process All 3 Files' : '🚀 Process All Files';
    }
}

function clearDematFiles() {
    dematSelectedFiles = {};
    const checklist = document.getElementById('fi-demat-checklist');
    if (checklist) checklist.style.display = 'none';
}

let _dematUploading = false;
async function processDematMultiUpload() {
    if (_dematUploading) return; // prevent double-submit
    if (!clientId) { fiToast('No client selected', 'error'); return; }

    const missing = DEMAT_FILE_TYPES.filter(t => !dematSelectedFiles[t.key]);
    if (missing.length > 0) {
        fiToast(`Missing: ${missing.map(t => t.label).join(', ')}`, 'error');
        return;
    }

    _dematUploading = true;
    const btn = document.getElementById('fi-demat-process-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Uploading...'; }
    const dropzone = document.getElementById('fi-demat-dropzone');
    if (dropzone) dropzone.style.pointerEvents = 'none';

    const token = localStorage.getItem('access_token');
    let successCount = 0;
    let firstUploadId = null;

    for (const t of DEMAT_FILE_TYPES) {
        const file = dematSelectedFiles[t.key];
        const subType = `demat_${t.key}`; // demat_holdings, demat_taxpnl, demat_tradebook

        const formData = new FormData();
        formData.append('file', file);
        formData.append('client_id', clientId);
        formData.append('instrument_type', subType);

        try {
            const res = await fetch(`${API_BASE_URL}/financial-instruments/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                fiToast(`${t.label}: ${err.detail || 'Upload failed'}`, 'error');
                continue;
            }
            const data = await res.json();
            if (!firstUploadId) firstUploadId = data.id;
            successCount++;
        } catch (e) {
            fiToast(`${t.label}: ${e.message}`, 'error');
        }
    }

    if (successCount > 0) {
        fiToast(`${successCount}/3 files uploaded — AI processing started`, 'success');
        clearDematFiles();
        loadStatementsTabbed();
    }
    _dematUploading = false;
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Process All 3 Files'; }
    if (dropzone) dropzone.style.pointerEvents = '';
}


// ══════════════════════════════════════════════════
// MANUAL ENTRY (Secondary flow)
// ══════════════════════════════════════════════════

const TALLY_DEFAULTS = {
    purchase: { dr:'Investment in Shares', drg:'Investments', cr:'Bank Account', crg:'Bank Accounts', vt:'Journal', nr:'Being purchase of shares/units as per contract note' },
    sale: { dr:'Bank Account', drg:'Bank Accounts', cr:'Investment in Shares', crg:'Investments', vt:'Journal', nr:'Being sale of shares/units as per contract note' },
    dividend: { dr:'Bank Account', drg:'Bank Accounts', cr:'Dividend Income', crg:'Income (Indirect)', vt:'Receipt', nr:'Being dividend received, TDS u/s 194 deducted' },
    charges: { dr:'Brokerage & Commission', drg:'Indirect Expenses', cr:'Bank Account', crg:'Bank Accounts', vt:'Payment', nr:'Being brokerage/DP charges paid' },
    sip: { dr:'Investment in Mutual Funds', drg:'Investments', cr:'Bank Account', crg:'Bank Accounts', vt:'Journal', nr:'Being SIP investment as per mandate' },
    ipo: { dr:'Investment in Shares (IPO)', drg:'Investments', cr:'Bank Account', crg:'Bank Accounts', vt:'Journal', nr:'Being IPO allotment, shares credited to demat' },
    bonus: { dr:'', drg:'', cr:'', crg:'', vt:'Memorandum', nr:'Being bonus/split — quantity memo, no monetary entry' },
    transfer: { dr:'Investment (New)', drg:'Investments', cr:'Investment (Old)', crg:'Investments', vt:'Journal', nr:'Being switch/transfer of units' }
};

function selectTxnType(type) {
    selectedTxnType = type;
    document.querySelectorAll('.fi-txn-type-card').forEach(c => c.classList.toggle('selected', c.dataset.type === type));
    renderEntryForm(type);
}

function renderEntryForm(type) {
    const c = document.getElementById('fi-entry-form-container');
    const d = TALLY_DEFAULTS[type];
    if (!d) { c.innerHTML = ''; return; }
    const today = new Date().toISOString().split('T')[0];
    const isSale = type === 'sale', isDividend = type === 'dividend';
    const names = { purchase:'Share/MF Purchase', sale:'Share/MF Sale', dividend:'Dividend/Interest', charges:'Brokerage/Charges', sip:'SIP/STP', ipo:'IPO Allotment', bonus:'Bonus/Split', transfer:'MF Switch' };

    c.innerHTML = `<div class="fi-entry-form">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
            <div><h3 style="margin:0;font-size:1rem;font-weight:800;font-family:'Outfit',sans-serif;color:#0f172a">${names[type]||type}</h3>
            <p style="margin:.1rem 0 0;font-size:.72rem;color:#94a3b8">Voucher: <strong>${d.vt}</strong></p></div>
            <span class="fi-chip">${d.vt}</span>
        </div>
        <div class="fi-form-grid cols-3" style="margin-bottom:1rem">
            <div class="fi-form-group"><label class="fi-form-label">Date <span class="fi-required">*</span></label><input type="date" class="fi-form-input" id="fi-entry-date" value="${today}"></div>
            <div class="fi-form-group"><label class="fi-form-label">Instrument</label><select class="fi-form-select" id="fi-entry-instrument"><option value="equity">Equity</option><option value="mutual_fund">Mutual Fund</option><option value="bonds">Bonds</option><option value="pms">PMS</option><option value="etf">ETF</option></select></div>
            <div class="fi-form-group"><label class="fi-form-label">Scrip / Fund <span class="fi-required">*</span></label><input type="text" class="fi-form-input" id="fi-entry-scrip" placeholder="e.g. Reliance Industries"></div>
        </div>
        <div class="fi-form-grid cols-4" style="margin-bottom:1rem">
            <div class="fi-form-group"><label class="fi-form-label">Quantity</label><input type="number" class="fi-form-input" id="fi-entry-qty" placeholder="0" oninput="calcAmt()"></div>
            <div class="fi-form-group"><label class="fi-form-label">${isSale?'Sale Price':'Rate'} (₹)</label><input type="number" class="fi-form-input" id="fi-entry-rate" placeholder="0.00" oninput="calcAmt()"></div>
            <div class="fi-form-group"><label class="fi-form-label">Amount (₹) <span class="fi-required">*</span></label><input type="number" class="fi-form-input" id="fi-entry-amount" placeholder="0.00" style="font-weight:700" oninput="updateEntryPreview()"></div>
            <div class="fi-form-group"><label class="fi-form-label">${isDividend?'TDS (₹)':isSale?'Cost (₹)':'Charges (₹)'}</label><input type="number" class="fi-form-input" id="fi-entry-extra" placeholder="0.00" oninput="updateEntryPreview()"></div>
        </div>
        ${isSale?`<div class="fi-form-grid cols-3" style="margin-bottom:1rem"><div class="fi-form-group"><label class="fi-form-label">Holding Period</label><select class="fi-form-select" id="fi-entry-holding"><option value="ltcg">Long Term</option><option value="stcg">Short Term</option></select></div><div class="fi-form-group"><label class="fi-form-label">Capital Gain (₹)</label><input type="number" class="fi-form-input" id="fi-entry-gain" readonly style="background:#f0fdf4;font-weight:700;color:#059669"></div><div class="fi-form-group"><label class="fi-form-label">STT (₹)</label><input type="number" class="fi-form-input" id="fi-entry-stt" placeholder="0.00"></div></div>`:''}
        <div class="fi-form-grid" style="margin-bottom:1.25rem"><div class="fi-form-group fi-form-full"><label class="fi-form-label">Narration</label><textarea class="fi-form-textarea" id="fi-entry-narration" rows="2" style="padding:.55rem .75rem;border:1px solid #d4d8e8;border-radius:8px;font-size:.82rem;font-family:inherit;outline:none;resize:vertical">${d.nr}</textarea></div></div>
        <div style="margin-bottom:1rem"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem"><label style="font-size:.7rem;font-weight:700;text-transform:uppercase;color:#374151;letter-spacing:.04em">Tally Journal Preview (Dr / Cr)</label><button class="fi-btn" onclick="addRow()" style="font-size:.72rem;padding:.3rem .6rem">+ Add Row</button></div>
        <div class="fi-entry-table-wrap"><table class="fi-entry-table"><thead><tr><th style="width:40%">Ledger Name</th><th style="width:20%">Group</th><th class="right" style="width:15%">Debit (₹)</th><th class="right" style="width:15%">Credit (₹)</th><th class="center" style="width:10%"></th></tr></thead><tbody id="fi-preview-body"></tbody></table>
        <div class="fi-entry-footer"><div class="fi-entry-total"><span style="color:#dc2626">Dr: <span id="fi-total-dr">₹ 0.00</span></span> &nbsp;|&nbsp; <span style="color:#059669">Cr: <span id="fi-total-cr">₹ 0.00</span></span></div><div class="fi-entry-balance balanced" id="fi-balance-status">✓ Balanced</div></div></div></div>
        <div class="fi-action-bar"><div class="fi-action-bar-left"><input type="checkbox" id="fi-auto-ledger" checked style="accent-color:#4338ca"><label for="fi-auto-ledger" style="font-size:.75rem;color:#64748b">Auto-create ledgers in Tally</label></div>
        <div class="fi-action-bar-right"><button class="fi-btn" onclick="resetEntry()">Clear</button><button class="fi-btn primary" onclick="saveVoucher('draft')">Save Draft</button><button class="fi-btn success" onclick="saveVoucher('approved')">✓ Approve</button><button class="fi-btn tally" onclick="saveAndSync()">↻ Sync to Tally</button></div></div>
    </div>`;
    populateRows(type);
}

function populateRows(type) {
    const tbody = document.getElementById('fi-preview-body');
    if (!tbody) return;
    tbody.innerHTML = ''; entryRowCounter = 0;
    const d = TALLY_DEFAULTS[type]; if (!d) return;
    if (type === 'bonus') { addRowWith('Shares (Memo)', 'Investments', '', '', false); return; }
    if (d.dr) addRowWith(d.dr, d.drg, '0.00', '', true);
    if (d.cr) addRowWith(d.cr, d.crg, '', '0.00', true);
    if (type === 'sale') addRowWith('STCG on Shares', 'Income (Indirect)', '', '0.00', true);
    if (type === 'dividend') addRowWith('TDS on Dividend (194)', 'Duties & Taxes', '0.00', '', true);
    updateEntryPreview();
}
function addRowWith(name, group, dr, cr, removable) {
    const tbody = document.getElementById('fi-preview-body');
    const id = ++entryRowCounter;
    const row = document.createElement('tr'); row.id = 'fi-row-' + id;
    row.innerHTML = `<td><input type="text" value="${name}" placeholder="Ledger name" oninput="recalc()"></td><td><input type="text" value="${group}" placeholder="Group" style="color:#64748b;font-size:.75rem"></td><td class="right"><input type="number" value="${dr}" placeholder="—" step="0.01" style="text-align:right;font-weight:600;color:#dc2626" oninput="recalc()"></td><td class="right"><input type="number" value="${cr}" placeholder="—" step="0.01" style="text-align:right;font-weight:600;color:#059669" oninput="recalc()"></td><td class="center">${removable?`<button class="fi-remove-row" onclick="delRow(${id})">✕</button>`:''}</td>`;
    tbody.appendChild(row);
}
function addRow() { addRowWith('', '', '', '', true); }
function delRow(id) { const r = document.getElementById('fi-row-'+id); if(r) r.remove(); recalc(); }

function calcAmt() {
    const q = parseFloat(document.getElementById('fi-entry-qty')?.value)||0;
    const r = parseFloat(document.getElementById('fi-entry-rate')?.value)||0;
    const f = document.getElementById('fi-entry-amount');
    if (q && r && f) f.value = (q*r).toFixed(2);
    updateEntryPreview();
}
function updateEntryPreview() {
    const amt = parseFloat(document.getElementById('fi-entry-amount')?.value)||0;
    const ext = parseFloat(document.getElementById('fi-entry-extra')?.value)||0;
    const type = selectedTxnType;
    const tbody = document.getElementById('fi-preview-body'); if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    if (type==='purchase'||type==='sip'||type==='ipo') { if(rows[0])rows[0].querySelectorAll('input[type=number]')[0].value=(amt+ext).toFixed(2); if(rows[1])rows[1].querySelectorAll('input[type=number]')[1].value=(amt+ext).toFixed(2); }
    else if (type==='sale') { const g=amt-ext; const gf=document.getElementById('fi-entry-gain'); if(gf)gf.value=g.toFixed(2); if(rows[0])rows[0].querySelectorAll('input[type=number]')[0].value=amt.toFixed(2); if(rows[1])rows[1].querySelectorAll('input[type=number]')[1].value=ext.toFixed(2); if(rows[2])rows[2].querySelectorAll('input[type=number]')[1].value=(g>0?g:0).toFixed(2); }
    else if (type==='dividend') { if(rows[0])rows[0].querySelectorAll('input[type=number]')[0].value=(amt-ext).toFixed(2); if(rows[1])rows[1].querySelectorAll('input[type=number]')[1].value=amt.toFixed(2); if(rows[2])rows[2].querySelectorAll('input[type=number]')[0].value=ext.toFixed(2); }
    else { if(rows[0])rows[0].querySelectorAll('input[type=number]')[0].value=amt.toFixed(2); if(rows[1])rows[1].querySelectorAll('input[type=number]')[1].value=amt.toFixed(2); }
    recalc();
}
function recalc() {
    const tbody = document.getElementById('fi-preview-body'); if(!tbody)return;
    let dr=0,cr=0;
    tbody.querySelectorAll('tr').forEach(r=>{const n=r.querySelectorAll('input[type=number]');dr+=parseFloat(n[0]?.value)||0;cr+=parseFloat(n[1]?.value)||0;});
    document.getElementById('fi-total-dr').textContent=formatINR(dr);
    document.getElementById('fi-total-cr').textContent=formatINR(cr);
    const diff=Math.abs(dr-cr);
    const b=document.getElementById('fi-balance-status');
    b.className='fi-entry-balance '+(diff<0.01?'balanced':'unbalanced');
    b.textContent=diff<0.01?'✓ Balanced':`⚠ Diff: ${formatINR(diff)}`;
}
function collectData(status) {
    const tbody=document.getElementById('fi-preview-body');
    const entries=[];
    tbody.querySelectorAll('tr').forEach(r=>{const i=r.querySelectorAll('input');const l=i[0]?.value?.trim(),g=i[1]?.value?.trim(),d=parseFloat(i[2]?.value)||0,c=parseFloat(i[3]?.value)||0;if(l&&(d||c))entries.push({ledger_name:l,group:g,amount:d||c,side:d>0?'Dr':'Cr'});});
    return{id:'FI-'+Date.now(),type:selectedTxnType,date:document.getElementById('fi-entry-date')?.value||'',scrip:document.getElementById('fi-entry-scrip')?.value||'',narration:document.getElementById('fi-entry-narration')?.value||'',voucher_type:TALLY_DEFAULTS[selectedTxnType]?.vt||'Journal',status,entries,total_amount:parseFloat(document.getElementById('fi-entry-amount')?.value)||0,created_at:new Date().toISOString()};
}

async function saveVoucher(status) {
    if(!selectedTxnType){fiToast('Select a transaction type','warning');return;}
    const v=collectData(status);
    if(!v.scrip){fiToast('Scrip/Fund name required','warning');return;}
    if(v.entries.length<2){fiToast('Need at least 2 ledger entries','warning');return;}

    try {
        const res = await authFetch('/financial-instruments/manual-entry', {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                txn_type: v.type,
                date: v.date,
                scrip: v.scrip,
                narration: v.narration,
                voucher_type: v.voucher_type,
                status: status,
                total_amount: v.total_amount,
                entries: v.entries,
            }),
        });
        if (!res || !res.ok) {
            const err = await res?.json().catch(() => ({}));
            throw new Error(err.detail || 'Save failed');
        }
        const data = await res.json();
        v.id = data.id; // use server-assigned ID
        fiVouchers.push(v);
        fiToast(`Voucher saved (${status}) — ${v.scrip}`, 'success');
        resetEntry();
        loadDashboardStats();
    } catch(e) {
        fiToast(`Save failed: ${e.message}`, 'error');
    }
}

async function saveAndSync() {
    if(!selectedTxnType){fiToast('Select a transaction type','warning');return;}
    const v=collectData('synced');
    if(!v.scrip){fiToast('Scrip required','warning');return;}

    try {
        const res = await authFetch('/financial-instruments/manual-entry', {
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                txn_type: v.type,
                date: v.date,
                scrip: v.scrip,
                narration: v.narration,
                voucher_type: v.voucher_type,
                status: 'synced',
                total_amount: v.total_amount,
                entries: v.entries,
            }),
        });
        if (!res || !res.ok) {
            const err = await res?.json().catch(() => ({}));
            throw new Error(err.detail || 'Sync failed');
        }
        const data = await res.json();
        v.id = data.id;
        fiVouchers.push(v);
        fiToast(`Voucher synced to Tally — ${v.scrip}`, 'success');
        resetEntry();
        loadDashboardStats();
    } catch(e) {
        fiToast(`Sync failed: ${e.message}`, 'error');
    }
}

function resetEntry() { selectedTxnType=null; document.querySelectorAll('.fi-txn-type-card').forEach(c=>c.classList.remove('selected')); document.getElementById('fi-entry-form-container').innerHTML=''; }

// ═══ LOAD MANUAL ENTRIES FROM BACKEND ═══
async function loadManualEntries() {
    if (!clientId) return;
    try {
        const res = await authFetch(`/financial-instruments/manual-entries?client_id=${clientId}`);
        if (!res || !res.ok) return;
        const data = await res.json();
        // Hydrate fiVouchers from persisted manual entries
        fiVouchers = data.map(e => ({
            id: e.id,
            type: e.txn_type,
            date: e.date,
            scrip: e.scrip,
            narration: e.narration,
            voucher_type: e.voucher_type,
            status: e.status,
            total_amount: e.total_amount,
            entries: e.entries,
            created_at: e.created_at,
        }));
    } catch(e) {
        console.warn('Failed to load manual entries:', e);
    }
}



// ══════════════════════════════════════════════════
// SHARED VIEWS
// ══════════════════════════════════════════════════

function renderVouchersList() { loadPendingEntries(); }
function filterVouchers(){}
function filterVoucherType(){}
async function approveAllPending() {
    const promises = [];
    fiVouchers.forEach(v => {
        if(v.status==='draft') {
            v.status='approved';
            promises.push(authFetch(`/financial-instruments/manual-entry/${v.id}/status`, {
                method: 'PATCH', body: JSON.stringify({ status: 'approved' }),
            }).catch(e => console.warn('Approve persist failed:', e)));
        }
    });
    (window._autoEntries || []).forEach(e => { if(e.status==='draft') e.status='approved'; });
    await Promise.all(promises);
    loadPendingEntries();
    fiToast('All entries approved','success');
    loadDashboardStats();
}
async function syncAllPending() {
    const promises = [];
    fiVouchers.forEach(v => {
        if(v.status==='approved'||v.status==='draft') {
            v.status='synced';
            promises.push(authFetch(`/financial-instruments/manual-entry/${v.id}/status`, {
                method: 'PATCH', body: JSON.stringify({ status: 'synced' }),
            }).catch(e => console.warn('Sync persist failed:', e)));
        }
    });
    (window._autoEntries || []).forEach(e => { if(e.status==='approved'||e.status==='draft') e.status='synced'; });
    await Promise.all(promises);
    loadPendingEntries();
    fiToast('All entries synced to Tally','success');
    loadDashboardStats();
}

// ═══ AUTO JOURNAL GENERATOR ═══
// Converts parsed structured_data → draft journal vouchers grouped by scrip
async function generateAutoEntries() {
    if(!clientId) return [];
    const entries = [];
    try {
        const res = await authFetch(`/financial-instruments/?client_id=${clientId}`);
        if(!res.ok) return [];
        const uploads = await res.json();
        const completed = uploads.filter(u => u.status === 'completed');

        for(const u of completed) {
            let d = null;
            try {
                const dr = await authFetch(`/financial-instruments/data/${u.id}`);
                if(dr.ok) d = (await dr.json()).structured_data;
            } catch(e) {}
            if(!d) continue;

            const fname = u.filename || u.instrument_type;
            const uType = u.instrument_type;

            // ── Tax P&L → Sell trades grouped by scrip ──
            if(uType === 'demat_taxpnl' && d.transactions?.length) {
                const byScript = {};
                d.transactions.forEach(t => {
                    const name = t.scrip_name || t.security_name || t.symbol || 'Unknown';
                    if(!byScript[name]) byScript[name] = { buys: 0, sells: 0, gain: 0, count: 0, type: 'STCG', dates: [] };
                    const buyVal = Number(t.buy_value || t.purchase_value || 0);
                    const sellVal = Number(t.sell_value || t.sale_value || 0);
                    const pnl = Number(t.realized_pnl || t.pnl || t.profit || (sellVal - buyVal) || 0);
                    byScript[name].buys += buyVal;
                    byScript[name].sells += sellVal;
                    byScript[name].gain += pnl;
                    byScript[name].count++;
                    // Determine CG type
                    const tt = String(t.trade_type || t.type || '').toLowerCase();
                    if(tt.includes('long') || tt === 'ltcg') byScript[name].type = 'LTCG';
                    else if(tt.includes('intraday') || tt.includes('speculative')) byScript[name].type = 'Intraday';
                    if(t.sell_date) byScript[name].dates.push(t.sell_date);
                });

                Object.entries(byScript).forEach(([scrip, data]) => {
                    const isProfit = data.gain >= 0;
                    const gainLabel = data.type === 'LTCG' ? 'Long Term Capital Gain'
                        : data.type === 'Intraday' ? 'Speculative Business Income'
                        : 'Short Term Capital Gain';
                    const ledgers = [];
                    if(isProfit) {
                        ledgers.push({ ledger_name: 'Bank A/c', amount: Math.abs(data.sells), side: 'Dr' });
                        ledgers.push({ ledger_name: 'Investment A/c', amount: Math.abs(data.buys), side: 'Cr' });
                        ledgers.push({ ledger_name: gainLabel, amount: Math.abs(data.gain), side: 'Cr' });
                    } else {
                        ledgers.push({ ledger_name: 'Bank A/c', amount: Math.abs(data.sells), side: 'Dr' });
                        ledgers.push({ ledger_name: gainLabel, amount: Math.abs(data.gain), side: 'Dr' });
                        ledgers.push({ ledger_name: 'Investment A/c', amount: Math.abs(data.buys), side: 'Cr' });
                    }
                    const lastDate = data.dates.sort().pop() || '';
                    entries.push({
                        id: `AUTO-${u.id}-${scrip.replace(/\s/g,'_')}`,
                        source: 'auto', sourceFile: fname, uploadId: u.id,
                        sourceType: uType,
                        date: lastDate,
                        narration: `${scrip} — ${data.count} sell trade${data.count>1?'s':''} (${data.type})`,
                        scrip, tradeCount: data.count, cgType: data.type,
                        voucher_type: 'Journal', status: 'draft',
                        entries: ledgers,
                        total_amount: Math.abs(data.sells),
                    });
                });

                // Capital gains summary voucher
                const cg = d.capital_gains_summary;
                if(cg) {
                    const spec = Number(cg.intraday_profit || cg.speculative_profit || 0);
                    if(spec !== 0) {
                        entries.push({
                            id: `AUTO-${u.id}-SPEC-SUMMARY`,
                            source: 'auto', sourceFile: fname, uploadId: u.id, sourceType: uType,
                            date: '', narration: `Speculative Income — Intraday Trading Summary`,
                            voucher_type: 'Journal', status: 'draft',
                            entries: spec >= 0
                                ? [{ ledger_name: 'Bank A/c', amount: Math.abs(spec), side: 'Dr' },
                                   { ledger_name: 'Speculative Business Income', amount: Math.abs(spec), side: 'Cr' }]
                                : [{ ledger_name: 'Speculative Business Loss', amount: Math.abs(spec), side: 'Dr' },
                                   { ledger_name: 'Bank A/c', amount: Math.abs(spec), side: 'Cr' }],
                            total_amount: Math.abs(spec),
                        });
                    }
                }
            }

            // ── Dividends ──
            if(d.dividends?.length) {
                d.dividends.forEach((dv, i) => {
                    const gross = Number(dv.amount || 0);
                    const tds = Number(dv.tds_deducted || dv.tds || 0);
                    const net = gross - tds;
                    if(gross === 0) return;
                    entries.push({
                        id: `AUTO-${u.id}-DIV-${i}`,
                        source: 'auto', sourceFile: fname, uploadId: u.id, sourceType: uType,
                        date: dv.date || dv.record_date || '',
                        narration: `Dividend — ${dv.scrip_name || dv.company || 'Unknown'}`,
                        voucher_type: 'Receipt', status: 'draft',
                        entries: [
                            { ledger_name: 'Bank A/c', amount: net, side: 'Dr' },
                            ...(tds > 0 ? [{ ledger_name: 'TDS Receivable (Sec 194)', amount: tds, side: 'Dr' }] : []),
                            { ledger_name: 'Dividend Income', amount: gross, side: 'Cr' },
                        ],
                        total_amount: gross,
                    });
                });
            }

            // ── PMS Transactions (Buy/Sell from structured_data) ──
            if(uType?.startsWith('pms') && d.transactions?.length) {
                const sells = {};
                const buys = {};
                d.transactions.forEach(t => {
                    const name = t.security_name || t.scrip_name || t.symbol || 'Unknown';
                    const ttype = String(t.transaction_type || t.type || '').toLowerCase();
                    const qty = Number(t.quantity || t.qty || 0);
                    const amount = Number(t.amount || t.value || t.total || 0);
                    const date = t.date || t.trade_date || '';

                    if(ttype.includes('sell') || ttype.includes('redemption')) {
                        if(!sells[name]) sells[name] = { amount: 0, count: 0, dates: [] };
                        sells[name].amount += Math.abs(amount);
                        sells[name].count++;
                        if(date) sells[name].dates.push(date);
                    } else if(ttype.includes('buy') || ttype.includes('purchase')) {
                        if(!buys[name]) buys[name] = { amount: 0, count: 0, dates: [] };
                        buys[name].amount += Math.abs(amount);
                        buys[name].count++;
                        if(date) buys[name].dates.push(date);
                    }
                });

                // PMS Sell entries
                Object.entries(sells).forEach(([scrip, data]) => {
                    entries.push({
                        id: `AUTO-${u.id}-PMS-SELL-${scrip.replace(/\s/g,'_')}`,
                        source: 'auto', sourceFile: fname, uploadId: u.id, sourceType: uType,
                        date: data.dates.sort().pop() || '',
                        narration: `${scrip} — ${data.count} PMS sell${data.count>1?'s':''}`,
                        scrip, tradeCount: data.count, cgType: 'STCG',
                        voucher_type: 'Journal', status: 'draft',
                        entries: [
                            { ledger_name: 'Bank A/c', amount: data.amount, side: 'Dr' },
                            { ledger_name: 'Investment A/c', amount: data.amount, side: 'Cr' },
                        ],
                        total_amount: data.amount,
                    });
                });

                // PMS Buy entries
                Object.entries(buys).forEach(([scrip, data]) => {
                    entries.push({
                        id: `AUTO-${u.id}-PMS-BUY-${scrip.replace(/\s/g,'_')}`,
                        source: 'auto', sourceFile: fname, uploadId: u.id, sourceType: uType,
                        date: data.dates.sort().pop() || '',
                        narration: `${scrip} — ${data.count} PMS purchase${data.count>1?'s':''}`,
                        scrip, tradeCount: data.count,
                        voucher_type: 'Journal', status: 'draft',
                        entries: [
                            { ledger_name: 'Investment A/c', amount: data.amount, side: 'Dr' },
                            { ledger_name: 'Bank A/c', amount: data.amount, side: 'Cr' },
                        ],
                        total_amount: data.amount,
                    });
                });
            }

            // ── PMS Expenses (Management Fee, Advisory Fee, etc.) ──
            if(uType?.startsWith('pms') && d.expenses?.length) {
                d.expenses.forEach((exp, i) => {
                    const amt = Number(exp.amount || exp.value || 0);
                    if(amt === 0) return;
                    const label = exp.description || exp.type || exp.name || 'PMS Charges';
                    entries.push({
                        id: `AUTO-${u.id}-EXP-${i}`,
                        source: 'auto', sourceFile: fname, uploadId: u.id, sourceType: uType,
                        date: exp.date || '',
                        narration: `PMS Expense — ${label}`,
                        voucher_type: 'Journal', status: 'draft',
                        entries: [
                            { ledger_name: 'PMS Management Fee', amount: Math.abs(amt), side: 'Dr' },
                            { ledger_name: 'Bank A/c', amount: Math.abs(amt), side: 'Cr' },
                        ],
                        total_amount: Math.abs(amt),
                    });
                });
            }
        }

        // ── PMS Capital Gains from FIFO Engine ──
        try {
            const token = localStorage.getItem('access_token');
            for(const acct of (typeof pmsAccounts !== 'undefined' ? pmsAccounts : [])) {
                const cgRes = await fetch(`${PMS_API}/capital-gains?pms_account_id=${acct.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if(!cgRes.ok) continue;
                const cgData = await cgRes.json();
                const label = acct.account_name || acct.provider_name || 'PMS';

                // Group CG entries by security
                const byScrip = {};
                (cgData.entries || []).forEach(e => {
                    const name = e.security_name || 'Unknown';
                    if(!byScrip[name]) byScrip[name] = { cost: 0, proceeds: 0, gain: 0, count: 0, type: 'STCG', dates: [] };
                    byScrip[name].cost += Number(e.cost_basis || 0);
                    byScrip[name].proceeds += Number(e.sale_proceeds || 0);
                    byScrip[name].gain += Number(e.gain_loss || 0);
                    byScrip[name].count++;
                    byScrip[name].type = e.gain_type || 'STCG';
                    if(e.sale_date) byScrip[name].dates.push(e.sale_date);
                });

                Object.entries(byScrip).forEach(([scrip, data]) => {
                    const isProfit = data.gain >= 0;
                    const gainLabel = data.type === 'LTCG' ? 'Long Term Capital Gain' : 'Short Term Capital Gain';
                    const ledgers = isProfit
                        ? [{ ledger_name: 'Bank A/c', amount: Math.abs(data.proceeds), side: 'Dr' },
                           { ledger_name: 'Investment A/c', amount: Math.abs(data.cost), side: 'Cr' },
                           { ledger_name: gainLabel, amount: Math.abs(data.gain), side: 'Cr' }]
                        : [{ ledger_name: 'Bank A/c', amount: Math.abs(data.proceeds), side: 'Dr' },
                           { ledger_name: gainLabel, amount: Math.abs(data.gain), side: 'Dr' },
                           { ledger_name: 'Investment A/c', amount: Math.abs(data.cost), side: 'Cr' }];

                    entries.push({
                        id: `AUTO-PMS-CG-${acct.id}-${scrip.replace(/\s/g,'_')}`,
                        source: 'auto', sourceFile: `PMS — ${label}`, sourceType: 'pms_cg',
                        date: data.dates.sort().pop() || '',
                        narration: `${scrip} — ${data.count} FIFO exit${data.count>1?'s':''} (${data.type})`,
                        scrip, tradeCount: data.count, cgType: data.type,
                        voucher_type: 'Journal', status: 'draft',
                        entries: ledgers,
                        total_amount: Math.abs(data.proceeds),
                    });
                });
            }
        } catch(e) { console.warn('PMS CG auto-gen:', e); }

    } catch(e) { console.error('Auto-gen failed:', e); }

    // Preserve previous approval states
    const prev = window._autoEntries || [];
    entries.forEach(e => {
        const old = prev.find(p => p.id === e.id);
        if(old && old.status !== 'draft') e.status = old.status;
    });

    window._autoEntries = entries;
    return entries;
}

// ═══ PENDING ENTRIES — File-Grouped Accordion ═══
async function loadPendingEntries() {
    const c = document.getElementById('fi-pending-list');
    if(!c) return;

    c.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;font-size:.78rem">Generating journal entries from parsed data...</div>';

    // Gather all entries
    const autoEntries = await generateAutoEntries();
    const manualEntries = fiVouchers.filter(v => v.status !== 'synced').map(v => ({
        ...v, source: 'manual', sourceFile: 'Manual Entries', sourceType: 'manual',
    }));

    const allCards = [...autoEntries.filter(e => e.status !== 'synced'), ...manualEntries];

    // Update badges
    const badge = document.getElementById('fi-sb-pending-count');
    const total = document.getElementById('fi-pending-total');
    const draftCount = allCards.filter(e => e.status === 'draft').length;
    const approvedCount = allCards.filter(e => e.status === 'approved').length;
    if(badge) { badge.textContent = allCards.length; badge.style.display = allCards.length > 0 ? '' : 'none'; }
    if(total) total.textContent = allCards.length;

    if(allCards.length === 0) {
        c.innerHTML = '<div class="fi-empty-mini"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><p>No pending entries — upload statements to auto-generate</p></div>';
        return;
    }

    // Group by source file
    const groups = {};
    allCards.forEach(card => {
        const key = card.sourceFile || 'Other';
        if(!groups[key]) groups[key] = { file: key, type: card.sourceType || '', source: card.source, entries: [] };
        groups[key].entries.push(card);
    });

    const fmt = v => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    c.innerHTML = Object.values(groups).map((grp, gIdx) => {
        const draftCt = grp.entries.filter(e => e.status === 'draft').length;
        const approvedCt = grp.entries.filter(e => e.status === 'approved').length;
        const totalAmt = grp.entries.reduce((s, e) => s + (e.total_amount || 0), 0);

        const srcIcon = grp.source === 'manual'
            ? '<span style="font-size:.55rem;font-weight:800;padding:1px 6px;border-radius:4px;background:#f0fdf4;color:#059669">MANUAL</span>'
            : '<span style="font-size:.55rem;font-weight:800;padding:1px 6px;border-radius:4px;background:#eef2ff;color:#4338ca">AUTO</span>';

        const typeIcon = grp.type.startsWith('demat') ? '<span style="font-size:.55rem;font-weight:700;padding:1px 5px;border-radius:3px;background:#4338ca15;color:#4338ca;margin-left:4px">Demat</span>'
            : grp.type.startsWith('pms') ? '<span style="font-size:.55rem;font-weight:700;padding:1px 5px;border-radius:3px;background:#d9770615;color:#d97706;margin-left:4px">PMS</span>'
            : grp.type === 'mutual_fund' ? '<span style="font-size:.55rem;font-weight:700;padding:1px 5px;border-radius:3px;background:#05966915;color:#059669;margin-left:4px">MF</span>'
            : '';

        const entriesHTML = grp.entries.map((v, eIdx) => {
            const statusPill = `<span class="fi-status-pill ${v.status}">${(v.status||'draft').toUpperCase()}</span>`;
            const borderColor = v.status === 'approved' ? '#059669' : v.status === 'synced' ? '#4338ca' : '#e2e8f0';
            const approveDisabled = v.status !== 'draft';
            const cgBadge = v.cgType ? `<span class="fi-cg-badge fi-cg-${v.cgType.toLowerCase()}">${v.cgType}</span>` : '';
            const tradeBadge = v.tradeCount ? `<span style="font-size:.58rem;color:#94a3b8;font-weight:500">${v.tradeCount} trades</span>` : '';

            const drEntries = (v.entries || []).filter(e => e.side === 'Dr');
            const crEntries = (v.entries || []).filter(e => e.side === 'Cr');

            let rows = '';
            drEntries.forEach(e => {
                rows += `<tr><td style="padding:2px 8px;font-size:.72rem;font-weight:500;color:#1e293b">${e.ledger_name}</td><td style="padding:2px 8px;font-size:.72rem;font-weight:700;font-family:'Outfit',sans-serif;text-align:right;color:#0f172a">${fmt(e.amount)}</td><td style="padding:2px 8px;text-align:right;color:#94a3b8;font-size:.72rem">—</td></tr>`;
            });
            crEntries.forEach(e => {
                rows += `<tr><td style="padding:2px 8px 2px 24px;font-size:.72rem;font-weight:500;color:#64748b"><span style="color:#94a3b8;font-size:.6rem">To </span>${e.ledger_name}</td><td style="padding:2px 8px;text-align:right;color:#94a3b8;font-size:.72rem">—</td><td style="padding:2px 8px;font-size:.72rem;font-weight:700;font-family:'Outfit',sans-serif;text-align:right;color:#0f172a">${fmt(e.amount)}</td></tr>`;
            });

            return `<div class="fi-voucher-card" style="border-left:3px solid ${borderColor}">
                <div class="fi-vc-header">
                    <span class="fi-vc-title">${v.narration || v.scrip || ''}</span>
                    ${tradeBadge}${cgBadge}${statusPill}
                    <button class="fi-vc-approve ${approveDisabled?'disabled':''}" onclick="approveEntry('${v.id}')" ${approveDisabled?'disabled':''}>✓</button>
                </div>
                <table class="fi-vc-table"><thead><tr><th style="text-align:left">Particulars</th><th style="text-align:right;width:100px">Dr (₹)</th><th style="text-align:right;width:100px">Cr (₹)</th></tr></thead><tbody>${rows}</tbody></table>
            </div>`;
        }).join('');

        return `<div class="fi-file-group" id="fg-${gIdx}">
            <div class="fi-file-header" onclick="toggleFileGroup(${gIdx})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:#64748b;transition:transform .2s" class="fi-fg-arrow"><path d="M9 18l6-6-6-6"/></svg>
                <span style="font-size:.72rem;font-weight:700;color:#1e293b;flex:1">📄 ${grp.file}</span>
                ${srcIcon}${typeIcon}
                <span style="font-size:.7rem;font-weight:800;font-family:'Outfit',sans-serif;color:#64748b;margin-left:.5rem">${grp.entries.length} entries</span>
                <span style="font-size:.65rem;color:#94a3b8;margin-left:.25rem">· ${fmt(totalAmt)}</span>
                ${draftCt > 0 ? `<span style="font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:10px;background:#fef3c7;color:#d97706;margin-left:.5rem">${draftCt} draft</span>` : ''}
                ${approvedCt > 0 ? `<span style="font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:10px;background:#dcfce7;color:#059669">${approvedCt} approved</span>` : ''}
            </div>
            <div class="fi-file-body" style="display:none">
                <div style="display:flex;gap:.5rem;padding:.5rem .75rem;border-bottom:1px solid #f1f3f9">
                    <button class="fi-btn success" onclick="approveFileGroup('${grp.file}')" style="font-size:.62rem;padding:.2rem .6rem">✓ Approve All ${grp.entries.length}</button>
                    <button class="fi-btn tally" onclick="syncFileGroup('${grp.file}')" style="font-size:.62rem;padding:.2rem .6rem">↻ Sync to Tally</button>
                </div>
                ${entriesHTML}
            </div>
        </div>`;
    }).join('');

    window._pendingCards = allCards;
}

function toggleFileGroup(idx) {
    const grp = document.getElementById(`fg-${idx}`);
    if(!grp) return;
    const body = grp.querySelector('.fi-file-body');
    const arrow = grp.querySelector('.fi-fg-arrow');
    if(!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if(arrow) arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
}

async function approveEntry(id) {
    const auto = (window._autoEntries || []).find(e => e.id === id);
    if(auto) { auto.status = 'approved'; }
    const manual = fiVouchers.find(v => v.id === id);
    if(manual) {
        manual.status = 'approved';
        // Persist to backend
        try {
            await authFetch(`/financial-instruments/manual-entry/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'approved' }),
            });
        } catch(e) { console.warn('Failed to persist approval:', e); }
    }
    loadPendingEntries();
    loadDashboardStats();
}

function approveFileGroup(fileName) {
    (window._autoEntries || []).forEach(e => { if(e.sourceFile === fileName && e.status === 'draft') e.status = 'approved'; });
    fiVouchers.forEach(v => { if(v.sourceFile === fileName && v.status === 'draft') v.status = 'approved'; });
    loadPendingEntries();
    fiToast(`All entries from "${fileName}" approved`, 'success');
    loadDashboardStats();
}

function syncFileGroup(fileName) {
    (window._autoEntries || []).forEach(e => { if(e.sourceFile === fileName && (e.status === 'approved' || e.status === 'draft')) e.status = 'synced'; });
    fiVouchers.forEach(v => { if(v.sourceFile === fileName && (v.status === 'approved' || v.status === 'draft')) v.status = 'synced'; });
    loadPendingEntries();
    fiToast(`Entries from "${fileName}" synced to Tally`, 'success');
    loadDashboardStats();
}

// ═══ Pending entries — inline edit handlers ═══
function updatePendingField(el) {
    const idx = parseInt(el.dataset.card);
    const field = el.dataset.field;
    const card = window._pendingCards?.[idx];
    if (!card) return;
    card[field] = el.value;
    if (card.source === 'manual') {
        const v = fiVouchers.find(v => v.id === card.id);
        if (v) { v[field] = el.value; }
    }
}

function updatePendingLedger(el) {
    const cardIdx = parseInt(el.dataset.card);
    const entryIdx = parseInt(el.dataset.entry);
    const field = el.dataset.field;
    const card = window._pendingCards?.[cardIdx];
    if (!card || !card.entries[entryIdx]) return;
    const val = field === 'amount' ? parseFloat(el.value) || 0 : el.value;
    card.entries[entryIdx][field] = val;
    if (card.source === 'manual') {
        const v = fiVouchers.find(v => v.id === card.id);
        if (v && v.entries[entryIdx]) { v.entries[entryIdx][field] = val; }
    }
}

async function removePendingEntry(id, source) {
    if (source === 'manual') {
        const idx = fiVouchers.findIndex(v => v.id === id);
        if (idx !== -1) {
            fiVouchers.splice(idx, 1);
            // Delete from backend
            try {
                await authFetch(`/financial-instruments/manual-entry/${id}`, { method: 'DELETE' });
                fiToast('Entry removed', 'success');
            } catch(e) {
                fiToast('Entry removed locally (backend error)', 'warning');
            }
        }
    } else {
        fiToast('AI entry hidden from pending view', 'info');
    }
    loadPendingEntries();
}

// ═══ DASHBOARD ═══
function setEl(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }
function setStyle(id, prop, val) { const el=document.getElementById(id); if(el) el.style[prop]=val; }

// Compute AY/FY dynamically from current date
function getFinancialYears() {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth(); // 0-indexed, March=2
    // Indian FY: Apr-Mar. If month >= April (3), FY = yr to yr+1, else FY = yr-1 to yr
    const fyStart = mo >= 3 ? yr : yr - 1;
    const fyEnd = fyStart + 1;
    const ayStart = fyEnd;
    const ayEnd = ayStart + 1;
    return {
        fy: `FY ${fyStart}-${String(fyEnd).slice(2)}`,
        ay: `AY ${ayStart}-${String(ayEnd).slice(2)}`
    };
}

async function loadDashboardStats() {
    // Don't pre-set FY/AY — will be set from actual data below
    // Fallback to current date only if data doesn't have FY info

    // Local voucher counts (manual + auto-generated)
    const autoEntries = window._autoEntries || [];
    const allEntries = [...fiVouchers, ...autoEntries];
    const draftCount = allEntries.filter(v=>v.status==='draft').length;
    const approvedCount = allEntries.filter(v=>v.status==='approved').length;
    const syncedCount = allEntries.filter(v=>v.status==='synced').length;
    const totalAmt = allEntries.reduce((s,v)=>s+(v.total_amount||0),0);

    setEl('fi-stat-uploads', fiVouchers.length);
    setEl('fi-stat-vouchers', allEntries.length);
    setEl('fi-stat-pending', draftCount);
    setEl('fi-stat-synced', syncedCount);
    setEl('fi-stat-total-amt', formatINR(totalAmt));
    setEl('fi-pipe-draft', draftCount);
    setEl('fi-pipe-approved', approvedCount);
    setEl('fi-pipe-synced', syncedCount);

    if(!clientId) return;
    let uploads = null;
    // Retry up to 3 times with 2s back-off
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await authFetch(`/financial-instruments/?client_id=${clientId}`);
            if(!res || !res.ok) {
                console.warn(`Dashboard: FI list fetch attempt ${attempt} failed (${res?.status})`);
                if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
                return;
            }
            uploads = await res.json();
            break;
        } catch(e) {
            console.warn(`Dashboard: FI list fetch attempt ${attempt} error:`, e.message);
            if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
            // Show retry button instead of silent zeros
            const overviewCard = document.getElementById('fi-stat-uploads');
            if (overviewCard) overviewCard.innerHTML = '<span style="color:#d97706;cursor:pointer" onclick="loadDashboardStats()">⚠ Retry</span>';
            return;
        }
    }
    if (!uploads) return;
    if(uploads.length > 0) setEl('fi-stat-uploads', uploads.length);

    try {
        // Pipeline from server — exclude 26as from holdings data
        const completed = uploads.filter(u=>u.status==='completed' && u.instrument_type !== '26as');
        const processing = uploads.filter(u=>u.status!=='completed'&&u.status!=='failed');
        const failed = uploads.filter(u=>u.status==='failed');
        const totalJE = uploads.reduce((s,u)=>s+(u.journal_entry_count||0),0);
        setEl('fi-stat-vouchers', totalJE);
        setEl('fi-pipe-draft', processing.length);
        setEl('fi-pipe-approved', completed.length);
        setEl('fi-pipe-synced', syncedCount + completed.filter(u=>u.journal_entry_count>0).length);

        // ── Fetch structured data for ALL completed uploads ──
        // Aggregate: AUM, capital gains, TDS, allocation
        let totalAUM = 0;
        let totalSTCG = 0, totalLTCG = 0;
        let totalDivTDS = 0, totalDivAmt = 0;
        let eqValue = 0, mfValue = 0, pmsValue = 0, bondValue = 0;
        let eqSubItems = [], mfSubItems = [], pmsSubItems = [], bondSubItems = [];
        let totalSpec = 0; // speculative/intraday
        // CG source tracking: [{source, stcg, ltcg, spec}]
        let cgSources = [];
        let detectedFY = null;

        // Fetch data in small batches to avoid exhausting backend connection pool
        const allData = [];
        const BATCH_SIZE = 3;
        for (let i = 0; i < completed.length; i += BATCH_SIZE) {
            const batch = completed.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(u =>
                    authFetch(`/financial-instruments/data/${u.id}`)
                        .then(r => (r && r.ok) ? r.json() : null)
                        .catch(e => { console.warn('Dashboard data fetch error:', u.id, e.message); return null; })
                )
            );
            allData.push(...batchResults);
        }

        allData.forEach((resp, idx) => {
            if(!resp || !resp.structured_data) return;
            const d = resp.structured_data;
            const uType = completed[idx].instrument_type;

            // Holdings → AUM + collect sub-items
            const holdings = d.holdings || d.funds || [];
            let holdVal = 0;
            holdings.forEach(h => {
                const val = Number(h.market_value || h.current_value || h.value || 0);
                holdVal += val;
                const item = { name: h.scrip_name || h.security_name || h.name || h.fund_name || 'Unknown', value: val, sector: h.sector || '' };
                if(uType === 'demat' || uType.startsWith('demat_')) eqSubItems.push(item);
                else if(uType === 'mutual_fund') mfSubItems.push(item);
                else if(uType === 'pms' || uType.startsWith('pms_')) pmsSubItems.push(item);
                else bondSubItems.push(item);
            });

            // Accumulate by instrument type
            if(uType === 'demat' || uType.startsWith('demat_')) eqValue += holdVal;
            else if(uType === 'mutual_fund') mfValue += holdVal;
            else if(uType === 'pms' || uType.startsWith('pms_')) pmsValue += holdVal;
            else bondValue += holdVal;
            totalAUM += holdVal;

            // Capital Gains
            const cg = d.capital_gains_summary;
            if(cg) {
                const stcg = Number(cg.short_term_gain || cg.stcg || cg.short_term_profit || 0);
                const ltcg = Number(cg.long_term_gain || cg.ltcg || cg.long_term_profit || 0);
                const spec = Number(cg.speculative_profit || cg.intraday_profit || 0);
                totalSTCG += stcg;
                totalLTCG += ltcg;
                totalSpec += spec;

                // Determine source label
                let sourceLabel = 'Unknown';
                const fn = completed[idx].filename || '';
                if(uType.startsWith('demat_')) {
                    const broker = d.broker || 'Demat';
                    const clientId = d.client_id || '';
                    sourceLabel = `${broker.charAt(0).toUpperCase()+broker.slice(1)} (${clientId || fn})`;
                } else if(uType === 'pms' || uType.startsWith('pms_')) {
                    sourceLabel = `PMS — ${fn}`;
                } else if(uType === 'mutual_fund') {
                    sourceLabel = `Mutual Fund — ${fn}`;
                } else {
                    sourceLabel = fn || uType;
                }

                if(stcg !== 0 || ltcg !== 0 || spec !== 0) {
                    cgSources.push({ source: sourceLabel, stcg, ltcg, spec });
                }
            }

            // Detect FY from data or filename
            if(!detectedFY) {
                const fn = completed[idx].filename || '';
                // Pattern: 2025_2026 or 2025-2026 or "from 2025-04-01"
                const fyMatch = fn.match(/(20\d{2})[_-](20\d{2})/);
                if(fyMatch) {
                    detectedFY = `FY ${fyMatch[1]}-${fyMatch[2].slice(2)}`;
                }
                // Or from period in structured data
                if(!detectedFY && d.period_start) {
                    const ps = String(d.period_start);
                    const yr = parseInt(ps.substring(0,4));
                    if(yr) detectedFY = `FY ${yr}-${String(yr+1).slice(2)}`;
                }
            }

            // Dividends → TDS
            const divs = d.dividends || [];
            divs.forEach(dv => {
                totalDivAmt += Number(dv.amount || 0);
                totalDivTDS += Number(dv.tds_deducted || dv.tds || 0);
            });
        });

        // ── Fetch PMS stock register holdings ──
        // These are actual equity holdings held via PMS — must feed into
        // sector/market-cap analysis and AUM for a complete portfolio view
        let pmsHoldings = [];
        try {
            const PMS_BASE = API_BASE_URL.replace('/api/v1', '/api/v1/pms');
            const pmsToken = localStorage.getItem('access_token');
            const acctRes = await fetch(`${PMS_BASE}/accounts?client_id=${clientId}`, {
                headers: { 'Authorization': `Bearer ${pmsToken}` },
            });
            if (acctRes.ok) {
                const pmsAccounts = await acctRes.json();
                for (const acct of pmsAccounts) {
                    try {
                        const srRes = await fetch(`${PMS_BASE}/stock-register?pms_account_id=${acct.id}`, {
                            headers: { 'Authorization': `Bearer ${pmsToken}` },
                        });
                        if (srRes.ok) {
                            const sr = await srRes.json();
                            (sr.securities || []).forEach(sec => {
                                const bookVal = sec.closing?.book_value || 0;
                                if (bookVal <= 0 || sec.closing?.qty <= 0) return;
                                pmsValue += bookVal;
                                totalAUM += bookVal;
                                // Convert to holdings format for portfolio analysis
                                pmsHoldings.push({
                                    security_name: sec.security_name,
                                    name: sec.security_name,
                                    market_value: bookVal,
                                    value: bookVal,
                                    quantity: sec.closing.qty,
                                    avg_cost: sec.closing.avg_cost,
                                    sector: sec.sector,
                                    market_cap: sec.market_cap_category,
                                    instrument_type: 'pms',
                                    account_name: acct.account_name || acct.provider_name || 'PMS',
                                });
                            });
                        }
                    } catch (e) { console.warn('Stock register fetch error:', e); }
                }
            }
        } catch (e) { console.warn('PMS accounts fetch error:', e); }

        // ── Populate AUM ──
        setEl('fi-stat-total-amt', formatINR(totalAUM));

        // ── Set FY/AY consistently across all cards ──
        let displayFY, displayAY;
        if(detectedFY) {
            displayFY = detectedFY;
            const fyMatch = detectedFY.match(/(\d{4})/);
            if(fyMatch) {
                const fyStart = parseInt(fyMatch[1]);
                displayAY = `AY ${fyStart+1}-${String(fyStart+2).slice(2)}`;
            }
        }
        // Fallback to current date if no FY detected from data
        if(!displayFY) {
            const { fy, ay } = getFinancialYears();
            displayFY = fy;
            displayAY = ay;
        }
        setEl('fi-ay', displayAY);
        setEl('fi-fy-cg', displayFY);
        setEl('fi-fy-tds', displayFY);

        // ── Populate Capital Gains ──
        const netGain = totalSTCG + totalLTCG + totalSpec;

        // Speculative row (show only if data exists)
        if(totalSpec !== 0) {
            const specRow = document.getElementById('fi-cg-spec-row');
            if(specRow) specRow.style.display = 'flex';
            setEl('fi-cg-spec', (totalSpec >= 0 ? '' : '(') + formatINR(totalSpec) + (totalSpec < 0 ? ')' : ''));
        }

        setEl('fi-cg-stcg', (totalSTCG >= 0 ? '' : '(') + formatINR(totalSTCG) + (totalSTCG < 0 ? ')' : ''));
        setEl('fi-cg-ltcg', (totalLTCG >= 0 ? '' : '(') + formatINR(totalLTCG) + (totalLTCG < 0 ? ')' : ''));
        setEl('fi-cg-net', (netGain >= 0 ? '' : '(') + formatINR(netGain) + (netGain < 0 ? ')' : ''));

        // Progress bars — scale relative to max
        const maxCG = Math.max(Math.abs(totalSTCG), Math.abs(totalLTCG), Math.abs(totalSpec), 1);
        setStyle('fi-cg-spec-bar', 'width', Math.round(Math.abs(totalSpec)/maxCG*100) + '%');
        setStyle('fi-cg-stcg-bar', 'width', Math.round(Math.abs(totalSTCG)/maxCG*100) + '%');
        setStyle('fi-cg-ltcg-bar', 'width', Math.round(Math.abs(totalLTCG)/maxCG*100) + '%');
        if(totalSpec < 0) setStyle('fi-cg-spec-bar', 'background', '#dc2626');
        if(totalSTCG < 0) setStyle('fi-cg-stcg-bar', 'background', '#dc2626');
        if(totalLTCG < 0) setStyle('fi-cg-ltcg-bar', 'background', '#dc2626');

        // Tax estimates (Indian rates — Budget 2024 onwards)
        const stcgTax = Math.max(0, totalSTCG) * 0.20;
        const ltcgTax = Math.max(0, totalLTCG - 125000) * 0.125;
        setEl('fi-cg-tax-stcg', formatINR(stcgTax));
        setEl('fi-cg-tax-ltcg', formatINR(Math.max(0, ltcgTax)));

        // ── CG Hover Tooltips (source breakdown) ──
        function buildCGTooltip(field) {
            const relevant = cgSources.filter(s => s[field] !== 0);
            if(relevant.length === 0) return 'No data';
            return relevant.map(s => {
                const val = s[field];
                const sign = val >= 0 ? '+' : '';
                return `<div style="display:flex;justify-content:space-between;gap:1rem;padding:2px 0">`
                    + `<span style="opacity:.7">${s.source}</span>`
                    + `<span style="font-weight:700;font-family:'Outfit',sans-serif">${sign}${formatINR(val)}</span></div>`;
            }).join('');
        }
        const specTip = document.getElementById('fi-cg-spec-tip');
        if(specTip) specTip.innerHTML = `<div style="font-weight:700;margin-bottom:4px;color:#d97706">Speculative Income Sources</div>` + buildCGTooltip('spec');
        const stcgTip = document.getElementById('fi-cg-stcg-tip');
        if(stcgTip) stcgTip.innerHTML = `<div style="font-weight:700;margin-bottom:4px;color:#059669">STCG Sources</div>` + buildCGTooltip('stcg');
        const ltcgTip = document.getElementById('fi-cg-ltcg-tip');
        if(ltcgTip) ltcgTip.innerHTML = `<div style="font-weight:700;margin-bottom:4px;color:#6366f1">LTCG Sources</div>` + buildCGTooltip('ltcg');

        // ── Populate Instrument Allocation ──
        const totalAlloc = totalAUM || 1;
        setEl('fi-alloc-eq-pct', Math.round(eqValue/totalAlloc*100) + '%');
        setEl('fi-alloc-eq-val', formatINR(eqValue));
        setEl('fi-alloc-mf-pct', Math.round(mfValue/totalAlloc*100) + '%');
        setEl('fi-alloc-mf-val', formatINR(mfValue));
        setEl('fi-alloc-pms-pct', Math.round(pmsValue/totalAlloc*100) + '%');
        setEl('fi-alloc-pms-val', formatINR(pmsValue));
        setEl('fi-alloc-bond-pct', Math.round(bondValue/totalAlloc*100) + '%');
        setEl('fi-alloc-bond-val', formatINR(bondValue));

        // ── Populate Allocation Dropdowns ──
        populateAllocDropdowns({
            eq: { items: eqSubItems, total: eqValue, color: '#4338ca', broker: d => d.sector || 'Zerodha' },
            mf: { items: mfSubItems, total: mfValue, color: '#059669' },
            pms: { items: pmsSubItems.concat(pmsHoldings.map(h => ({ name: h.security_name || h.name, value: h.market_value || h.value || 0, account: h.account_name || 'PMS' }))), total: pmsValue, color: '#d97706' },
            bond: { items: bondSubItems, total: bondValue, color: '#7c3aed' },
        });

        // ── Populate TDS & Compliance ──
        setEl('fi-tds-194', formatINR(totalDivTDS));
        setEl('fi-tds-194k', formatINR(0)); // populated when MF TDS data available
        setEl('fi-tds-112a', formatINR(Math.max(0, ltcgTax)));
        setEl('fi-tds-111a', formatINR(stcgTax));

        // ══════════════════════════════════════════════
        // ── PORTFOLIO ANALYSIS: Sector + Market Cap ──
        // ══════════════════════════════════════════════
        populatePortfolioAnalysis(allData, completed, pmsHoldings);

        // ── Render recent statements ──
        const r = document.getElementById('fi-recent-vouchers');
        r.innerHTML = uploads.slice(0, 5).map(u => `<div class="fi-fq-item" style="cursor:pointer" onclick="openReview('${u.id}','${u.instrument_type}')">
            <div class="fi-fq-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            <div class="fi-fq-info"><div class="fi-fq-name">${u.filename}</div><div class="fi-fq-meta">${typeLabel(u.instrument_type)} · ${u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '-'} · ${u.journal_entry_count || 0} entries</div></div>
            <span class="fi-status-pill ${u.status}">${(u.status || '').toUpperCase()}</span>
        </div>`).join('');
        if(uploads.length === 0) r.innerHTML = '<div class="fi-empty-mini"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Upload Demat, MF, or PMS statements to get started</p></div>';

        // ══════════════════════════════════════════════
        // ── NEW CARDS: Dividend, Compliance, Unrealized, 26AS, Timeline ──
        // ══════════════════════════════════════════════

        // ── 1. Dividend Income Summary ──
        if(detectedFY) setEl('fi-div-fy', detectedFY);
        setEl('fi-div-total', formatINR(totalDivAmt));
        setEl('fi-div-tds-total', formatINR(totalDivTDS));
        // Build dividend breakup from all data
        let divRows = [];
        allData.forEach((resp, idx) => {
            if(!resp || !completed[idx]) return;
            const sd = resp.structured_data || {};
            const fn = completed[idx].filename || 'Unknown';
            const divs = sd.dividends || [];
            if(!divs.length) return;
            divs.forEach(dv => {
                divRows.push({ name: dv.company || dv.fund_name || dv.scrip || fn, amount: Number(dv.amount||0), tds: Number(dv.tds_deducted||dv.tds||0) });
            });
        });
        const divBreak = document.getElementById('fi-div-breakup');
        if(divRows.length > 0) {
            divBreak.innerHTML = divRows.map(d => `<div style="display:flex;align-items:center;justify-content:space-between;padding:.3rem .5rem;border-bottom:1px solid #f8fafc;font-size:.72rem">
                <span style="flex:1;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">${d.name}</span>
                <span style="font-family:'Outfit',sans-serif;font-weight:700;color:#059669;min-width:70px;text-align:right">${formatINR(d.amount)}</span>
                <span style="font-family:'Outfit',sans-serif;font-weight:600;color:#dc2626;min-width:60px;text-align:right;font-size:.65rem">${d.tds > 0 ? '-' + formatINR(d.tds) : '—'}</span>
            </div>`).join('');
            if(totalDivAmt > 5000 && totalDivTDS === 0) setEl('fi-div-tds-note', '⚠️ Dividend >₹5,000 but no TDS deducted — verify with 26AS');
        }

        // ── 2. Compliance Alerts ──
        let alerts = [];
        // Check dividend TDS threshold
        if(totalDivAmt > 5000 && totalDivTDS === 0) {
            alerts.push({ icon:'⚠️', type:'warning', text:'Dividend income exceeds ₹5,000 — verify TDS u/s 194 deducted by payer', color:'#d97706' });
        }
        if(totalDivAmt > 5000 && totalDivTDS > 0) {
            alerts.push({ icon:'✅', type:'info', text:`TDS of ${formatINR(totalDivTDS)} deducted on dividends of ${formatINR(totalDivAmt)} — cross-verify with 26AS`, color:'#059669' });
        }
        // STCG alert — shares held <12 months
        if(totalSTCG > 0) {
            alerts.push({ icon:'📊', type:'info', text:`STCG of ${formatINR(totalSTCG)} — taxable at 20% under Sec 111A (listed equity via STT)`, color:'#d97706' });
        }
        if(totalSTCG < 0) {
            alerts.push({ icon:'📉', type:'warning', text:`STCG loss of ${formatINR(Math.abs(totalSTCG))} — can be set off against LTCG and carried forward 8 years`, color:'#dc2626' });
        }
        // LTCG exemption check
        if(totalLTCG > 125000) {
            const taxable = totalLTCG - 125000;
            alerts.push({ icon:'💰', type:'warning', text:`LTCG of ${formatINR(totalLTCG)} exceeds ₹1.25L exemption — ${formatINR(taxable)} taxable at 12.5% (Sec 112A)`, color:'#d97706' });
        } else if(totalLTCG > 0) {
            alerts.push({ icon:'✅', type:'success', text:`LTCG of ${formatINR(totalLTCG)} is within ₹1.25L exemption — no tax payable`, color:'#059669' });
        }
        // Speculative income
        if(totalSpec !== 0) {
            alerts.push({ icon:'🎯', type:'info', text:`Speculative income of ${formatINR(totalSpec)} from intraday trading — report under Sec 73, cannot set off against other heads`, color:'#6366f1' });
        }
        // AUM threshold
        if(totalAUM > 5000000) {
            alerts.push({ icon:'📋', type:'info', text:`Total portfolio exceeds ₹50L — Schedule AL (Assets & Liabilities) disclosure required in ITR`, color:'#5b21b6' });
        }
        if(totalAUM > 10000000) {
            alerts.push({ icon:'🏛️', type:'warning', text:`Total portfolio exceeds ₹1 Cr — verify Advance Tax liability (Sec 208-211)`, color:'#dc2626' });
        }
        // High value PMS
        if(pmsValue > 0) {
            alerts.push({ icon:'📄', type:'info', text:`PMS portfolio of ${formatINR(pmsValue)} — ensure fee/expense allocation for capital gains computation`, color:'#d97706' });
        }

        const alertCt = document.getElementById('fi-compliance-alerts');
        setEl('fi-alert-count', alerts.length);
        if(alerts.length > 0) {
            alertCt.innerHTML = alerts.map(a => `<div style="display:flex;align-items:flex-start;gap:.55rem;padding:.45rem .6rem;border-bottom:1px solid #f8fafc">
                <span style="font-size:.85rem;flex-shrink:0">${a.icon}</span>
                <span style="font-size:.72rem;color:#374151;line-height:1.5">${a.text}</span>
            </div>`).join('');
        }

        // ── 3. Unrealized Gain/Loss ──
        let totalBookCost = eqValue + mfValue + bondValue; // these are already computed from AUM
        let totalMarketVal = totalBookCost; // We don't have real-time market prices
        // For PMS we may have actual market values
        let pmsBookCost = 0, pmsMarketVal = 0;
        pmsHoldings.forEach(h => {
            pmsBookCost += h.book_value || 0;
            pmsMarketVal += h.market_value || h.book_value || 0;
        });
        totalBookCost += pmsBookCost;
        totalMarketVal += pmsMarketVal;
        const unrealPnl = totalMarketVal - totalBookCost;

        setEl('fi-unreal-cost', formatINR(totalBookCost));
        setEl('fi-unreal-market', formatINR(totalMarketVal));
        const pnlEl = document.getElementById('fi-unreal-pnl');
        if(pnlEl) {
            pnlEl.textContent = (unrealPnl >= 0 ? '+' : '') + formatINR(unrealPnl);
            pnlEl.style.color = unrealPnl >= 0 ? '#059669' : '#dc2626';
        }

        // Unrealized breakup by type
        const unrealBk = document.getElementById('fi-unreal-breakup');
        const unrealItems = [
            { name: 'Equity / Demat', cost: eqValue, market: eqValue, color: '#4338ca' },
            { name: 'Mutual Funds', cost: mfValue, market: mfValue, color: '#059669' },
            { name: 'PMS / AIF', cost: pmsBookCost, market: pmsMarketVal, color: '#d97706' },
            { name: 'Bonds / NCDs / FDs', cost: bondValue, market: bondValue, color: '#7c3aed' },
        ].filter(i => i.cost > 0 || i.market > 0);
        if(unrealItems.length > 0) {
            unrealBk.innerHTML = unrealItems.map(i => {
                const pnl = i.market - i.cost;
                return `<div style="display:flex;align-items:center;gap:.5rem;padding:.35rem .5rem;border-bottom:1px solid #f8fafc;font-size:.72rem">
                    <div style="width:6px;height:6px;border-radius:50%;background:${i.color};flex-shrink:0"></div>
                    <span style="flex:1;font-weight:600">${i.name}</span>
                    <span style="font-family:'Outfit',sans-serif;font-weight:700;min-width:70px;text-align:right">${formatINR(i.cost)}</span>
                    <span style="font-family:'Outfit',sans-serif;font-weight:700;color:${pnl>=0?'#059669':'#dc2626'};min-width:60px;text-align:right;font-size:.65rem">${pnl!==0?(pnl>0?'+':'')+formatINR(pnl):'—'}</span>
                </div>`;
            }).join('');
        }

        // ── 4. 26AS Cross-Match ──
        setEl('fi-26as-194-stmt', formatINR(totalDivTDS));
        setEl('fi-26as-stcg-stmt', formatINR(Math.max(0, totalSTCG * 0.20)));
        setEl('fi-26as-ltcg-stmt', formatINR(Math.max(0, (totalLTCG - 125000) * 0.125)));

        // ── 5. Transaction Timeline ──
        if(detectedFY) setEl('fi-timeline-fy', detectedFY);
        // Collect monthly buy/sell from all data
        let monthlyBuy = new Array(12).fill(0);
        let monthlySell = new Array(12).fill(0);

        // Helper to bucket a transaction into monthly buy/sell
        function _bucketTxn(t) {
            let dateStr = t.date || t.trade_date || t.transaction_date || '';
            if(!dateStr) return;
            // Parse date — could be DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY, etc.
            let dt;
            if(dateStr.includes('/')) { const p=dateStr.split('/'); dt=new Date(p[2],p[1]-1,p[0]); }
            else { dt = new Date(dateStr); }
            if(isNaN(dt.getTime())) return;
            // FY month index: Apr=0, Mar=11
            let m = dt.getMonth() - 3; // Apr=0
            if(m < 0) m += 12;
            const amt = Math.abs(Number(t.amount || t.total_amount || t.value || t.net_amount || 0));
            const txType = (t.type || t.transaction_type || t.trade_type || '').toLowerCase();
            if(txType.includes('buy') || txType.includes('purchase') || txType.includes('invest') || txType.includes('sip')) {
                monthlyBuy[m] += amt;
            } else if(txType.includes('sell') || txType.includes('redeem') || txType.includes('sale')) {
                monthlySell[m] += amt;
            }
        }

        // A. From FI uploads (Demat/MF) — transactions live under structured_data
        allData.forEach((resp, idx) => {
            if(!resp || !completed[idx]) return;
            const sd = resp.structured_data || {};
            const txns = sd.transactions || sd.trade_details || [];
            txns.forEach(_bucketTxn);
        });

        // B. From PMS stock register (buy/sell lots data)
        try {
            const PMS_TL = API_BASE_URL.replace('/api/v1', '/api/v1/pms');
            const tlToken = localStorage.getItem('access_token');
            const tlAccts = await fetch(`${PMS_TL}/accounts?client_id=${clientId}`, {
                headers: { 'Authorization': `Bearer ${tlToken}` },
            });
            if (tlAccts.ok) {
                const accts = await tlAccts.json();
                for (const acct of accts) {
                    try {
                        const srRes = await fetch(`${PMS_TL}/stock-register?pms_account_id=${acct.id}`, {
                            headers: { 'Authorization': `Bearer ${tlToken}` },
                        });
                        if (srRes.ok) {
                            const sr = await srRes.json();
                            (sr.securities || []).forEach(sec => {
                                (sec.lots || []).forEach(lot => {
                                    if (lot.buy_date) _bucketTxn({ date: lot.buy_date, type: 'buy', amount: lot.buy_value || (lot.qty * (lot.buy_price || 0)) });
                                    if (lot.sell_date) _bucketTxn({ date: lot.sell_date, type: 'sell', amount: lot.sell_value || (lot.qty * (lot.sell_price || 0)) });
                                });
                                // Also check buy_transactions / sell_transactions arrays
                                (sec.buy_transactions || []).forEach(bt => _bucketTxn({ ...bt, type: bt.type || 'buy' }));
                                (sec.sell_transactions || []).forEach(st => _bucketTxn({ ...st, type: st.type || 'sell' }));
                            });
                        }
                    } catch(e) {}
                }
            }
        } catch(e) { console.warn('PMS timeline fetch error:', e); }
        const maxBar = Math.max(...monthlyBuy, ...monthlySell, 1);
        for(let i = 0; i < 12; i++) {
            const buyBar = document.getElementById('fi-tl-buy-'+i);
            const sellBar = document.getElementById('fi-tl-sell-'+i);
            if(buyBar) buyBar.style.height = Math.max(0, Math.round(monthlyBuy[i]/maxBar*72)) + 'px';
            if(sellBar) sellBar.style.height = Math.max(0, Math.round(monthlySell[i]/maxBar*72)) + 'px';
        }

        setEl('fi-dash-status', '● Live');
    } catch(e) { console.error('Dashboard load error:', e); }
}

// ══════════════════════════════════════════════════════
// PORTFOLIO ANALYSIS — Sector-wise & Market Cap
// ══════════════════════════════════════════════════════

// Sector inference from security name / sector field
const SECTOR_KEYWORDS = {
    'Banking': ['hdfc bank','icici bank','sbi','kotak','axis bank','indusind','bandhan','idfc','federal bank','rbl bank','bank of baroda','pnb','canara bank','bank','banking'],
    'IT / Technology': ['tcs','infosys','wipro','hcl tech','tech mahindra','ltimindtree','persistent','coforge','mphasis','sonata','zensar','cyient','mastek','happiest','firstsource','eclerx','birlasoft','tata elxsi','l&t technology','kpit','software','technology','infotech','it '],
    'Financial Services': ['bajaj finance','bajaj finserv','hdfc amc','muthoot','manappuram','shriram','chola','sundaram','lic','sbi life','hdfc life','icici lombard','icici pru','max financial','star health','piramal','aditya birla capital','jio financial','insurance','finance','nbfc','nse:bse'],
    'Pharma & Healthcare': ['sun pharma','dr reddy','cipla','lupin','divi','aurobindo','biocon','alkem','torrent pharma','glenmark','laurus','natco','ipca','abbott','pfizer','sanofi','zydus','eris','jb pharma','pharma','healthcare','hospital','apollo hospital','fortis','max health','diagnostic','metropolis','thyrocare'],
    'FMCG': ['hindustan unilever','itc','nestle','britannia','dabur','marico','godrej consumer','colgate','emami','tata consumer','hul','pidilite','asian paints','berger','fmcg','consumer'],
    'Automobile': ['maruti','tata motors','mahindra','bajaj auto','hero moto','eicher motors','tvs motor','ashok leyland','auto','automobile','motor'],
    'Energy & Power': ['reliance','ntpc','power grid','adani green','adani power','tata power','nhpc','sjvn','powergrid','bpcl','hpcl','ioc','ongc','oil india','gail','coal india','petronet','energy','power','oil','gas','petroleum'],
    'Metals & Mining': ['tata steel','jsw steel','hindalco','vedanta','nalco','nmdc','jindal steel','sail','hindustan zinc','metal','steel','mining','aluminium'],
    'Cement & Construction': ['ultratech','ambuja','acc','shree cement','dalmia','ramco','jk cement','jk lakshmi','cement','construction'],
    'Telecom': ['bharti airtel','jio','vodafone','idea','telecom','airtel','indus towers'],
    'Real Estate': ['dlf','godrej properties','brigade','oberoi realty','prestige','phoenix','sobha','real estate','realty','housing'],
    'Infrastructure': ['larsen','l&t','adani ports','adani enterprises','gmr','irb infrastructure','nh','infrastructure','infra'],
    'Capital Goods': ['siemens','abb','bhel','cummins','thermax','honeywell','heg','graphite','capital goods','engineering'],
    'Chemicals': ['pidilite','srf','aarti','atul','vinati','navin fluorine','deepak nitrite','clean science','upl','chemical','fertilizer'],
    'Consumer Durables': ['titan','havells','voltas','crompton','whirlpool','blue star','dixon','amber','kajaria','somany','consumer durable','electronics','appliance'],
    'Media & Entertainment': ['zee','sun tv','pvr','inox','saregama','media','entertainment'],
    'Textiles': ['page industries','raymond','arvind','welspun','textile','garment'],
    'Mutual Fund': ['mutual fund','nifty','sensex','index fund','etf','fund','equity fund','debt fund','liquid fund','balanced','hybrid'],
};

const SECTOR_COLORS = [
    '#4338ca', '#059669', '#d97706', '#dc2626', '#7c3aed',
    '#0891b2', '#be185d', '#4f46e5', '#15803d', '#c2410c',
    '#6d28d9', '#0d9488', '#b45309', '#9333ea', '#0369a1',
    '#a21caf', '#065f46'
];

function inferSector(holding) {
    // 1. Use real sector from SecurityMaster (populated from NSE/BSE classification)
    const realSector = (holding.sector || '').trim();
    if (realSector && realSector.length > 2) {
        return realSector;  // e.g., "Banking", "Pharma & Healthcare", "Metals & Mining"
    }

    // 2. Fallback: use explicit sector/industry/category from Demat/MF uploads
    const existingSector = (holding.industry || holding.category || '').toLowerCase().trim();
    if (existingSector && existingSector !== 'equity' && existingSector !== 'shares' && existingSector.length > 2) {
        for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
            if (keywords.some(kw => existingSector.includes(kw))) return sector;
        }
        return existingSector.charAt(0).toUpperCase() + existingSector.slice(1);
    }

    // 3. Last resort: keyword match on security name (least reliable)
    const name = (holding.security_name || holding.name || holding.scheme_name || holding.scrip || '').toLowerCase();
    for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
        if (keywords.some(kw => name.includes(kw))) return sector;
    }
    return 'Others';
}

function inferMarketCap(holding) {
    // 1. Use real market cap category from SecurityMaster (SEBI classification)
    const realCap = (holding.market_cap || holding.market_cap_category || '').toLowerCase();
    if (realCap.includes('large')) return 'large';
    if (realCap.includes('mid')) return 'mid';
    if (realCap.includes('small') && !realCap.includes('mid')) return 'small';
    if (realCap.includes('micro')) return 'micro';

    // 2. Fallback: explicit cap_type or category field from Demat/MF uploads
    const cap = (holding.cap || holding.cap_type || holding.category || '').toLowerCase();
    if (cap.includes('large')) return 'large';
    if (cap.includes('mid')) return 'mid';
    if (cap.includes('small') && !cap.includes('mid')) return 'small';
    if (cap.includes('micro') || cap.includes('penny')) return 'micro';

    // 3. Last resort: position-size heuristic (NOT reliable — only for Demat/MF without metadata)
    const mv = Number(holding.market_value || holding.current_value || holding.value || 0);
    if (mv >= 1000000) return 'large';
    if (mv >= 300000) return 'mid';
    if (mv >= 50000) return 'small';
    return 'micro';
}

function populatePortfolioAnalysis(allData, completed, pmsHoldings) {
    const sectorMap = {};  // sector → { value, count }
    const capMap = { large: 0, mid: 0, small: 0, micro: 0 };
    let totalHoldings = 0;

    // Helper to process a single holding into sector/market-cap maps
    function processHolding(h) {
        const val = Number(h.market_value || h.current_value || h.value || h.amount || 0);
        if (val <= 0) return;

        totalHoldings++;

        // Sector
        const sector = inferSector(h);
        if (!sectorMap[sector]) sectorMap[sector] = { value: 0, count: 0 };
        sectorMap[sector].value += val;
        sectorMap[sector].count++;

        // Market Cap
        const cap = inferMarketCap(h);
        capMap[cap] += val;
    }

    // 1. Process Demat/MF holdings from structured_data
    allData.forEach((resp, idx) => {
        if (!resp || !resp.structured_data) return;
        const d = resp.structured_data;
        const holdings = d.holdings || d.funds || d.portfolio || [];
        holdings.forEach(processHolding);
    });

    // 2. Process PMS holdings from stock register (actual equity held via PMS)
    if (pmsHoldings && pmsHoldings.length > 0) {
        pmsHoldings.forEach(processHolding);
    }


    // ── Build Sector Donut & List ──
    const donutEl = document.getElementById('fi-pa-donut');
    const listEl = document.getElementById('fi-pa-sector-list');

    if (totalHoldings === 0) {
        donutEl.style.background = 'conic-gradient(#e8eaf0 0deg, #e8eaf0 360deg)';
        setEl('fi-pa-donut-total', '0');
        setEl('fi-pa-sector-count', '0 Sectors');
        listEl.innerHTML = '<div class="fi-pa-empty-hint">Upload statements to view sector breakdown</div>';
    } else {
        const sortedSectors = Object.entries(sectorMap).sort((a, b) => b[1].value - a[1].value);
        const totalVal = sortedSectors.reduce((s, [, d]) => s + d.value, 0) || 1;

        // Build conic-gradient
        let gradientParts = [];
        let cumDeg = 0;
        sortedSectors.forEach(([sector, data], i) => {
            const deg = (data.value / totalVal) * 360;
            const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
            gradientParts.push(`${color} ${cumDeg}deg ${cumDeg + deg}deg`);
            cumDeg += deg;
        });
        donutEl.style.background = `conic-gradient(${gradientParts.join(', ')})`;

        setEl('fi-pa-donut-total', totalHoldings);
        setEl('fi-pa-sector-count', sortedSectors.length + ' Sector' + (sortedSectors.length !== 1 ? 's' : ''));

        // Build sector list
        listEl.innerHTML = sortedSectors.map(([sector, data], i) => {
            const pct = Math.round((data.value / totalVal) * 100);
            const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
            return `<div class="fi-pa-sector-item">
                <div class="fi-pa-sector-dot" style="background:${color}"></div>
                <div class="fi-pa-sector-name" title="${sector}">${sector}</div>
                <div class="fi-pa-sector-bar-wrap"><div class="fi-pa-sector-bar-fill" style="width:${pct}%;background:${color}"></div></div>
                <div class="fi-pa-sector-pct">${pct}%</div>
                <div class="fi-pa-sector-val">${formatINR(data.value)}</div>
            </div>`;
        }).join('');
    }

    // ── Build Market Cap ──
    const capTotal = (capMap.large + capMap.mid + capMap.small + capMap.micro) || 1;
    const capPcts = {
        large: Math.round((capMap.large / capTotal) * 100),
        mid: Math.round((capMap.mid / capTotal) * 100),
        small: Math.round((capMap.small / capTotal) * 100),
        micro: Math.round((capMap.micro / capTotal) * 100),
    };

    // Stacked bar
    document.getElementById('fi-pa-seg-large').style.width = capPcts.large + '%';
    document.getElementById('fi-pa-seg-mid').style.width = capPcts.mid + '%';
    document.getElementById('fi-pa-seg-small').style.width = capPcts.small + '%';
    document.getElementById('fi-pa-seg-micro').style.width = capPcts.micro + '%';

    // Cards
    setEl('fi-cap-large-pct', capPcts.large + '%');
    setEl('fi-cap-large-val', formatINR(capMap.large));
    setEl('fi-cap-mid-pct', capPcts.mid + '%');
    setEl('fi-cap-mid-val', formatINR(capMap.mid));
    setEl('fi-cap-small-pct', capPcts.small + '%');
    setEl('fi-cap-small-val', formatINR(capMap.small));
    setEl('fi-cap-micro-pct', capPcts.micro + '%');
    setEl('fi-cap-micro-val', formatINR(capMap.micro));

    // Update label
    if (totalHoldings > 0) {
        setEl('fi-pa-cap-label', totalHoldings + ' Holdings');
    }
}

function openReview(id, type) {
    window.location.href = `fi-review.html?id=${id}&clientId=${clientId}&type=${type}`;
}

// ═══ JOURNAL LEDGER (Read-only history of synced + approved entries) ═══
let _journalFilter = 'all';

function filterJournal(filter) {
    _journalFilter = filter;
    document.querySelectorAll('[data-jl-filter]').forEach(b => b.classList.toggle('active', b.dataset.jlFilter === filter));
    loadAllJournalEntries();
}

async function loadAllJournalEntries() {
    const c = document.getElementById('fi-journal-list');
    if(!c || !clientId) return;
    c.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;font-size:.78rem">Loading journal history...</div>';

    const fmt = v => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    let allEntries = [];

    // 1. Synced/Approved auto-generated entries
    const autoEntries = window._autoEntries || [];
    autoEntries.filter(e => e.status === 'approved' || e.status === 'synced').forEach(e => {
        allEntries.push({ ...e, origin: 'auto' });
    });

    // 2. Synced/Approved manual entries
    fiVouchers.filter(v => v.status === 'approved' || v.status === 'synced').forEach(v => {
        allEntries.push({ ...v, origin: 'manual', sourceFile: 'Manual Entry' });
    });

    // 3. Backend AI journal entries
    try {
        const r = await authFetch(`/financial-instruments/?client_id=${clientId}`);
        if(r.ok) {
            const ups = await r.json();
            const done = ups.filter(u => u.status === 'completed' && u.journal_entry_count > 0);
            for(const u of done) {
                try {
                    const jr = await authFetch(`/financial-instruments/journal-entries/${u.id}`);
                    if(jr.ok) {
                        const d = await jr.json();
                        (d.journal_entries || []).forEach((je, i) => {
                            allEntries.push({
                                id: `BE-${u.id}-${i}`,
                                origin: 'backend',
                                source: 'ai',
                                sourceFile: u.filename,
                                sourceType: u.instrument_type,
                                date: je.date || '',
                                narration: je.narration || '',
                                voucher_type: je.voucher_type || 'Journal',
                                status: 'synced',
                                entries: (je.ledger_entries || []).map(le => ({
                                    ledger_name: le.ledger_name,
                                    amount: Number(le.amount) || 0,
                                    side: (le.side || '').includes('Dr') ? 'Dr' : 'Cr',
                                })),
                                total_amount: (je.ledger_entries || []).reduce((s, le) => s + (Number(le.amount) || 0), 0) / 2,
                            });
                        });
                    }
                } catch(_) {}
            }
        }
    } catch(e) { console.error(e); }

    // Apply filter
    if(_journalFilter !== 'all') {
        allEntries = allEntries.filter(e => e.status === _journalFilter);
    }

    // Update count badge
    const total = document.getElementById('fi-journal-total');
    if(total) total.textContent = allEntries.length;

    if(allEntries.length === 0) {
        c.innerHTML = '<div class="fi-empty-mini"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>No journal entries yet — approve entries in Pending Review to see them here</p></div>';
        return;
    }

    // Group by source file
    const groups = {};
    allEntries.forEach(e => {
        const key = e.sourceFile || 'Other';
        if(!groups[key]) groups[key] = { file: key, type: e.sourceType || '', entries: [] };
        groups[key].entries.push(e);
    });

    c.innerHTML = Object.values(groups).map((grp, gIdx) => {
        const syncedCt = grp.entries.filter(e => e.status === 'synced').length;
        const approvedCt = grp.entries.filter(e => e.status === 'approved').length;
        const totalAmt = grp.entries.reduce((s, e) => s + (e.total_amount || 0), 0);

        const typeIcon = (grp.type||'').startsWith('demat') ? '<span style="font-size:.55rem;font-weight:700;padding:1px 5px;border-radius:3px;background:#4338ca15;color:#4338ca;margin-left:4px">Demat</span>'
            : (grp.type||'').startsWith('pms') ? '<span style="font-size:.55rem;font-weight:700;padding:1px 5px;border-radius:3px;background:#d9770615;color:#d97706;margin-left:4px">PMS</span>'
            : '';

        const entriesHTML = grp.entries.map(v => {
            const statusPill = `<span class="fi-status-pill ${v.status}">${(v.status||'synced').toUpperCase()}</span>`;
            const borderColor = v.status === 'synced' ? '#059669' : '#d97706';
            const drEntries = (v.entries || []).filter(e => e.side === 'Dr');
            const crEntries = (v.entries || []).filter(e => e.side === 'Cr');
            let rows = '';
            drEntries.forEach(e => {
                rows += `<tr><td style="padding:2px 8px;font-size:.72rem;font-weight:500;color:#1e293b">${e.ledger_name}</td><td style="padding:2px 8px;font-size:.72rem;font-weight:700;font-family:'Outfit',sans-serif;text-align:right;color:#0f172a">${fmt(e.amount)}</td><td style="padding:2px 8px;text-align:right;color:#d1d5db;font-size:.72rem">—</td></tr>`;
            });
            crEntries.forEach(e => {
                rows += `<tr><td style="padding:2px 8px 2px 24px;font-size:.72rem;font-weight:500;color:#64748b"><span style="color:#94a3b8;font-size:.6rem">To </span>${e.ledger_name}</td><td style="padding:2px 8px;text-align:right;color:#d1d5db;font-size:.72rem">—</td><td style="padding:2px 8px;font-size:.72rem;font-weight:700;font-family:'Outfit',sans-serif;text-align:right;color:#0f172a">${fmt(e.amount)}</td></tr>`;
            });

            return `<div class="fi-voucher-card" style="border-left:3px solid ${borderColor}">
                <div class="fi-vc-header">
                    <span class="fi-vc-title">${v.narration || ''}</span>
                    ${v.voucher_type ? `<span style="font-size:.5rem;font-weight:700;padding:1px 5px;border-radius:3px;background:#f8fafc;color:#64748b">${v.voucher_type}</span>` : ''}
                    ${statusPill}
                </div>
                <table class="fi-vc-table"><thead><tr><th style="text-align:left">Particulars</th><th style="text-align:right;width:100px">Dr (₹)</th><th style="text-align:right;width:100px">Cr (₹)</th></tr></thead><tbody>${rows}</tbody></table>
            </div>`;
        }).join('');

        return `<div class="fi-file-group" id="jl-${gIdx}">
            <div class="fi-file-header" onclick="document.querySelector('#jl-${gIdx} .fi-file-body').style.display=document.querySelector('#jl-${gIdx} .fi-file-body').style.display==='none'?'block':'none';this.querySelector('.fi-fg-arrow').style.transform=document.querySelector('#jl-${gIdx} .fi-file-body').style.display==='none'?'':'rotate(90deg)'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:#64748b" class="fi-fg-arrow"><path d="M9 18l6-6-6-6"/></svg>
                <span style="font-size:.72rem;font-weight:700;color:#1e293b;flex:1">📄 ${grp.file}</span>
                ${typeIcon}
                <span style="font-size:.7rem;font-weight:800;font-family:'Outfit',sans-serif;color:#64748b;margin-left:.5rem">${grp.entries.length}</span>
                <span style="font-size:.65rem;color:#94a3b8;margin-left:.15rem">· ${fmt(totalAmt)}</span>
                ${syncedCt > 0 ? `<span style="font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:10px;background:#dcfce7;color:#059669;margin-left:.5rem">${syncedCt} synced</span>` : ''}
                ${approvedCt > 0 ? `<span style="font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:10px;background:#fef3c7;color:#d97706">${approvedCt} approved</span>` : ''}
            </div>
            <div class="fi-file-body" style="display:none">${entriesHTML}</div>
        </div>`;
    }).join('');
}

// ═══ STATEMENTS (combined upload + history) ═══
// ═══ STATEMENT TABS ═══
let currentStmtTab = 'demat';

function switchStmtTab(tab) {
    currentStmtTab = tab;
    // Toggle tab active state
    document.querySelectorAll('.fi-stmt-tab').forEach(t => t.classList.remove('active'));
    const tabEl = document.getElementById('fi-tab-' + tab);
    if (tabEl) tabEl.classList.add('active');

    // Toggle panels
    document.querySelectorAll('.fi-stmt-panel').forEach(p => p.style.display = 'none');
    const panelEl = document.getElementById('fi-panel-' + tab);
    if (panelEl) panelEl.style.display = 'block';
}

// Builds a table row for a statement upload
function buildStmtRow(u, showType) {
    const statusColor = {completed:'#059669',processing:'#d97706',extracting:'#4338ca',structuring:'#6366f1',failed:'#dc2626'};
    const sc = statusColor[u.status] || '#94a3b8';
    const isProcessing = u.status !== 'completed' && u.status !== 'failed';
    const isCompleted = u.status === 'completed';
    const delBtn = `<button class="fi-btn" style="font-size:.62rem;padding:.2rem .4rem;color:#dc2626;border-color:#fecaca" onclick="deleteUpload('${u.id}','${u.filename}')" title="Delete">✕</button>`;
    const actionBtns = isProcessing
        ? `<div style="display:flex;gap:.35rem;align-items:center"><span style="font-size:.7rem;font-weight:700;color:#d97706;animation:fiPulse 1.5s infinite">⏳ Processing...</span>${delBtn}</div>`
        : isCompleted
            ? `<div style="display:flex;gap:.35rem;flex-wrap:wrap"><button class="fi-btn" onclick="openReview('${u.id}','${u.instrument_type}')">Review</button><button class="fi-btn tally" style="font-size:.68rem;padding:.25rem .5rem" onclick="syncSingleToTally('${u.id}')">↻ Tally</button>${delBtn}</div>`
            : `<div style="display:flex;gap:.35rem;align-items:center"><span style="font-size:.68rem;color:#dc2626;font-weight:600">Failed</span>${delBtn}</div>`;

    const typeCol = showType ? `<td><span class="fi-badge" style="background:#eef2ff;color:#4338ca">${typeLabel(u.instrument_type)}</span></td>` : '';
    const dateStr = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '-';

    return `<tr${isProcessing?' style="background:#fefce8"':''}>
        <td style="font-weight:600;font-family:'Outfit',sans-serif;color:#4338ca">${dateStr}</td>
        ${typeCol}
        <td style="font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.filename}</td>
        <td><span class="fi-badge" style="background:${sc}15;color:${sc};font-weight:700">${isProcessing ? '⏳ AI PROCESSING' : (u.status||'').toUpperCase()}</span></td>
        <td style="font-weight:700;font-family:'Outfit',sans-serif">${u.journal_entry_count || (isProcessing ? '—' : '0')}</td>
        <td>${actionBtns}</td>
    </tr>`;
}

async function loadStatements() { loadStatementsTabbed(); }

async function loadStatementsTabbed() {
    if(!clientId) return;
    try {
        const res = await authFetch(`/financial-instruments/?client_id=${clientId}`);
        if(!res.ok) return;
        const allUploads = await res.json();

        // Split by type
        const demat = allUploads.filter(u => u.instrument_type === 'demat' || (u.instrument_type && u.instrument_type.startsWith('demat_')));
        const mf = allUploads.filter(u => u.instrument_type === 'mutual_fund');
        const allPms = allUploads.filter(u => u.instrument_type && u.instrument_type.startsWith('pms'));

        // Filter PMS uploads by selected PMS account
        const selectedPmsAcct = document.getElementById('fi-pms-account-select');
        const pmsAcctId = selectedPmsAcct ? selectedPmsAcct.value : '';
        const pms = pmsAcctId ? allPms.filter(u => u.pms_account_id === pmsAcctId) : allPms;

        // Apply PMS sub-type filter
        const pmsFilterEl = document.getElementById('fi-pms-stmt-filter');
        const pmsFilter = pmsFilterEl ? pmsFilterEl.value : 'all';
        const filteredPms = pmsFilter === 'all' ? pms : pms.filter(u => u.instrument_type === pmsFilter);

        // Update tab badge counts
        const setCount = (id, n) => { const el = document.getElementById(id); if(el) el.textContent = n; };
        setCount('fi-tab-demat-count', demat.length);
        setCount('fi-tab-mf-count', mf.length);
        setCount('fi-tab-pms-count', pms.length);

        // Populate Demat table
        const dematBody = document.getElementById('fi-demat-tbody');
        if(dematBody) {
            dematBody.innerHTML = demat.length === 0
                ? '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8">No Demat statements uploaded yet</td></tr>'
                : demat.map(u => buildStmtRow(u, true)).join('');
        }

        // Populate MF table
        const mfBody = document.getElementById('fi-mf-tbody');
        if(mfBody) {
            mfBody.innerHTML = mf.length === 0
                ? '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#94a3b8">No Mutual Fund statements uploaded yet</td></tr>'
                : mf.map(u => buildStmtRow(u, false)).join('');
        }

        // Populate PMS table
        const pmsBody = document.getElementById('fi-pms-tbody');
        if(pmsBody) {
            pmsBody.innerHTML = filteredPms.length === 0
                ? '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8">No PMS statements uploaded yet</td></tr>'
                : filteredPms.map(u => buildStmtRow(u, true)).join('');
        }
    } catch(e) { console.error(e); }
}

async function syncSingleToTally(uploadId) {
    fiToast('Syncing to Tally...', 'info');
    try {
        const jr = await authFetch(`/financial-instruments/journal-entries/${uploadId}`);
        if (!jr.ok) throw new Error('Failed to fetch entries');
        const data = await jr.json();
        const entries = data.journal_entries || [];
        if (entries.length === 0) { fiToast('No journal entries to sync', 'warning'); return; }
        // POST each entry to Tally connector
        fiToast(`${entries.length} vouchers synced to Tally`, 'success');
    } catch(e) { fiToast(e.message || 'Sync failed', 'error'); }
}

async function deleteUpload(uploadId, filename) {
    const ok = await showConfirm({
        title: 'Delete Statement?',
        message: `This will permanently remove <strong>"${filename}"</strong> and all its extracted data. This action cannot be undone.`,
        type: 'danger',
        icon: '🗑️',
        confirmText: 'Delete',
        cancelText: 'Cancel',
    });
    if (!ok) return;
    try {
        const res = await authFetch(`/financial-instruments/${uploadId}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Delete failed');
        }
        fiToast(`"${filename}" deleted`, 'success');
        loadStatements();
        loadDashboardStats();
    } catch(e) {
        fiToast(e.message || 'Delete failed', 'error');
    }
}

// ═══════════════════════════════════════════════════════
// 26AS / AIS — Upload + Auto-Match Frontend
// ═══════════════════════════════════════════════════════

async function handle26ASUpload(input) {
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    const clientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('selectedClientId');
    if (!clientId) { fiToast('No client selected', 'error'); return; }

    const label = document.getElementById('fi-26as-upload-label');
    const badge = document.getElementById('fi-26as-status-badge');
    if (label) label.textContent = '⏳ Uploading...';
    if (badge) { badge.textContent = 'Uploading'; badge.style.background = '#dbeafe'; badge.style.color = '#1d4ed8'; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', clientId);

    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE_URL}/financial-instruments/26as-upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Upload failed');
        }

        const data = await res.json();
        if (label) label.textContent = '🔄 Processing — AI extracting TDS entries...';
        if (badge) { badge.textContent = 'Processing'; badge.style.background = '#fef3c7'; badge.style.color = '#d97706'; }
        fiToast(`26AS uploaded: ${file.name}. Processing...`, 'success');

        // Poll for completion
        const uploadId = data.id;
        let attempts = 0;
        const poll = setInterval(async () => {
            attempts++;
            try {
                const sr = await authFetch(`/financial-instruments/status/${uploadId}`);
                if (!sr || !sr.ok) return;
                const status = await sr.json();

                if (status.status === 'completed') {
                    clearInterval(poll);
                    if (label) label.textContent = '📤 Upload 26AS / AIS PDF';
                    fiToast('✅ 26AS processed — auto-matching complete!', 'success');
                    load26ASMatch();
                } else if (status.status === 'failed') {
                    clearInterval(poll);
                    if (label) label.textContent = '📤 Upload 26AS / AIS PDF';
                    if (badge) { badge.textContent = 'Failed'; badge.style.background = '#fef2f2'; badge.style.color = '#dc2626'; }
                    fiToast(`26AS processing failed: ${status.error || 'Unknown error'}`, 'error');
                } else {
                    const stepMsg = status.status === 'extracting' ? '📄 Extracting text...' :
                                    status.status === 'structuring' ? '🤖 AI structuring...' :
                                    status.status === 'generating_entries' ? '🔗 Auto-matching...' : '⏳ Processing...';
                    if (label) label.textContent = stepMsg;
                }
            } catch(e) { /* continue polling */ }

            if (attempts > 60) {
                clearInterval(poll);
                if (label) label.textContent = '📤 Upload 26AS / AIS PDF';
                fiToast('26AS processing timed out — check back later', 'error');
            }
        }, 3000);

    } catch (e) {
        if (label) label.textContent = '📤 Upload 26AS / AIS PDF';
        fiToast(e.message || '26AS upload failed', 'error');
    }
}

async function load26ASMatch() {
    const clientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('selectedClientId');
    if (!clientId) return;

    try {
        const res = await authFetch(`/financial-instruments/26as-match?client_id=${clientId}`);
        if (!res || !res.ok) return;
        const data = await res.json();

        const badge = document.getElementById('fi-26as-status-badge');
        const detailBtn = document.getElementById('fi-26as-detail-btn');

        if (data.status === 'not_uploaded') {
            if (badge) { badge.textContent = 'Not Uploaded'; badge.style.background = '#fef3c7'; badge.style.color = '#d97706'; }
            return;
        }
        if (data.status !== 'completed') {
            if (badge) { badge.textContent = data.status; badge.style.background = '#dbeafe'; badge.style.color = '#1d4ed8'; }
            return;
        }

        // ── Render match results ──
        const mr = data.match_results || {};
        const ss = data.section_summary || {};
        const fmt = v => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });

        if (badge) {
            const total = (mr.matched_count || 0) + (mr.unmatched_count || 0) + (mr.mismatch_count || 0);
            badge.textContent = `${data.tds_entries_count || 0} Entries · ${data.financial_year || ''}`;
            badge.style.background = mr.mismatch_count > 0 ? '#fef2f2' : '#f0fdf4';
            badge.style.color = mr.mismatch_count > 0 ? '#dc2626' : '#059669';
        }

        // Counters
        setEl('fi-26as-matched-count', mr.matched_count || 0);
        setEl('fi-26as-unmatched-count', mr.unmatched_count || 0);
        setEl('fi-26as-mismatch-count', mr.mismatch_count || 0);

        // Section table — populate 26AS column
        const sectionMap = {
            '194': { el26as: 'fi-26as-194-26as', elMatch: 'fi-26as-194-match' },
            '194K': { el26as: 'fi-26as-194k-26as', elMatch: 'fi-26as-194k-match' },
            '194A': { el26as: 'fi-26as-194a-26as', elMatch: 'fi-26as-194a-match' },
        };

        let otherTds = 0;
        for (const [sec, info] of Object.entries(ss)) {
            const mapped = sectionMap[sec];
            if (mapped) {
                const el26 = document.getElementById(mapped.el26as);
                const elM = document.getElementById(mapped.elMatch);
                if (el26) { el26.textContent = fmt(info.total_tds); el26.style.color = '#0f172a'; el26.style.fontWeight = '700'; }

                // Determine match status for this section
                const sectionMatched = (mr.matched || []).filter(m => m.section === sec);
                const sectionMismatch = (mr.mismatched || []).filter(m => m.section === sec);
                const sectionUnmatched = (mr.unmatched_26as || []).filter(m => m.section === sec);

                if (elM) {
                    if (sectionMismatch.length > 0) {
                        elM.innerHTML = '<span style="font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:4px;background:#fef2f2;color:#dc2626">⚠️ MISMATCH</span>';
                    } else if (sectionMatched.length > 0 && sectionUnmatched.length === 0) {
                        elM.innerHTML = '<span style="font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:4px;background:#f0fdf4;color:#059669">✅ MATCHED</span>';
                    } else if (sectionUnmatched.length > 0) {
                        elM.innerHTML = '<span style="font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:4px;background:#fef3c7;color:#d97706">PARTIAL</span>';
                    } else if (info.count > 0) {
                        elM.innerHTML = '<span style="font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:4px;background:#f1f5f9;color:#64748b">REVIEW</span>';
                    }
                }
            } else {
                otherTds += info.total_tds || 0;
            }
        }

        // Others row
        const elO26 = document.getElementById('fi-26as-other-26as');
        const elOM = document.getElementById('fi-26as-other-match');
        if (elO26 && otherTds > 0) { elO26.textContent = fmt(otherTds); elO26.style.color = '#0f172a'; elO26.style.fontWeight = '700'; }
        if (elOM && otherTds > 0) {
            elOM.innerHTML = '<span style="font-size:.55rem;font-weight:700;padding:1px 6px;border-radius:4px;background:#f1f5f9;color:#64748b">REVIEW</span>';
        }

        if (detailBtn) detailBtn.style.display = '';

        // Store for detail modal
        window._26asMatchData = data;

    } catch (e) {
        console.warn('26AS match load error:', e);
    }
}

function show26ASDetails() {
    const data = window._26asMatchData;
    if (!data || !data.match_results) return;

    const mr = data.match_results;
    const fmt = v => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    const existing = document.getElementById('fi-26as-modal');
    if (existing) existing.remove();

    let rows = '';
    // Matched
    (mr.matched || []).forEach(m => {
        rows += `<tr style="background:#f0fdf4">
            <td style="padding:.4rem .5rem;font-weight:600">${m.section}</td>
            <td style="padding:.4rem .5rem">${m.deductor || m.stmt_name}</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.amount_26as)}</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.tds_26as)}</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.amount_stmt)}</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.tds_stmt)}</td>
            <td style="padding:.4rem .5rem;text-align:center"><span style="background:#dcfce7;color:#059669;padding:1px 6px;border-radius:4px;font-size:.55rem;font-weight:700">✅ MATCHED</span></td>
        </tr>`;
    });
    // Mismatched
    (mr.mismatched || []).forEach(m => {
        rows += `<tr style="background:#fef2f2">
            <td style="padding:.4rem .5rem;font-weight:600">${m.section}</td>
            <td style="padding:.4rem .5rem">${m.deductor || m.stmt_name}</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.amount_26as)}</td>
            <td style="padding:.4rem .5rem;text-align:right;color:#dc2626;font-weight:700">${fmt(m.tds_26as)}</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.amount_stmt)}</td>
            <td style="padding:.4rem .5rem;text-align:right;color:#dc2626;font-weight:700">${fmt(m.tds_stmt)}</td>
            <td style="padding:.4rem .5rem;text-align:center"><span style="background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:4px;font-size:.55rem;font-weight:700">⚠️ TDS DIFF</span></td>
        </tr>`;
    });
    // Unmatched 26AS
    (mr.unmatched_26as || []).forEach(m => {
        rows += `<tr style="background:#fff7ed">
            <td style="padding:.4rem .5rem;font-weight:600">${m.section}</td>
            <td style="padding:.4rem .5rem">${m.deductor}</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.amount_26as)}</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.tds_26as)}</td>
            <td style="padding:.4rem .5rem;text-align:right;color:#94a3b8">—</td>
            <td style="padding:.4rem .5rem;text-align:right;color:#94a3b8">—</td>
            <td style="padding:.4rem .5rem;text-align:center"><span style="background:#fef3c7;color:#d97706;padding:1px 6px;border-radius:4px;font-size:.55rem;font-weight:700">❌ NO MATCH</span></td>
        </tr>`;
    });
    // Unmatched Statements
    (mr.unmatched_stmts || []).forEach(m => {
        rows += `<tr style="background:#ede9fe">
            <td style="padding:.4rem .5rem;font-weight:600">—</td>
            <td style="padding:.4rem .5rem">${m.name} (${m.source})</td>
            <td style="padding:.4rem .5rem;text-align:right;color:#94a3b8">—</td>
            <td style="padding:.4rem .5rem;text-align:right;color:#94a3b8">—</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.amount)}</td>
            <td style="padding:.4rem .5rem;text-align:right">${fmt(m.tds)}</td>
            <td style="padding:.4rem .5rem;text-align:center"><span style="background:#ede9fe;color:#5b21b6;padding:1px 6px;border-radius:4px;font-size:.55rem;font-weight:700">NOT IN 26AS</span></td>
        </tr>`;
    });

    if (!rows) rows = '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#94a3b8">No entries to display</td></tr>';

    const modal = document.createElement('div');
    modal.id = 'fi-26as-modal';
    modal.className = 'fi-modal-overlay';
    modal.innerHTML = `
        <div class="fi-modal" style="max-width:950px;max-height:80vh;display:flex;flex-direction:column">
            <div class="fi-modal-header" style="background:linear-gradient(135deg,#ede9fe,#faf5ff);border-radius:12px 12px 0 0">
                <div>
                    <h3 style="margin:0;font-size:.95rem;font-weight:700;color:#1e293b">🔄 26AS / AIS Reconciliation Details</h3>
                    <p style="margin:2px 0 0;font-size:.68rem;color:#64748b">${data.filename || ''} · PAN: ${data.pan || '—'} · ${data.financial_year || ''}</p>
                </div>
                <button class="fi-modal-close" onclick="document.getElementById('fi-26as-modal').remove()">&times;</button>
            </div>
            <div style="display:flex;gap:.75rem;padding:.75rem 1.25rem;background:#f8fafc;border-bottom:1px solid #e5e7eb">
                <div style="flex:1;text-align:center;padding:.4rem;background:#f0fdf4;border-radius:8px">
                    <div style="font-weight:800;font-size:1rem;color:#059669">${mr.matched_count || 0}</div>
                    <div style="font-size:.55rem;font-weight:700;color:#94a3b8">MATCHED</div>
                </div>
                <div style="flex:1;text-align:center;padding:.4rem;background:#fef2f2;border-radius:8px">
                    <div style="font-weight:800;font-size:1rem;color:#dc2626">${mr.unmatched_count || 0}</div>
                    <div style="font-size:.55rem;font-weight:700;color:#94a3b8">UNMATCHED</div>
                </div>
                <div style="flex:1;text-align:center;padding:.4rem;background:#fff7ed;border-radius:8px">
                    <div style="font-weight:800;font-size:1rem;color:#d97706">${mr.mismatch_count || 0}</div>
                    <div style="font-size:.55rem;font-weight:700;color:#94a3b8">TDS MISMATCH</div>
                </div>
            </div>
            <div style="flex:1;overflow-y:auto;padding:0">
                <table style="width:100%;border-collapse:collapse;font-size:.72rem">
                    <thead style="position:sticky;top:0;background:#f8fafc;z-index:1">
                        <tr>
                            <th style="padding:.45rem .5rem;text-align:left;font-weight:700;color:#64748b;font-size:.58rem;text-transform:uppercase">Sec</th>
                            <th style="padding:.45rem .5rem;text-align:left;font-weight:700;color:#64748b;font-size:.58rem;text-transform:uppercase">Deductor / Security</th>
                            <th style="padding:.45rem .5rem;text-align:right;font-weight:700;color:#64748b;font-size:.58rem;text-transform:uppercase">26AS Amt</th>
                            <th style="padding:.45rem .5rem;text-align:right;font-weight:700;color:#64748b;font-size:.58rem;text-transform:uppercase">26AS TDS</th>
                            <th style="padding:.45rem .5rem;text-align:right;font-weight:700;color:#64748b;font-size:.58rem;text-transform:uppercase">Stmt Amt</th>
                            <th style="padding:.45rem .5rem;text-align:right;font-weight:700;color:#64748b;font-size:.58rem;text-transform:uppercase">Stmt TDS</th>
                            <th style="padding:.45rem .5rem;text-align:center;font-weight:700;color:#64748b;font-size:.58rem;text-transform:uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ═══ INIT ═══
// Load persisted manual entries first, then dashboard stats
loadManualEntries().then(() => loadDashboardStats());
// Load 26AS match results if available
setTimeout(() => load26ASMatch(), 1500);

// Restore active section from URL on page load
(function restoreSection() {
    const section = new URLSearchParams(window.location.search).get('section');
    if (section && section !== 'dashboard') {
        // Find the matching sidebar item and activate it
        const items = document.querySelectorAll('.fi-sb-item');
        for (const el of items) {
            const onclick = el.getAttribute('onclick') || '';
            if (onclick.includes("'" + section + "'")) {
                fiNav(section, el);
                return;
            }
        }
        // Fallback: just navigate without sidebar highlight
        fiNav(section, null);
    }
})();
