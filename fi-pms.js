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

    const token = localStorage.getItem('token');
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
        const token = localStorage.getItem('token');
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
        const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');
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

// FY state — default to current FY (April-March)
let srSelectedFY = 2025;  // means FY 2025-26 (Apr 2025 – Mar 2026)

function setFY(fy) {
    srSelectedFY = fy;
    // Update button states
    document.querySelectorAll('.fi-fy-btn').forEach(btn => {
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

async function loadStockRegister() {
    const sel = document.getElementById('fi-sr-pms-select');
    const tbody = document.getElementById('fi-sr-tbody');
    const tfoot = document.getElementById('fi-sr-tfoot');
    if (!sel || !tbody) return;

    const accountId = sel.value;
    if (!accountId) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#9ca3af">Select a PMS account to view the stock register</td></tr>';
        if (tfoot) tfoot.style.display = 'none';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#94a3b8">Loading...</td></tr>';
    if (tfoot) tfoot.style.display = 'none';

    try {
        const token = localStorage.getItem('token');
        const fyQ = _fyParams();
        const res = await fetch(`${PMS_API}/stock-register?pms_account_id=${accountId}${fyQ}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        const securities = data.securities || [];
        const totals = data.totals || {};

        if (!securities.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#9ca3af">No holdings found. Upload a Transaction Statement or set opening balances.</td></tr>';
            return;
        }

        const fmt = (v) => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });

        tbody.innerHTML = securities.map(sec => {
            const boughtQty = sec.bought_qty || sec.purchases.reduce((s, p) => s + p.qty, 0);
            const soldQty = sec.sold_qty || sec.sales.reduce((s, p) => s + p.qty, 0);
            const bookValue = sec.closing.book_value != null ? sec.closing.book_value : sec.closing.value || 0;
            const lotCount = (sec.remaining_lots || []).length;
            const lotIcon = lotCount > 0 ? `<span class="fi-sr-expand" onclick="toggleLotDetail(this)" title="View ${lotCount} FIFO lots" style="cursor:pointer;margin-left:.35rem;font-size:.7rem;color:#6366f1">▶ ${lotCount} lots</span>` : '';

            // Build hidden lot detail row
            let lotDetailRow = '';
            if (lotCount > 0) {
                const lotRows = sec.remaining_lots.map(l => `
                    <tr style="font-size:.68rem;color:#64748b">
                        <td style="padding-left:2rem">${l.is_opening ? '📋 Opening' : '🛒 Buy'}</td>
                        <td>${l.purchase_date || '—'}</td>
                        <td>${l.remaining_qty.toFixed(4)} / ${l.original_qty.toFixed(4)}</td>
                        <td>₹${l.cost_per_unit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td colspan="3">₹${l.book_value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    </tr>
                `).join('');

                lotDetailRow = `<tr class="fi-sr-lot-detail" style="display:none"><td colspan="7" style="padding:0;background:#f8fafc">
                    <table style="width:100%;border-collapse:collapse"><thead>
                    <tr style="font-size:.6rem;text-transform:uppercase;color:#94a3b8;letter-spacing:.05em">
                        <th style="padding:.35rem .75rem;text-align:left">Type</th>
                        <th style="padding:.35rem .75rem;text-align:left">Purchase Date</th>
                        <th style="padding:.35rem .75rem;text-align:left">Remaining / Original</th>
                        <th style="padding:.35rem .75rem;text-align:left">Cost/Unit</th>
                        <th style="padding:.35rem .75rem;text-align:left" colspan="3">Book Value</th>
                    </tr></thead><tbody>${lotRows}</tbody></table>
                </td></tr>`;
            }

            return `<tr>
                <td><strong>${sec.security_name}</strong>${lotIcon}</td>
                <td>${sec.opening.qty.toFixed(4)}</td>
                <td style="color:#059669">+${boughtQty.toFixed(4)}</td>
                <td style="color:#dc2626">-${soldQty.toFixed(4)}</td>
                <td><strong>${sec.closing.qty.toFixed(4)}</strong></td>
                <td>₹${sec.closing.avg_cost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                <td style="font-weight:600;color:#374151">${fmt(bookValue)}</td>
            </tr>${lotDetailRow}`;
        }).join('');

        // Totals row
        if (tfoot && totals) {
            tfoot.style.display = '';
            tfoot.innerHTML = `<tr style="font-weight:700;background:#f1f5f9;border-top:2px solid #e2e8f0">
                <td style="padding:.6rem .75rem">TOTAL (${securities.length} securities)</td>
                <td style="padding:.6rem .75rem">${(totals.opening_qty || 0).toFixed(4)}</td>
                <td style="padding:.6rem .75rem;color:#059669">+${(totals.bought_qty || 0).toFixed(4)}</td>
                <td style="padding:.6rem .75rem;color:#dc2626">-${(totals.sold_qty || 0).toFixed(4)}</td>
                <td style="padding:.6rem .75rem">${(totals.closing_qty || 0).toFixed(4)}</td>
                <td style="padding:.6rem .75rem">—</td>
                <td style="padding:.6rem .75rem;color:#374151">${fmt(totals.closing_book_value || 0)}</td>
            </tr>`;
        }

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#dc2626">${e.message}</td></tr>`;
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
        const token = localStorage.getItem('token');
        const res = await fetch(`${PMS_API}/run-fifo?pms_account_id=${accountId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
            const data = await res.json();
            if (typeof showToast === 'function') showToast(
                `FIFO complete: ${data.buys_processed} buys, ${data.sells_processed} sells, Net: ₹${data.net_gain.toLocaleString('en-IN')}`,
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


// ─── Capital Gains ───────────────────────────────────

async function loadCapitalGains() {
    const sel = document.getElementById('fi-cg-pms-select');
    const tbody = document.getElementById('fi-cg-tbody');
    if (!sel || !tbody) return;

    const accountId = sel.value;
    if (!accountId) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#9ca3af">Select a PMS account to view capital gains</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#94a3b8">Loading...</td></tr>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${PMS_API}/capital-gains?pms_account_id=${accountId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        // Update summary cards
        const fmt = (v) => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
        const el = (id) => document.getElementById(id);
        if (el('fi-cg-summary-stcg')) el('fi-cg-summary-stcg').textContent = fmt(data.summary.stcg);
        if (el('fi-cg-summary-ltcg')) el('fi-cg-summary-ltcg').textContent = fmt(data.summary.ltcg);
        if (el('fi-cg-summary-net')) {
            el('fi-cg-summary-net').textContent = (data.summary.total >= 0 ? '' : '(') + fmt(data.summary.total) + (data.summary.total < 0 ? ')' : '');
            el('fi-cg-summary-net').style.color = data.summary.total >= 0 ? '#059669' : '#dc2626';
        }
        if (el('fi-cg-summary-stcg-tax')) el('fi-cg-summary-stcg-tax').textContent = fmt(data.summary.stcg_tax || 0);
        if (el('fi-cg-summary-ltcg-tax')) el('fi-cg-summary-ltcg-tax').textContent = fmt(data.summary.ltcg_tax || 0);
        if (el('fi-cg-summary-count')) el('fi-cg-summary-count').textContent = data.entries.length;

        if (!data.entries.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#9ca3af">No sales found — upload a Transaction Statement with sell trades.</td></tr>';
            return;
        }

        tbody.innerHTML = data.entries.map(e => {
            const gainColor = e.gain_loss >= 0 ? '#059669' : '#dc2626';
            const typeBadge = e.gain_type === 'LTCG'
                ? '<span style="background:#ede9fe;color:#6366f1;padding:2px 6px;border-radius:4px;font-size:.65rem;font-weight:600">LTCG</span>'
                : '<span style="background:#dcfce7;color:#059669;padding:2px 6px;border-radius:4px;font-size:.65rem;font-weight:600">STCG</span>';
            const gfBadge = e.is_grandfathered ? ' <span style="color:#d97706;font-size:.6rem" title="Section 112A grandfathered">⚡112A</span>' : '';

            return `<tr>
                <td><strong>${e.security_name}</strong>${gfBadge}</td>
                <td>${e.purchase_date || '—'}</td>
                <td>${e.sale_date || '—'}</td>
                <td>${e.qty.toFixed(4)}</td>
                <td>₹${e.cost_basis.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td>₹${e.sale_proceeds.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td style="font-weight:600;color:${gainColor}">${e.gain_loss >= 0 ? '+' : ''}₹${e.gain_loss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                <td>${typeBadge}</td>
                <td>${e.holding_days || '—'}</td>
            </tr>`;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:#dc2626">${e.message}</td></tr>`;
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
