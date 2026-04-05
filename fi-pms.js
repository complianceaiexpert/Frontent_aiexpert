/**
 * fi-pms.js — PMS Accounting Frontend Logic
 * ──────────────────────────────────────────
 * Handles: PMS accounts, 3-PDF upload, stock register, capital gains,
 * opening balances. Runs alongside fi-tally-entry.js.
 */

const PMS_API = (typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:8000/api/v1') + '/pms';

// ─── State ───
let pmsAccounts = [];
let selectedPMSAccountId = '';

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => loadPMSAccounts(), 500);
});

// ─── PMS Account CRUD ─────────────────────────────────

async function loadPMSAccounts() {
    const clientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('selectedClientId');
    if (!clientId) return;

    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`${PMS_API}/accounts?client_id=${clientId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        pmsAccounts = await res.json();
        populatePMSSelectors();
    } catch (e) {
        console.warn('PMS accounts load failed:', e);
    }
}

function populatePMSSelectors() {
    const selectors = [
        document.getElementById('fi-pms-account-select'),
        document.getElementById('fi-sr-pms-select'),
        document.getElementById('fi-cg-pms-select'),
    ];

    selectors.forEach(sel => {
        if (!sel) return;
        const current = sel.value;
        sel.innerHTML = '<option value="">— Select PMS Account —</option>';
        pmsAccounts.forEach(a => {
            const label = a.strategy_name
                ? `${a.provider_name} — ${a.strategy_name}`
                : a.provider_name;
            sel.innerHTML += `<option value="${a.id}">${label}</option>`;
        });
        if (current) sel.value = current;
    });
}

function onPMSAccountChange() {
    const sel = document.getElementById('fi-pms-account-select');
    selectedPMSAccountId = sel ? sel.value : '';
    const cards = document.getElementById('fi-pms-upload-cards');
    const badge = document.getElementById('fi-pms-accrual-badge');

    if (cards) cards.style.display = selectedPMSAccountId ? 'grid' : 'none';

    if (badge && selectedPMSAccountId) {
        const acct = pmsAccounts.find(a => a.id === selectedPMSAccountId);
        if (acct && acct.config) {
            const mode = acct.config.accrual_mode || 'quarterly_actual';
            badge.textContent = mode === 'daily' ? 'Daily Accruals' : 'Quarterly Actuals';
            badge.style.display = '';
        }
    } else if (badge) {
        badge.style.display = 'none';
    }

    // Refresh PMS uploads table filtered by selected account
    if (typeof loadStatementsTabbed === 'function') loadStatementsTabbed();
}


// ─── PMS Account Modal ───────────────────────────────

function showPMSAccountModal() {
    const existing = document.getElementById('pms-account-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'pms-account-modal';
    modal.className = 'fi-modal-overlay';
    modal.innerHTML = `
        <div class="fi-modal" style="max-width:480px">
            <div class="fi-modal-header">
                <h3 style="margin:0;font-size:.95rem;font-weight:700">Add PMS Account</h3>
                <button class="fi-modal-close" onclick="document.getElementById('pms-account-modal').remove()">&times;</button>
            </div>
            <div class="fi-modal-body" style="padding:1.25rem;display:grid;gap:.85rem">
                <div>
                    <label class="fi-form-label">Provider Name *</label>
                    <input class="fi-form-input" id="pms-provider" placeholder="e.g. Abakkus, Marcellus, ASK" />
                </div>
                <div>
                    <label class="fi-form-label">Strategy Name</label>
                    <input class="fi-form-input" id="pms-strategy" placeholder="e.g. Emerging Opportunities" />
                </div>
                <div>
                    <label class="fi-form-label">Account Code</label>
                    <input class="fi-form-input" id="pms-account-code" placeholder="PMS account number" />
                </div>
                <div>
                    <label class="fi-form-label">PMS Start Date</label>
                    <input class="fi-form-input" id="pms-start-date" type="date" />
                </div>
                <div>
                    <label class="fi-form-label">Accrual Mode</label>
                    <select class="fi-form-select" id="pms-accrual-mode">
                        <option value="quarterly_actual">Quarterly Actuals (recommended)</option>
                        <option value="daily">Daily Accruals</option>
                    </select>
                </div>
            </div>
            <div class="fi-modal-footer" style="padding:.75rem 1.25rem;display:flex;gap:.5rem;justify-content:flex-end;border-top:1px solid #e5e7eb">
                <button class="fi-btn" onclick="document.getElementById('pms-account-modal').remove()">Cancel</button>
                <button class="fi-btn success" onclick="createPMSAccount()">Create Account</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('pms-provider').focus();
}

async function createPMSAccount() {
    const clientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('selectedClientId');
    const provider = document.getElementById('pms-provider')?.value?.trim();
    const strategy = document.getElementById('pms-strategy')?.value?.trim() || null;
    const code = document.getElementById('pms-account-code')?.value?.trim() || null;
    const startDate = document.getElementById('pms-start-date')?.value || null;
    const accrualMode = document.getElementById('pms-accrual-mode')?.value || 'quarterly_actual';

    if (!provider) {
        if (typeof showToast === 'function') showToast('Provider name is required', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${PMS_API}/accounts`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                provider_name: provider,
                strategy_name: strategy,
                account_code: code,
                pms_start_date: startDate,
                accrual_mode: accrualMode,
            }),
        });

        if (res.ok) {
            if (typeof showToast === 'function') showToast(`PMS Account created: ${provider}`, 'success');
            document.getElementById('pms-account-modal')?.remove();
            await loadPMSAccounts();
        } else {
            const err = await res.json();
            if (typeof showToast === 'function') showToast(err.detail || 'Failed to create account', 'error');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('Network error', 'error');
    }
}


// ─── PMS PDF Upload ──────────────────────────────────

async function handlePMSUpload(input, statementType) {
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    if (!selectedPMSAccountId) {
        if (typeof showToast === 'function') showToast('Please select a PMS account first', 'error');
        return;
    }

    const clientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('selectedClientId');
    if (!clientId) {
        if (typeof showToast === 'function') showToast('No client selected', 'error');
        return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
        if (typeof showToast === 'function') showToast('File too large. Max 25 MB.', 'error');
        return;
    }

    const labels = { transaction: 'Transaction', dividend: 'Dividend', expenses: 'Expenses' };
    if (typeof showToast === 'function') showToast(`Uploading ${labels[statementType]} statement: ${file.name}...`, 'info');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', clientId);
    formData.append('pms_account_id', selectedPMSAccountId);
    formData.append('statement_type', statementType);

    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${PMS_API}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        if (res.ok) {
            const data = await res.json();
            if (typeof showToast === 'function') showToast(`Processing ${labels[statementType]} statement... This may take 30-60s.`, 'success');
            // Poll status
            pollUploadStatus(data.id, statementType);
            // Refresh statements list
            if (typeof loadStatements === 'function') loadStatements();
        } else {
            const err = await res.json();
            if (typeof showToast === 'function') showToast(err.detail || `Upload failed`, 'error');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('Upload failed: network error', 'error');
    }
}

async function pollUploadStatus(uploadId, statementType) {
    const token = localStorage.getItem('access_token');
    const FI_API = (typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:8000/api/v1') + '/financial-instruments';

    const poll = async () => {
        try {
            const res = await fetch(`${FI_API}/status/${uploadId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();

            if (data.status === 'completed') {
                const labels = { transaction: 'Transaction', dividend: 'Dividend', expenses: 'Expenses' };
                if (typeof showToast === 'function') showToast(
                    `✅ ${labels[statementType] || 'PMS'} statement processed: ${data.journal_entry_count || 0} records imported`,
                    'success'
                );
                if (typeof loadStatements === 'function') loadStatements();
                return;
            } else if (data.status === 'failed') {
                if (typeof showToast === 'function') showToast(`❌ Processing failed: ${data.error || 'Unknown error'}`, 'error');
                return;
            }
            // Still processing — poll again
            setTimeout(poll, 3000);
        } catch (e) {
            console.warn('Poll error:', e);
        }
    };
    setTimeout(poll, 3000);
}


// ─── Stock Register ──────────────────────────────────

// Pill toggle helpers
function setSRSource(val) {
    document.querySelectorAll('[data-sr-source]').forEach(b => b.classList.toggle('active', b.dataset.srSource === val));
    const hid = document.getElementById('fi-sr-source-select');
    if(hid) hid.value = val;
    // Show PMS account dropdown when PMS selected
    const pm = document.getElementById('fi-sr-pms-select');
    if(pm) pm.style.display = (val === 'pms') ? '' : 'none';
    const fb = document.getElementById('fi-sr-fifo-btn');
    if(fb) fb.style.display = (val === 'pms') ? '' : 'none';
    loadStockRegister();
}

function setCGSource(val) {
    document.querySelectorAll('[data-cg-source]').forEach(b => b.classList.toggle('active', b.dataset.cgSource === val));
    const hid = document.getElementById('fi-cg-source-select');
    if(hid) hid.value = val;
    const pm = document.getElementById('fi-cg-pms-select');
    if(pm) pm.style.display = (val === 'pms') ? '' : 'none';
    loadCapitalGains();
}

function setCGCat(val) {
    document.querySelectorAll('[data-cg-cat]').forEach(b => b.classList.toggle('active', b.dataset.cgCat === val));
    const hid = document.getElementById('fi-cg-category');
    if(hid) hid.value = val;
    loadCapitalGains();
}

// FY state — default to current FY (April-March)
let srSelectedFY = 2025;  // means FY 2025-26 (Apr 2025 – Mar 2026)

function setFY(fy) {
    srSelectedFY = fy;
    document.querySelectorAll('[data-fy]').forEach(btn => {
        btn.classList.toggle('active', String(btn.dataset.fy) === String(fy));
    });
    loadStockRegister();
}

function _fyParams() {
    if (srSelectedFY === 'all') return '';
    const start = `${srSelectedFY}-04-01`;
    const end = `${Number(srSelectedFY) + 1}-03-31`;
    return `&fy_start=${start}&fy_end=${end}`;
}

// Helper: fetch all completed FI uploads with structured_data for given type
async function _fetchFIData(typePrefix) {
    const clientId = new URLSearchParams(location.search).get('clientId') || localStorage.getItem('selectedClientId');
    if(!clientId) return [];
    try {
        const res = await authFetch(`/financial-instruments/?client_id=${clientId}`);
        if(!res.ok) return [];
        const uploads = await res.json();
        const completed = uploads.filter(u => u.status === 'completed' && u.instrument_type?.startsWith(typePrefix));
        const results = [];
        for(const u of completed) {
            try {
                const dr = await authFetch(`/financial-instruments/data/${u.id}`);
                if(dr.ok) {
                    const d = await dr.json();
                    results.push({ upload: u, data: d.structured_data || {} });
                }
            } catch(e) {}
        }
        return results;
    } catch(e) { return []; }
}

async function loadStockRegister() {
    const sourceSelect = document.getElementById('fi-sr-source-select');
    const pmsSelect = document.getElementById('fi-sr-pms-select');
    const tbody = document.getElementById('fi-sr-tbody');
    const tfoot = document.getElementById('fi-sr-tfoot');
    const fifoBtn = document.getElementById('fi-sr-fifo-btn');
    if(!tbody) return;

    const source = sourceSelect?.value || 'all';
    // Show/hide PMS account selector
    if(pmsSelect) pmsSelect.style.display = (source === 'pms' || source === 'all') ? '' : 'none';
    if(fifoBtn) fifoBtn.style.display = source === 'pms' ? '' : 'none';

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#94a3b8">Loading holdings...</td></tr>';
    if(tfoot) tfoot.style.display = 'none';

    const fmt = v => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    let allRows = [];

    // ── PMS Holdings ──
    if(source === 'all' || source === 'pms') {
        const accountId = pmsSelect?.value;
        if(accountId) {
            try {
                const token = localStorage.getItem('access_token');
                const fyQ = _fyParams();
                const res = await fetch(`${PMS_API}/stock-register?pms_account_id=${accountId}${fyQ}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if(res.ok) {
                    const data = await res.json();
                    const acct = pmsAccounts.find(a => a.id == accountId);
                    const label = acct?.account_name || acct?.provider_name || 'PMS';
                    (data.securities || []).forEach(sec => {
                        const bookValue = sec.closing?.book_value || 0;
                        allRows.push({
                            name: sec.security_name,
                            source: label,
                            sourceType: 'pms',
                            qty: sec.closing?.qty || 0,
                            avgCost: sec.closing?.avg_cost || 0,
                            marketPrice: 0,
                            invested: bookValue,
                            current: bookValue,
                            pnl: 0,
                        });
                    });
                }
            } catch(e) {}
        }
    }

    // ── Demat Holdings ──
    if(source === 'all' || source === 'demat') {
        const dematData = await _fetchFIData('demat_holdings');
        dematData.forEach(({ upload, data }) => {
            const broker = data.broker || 'Zerodha';
            (data.holdings || []).forEach(h => {
                const qty = Number(h.quantity || h.qty || 0);
                const avgCost = Number(h.avg_cost || h.average_cost || 0);
                const marketPrice = Number(h.close_price || h.market_price || h.ltp || 0);
                const invested = Number(h.invested_value || h.total_cost || avgCost * qty || 0);
                const current = Number(h.market_value || h.current_value || marketPrice * qty || 0);
                allRows.push({
                    name: h.scrip_name || h.security_name || h.name || 'Unknown',
                    source: broker.charAt(0).toUpperCase() + broker.slice(1),
                    sourceType: 'demat',
                    qty,
                    avgCost,
                    marketPrice,
                    invested,
                    current,
                    pnl: current - invested,
                });
            });
        });
    }

    // ── Mutual Fund Holdings ──
    if(source === 'all' || source === 'mf') {
        const mfData = await _fetchFIData('mutual_fund');
        mfData.forEach(({ upload, data }) => {
            (data.holdings || data.funds || []).forEach(h => {
                const invested = Number(h.invested_value || h.cost || 0);
                const current = Number(h.market_value || h.current_value || 0);
                allRows.push({
                    name: h.fund_name || h.scheme_name || h.name || 'Unknown',
                    source: 'AMC',
                    sourceType: 'mf',
                    qty: Number(h.units || h.quantity || 0),
                    avgCost: Number(h.avg_nav || h.avg_cost || 0),
                    marketPrice: Number(h.current_nav || h.nav || 0),
                    invested,
                    current,
                    pnl: current - invested,
                });
            });
        });
    }

    // Sort by current value descending
    allRows.sort((a, b) => b.current - a.current);

    if(!allRows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#9ca3af">No holdings found. Upload statements or select a PMS account.</td></tr>';
        return;
    }

    const sourceBadge = (type) => {
        const colors = { pms: '#d97706', demat: '#4338ca', mf: '#059669' };
        const labels = { pms: 'PMS', demat: 'Demat', mf: 'MF' };
        return `<span style="background:${colors[type]||'#94a3b8'}15;color:${colors[type]||'#94a3b8'};padding:1px 6px;border-radius:4px;font-size:.6rem;font-weight:600">${labels[type]||type}</span>`;
    };

    tbody.innerHTML = allRows.map(r => {
        const pnlColor = r.pnl >= 0 ? '#059669' : '#dc2626';
        const pnlSign = r.pnl >= 0 ? '+' : '';
        return `<tr>
            <td><strong>${r.name}</strong></td>
            <td>${sourceBadge(r.sourceType)} ${r.source}</td>
            <td>${r.qty.toLocaleString('en-IN', { maximumFractionDigits: 4 })}</td>
            <td>${fmt(r.avgCost)}</td>
            <td>${r.marketPrice ? fmt(r.marketPrice) : '—'}</td>
            <td>${fmt(r.invested)}</td>
            <td style="font-weight:600">${fmt(r.current)}</td>
            <td style="font-weight:600;color:${pnlColor}">${pnlSign}${fmt(r.pnl)}</td>
        </tr>`;
    }).join('');

    // Summary cards
    const totalInvested = allRows.reduce((s, r) => s + r.invested, 0);
    const totalCurrent = allRows.reduce((s, r) => s + r.current, 0);
    const el = id => document.getElementById(id);
    if(el('fi-sr-total-count')) el('fi-sr-total-count').textContent = allRows.length + ' securities';
    if(el('fi-sr-invested')) el('fi-sr-invested').textContent = fmt(totalInvested);
    if(el('fi-sr-current')) {
        el('fi-sr-current').textContent = fmt(totalCurrent);
        el('fi-sr-current').style.color = totalCurrent >= totalInvested ? '#059669' : '#dc2626';
    }

    // Total footer
    if(tfoot) {
        const totalPnl = totalCurrent - totalInvested;
        tfoot.style.display = '';
        tfoot.innerHTML = `<tr style="font-weight:700;background:#f1f5f9;border-top:2px solid #e2e8f0">
            <td style="padding:.6rem .75rem">TOTAL (${allRows.length})</td>
            <td></td><td></td><td></td><td></td>
            <td style="padding:.6rem .75rem">${fmt(totalInvested)}</td>
            <td style="padding:.6rem .75rem">${fmt(totalCurrent)}</td>
            <td style="padding:.6rem .75rem;color:${totalPnl>=0?'#059669':'#dc2626'}">${totalPnl>=0?'+':''}${fmt(totalPnl)}</td>
        </tr>`;
    }
}

function toggleLotDetail(el) {
    const mainRow = el.closest('tr');
    const detailRow = mainRow.nextElementSibling;
    if (!detailRow || !detailRow.classList.contains('fi-sr-lot-detail')) return;
    const isHidden = detailRow.style.display === 'none';
    detailRow.style.display = isHidden ? '' : 'none';
    el.textContent = isHidden
        ? '▼ ' + el.textContent.replace('▶ ', '').replace('▼ ', '')
        : '▶ ' + el.textContent.replace('▶ ', '').replace('▼ ', '');
}

async function recomputeFIFO() {
    const sel = document.getElementById('fi-sr-pms-select');
    const accountId = sel?.value;
    if (!accountId) {
        if (typeof showToast === 'function') showToast('Select a PMS account first', 'error');
        return;
    }
    if (typeof showToast === 'function') showToast('Re-computing FIFO lots...', 'info');
    try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${PMS_API}/run-fifo?pms_account_id=${accountId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
            const data = await res.json();
            if (typeof showToast === 'function') showToast(
                `FIFO complete: ${data.buys_processed} buys, ${data.sells_processed} sells`,
                'success'
            );
            loadStockRegister();
        } else {
            const err = await res.json();
            if (typeof showToast === 'function') showToast(err.detail || 'FIFO failed', 'error');
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast('FIFO computation failed', 'error');
    }
}


// ─── Capital Gains (Unified) ───────────────────────────────────

async function loadCapitalGains() {
    const sourceSelect = document.getElementById('fi-cg-source-select');
    const pmsSelect = document.getElementById('fi-cg-pms-select');
    const categorySelect = document.getElementById('fi-cg-category');
    const tbody = document.getElementById('fi-cg-tbody');
    if(!tbody) return;

    const source = sourceSelect?.value || 'all';
    const category = categorySelect?.value || 'all';
    // Show/hide PMS selector
    if(pmsSelect) pmsSelect.style.display = (source === 'pms') ? '' : 'none';

    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:#94a3b8">Loading capital gains...</td></tr>';

    const fmt = v => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    let allEntries = [];

    // ── PMS Capital Gains ──
    if(source === 'all' || source === 'pms') {
        const accountId = pmsSelect?.value;
        if(accountId) {
            try {
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${PMS_API}/capital-gains?pms_account_id=${accountId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if(res.ok) {
                    const data = await res.json();
                    const acct = pmsAccounts.find(a => a.id == accountId);
                    const label = acct?.account_name || acct?.provider_name || 'PMS';
                    (data.entries || []).forEach(e => {
                        allEntries.push({
                            name: e.security_name,
                            source: label,
                            sourceType: 'pms',
                            buyDate: e.purchase_date || '—',
                            sellDate: e.sale_date || '—',
                            qty: e.qty || 0,
                            buyValue: e.cost_basis || 0,
                            sellValue: e.sale_proceeds || 0,
                            gain: e.gain_loss || 0,
                            type: e.gain_type || 'STCG',
                            days: e.holding_days || 0,
                            isGrandfathered: e.is_grandfathered || false,
                        });
                    });
                }
            } catch(e) {}
        }
    }

    // ── Demat Capital Gains (from Tax P&L) ──
    if(source === 'all' || source === 'demat') {
        const dematData = await _fetchFIData('demat_taxpnl');
        dematData.forEach(({ upload, data }) => {
            const broker = data.broker || 'Zerodha';
            const brokerLabel = broker.charAt(0).toUpperCase() + broker.slice(1);
            (data.transactions || []).forEach(t => {
                const buyVal = Number(t.buy_value || t.purchase_value || 0);
                const sellVal = Number(t.sell_value || t.sale_value || 0);
                const gain = Number(t.realized_pnl || t.pnl || t.profit || (sellVal - buyVal) || 0);
                // Determine type from trade_type or holding period
                let type = 'STCG';
                const tt = String(t.trade_type || t.type || '').toLowerCase();
                if(tt.includes('long') || tt === 'ltcg') type = 'LTCG';
                else if(tt.includes('intraday') || tt.includes('speculative')) type = 'Intraday';
                else if(tt.includes('short') || tt === 'stcg') type = 'STCG';
                else if(t.holding_days && t.holding_days > 365) type = 'LTCG';

                allEntries.push({
                    name: t.scrip_name || t.security_name || t.symbol || 'Unknown',
                    source: brokerLabel,
                    sourceType: 'demat',
                    buyDate: t.buy_date || t.purchase_date || '—',
                    sellDate: t.sell_date || t.sale_date || '—',
                    qty: Number(t.quantity || t.qty || 0),
                    buyValue: buyVal,
                    sellValue: sellVal,
                    gain,
                    type,
                    days: Number(t.holding_days || 0),
                    isGrandfathered: false,
                });
            });
        });
    }

    // ── Apply Category Filter ──
    if(category !== 'all') {
        allEntries = allEntries.filter(e => {
            if(category === 'intraday') return e.type === 'Intraday';
            if(category === 'stcg') return e.type === 'STCG';
            if(category === 'ltcg') return e.type === 'LTCG';
            return true;
        });
    }

    // Sort by sell date (most recent first)
    allEntries.sort((a, b) => {
        if(a.sellDate === '—') return 1;
        if(b.sellDate === '—') return -1;
        return b.sellDate.localeCompare(a.sellDate);
    });

    // ── Summary Computations ──
    const specTotal = allEntries.filter(e => e.type === 'Intraday').reduce((s, e) => s + e.gain, 0);
    const stcgTotal = allEntries.filter(e => e.type === 'STCG').reduce((s, e) => s + e.gain, 0);
    const ltcgTotal = allEntries.filter(e => e.type === 'LTCG').reduce((s, e) => s + e.gain, 0);
    const netTotal = specTotal + stcgTotal + ltcgTotal;
    const stcgTax = Math.max(0, stcgTotal) * 0.20;
    const ltcgTax = Math.max(0, ltcgTotal - 125000) * 0.125;

    const el = id => document.getElementById(id);
    const fmtSigned = v => (v >= 0 ? '' : '(') + fmt(v) + (v < 0 ? ')' : '');
    if(el('fi-cg-summary-spec')) el('fi-cg-summary-spec').textContent = fmtSigned(specTotal);
    if(el('fi-cg-summary-stcg')) el('fi-cg-summary-stcg').textContent = fmtSigned(stcgTotal);
    if(el('fi-cg-summary-ltcg')) el('fi-cg-summary-ltcg').textContent = fmtSigned(ltcgTotal);
    if(el('fi-cg-summary-net')) {
        el('fi-cg-summary-net').textContent = fmtSigned(netTotal);
        el('fi-cg-summary-net').style.color = netTotal >= 0 ? '#059669' : '#dc2626';
    }
    if(el('fi-cg-summary-stcg-tax')) el('fi-cg-summary-stcg-tax').textContent = fmt(stcgTax);
    if(el('fi-cg-summary-ltcg-tax')) el('fi-cg-summary-ltcg-tax').textContent = fmt(Math.max(0, ltcgTax));
    if(el('fi-cg-summary-count')) el('fi-cg-summary-count').textContent = allEntries.length;

    if(!allEntries.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;color:#9ca3af">No capital gains data found. Upload Tax P&L or transactions.</td></tr>';
        return;
    }

    const sourceBadge = (type) => {
        const colors = { pms: '#d97706', demat: '#4338ca', mf: '#059669' };
        const labels = { pms: 'PMS', demat: 'Demat', mf: 'MF' };
        return `<span style="background:${colors[type]||'#94a3b8'}15;color:${colors[type]||'#94a3b8'};padding:1px 6px;border-radius:4px;font-size:.6rem;font-weight:600">${labels[type]||type}</span>`;
    };

    const typeBadge = (type) => {
        if(type === 'LTCG') return '<span style="background:#ede9fe;color:#6366f1;padding:2px 6px;border-radius:4px;font-size:.6rem;font-weight:600">LTCG</span>';
        if(type === 'Intraday') return '<span style="background:#fff7ed;color:#d97706;padding:2px 6px;border-radius:4px;font-size:.6rem;font-weight:600">Speculative</span>';
        return '<span style="background:#dcfce7;color:#059669;padding:2px 6px;border-radius:4px;font-size:.6rem;font-weight:600">STCG</span>';
    };

    // Limit to 500 rows for performance
    const displayEntries = allEntries.slice(0, 500);
    tbody.innerHTML = displayEntries.map(e => {
        const gainColor = e.gain >= 0 ? '#059669' : '#dc2626';
        const gfBadge = e.isGrandfathered ? ' <span style="color:#d97706;font-size:.55rem" title="Section 112A grandfathered">⚡112A</span>' : '';
        return `<tr>
            <td><strong>${e.name}</strong>${gfBadge}</td>
            <td>${sourceBadge(e.sourceType)} ${e.source}</td>
            <td>${e.buyDate}</td>
            <td>${e.sellDate}</td>
            <td>${e.qty.toLocaleString('en-IN', { maximumFractionDigits: 4 })}</td>
            <td>${fmt(e.buyValue)}</td>
            <td>${fmt(e.sellValue)}</td>
            <td style="font-weight:600;color:${gainColor}">${e.gain >= 0 ? '+' : ''}${fmt(e.gain)}</td>
            <td>${typeBadge(e.type)}</td>
            <td>${e.days || '—'}</td>
        </tr>`;
    }).join('');

    if(allEntries.length > 500) {
        tbody.innerHTML += `<tr><td colspan="10" style="text-align:center;padding:.75rem;color:#94a3b8;font-size:.72rem">Showing 500 of ${allEntries.length} entries</td></tr>`;
    }
}


// ─── Modal CSS (injected once) ───────────────────────

(function injectPMSModalCSS() {
    if (document.getElementById('pms-modal-css')) return;
    const style = document.createElement('style');
    style.id = 'pms-modal-css';
    style.textContent = `
        .fi-modal-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,.45);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; backdrop-filter: blur(4px);
            animation: fadeIn .2s ease;
        }
        .fi-modal {
            background: #fff; border-radius: 12px; width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,.25);
            animation: slideUp .25s ease;
        }
        .fi-modal-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: .75rem 1.25rem; border-bottom: 1px solid #e5e7eb;
        }
        .fi-modal-close {
            background: none; border: none; font-size: 1.3rem; cursor: pointer;
            color: #94a3b8; width: 28px; height: 28px; display: flex;
            align-items: center; justify-content: center; border-radius: 6px;
        }
        .fi-modal-close:hover { background: #f1f5f9; color: #374151; }
        @keyframes fadeIn { from { opacity: 0; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } }
    `;
    document.head.appendChild(style);
})();
