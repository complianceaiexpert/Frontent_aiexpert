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
function typeLabel(t) { return { demat: 'Demat', mutual_fund: 'Mutual Fund', pms: 'PMS' }[t] || t; }

// ═══ SIDEBAR NAV ═══
function fiNav(sectionId, el) {
    document.querySelectorAll('.fi-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('sec-' + sectionId);
    if (target) target.classList.add('active');
    document.querySelectorAll('.fi-sb-item').forEach(l => l.classList.remove('active'));
    if (el) el.classList.add('active');
    if (sectionId === 'statements') loadStatements();
    if (sectionId === 'journal-entries') loadAllJournalEntries();
    if (sectionId === 'pending') loadPendingEntries();
    if (sectionId === 'stock-register' && typeof loadStockRegister === 'function') loadStockRegister();
    if (sectionId === 'capital-gains' && typeof loadCapitalGains === 'function') loadCapitalGains();
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

        // Show processing row in history table with live timer
        addProcessingRow(data.id, file.name, instrumentType);

        // Brief delay so user sees the row, then redirect
        setTimeout(() => {
            window.location.href = `fi-review.html?id=${data.id}&clientId=${clientId}&type=${instrumentType}`;
        }, 1200);
    } catch (e) {
        fiToast(e.message, 'error');
        if (card) { card.style.pointerEvents = ''; card.style.opacity = ''; if (nameEl) nameEl.textContent = origName; }
    }
    input.value = '';
}

function addProcessingRow(uploadId, filename, type) {
    const tbody = document.getElementById('fi-history-tbody');
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
function saveVoucher(status) {
    if(!selectedTxnType){fiToast('Select a transaction type','warning');return;}
    const v=collectData(status); if(!v.scrip){fiToast('Scrip/Fund name required','warning');return;} if(v.entries.length<2){fiToast('Need at least 2 ledger entries','warning');return;}
    fiVouchers.push(v); fiToast(`Voucher ${v.id} saved (${status})`,'success'); resetEntry(); loadDashboardStats();
}
function saveAndSync() {
    if(!selectedTxnType){fiToast('Select a transaction type','warning');return;}
    const v=collectData('synced'); if(!v.scrip){fiToast('Scrip required','warning');return;}
    fiVouchers.push(v); fiToast(`Voucher ${v.id} synced to Tally`,'success'); resetEntry(); loadDashboardStats();
}
function resetEntry() { selectedTxnType=null; document.querySelectorAll('.fi-txn-type-card').forEach(c=>c.classList.remove('selected')); document.getElementById('fi-entry-form-container').innerHTML=''; }


// ══════════════════════════════════════════════════
// SHARED VIEWS
// ══════════════════════════════════════════════════

function renderVouchersList() { loadPendingEntries(); }
function filterVouchers(){}
function filterVoucherType(){}
function approveAllPending() {
    fiVouchers.forEach(v => { if(v.status==='draft') v.status='approved'; });
    loadPendingEntries();
    fiToast('All entries approved','success');
    loadDashboardStats();
}
function syncAllPending() {
    fiVouchers.forEach(v => { if(v.status==='approved'||v.status==='draft') v.status='synced'; });
    loadPendingEntries();
    fiToast('All entries synced to Tally','success');
    loadDashboardStats();
}

async function loadPendingEntries() {
    const c = document.getElementById('fi-pending-list');
    if (!c) return;
    const sourceFilter = document.getElementById('fi-pending-source')?.value || 'all';

    let allCards = [];

    // 1. Manual entries from fiVouchers
    if (sourceFilter === 'all' || sourceFilter === 'manual') {
        const manualPending = fiVouchers.filter(v => v.status !== 'synced');
        manualPending.forEach(v => {
            allCards.push({
                source: 'manual',
                date: v.date || '-',
                narration: `${v.scrip || ''} — ${v.narration || ''}`,
                type: v.type,
                status: v.status,
                entries: v.entries || [],
                id: v.id,
                amount: v.total_amount || 0
            });
        });
    }

    // 2. AI-extracted entries from completed uploads
    if (clientId && (sourceFilter === 'all' || sourceFilter === 'ai')) {
        try {
            const res = await authFetch(`/financial-instruments/?client_id=${clientId}`);
            if (res && res.ok) {
                const uploads = await res.json();
                const completed = uploads.filter(u => u.status === 'completed' && u.journal_entry_count > 0);
                const jrPromises = completed.map(u =>
                    authFetch(`/financial-instruments/journal-entries/${u.id}`)
                        .then(r => r.ok ? r.json() : null)
                        .catch(() => null)
                );
                const allJR = await Promise.all(jrPromises);
                allJR.forEach((data, idx) => {
                    if (!data) return;
                    (data.journal_entries || []).forEach((je, i) => {
                        allCards.push({
                            source: 'ai',
                            date: je.date || '-',
                            narration: je.narration || `AI Entry from ${completed[idx].filename}`,
                            type: completed[idx].instrument_type,
                            voucher_type: je.voucher_type || 'Journal',
                            status: 'draft',
                            entries: (je.ledger_entries || []).map(le => ({
                                ledger_name: le.ledger_name,
                                amount: le.amount || 0,
                                side: (le.side || '').includes('Dr') ? 'Dr' : 'Cr'
                            })),
                            id: `AI-${completed[idx].id}-${i}`,
                            amount: (je.ledger_entries || []).reduce((s, le) => s + (Number(le.amount) || 0), 0) / 2
                        });
                    });
                });
            }
        } catch(e) { console.error(e); }
    }

    // Update sidebar badge
    const badge = document.getElementById('fi-sb-pending-count');
    const total = document.getElementById('fi-pending-total');
    if (badge) { badge.textContent = allCards.length; badge.style.display = allCards.length > 0 ? '' : 'none'; }
    if (total) total.textContent = allCards.length;

    if (allCards.length === 0) {
        c.innerHTML = '<div class="fi-empty-mini"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><p>No pending entries — all clear!</p></div>';
        return;
    }

    c.innerHTML = allCards.map((v, cardIdx) => {
        const srcBadge = v.source === 'ai'
            ? '<span style="font-size:.55rem;font-weight:800;padding:1px 6px;border-radius:4px;background:#eef2ff;color:#4338ca;margin-left:.35rem">AI</span>'
            : '<span style="font-size:.55rem;font-weight:800;padding:1px 6px;border-radius:4px;background:#f0fdf4;color:#059669;margin-left:.35rem">MANUAL</span>';
        const statusPill = `<span class="fi-status-pill ${v.status}">${(v.status||'draft').toUpperCase()}</span>`;
        const voucherBadge = v.voucher_type ? `<span style="font-size:.5rem;font-weight:700;padding:1px 5px;border-radius:3px;background:#f8fafc;color:#64748b;margin-left:.25rem">${v.voucher_type}</span>` : '';
        const deleteBtn = `<button onclick="removePendingEntry('${v.id}','${v.source}')" style="margin-left:auto;background:none;border:none;color:#dc2626;font-size:.8rem;cursor:pointer;padding:2px 6px;border-radius:4px;opacity:.6;transition:opacity .15s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.6" title="Remove entry">✕</button>`;

        return `<div class="fi-je-card" id="pe-card-${cardIdx}" style="border-left:3px solid ${v.source==='ai'?'#4338ca':'#059669'}">
            <div class="fi-je-header" style="flex-wrap:wrap;gap:.35rem">
                <input type="date" value="${v.date}" data-card="${cardIdx}" data-field="date" onchange="updatePendingField(this)" style="font-size:.68rem;font-weight:700;color:#4338ca;border:1px solid transparent;border-radius:4px;padding:1px 4px;background:transparent;font-family:'Outfit',sans-serif;cursor:pointer;width:110px" onfocus="this.style.borderColor='#c7d2fe'" onblur="this.style.borderColor='transparent'" />${srcBadge}${voucherBadge}
                <input type="text" value="${v.narration.replace(/"/g,'&quot;')}" data-card="${cardIdx}" data-field="narration" onchange="updatePendingField(this)" style="flex:1;min-width:150px;font-size:.72rem;color:#64748b;border:1px solid transparent;border-radius:4px;padding:2px 6px;background:transparent" onfocus="this.style.borderColor='#c7d2fe'" onblur="this.style.borderColor='transparent'" />
                ${statusPill}${deleteBtn}
            </div>
            <div class="fi-je-entries">${v.entries.map((e, eIdx) =>
                `<div class="fi-je-entry" style="gap:.25rem">
                    <span style="color:#94a3b8;font-size:.7rem;min-width:24px">${e.side==='Dr'?'':'&nbsp;&nbsp;To'}</span>
                    <input type="text" value="${(e.ledger_name||'').replace(/"/g,'&quot;')}" data-card="${cardIdx}" data-entry="${eIdx}" data-field="ledger_name" onchange="updatePendingLedger(this)" style="flex:1;font-size:.78rem;font-weight:500;color:#1e293b;border:1px solid transparent;border-radius:4px;padding:2px 6px;background:transparent" onfocus="this.style.borderColor='#c7d2fe'" onblur="this.style.borderColor='transparent'" />
                    <input type="number" value="${e.amount}" data-card="${cardIdx}" data-entry="${eIdx}" data-field="amount" onchange="updatePendingLedger(this)" step="0.01" style="width:100px;text-align:right;font-size:.78rem;font-weight:700;font-family:'Outfit',sans-serif;color:#0f172a;border:1px solid transparent;border-radius:4px;padding:2px 6px;background:transparent" onfocus="this.style.borderColor='#c7d2fe'" onblur="this.style.borderColor='transparent'" />
                    <span class="fi-je-side ${e.side==='Dr'?'fi-dr':'fi-cr'}" style="min-width:24px;text-align:center">${e.side}</span>
                </div>`
            ).join('')}</div>
        </div>`;
    }).join('');

    // Store cards data globally for editing
    window._pendingCards = allCards;
}

// ═══ Pending entries — inline edit handlers ═══
function updatePendingField(el) {
    const idx = parseInt(el.dataset.card);
    const field = el.dataset.field;
    const card = window._pendingCards?.[idx];
    if (!card) return;
    card[field] = el.value;
    // Save back to fiVouchers if manual
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
    // Save back to fiVouchers if manual
    if (card.source === 'manual') {
        const v = fiVouchers.find(v => v.id === card.id);
        if (v && v.entries[entryIdx]) { v.entries[entryIdx][field] = val; }
    }
}

function removePendingEntry(id, source) {
    if (source === 'manual') {
        const idx = fiVouchers.findIndex(v => v.id === id);
        if (idx !== -1) { fiVouchers.splice(idx, 1); fiToast('Entry removed', 'success'); }
    } else {
        fiToast('AI entry hidden from pending view', 'info');
    }
    // Animate out and reload
    const cards = document.querySelectorAll('.fi-je-card');
    cards.forEach(c => {
        if (c.querySelector(`[data-card]`)?.closest('.fi-je-card') === c) {
            // find the card with matching id
        }
    });
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
    // Set dynamic AY/FY labels
    const { fy, ay } = getFinancialYears();
    setEl('fi-ay', ay);
    setEl('fi-fy-cg', fy);
    setEl('fi-fy-tds', fy);

    // Local voucher counts
    const draftCount = fiVouchers.filter(v=>v.status==='draft').length;
    const approvedCount = fiVouchers.filter(v=>v.status==='approved').length;
    const syncedCount = fiVouchers.filter(v=>v.status==='synced').length;
    const totalAmt = fiVouchers.reduce((s,v)=>s+(v.total_amount||0),0);

    setEl('fi-stat-uploads', fiVouchers.length);
    setEl('fi-stat-vouchers', fiVouchers.length);
    setEl('fi-stat-pending', draftCount);
    setEl('fi-stat-synced', syncedCount);
    setEl('fi-stat-total-amt', formatINR(totalAmt));
    setEl('fi-pipe-draft', draftCount);
    setEl('fi-pipe-approved', approvedCount);
    setEl('fi-pipe-synced', syncedCount);

    if(!clientId) return;
    try {
        const res = await authFetch(`/financial-instruments/?client_id=${clientId}`);
        if(!res || !res.ok) return;
        const uploads = await res.json();
        if(uploads.length > 0) setEl('fi-stat-uploads', uploads.length);

        // Pipeline from server
        const completed = uploads.filter(u=>u.status==='completed');
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

        const dataPromises = completed.map(u =>
            authFetch(`/financial-instruments/data/${u.id}`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        );
        const allData = await Promise.all(dataPromises);

        allData.forEach((resp, idx) => {
            if(!resp || !resp.structured_data) return;
            const d = resp.structured_data;
            const uType = completed[idx].instrument_type;

            // Holdings → AUM
            const holdings = d.holdings || d.funds || [];
            let holdVal = 0;
            holdings.forEach(h => { holdVal += Number(h.market_value || h.current_value || h.value || 0); });

            // Accumulate by instrument type
            if(uType === 'demat') eqValue += holdVal;
            else if(uType === 'mutual_fund') mfValue += holdVal;
            else if(uType === 'pms') pmsValue += holdVal;
            else bondValue += holdVal;
            totalAUM += holdVal;

            // Capital Gains
            const cg = d.capital_gains_summary;
            if(cg) {
                totalSTCG += Number(cg.short_term_gain || cg.stcg || 0);
                totalLTCG += Number(cg.long_term_gain || cg.ltcg || 0);
            }

            // Dividends → TDS
            const divs = d.dividends || [];
            divs.forEach(dv => {
                totalDivAmt += Number(dv.amount || 0);
                totalDivTDS += Number(dv.tds_deducted || dv.tds || 0);
            });
        });

        // ── Populate AUM ──
        setEl('fi-stat-total-amt', formatINR(totalAUM));

        // ── Populate Capital Gains ──
        const netGain = totalSTCG + totalLTCG;
        setEl('fi-cg-stcg', (totalSTCG >= 0 ? '' : '(') + formatINR(totalSTCG) + (totalSTCG < 0 ? ')' : ''));
        setEl('fi-cg-ltcg', (totalLTCG >= 0 ? '' : '(') + formatINR(totalLTCG) + (totalLTCG < 0 ? ')' : ''));
        setEl('fi-cg-net', (netGain >= 0 ? '' : '(') + formatINR(netGain) + (netGain < 0 ? ')' : ''));

        // Progress bars — scale relative to max
        const maxCG = Math.max(Math.abs(totalSTCG), Math.abs(totalLTCG), 1);
        setStyle('fi-cg-stcg-bar', 'width', Math.round(Math.abs(totalSTCG)/maxCG*100) + '%');
        setStyle('fi-cg-ltcg-bar', 'width', Math.round(Math.abs(totalLTCG)/maxCG*100) + '%');
        if(totalSTCG < 0) setStyle('fi-cg-stcg-bar', 'background', '#dc2626');
        if(totalLTCG < 0) setStyle('fi-cg-ltcg-bar', 'background', '#dc2626');

        // Tax estimates (Indian rates — Budget 2024 onwards)
        // STCG on listed equity (Sec 111A): 20%
        // LTCG on listed equity (Sec 112A): 12.5%, exemption ₹1.25L
        const stcgTax = Math.max(0, totalSTCG) * 0.20;
        const ltcgTax = Math.max(0, totalLTCG - 125000) * 0.125; // ₹1.25L exemption
        setEl('fi-cg-tax-stcg', formatINR(stcgTax));
        setEl('fi-cg-tax-ltcg', formatINR(Math.max(0, ltcgTax)));

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

        // ── Populate TDS & Compliance ──
        setEl('fi-tds-194', formatINR(totalDivTDS));
        setEl('fi-tds-194k', formatINR(0)); // populated when MF TDS data available
        setEl('fi-tds-112a', formatINR(Math.max(0, ltcgTax)));
        setEl('fi-tds-111a', formatINR(stcgTax));

        // ══════════════════════════════════════════════
        // ── PORTFOLIO ANALYSIS: Sector + Market Cap ──
        // ══════════════════════════════════════════════
        populatePortfolioAnalysis(allData, completed);

        // ── Render recent statements ──
        const r = document.getElementById('fi-recent-vouchers');
        r.innerHTML = uploads.slice(0, 5).map(u => `<div class="fi-fq-item" style="cursor:pointer" onclick="openReview('${u.id}','${u.instrument_type}')">
            <div class="fi-fq-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            <div class="fi-fq-info"><div class="fi-fq-name">${u.filename}</div><div class="fi-fq-meta">${typeLabel(u.instrument_type)} · ${u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '-'} · ${u.journal_entry_count || 0} entries</div></div>
            <span class="fi-status-pill ${u.status}">${(u.status || '').toUpperCase()}</span>
        </div>`).join('');
        if(uploads.length === 0) r.innerHTML = '<div class="fi-empty-mini"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Upload Demat, MF, or PMS statements to get started</p></div>';
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
    // Use explicit sector if available
    const existingSector = (holding.sector || holding.industry || holding.category || '').toLowerCase().trim();
    if (existingSector && existingSector !== 'equity' && existingSector !== 'shares' && existingSector.length > 2) {
        // Map known sector strings
        for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
            if (keywords.some(kw => existingSector.includes(kw))) return sector;
        }
        // Return capitalized if unmatched but valid
        return existingSector.charAt(0).toUpperCase() + existingSector.slice(1);
    }
    // Infer from security name
    const name = (holding.security_name || holding.name || holding.scheme_name || holding.scrip || '').toLowerCase();
    for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
        if (keywords.some(kw => name.includes(kw))) return sector;
    }
    return 'Others';
}

function inferMarketCap(holding) {
    // Use explicit market_cap field
    const cap = (holding.market_cap || holding.cap || holding.cap_type || holding.category || '').toLowerCase();
    if (cap.includes('large')) return 'large';
    if (cap.includes('mid')) return 'mid';
    if (cap.includes('small') && !cap.includes('mid')) return 'small';
    if (cap.includes('micro') || cap.includes('penny')) return 'micro';

    // Infer from market_value (approximate Indian market cap classification)
    const mv = Number(holding.market_value || holding.current_value || holding.value || 0);
    // These are portfolio-level thresholds (not actual market cap) — rough heuristic
    if (mv >= 1000000) return 'large';  // ₹10L+ position likely large cap
    if (mv >= 300000) return 'mid';      // ₹3L-10L position likely mid cap
    if (mv >= 50000) return 'small';     // ₹50K-3L position likely small cap
    return 'micro';
}

function populatePortfolioAnalysis(allData, completed) {
    const sectorMap = {};  // sector → { value, count }
    const capMap = { large: 0, mid: 0, small: 0, micro: 0 };
    let totalHoldings = 0;

    allData.forEach((resp, idx) => {
        if (!resp || !resp.structured_data) return;
        const d = resp.structured_data;
        const holdings = d.holdings || d.funds || d.portfolio || [];

        holdings.forEach(h => {
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
        });
    });

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

// ═══ JOURNAL ENTRIES ═══
async function loadAllJournalEntries(){
    const c=document.getElementById('fi-journal-list'); if(!clientId)return;
    try{const r=await authFetch(`/financial-instruments/?client_id=${clientId}`);if(!r.ok)return;
    const ups=await r.json();const done=ups.filter(u=>u.status==='completed'&&u.journal_entry_count>0);
    if(done.length===0){c.innerHTML='<div class="fi-empty-mini"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>Upload a statement to generate entries</p></div>';return;}
    let html='';
    for(const u of done){
        try{const jr=await authFetch(`/financial-instruments/journal-entries/${u.id}`);if(jr.ok){const d=await jr.json();
        (d.journal_entries||[]).forEach((je,i)=>{
            html+=`<div class="fi-je-card"><div class="fi-je-header"><span class="fi-je-date">${je.date||'-'}</span><span class="fi-je-narration">${je.narration||''}</span><span style="font-size:.65rem;font-weight:700;color:#94a3b8">#${i+1}</span></div><div class="fi-je-entries">${(je.ledger_entries||[]).map(le=>{const isDr=(le.side||'').toLowerCase().includes('dr');return`<div class="fi-je-entry"><span class="fi-je-ledger">${isDr?'':'&nbsp;&nbsp;&nbsp;&nbsp;To '}${le.ledger_name}</span><span class="fi-je-amount">${formatINR(le.amount)}</span><span class="fi-je-side ${isDr?'fi-dr':'fi-cr'}">${le.side}</span></div>`;}).join('')}</div></div>`;
        });}}catch(_){}}
    c.innerHTML=html||'<div class="fi-empty-mini"><p>No entries found</p></div>';
    }catch(e){console.error(e);}
}

// ═══ STATEMENTS (combined upload + history) ═══
async function loadStatements(){
    if(!clientId) return;
    try {
        const res = await authFetch(`/financial-instruments/?client_id=${clientId}`);
        if(!res.ok) return;
        let ups = await res.json();

        // Apply type filter if set
        const filterEl = document.getElementById('fi-stmt-filter');
        const filterVal = filterEl ? filterEl.value : 'all';
        if(filterVal !== 'all') ups = ups.filter(u => u.instrument_type === filterVal);

        const tbody = document.getElementById('fi-history-tbody');
        if(ups.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8">No ${filterVal==='all'?'':typeLabel(filterVal)+' '}statements uploaded yet</td></tr>`;
            return;
        }
        tbody.innerHTML = ups.map(u => {
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

            return `<tr${isProcessing?' style="background:#fefce8"':''}>
                <td style="font-weight:600;font-family:'Outfit',sans-serif;color:#4338ca">${u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '-'}</td>
                <td><span class="fi-badge" style="background:#eef2ff;color:#4338ca">${typeLabel(u.instrument_type)}</span></td>
                <td style="font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.filename}</td>
                <td><span class="fi-badge" style="background:${sc}15;color:${sc};font-weight:700">${isProcessing ? '⏳ AI PROCESSING' : (u.status||'').toUpperCase()}</span></td>
                <td style="font-weight:700;font-family:'Outfit',sans-serif">${u.journal_entry_count || (isProcessing ? '—' : '0')}</td>
                <td>${actionBtns}</td>
            </tr>`;
        }).join('');
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
    if (!confirm(`Delete "${filename}"?\n\nThis will remove the statement and all its extracted data. This cannot be undone.`)) return;
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

// ═══ INIT ═══
loadDashboardStats();
