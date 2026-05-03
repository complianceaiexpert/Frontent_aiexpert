/**
 * FY Period Utility Module — v2 (Calendar Picker)
 * ════════════════════════════════════════════════════════
 * Banking-style period picker with quick presets, month grids,
 * and FY-aware date ranges.
 * 
 * Usage:
 *   FYPeriod.mount('#container', { type: 'monthly', onChange: fn });
 *   FYPeriod.getSelected()  → { value, label, dateRange, fy }
 *   FYPeriod.getCurrentFY() → "2026-27"
 * 
 * Config:
 *   type:       'monthly' | 'quarterly' | 'half-yearly' | 'yearly'
 *   format:     'FY' | 'AY' (default: 'FY')
 *   label:      Custom label (default: auto based on type)
 *   pastYears:  Number of past FYs (default: 3)
 *   showNext:   Show next FY (default: true)
 *   onChange:    callback({ value, label, dateRange, fy })
 *   persist:    Persist selection in sessionStorage (default: true)
 *   defaultValue: 'current' | specific value
 */

const FYPeriod = (() => {
    // ═══ CONSTANTS ═══
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // FY month order: Apr(3)..Dec(11), Jan(0)..Mar(2)
    const FY_MONTH_INDICES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
    const STORAGE_KEY = 'fy_period_selection';

    // ═══ INTERNAL STATE ═══
    let _mounted = false;
    let _config = {};
    let _selected = null;
    let _containerId = null;
    let _panelOpen = false;
    let _uid = 0; // unique instance counter

    // ═══════════════════════════════════════════════════════
    //  CORE FY LOGIC
    // ═══════════════════════════════════════════════════════

    /** Get current Financial Year as "YYYY-YY" (e.g., "2026-27") */
    function getCurrentFY() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const fyStartYear = month >= 3 ? year : year - 1;
        return _formatFY(fyStartYear);
    }

    /** Get FY from a specific date */
    function getFYFromDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth();
        const fyStartYear = month >= 3 ? year : year - 1;
        return _formatFY(fyStartYear);
    }

    /** Get Assessment Year from FY: "2025-26" → "2026-27" */
    function getAY(fy) {
        const startYear = parseInt(fy.split('-')[0]);
        return _formatFY(startYear + 1);
    }

    /** Get FY from AY: "2026-27" → "2025-26" */
    function getFYFromAY(ay) {
        const startYear = parseInt(ay.split('-')[0]);
        return _formatFY(startYear - 1);
    }

    /** Get date range for a FY: { from: "2025-04-01", to: "2026-03-31" } */
    function getFYDateRange(fy) {
        const startYear = parseInt(fy.split('-')[0]);
        return {
            from: `${startYear}-04-01`,
            to: `${startYear + 1}-03-31`,
        };
    }

    /** Check if a date falls within a FY */
    function isDateInFY(date, fy) {
        const range = getFYDateRange(fy);
        const d = new Date(date);
        return d >= new Date(range.from) && d <= new Date(range.to);
    }

    function _formatFY(startYear) {
        return `${startYear}-${String(startYear + 1).slice(-2)}`;
    }

    function _fyStartYear(fy) {
        return parseInt(fy.split('-')[0]);
    }

    // ═══════════════════════════════════════════════════════
    //  PERIOD GENERATORS
    // ═══════════════════════════════════════════════════════

    function getFYOptions(pastYears = 3, showNext = true) {
        const currentStartYear = _fyStartYear(getCurrentFY());
        const options = [];
        for (let i = pastYears; i >= 1; i--) {
            const y = currentStartYear - i;
            options.push({ value: _formatFY(y), label: `FY ${_formatFY(y)}`, dateRange: getFYDateRange(_formatFY(y)), fy: _formatFY(y), isCurrent: false });
        }
        options.push({ value: _formatFY(currentStartYear), label: `FY ${_formatFY(currentStartYear)}`, dateRange: getFYDateRange(_formatFY(currentStartYear)), fy: _formatFY(currentStartYear), isCurrent: true });
        if (showNext) {
            const n = currentStartYear + 1;
            options.push({ value: _formatFY(n), label: `FY ${_formatFY(n)}`, dateRange: getFYDateRange(_formatFY(n)), fy: _formatFY(n), isCurrent: false });
        }
        return options;
    }

    function getAYOptions(pastYears = 3, showNext = true) {
        return getFYOptions(pastYears, showNext).map(opt => ({
            ...opt, value: getAY(opt.value), label: `AY ${getAY(opt.value)}`,
        }));
    }

    function getMonthlyPeriods(fy) {
        const startYear = _fyStartYear(fy || getCurrentFY());
        const periods = [];
        for (let m = 3; m <= 11; m++) {
            const monthStr = String(m + 1).padStart(2, '0');
            const daysInMonth = new Date(startYear, m + 1, 0).getDate();
            periods.push({ value: `${startYear}-${monthStr}`, label: `${MONTHS[m]} ${startYear}`, shortLabel: `${MONTHS_SHORT[m]} ${startYear}`, dateRange: { from: `${startYear}-${monthStr}-01`, to: `${startYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}` }, fy: fy || getCurrentFY(), monthIndex: m });
        }
        for (let m = 0; m <= 2; m++) {
            const nextYear = startYear + 1;
            const monthStr = String(m + 1).padStart(2, '0');
            const daysInMonth = new Date(nextYear, m + 1, 0).getDate();
            periods.push({ value: `${nextYear}-${monthStr}`, label: `${MONTHS[m]} ${nextYear}`, shortLabel: `${MONTHS_SHORT[m]} ${nextYear}`, dateRange: { from: `${nextYear}-${monthStr}-01`, to: `${nextYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}` }, fy: fy || getCurrentFY(), monthIndex: m });
        }
        return periods;
    }

    function getQuarterlyPeriods(fy) {
        const startYear = _fyStartYear(fy || getCurrentFY());
        const nextYear = startYear + 1;
        return [
            { value: `${startYear}-Q1`, label: `Q1 (Apr–Jun ${startYear})`, shortLabel: `Q1 ${startYear}`, dateRange: { from: `${startYear}-04-01`, to: `${startYear}-06-30` }, fy: fy || getCurrentFY() },
            { value: `${startYear}-Q2`, label: `Q2 (Jul–Sep ${startYear})`, shortLabel: `Q2 ${startYear}`, dateRange: { from: `${startYear}-07-01`, to: `${startYear}-09-30` }, fy: fy || getCurrentFY() },
            { value: `${startYear}-Q3`, label: `Q3 (Oct–Dec ${startYear})`, shortLabel: `Q3 ${startYear}`, dateRange: { from: `${startYear}-10-01`, to: `${startYear}-12-31` }, fy: fy || getCurrentFY() },
            { value: `${nextYear}-Q4`, label: `Q4 (Jan–Mar ${nextYear})`, shortLabel: `Q4 ${nextYear}`, dateRange: { from: `${nextYear}-01-01`, to: `${nextYear}-03-31` }, fy: fy || getCurrentFY() },
        ];
    }

    function getHalfYearlyPeriods(fy) {
        const startYear = _fyStartYear(fy || getCurrentFY());
        const nextYear = startYear + 1;
        return [
            { value: `${startYear}-H1`, label: `H1 (Apr–Sep ${startYear})`, shortLabel: `H1 ${startYear}`, dateRange: { from: `${startYear}-04-01`, to: `${startYear}-09-30` }, fy: fy || getCurrentFY() },
            { value: `${startYear}-H2`, label: `H2 (Oct ${startYear}–Mar ${nextYear})`, shortLabel: `H2 ${startYear}-${String(nextYear).slice(-2)}`, dateRange: { from: `${startYear}-10-01`, to: `${nextYear}-03-31` }, fy: fy || getCurrentFY() },
        ];
    }

    // ═══════════════════════════════════════════════════════
    //  RESOLVE PERIOD
    // ═══════════════════════════════════════════════════════

    function _resolvePeriod(value) {
        const { type, format } = _config;
        if (type === 'yearly') {
            const fy = format === 'AY' ? getFYFromAY(value) : value;
            return { value, label: `${format} ${value}`, dateRange: getFYDateRange(fy), fy, type };
        }
        if (type === 'monthly') {
            const [year, month] = value.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const monthStr = String(month).padStart(2, '0');
            return { value, label: `${MONTHS[month - 1]} ${year}`, dateRange: { from: `${year}-${monthStr}-01`, to: `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}` }, fy: getFYFromDate(new Date(year, month - 1, 15)), type };
        }
        if (type === 'quarterly') {
            const [yearStr, q] = value.split('-');
            const year = parseInt(yearStr);
            const ranges = { Q1: { from: `${year}-04-01`, to: `${year}-06-30` }, Q2: { from: `${year}-07-01`, to: `${year}-09-30` }, Q3: { from: `${year}-10-01`, to: `${year}-12-31` }, Q4: { from: `${year}-01-01`, to: `${year}-03-31` } };
            const labels = { Q1: `Q1 (Apr–Jun ${year})`, Q2: `Q2 (Jul–Sep ${year})`, Q3: `Q3 (Oct–Dec ${year})`, Q4: `Q4 (Jan–Mar ${year})` };
            return { value, label: labels[q] || value, dateRange: ranges[q], fy: getFYFromDate(new Date(ranges[q].from)), type };
        }
        if (type === 'half-yearly') {
            const [yearStr, h] = value.split('-');
            const year = parseInt(yearStr);
            const nextYear = year + 1;
            const ranges = { H1: { from: `${year}-04-01`, to: `${year}-09-30` }, H2: { from: `${year}-10-01`, to: `${nextYear}-03-31` } };
            const labels = { H1: `H1 (Apr–Sep ${year})`, H2: `H2 (Oct ${year}–Mar ${nextYear})` };
            return { value, label: labels[h] || value, dateRange: ranges[h], fy: _formatFY(year), type };
        }
        return { value, label: value, dateRange: null, fy: null, type };
    }

    // ═══════════════════════════════════════════════════════
    //  QUICK PRESETS
    // ═══════════════════════════════════════════════════════

    function _getPresets() {
        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();
        const curFY = getCurrentFY();
        const curFYStart = _fyStartYear(curFY);
        const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
        const prevMonthYear = curMonth === 0 ? curYear - 1 : curYear;

        const _icon = (d) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
        const presets = [];

        if (_config.type === 'monthly' || _config.type === 'quarterly' || _config.type === 'half-yearly') {
            presets.push({
                id: 'this-month', icon: _icon('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'), label: 'This Month',
                value: `${curYear}-${String(curMonth + 1).padStart(2, '0')}`,
                sub: `${MONTHS_SHORT[curMonth]} ${curYear}`
            });
            presets.push({
                id: 'last-month', icon: _icon('<polyline points="15 18 9 12 15 6"/>'), label: 'Last Month',
                value: `${prevMonthYear}-${String(prevMonth + 1).padStart(2, '0')}`,
                sub: `${MONTHS_SHORT[prevMonth]} ${prevMonthYear}`
            });
        }

        if (_config.type === 'quarterly' || _config.type === 'monthly') {
            const qMap = { 3: 'Q1', 4: 'Q1', 5: 'Q1', 6: 'Q2', 7: 'Q2', 8: 'Q2', 9: 'Q3', 10: 'Q3', 11: 'Q3', 0: 'Q4', 1: 'Q4', 2: 'Q4' };
            const qYear = curMonth >= 3 ? curYear : curYear;
            presets.push({
                id: 'this-quarter', icon: _icon('<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>'), label: 'This Quarter',
                value: `${qYear}-${qMap[curMonth]}`,
                sub: qMap[curMonth]
            });
        }

        if (_config.format === 'AY') {
            presets.push({
                id: 'this-ay', icon: _icon('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="10" y1="4" x2="10" y2="22"/>'), label: 'Current AY',
                value: getAY(curFY),
                sub: `AY ${getAY(curFY)}`
            });
            presets.push({
                id: 'last-ay', icon: _icon('<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>'), label: 'Previous AY',
                value: getAY(_formatFY(curFYStart - 1)),
                sub: `AY ${getAY(_formatFY(curFYStart - 1))}`
            });
        } else {
            presets.push({
                id: 'this-fy', icon: _icon('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="10" y1="4" x2="10" y2="22"/>'), label: 'Current FY',
                value: curFY,
                sub: `FY ${curFY}`
            });
            presets.push({
                id: 'last-fy', icon: _icon('<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>'), label: 'Previous FY',
                value: _formatFY(curFYStart - 1),
                sub: `FY ${_formatFY(curFYStart - 1)}`
            });
        }

        // Always add Custom Range
        presets.push({
            id: 'custom-range', icon: _icon('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/>'), label: 'Custom Range',
            value: '__custom__',
            sub: 'Pick dates'
        });

        return presets;
    }

    // ═══════════════════════════════════════════════════════
    //  UI RENDERING — Calendar Picker
    // ═══════════════════════════════════════════════════════

    function mount(selector, config = {}) {
        const container = typeof selector === 'string'
            ? document.querySelector(selector) : selector;
        if (!container) { console.warn(`FYPeriod: Container "${selector}" not found`); return; }

        _uid++;
        _config = {
            type: config.type || 'yearly',
            format: config.format || 'FY',
            label: config.label || _getDefaultLabel(config.type || 'yearly', config.format),
            pastYears: config.pastYears ?? 3,
            showNext: config.showNext ?? true,
            onChange: config.onChange || null,
            persist: config.persist ?? true,
            defaultValue: config.defaultValue || 'current',
            compact: config.compact || false,
            selectId: config.selectId || `fyp-${_uid}`,
        };

        _containerId = selector;
        _mounted = true;
        _panelOpen = false;

        container.innerHTML = '';
        container.classList.add('fyp-root');
        _injectStyles();

        // ── Trigger Button ──
        const trigger = document.createElement('button');
        trigger.className = 'fyp-trigger';
        trigger.id = _config.selectId + '-trigger';
        trigger.type = 'button';
        trigger.innerHTML = `
            <span class="fyp-trigger-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <span class="fyp-trigger-text" id="${_config.selectId}-text">Select Period</span>
            <span class="fyp-trigger-arrow">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
            </span>`;
        trigger.addEventListener('click', (e) => { e.stopPropagation(); _togglePanel(); });

        // ── Dropdown Panel ──
        const panel = document.createElement('div');
        panel.className = 'fyp-panel';
        panel.id = _config.selectId + '-panel';
        panel.style.display = 'none';
        panel.addEventListener('click', (e) => e.stopPropagation());

        _buildPanel(panel);

        container.appendChild(trigger);
        container.appendChild(panel);

        // Close on outside click
        document.addEventListener('click', () => { if (_panelOpen) _closePanel(); });

        // Restore or set default selection
        const savedValue = _config.persist ? _getSavedValue() : null;
        if (savedValue) {
            _selectValue(savedValue, true);
        } else {
            _selectDefault(true);
        }
    }

    function _buildPanel(panel) {
        const { type, format, pastYears, showNext } = _config;
        panel.innerHTML = '';

        // ── Quick Presets ──
        const presets = _getPresets();
        const presetsBar = document.createElement('div');
        presetsBar.className = 'fyp-presets';
        presets.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'fyp-preset-btn';
            btn.type = 'button';
            btn.dataset.value = p.value;
            btn.innerHTML = `<span class="fyp-preset-icon">${p.icon}</span><span class="fyp-preset-label">${p.label}</span><span class="fyp-preset-sub">${p.sub}</span>`;
            if (p.id === 'custom-range') {
                btn.addEventListener('click', () => _showCustomRange());
            } else {
                btn.addEventListener('click', () => _selectPreset(p));
            }
            presetsBar.appendChild(btn);
        });
        panel.appendChild(presetsBar);

        // ── Divider ──
        const divider = document.createElement('div');
        divider.className = 'fyp-divider';
        panel.appendChild(divider);

        // ── Grid Area ──
        const gridArea = document.createElement('div');
        gridArea.className = 'fyp-grid-area';
        gridArea.id = _config.selectId + '-grid';

        const fyOptions = getFYOptions(pastYears, showNext);

        if (type === 'yearly') {
            // FY/AY tile grid
            const grid = document.createElement('div');
            grid.className = 'fyp-fy-grid';
            fyOptions.forEach(opt => {
                const tile = document.createElement('button');
                tile.type = 'button';
                tile.className = 'fyp-fy-tile' + (opt.isCurrent ? ' current' : '');
                tile.dataset.value = format === 'AY' ? getAY(opt.value) : opt.value;
                const displayLabel = format === 'AY' ? `AY ${getAY(opt.value)}` : `FY ${opt.value}`;
                const range = opt.dateRange;
                tile.innerHTML = `<span class="fyp-fy-label">${displayLabel}</span><span class="fyp-fy-range">${_fmtDate(range.from)} – ${_fmtDate(range.to)}</span>${opt.isCurrent ? '<span class="fyp-current-dot">●</span>' : ''}`;
                tile.addEventListener('click', () => _selectValue(tile.dataset.value));
                grid.appendChild(tile);
            });
            gridArea.appendChild(grid);
        } else if (type === 'monthly') {
            // Month grids grouped by FY
            fyOptions.forEach(fyOpt => {
                const fyBlock = document.createElement('div');
                fyBlock.className = 'fyp-fy-block';
                const fyHeader = document.createElement('div');
                fyHeader.className = 'fyp-fy-block-header';
                fyHeader.innerHTML = `<span>FY ${fyOpt.value}</span>${fyOpt.isCurrent ? '<span class="fyp-fy-current-badge">Current</span>' : ''}`;
                fyBlock.appendChild(fyHeader);

                const monthGrid = document.createElement('div');
                monthGrid.className = 'fyp-month-grid';
                const periods = getMonthlyPeriods(fyOpt.value);
                periods.forEach(p => {
                    const cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = 'fyp-month-cell';
                    cell.dataset.value = p.value;
                    const monthName = MONTHS_SHORT[parseInt(p.value.split('-')[1]) - 1];
                    const yr = p.value.split('-')[0].slice(-2);
                    cell.innerHTML = `<span class="fyp-month-name">${monthName}</span><span class="fyp-month-year">'${yr}</span>`;
                    cell.addEventListener('click', () => _selectValue(p.value));
                    monthGrid.appendChild(cell);
                });
                fyBlock.appendChild(monthGrid);
                gridArea.appendChild(fyBlock);
            });
        } else if (type === 'quarterly') {
            fyOptions.forEach(fyOpt => {
                const fyBlock = document.createElement('div');
                fyBlock.className = 'fyp-fy-block';
                const fyHeader = document.createElement('div');
                fyHeader.className = 'fyp-fy-block-header';
                fyHeader.innerHTML = `<span>FY ${fyOpt.value}</span>${fyOpt.isCurrent ? '<span class="fyp-fy-current-badge">Current</span>' : ''}`;
                fyBlock.appendChild(fyHeader);
                const qGrid = document.createElement('div');
                qGrid.className = 'fyp-quarter-grid';
                const periods = getQuarterlyPeriods(fyOpt.value);
                periods.forEach(p => {
                    const cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = 'fyp-quarter-cell';
                    cell.dataset.value = p.value;
                    cell.innerHTML = `<span class="fyp-q-label">${p.shortLabel}</span><span class="fyp-q-range">${_fmtDate(p.dateRange.from)} – ${_fmtDate(p.dateRange.to)}</span>`;
                    cell.addEventListener('click', () => _selectValue(p.value));
                    qGrid.appendChild(cell);
                });
                fyBlock.appendChild(qGrid);
                gridArea.appendChild(fyBlock);
            });
        } else if (type === 'half-yearly') {
            fyOptions.forEach(fyOpt => {
                const fyBlock = document.createElement('div');
                fyBlock.className = 'fyp-fy-block';
                const fyHeader = document.createElement('div');
                fyHeader.className = 'fyp-fy-block-header';
                fyHeader.innerHTML = `<span>FY ${fyOpt.value}</span>${fyOpt.isCurrent ? '<span class="fyp-fy-current-badge">Current</span>' : ''}`;
                fyBlock.appendChild(fyHeader);
                const hGrid = document.createElement('div');
                hGrid.className = 'fyp-quarter-grid';
                const periods = getHalfYearlyPeriods(fyOpt.value);
                periods.forEach(p => {
                    const cell = document.createElement('button');
                    cell.type = 'button';
                    cell.className = 'fyp-quarter-cell';
                    cell.dataset.value = p.value;
                    cell.innerHTML = `<span class="fyp-q-label">${p.shortLabel}</span><span class="fyp-q-range">${_fmtDate(p.dateRange.from)} – ${_fmtDate(p.dateRange.to)}</span>`;
                    cell.addEventListener('click', () => _selectValue(p.value));
                    hGrid.appendChild(cell);
                });
                fyBlock.appendChild(hGrid);
                gridArea.appendChild(fyBlock);
            });
        }

        panel.appendChild(gridArea);

        // ── Custom Date Range Section (hidden by default) ──
        const customSection = document.createElement('div');
        customSection.className = 'fyp-custom-section';
        customSection.id = _config.selectId + '-custom';
        customSection.style.display = 'none';
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const fyRange = getFYDateRange(getCurrentFY());
        customSection.innerHTML = `
            <div class="fyp-custom-header">
                <span class="fyp-custom-title">Custom Date Range</span>
                <button type="button" class="fyp-custom-back" id="${_config.selectId}-custom-back">← Back</button>
            </div>
            <div class="fyp-custom-inputs">
                <div class="fyp-custom-field">
                    <label class="fyp-custom-label" for="${_config.selectId}-cust-from">From Date</label>
                    <input type="date" class="fyp-custom-date" id="${_config.selectId}-cust-from" value="${fyRange.from}">
                </div>
                <div class="fyp-custom-field">
                    <label class="fyp-custom-label" for="${_config.selectId}-cust-to">To Date</label>
                    <input type="date" class="fyp-custom-date" id="${_config.selectId}-cust-to" value="${todayStr}">
                </div>
            </div>
            <button type="button" class="fyp-custom-apply" id="${_config.selectId}-cust-apply">Apply Range</button>`;
        panel.appendChild(customSection);

        // Wire custom range events after DOM insertion
        setTimeout(() => {
            const backBtn = document.getElementById(_config.selectId + '-custom-back');
            const applyBtn = document.getElementById(_config.selectId + '-cust-apply');
            if (backBtn) backBtn.addEventListener('click', () => _hideCustomRange());
            if (applyBtn) applyBtn.addEventListener('click', () => _applyCustomRange());
        }, 0);

        // ── Date range footer ──
        const footer = document.createElement('div');
        footer.className = 'fyp-footer';
        footer.id = _config.selectId + '-footer';
        footer.innerHTML = `
            <div class="fyp-date-range">
                <div class="fyp-dr-item"><span class="fyp-dr-label">From</span><span class="fyp-dr-val" id="${_config.selectId}-from">—</span></div>
                <span class="fyp-dr-sep">→</span>
                <div class="fyp-dr-item"><span class="fyp-dr-label">To</span><span class="fyp-dr-val" id="${_config.selectId}-to">—</span></div>
            </div>`;
        panel.appendChild(footer);
    }

    // ═══════════════════════════════════════════════════════
    //  SELECTION LOGIC
    // ═══════════════════════════════════════════════════════

    function _selectValue(value, isInit = false) {
        if (!value) return;

        // Handle restoring a custom range value
        if (typeof value === 'string' && value.startsWith('custom:')) {
            const parts = value.split(':');
            if (parts.length === 3) {
                const fromVal = parts[1], toVal = parts[2];
                _selected = {
                    value, label: `${_fmtDateLong(fromVal)} – ${_fmtDateLong(toVal)}`,
                    dateRange: { from: fromVal, to: toVal },
                    fy: getFYFromDate(new Date(fromVal)), type: 'custom',
                };
                const textEl = document.getElementById(_config.selectId + '-text');
                if (textEl) textEl.textContent = _selected.label;
                const fromEl = document.getElementById(_config.selectId + '-from');
                const toEl = document.getElementById(_config.selectId + '-to');
                if (fromEl) fromEl.textContent = _fmtDateLong(fromVal);
                if (toEl) toEl.textContent = _fmtDateLong(toVal);
                if (_config.onChange && !arguments[1]) _config.onChange(_selected);
                return;
            }
        }

        _selected = _resolvePeriod(value);

        // Update trigger text
        const textEl = document.getElementById(_config.selectId + '-text');
        if (textEl) textEl.textContent = _selected.label;

        // Update date range footer
        if (_selected.dateRange) {
            const fromEl = document.getElementById(_config.selectId + '-from');
            const toEl = document.getElementById(_config.selectId + '-to');
            if (fromEl) fromEl.textContent = _fmtDateLong(_selected.dateRange.from);
            if (toEl) toEl.textContent = _fmtDateLong(_selected.dateRange.to);
        }

        // Highlight active cell
        _highlightActive(value);

        // Hide custom section if visible
        _hideCustomRange();

        // Persist
        if (_config.persist) {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                value, type: _config.type, timestamp: Date.now(),
            }));
        }

        // Close panel
        if (!isInit) _closePanel();

        // Callback
        if (_config.onChange) _config.onChange(_selected);
    }

    function _selectPreset(preset) {
        const { type } = _config;
        const value = preset.value;

        // FY/AY preset in non-yearly mode → apply as full date range
        if ((preset.id.includes('fy') || preset.id.includes('ay')) && type !== 'yearly') {
            const fy = value.length > 4 ? value : getCurrentFY();
            const range = getFYDateRange(fy);
            _applyPresetRange(`FY ${fy}`, range.from, range.to, fy);
            return;
        }

        // Quarter preset in monthly mode → apply as full quarter range
        if (preset.id.includes('quarter') && type === 'monthly') {
            const [yearStr, q] = value.split('-');
            const year = parseInt(yearStr);
            const qRanges = {
                Q1: { from: `${year}-04-01`, to: `${year}-06-30`, label: `Q1 (Apr–Jun ${year})` },
                Q2: { from: `${year}-07-01`, to: `${year}-09-30`, label: `Q2 (Jul–Sep ${year})` },
                Q3: { from: `${year}-10-01`, to: `${year}-12-31`, label: `Q3 (Oct–Dec ${year})` },
                Q4: { from: `${year}-01-01`, to: `${year}-03-31`, label: `Q4 (Jan–Mar ${year})` },
            };
            const qr = qRanges[q];
            if (qr) {
                _applyPresetRange(qr.label, qr.from, qr.to, getFYFromDate(new Date(qr.from)));
                return;
            }
        }

        _selectValue(value);
    }

    /** Apply a preset as a full date range (like custom range but with a clean label) */
    function _applyPresetRange(label, fromVal, toVal, fy) {
        const customValue = `custom:${fromVal}:${toVal}`;
        _selected = {
            value: customValue,
            label: label,
            dateRange: { from: fromVal, to: toVal },
            fy: fy,
            type: 'custom',
        };

        const textEl = document.getElementById(_config.selectId + '-text');
        if (textEl) textEl.textContent = label;

        const fromEl = document.getElementById(_config.selectId + '-from');
        const toEl = document.getElementById(_config.selectId + '-to');
        if (fromEl) fromEl.textContent = _fmtDateLong(fromVal);
        if (toEl) toEl.textContent = _fmtDateLong(toVal);

        // Highlight preset button
        const panel = document.getElementById(_config.selectId + '-panel');
        if (panel) {
            panel.querySelectorAll('.fyp-active').forEach(el => el.classList.remove('fyp-active'));
            panel.querySelectorAll('.fyp-preset-btn').forEach(btn => {
                btn.classList.remove('fyp-preset-active');
            });
        }

        if (_config.persist) {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                value: customValue, type: _config.type, timestamp: Date.now(),
            }));
        }

        _closePanel();
        if (_config.onChange) _config.onChange(_selected);
    }

    function _selectDefault(isInit = false) {
        const { type, format } = _config;
        const now = new Date();
        let defaultVal = '';

        if (type === 'yearly') {
            defaultVal = format === 'AY' ? getAY(getCurrentFY()) : getCurrentFY();
        } else if (type === 'monthly') {
            const m = String(now.getMonth() + 1).padStart(2, '0');
            defaultVal = `${now.getFullYear()}-${m}`;
        } else if (type === 'quarterly') {
            const month = now.getMonth();
            const qMap = { 3: 'Q1', 4: 'Q1', 5: 'Q1', 6: 'Q2', 7: 'Q2', 8: 'Q2', 9: 'Q3', 10: 'Q3', 11: 'Q3', 0: 'Q4', 1: 'Q4', 2: 'Q4' };
            const qYear = month >= 3 ? now.getFullYear() : now.getFullYear();
            defaultVal = `${qYear}-${qMap[month]}`;
        } else if (type === 'half-yearly') {
            const month = now.getMonth();
            const hYear = month >= 3 ? now.getFullYear() : now.getFullYear() - 1;
            defaultVal = month >= 3 && month <= 8 ? `${hYear}-H1` : `${hYear}-H2`;
        }

        if (defaultVal) _selectValue(defaultVal, isInit);
    }

    function _highlightActive(value) {
        const panel = document.getElementById(_config.selectId + '-panel');
        if (!panel) return;
        // Remove existing highlights
        panel.querySelectorAll('.fyp-active').forEach(el => el.classList.remove('fyp-active'));
        // Add to matching element
        const match = panel.querySelector(`[data-value="${value}"]`);
        if (match) match.classList.add('fyp-active');
        // Also highlight matching preset
        panel.querySelectorAll('.fyp-preset-btn').forEach(btn => {
            btn.classList.toggle('fyp-preset-active', btn.dataset.value === value);
        });
    }

    // ═══════════════════════════════════════════════════════
    //  PANEL TOGGLE
    // ═══════════════════════════════════════════════════════

    function _togglePanel() {
        _panelOpen ? _closePanel() : _openPanel();
    }

    function _openPanel() {
        const panel = document.getElementById(_config.selectId + '-panel');
        const trigger = document.getElementById(_config.selectId + '-trigger');
        if (!panel) return;
        panel.style.display = 'block';
        trigger?.classList.add('fyp-trigger-open');
        _panelOpen = true;
        // Scroll active into view
        setTimeout(() => {
            const active = panel.querySelector('.fyp-active');
            if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 50);
    }

    function _closePanel() {
        const panel = document.getElementById(_config.selectId + '-panel');
        const trigger = document.getElementById(_config.selectId + '-trigger');
        if (!panel) return;
        panel.style.display = 'none';
        trigger?.classList.remove('fyp-trigger-open');
        _panelOpen = false;
        _hideCustomRange();
    }

    // ═══════════════════════════════════════════════════════
    //  CUSTOM DATE RANGE
    // ═══════════════════════════════════════════════════════

    function _showCustomRange() {
        const grid = document.getElementById(_config.selectId + '-grid');
        const custom = document.getElementById(_config.selectId + '-custom');
        const presets = document.getElementById(_config.selectId + '-panel')?.querySelector('.fyp-presets');
        if (grid) grid.style.display = 'none';
        if (custom) custom.style.display = 'block';
        // Highlight custom preset button
        if (presets) presets.querySelectorAll('.fyp-preset-btn').forEach(btn => {
            btn.classList.toggle('fyp-preset-active', btn.dataset.value === '__custom__');
        });
    }

    function _hideCustomRange() {
        const grid = document.getElementById(_config.selectId + '-grid');
        const custom = document.getElementById(_config.selectId + '-custom');
        if (grid) grid.style.display = '';
        if (custom) custom.style.display = 'none';
    }

    function _applyCustomRange() {
        const fromInput = document.getElementById(_config.selectId + '-cust-from');
        const toInput = document.getElementById(_config.selectId + '-cust-to');
        if (!fromInput || !toInput) return;

        const fromVal = fromInput.value;
        const toVal = toInput.value;
        if (!fromVal || !toVal) return;

        if (new Date(fromVal) > new Date(toVal)) {
            // Swap if from > to
            fromInput.value = toVal;
            toInput.value = fromVal;
            return _applyCustomRange();
        }

        const customValue = `custom:${fromVal}:${toVal}`;
        _selected = {
            value: customValue,
            label: `${_fmtDateLong(fromVal)} – ${_fmtDateLong(toVal)}`,
            dateRange: { from: fromVal, to: toVal },
            fy: getFYFromDate(new Date(fromVal)),
            type: 'custom',
        };

        // Update trigger text
        const textEl = document.getElementById(_config.selectId + '-text');
        if (textEl) textEl.textContent = _selected.label;

        // Update footer
        const fromEl = document.getElementById(_config.selectId + '-from');
        const toEl = document.getElementById(_config.selectId + '-to');
        if (fromEl) fromEl.textContent = _fmtDateLong(fromVal);
        if (toEl) toEl.textContent = _fmtDateLong(toVal);

        // Clear grid highlights
        const panel = document.getElementById(_config.selectId + '-panel');
        if (panel) panel.querySelectorAll('.fyp-active').forEach(el => el.classList.remove('fyp-active'));

        // Persist
        if (_config.persist) {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                value: customValue, type: _config.type, timestamp: Date.now(),
            }));
        }

        _closePanel();
        if (_config.onChange) _config.onChange(_selected);
    }

    // ═══════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════

    function _fmtDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]}`;
    }

    function _fmtDateLong(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    }

    function _getSavedValue() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
            if (saved && saved.type === _config.type) return saved.value;
        } catch (e) { }
        return null;
    }

    function _getDefaultLabel(type, format) {
        if (format === 'AY') return 'Assessment Year';
        return { monthly: 'Tax Period', quarterly: 'Return Period', 'half-yearly': 'Period', yearly: 'Financial Year' }[type] || 'Period';
    }

    // ═══════════════════════════════════════════════════════
    //  STYLES
    // ═══════════════════════════════════════════════════════

    let _stylesInjected = false;
    function _injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;

        const style = document.createElement('style');
        style.textContent = `
/* ═══ FYPeriod Calendar Picker v2 ═══ */
.fyp-root {
    position: relative;
    display: inline-block;
    min-width: 200px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* ── Trigger Button ── */
.fyp-trigger {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
    padding: 0.55rem 0.85rem;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-left: 3px solid #1e3a8a;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    text-align: left;
}
.fyp-trigger:hover {
    border-color: #94a3b8;
    border-left-color: #1e3a8a;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.fyp-trigger-open {
    border-color: #3b82f6;
    border-left-color: #1e3a8a;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.fyp-trigger-icon {
    flex-shrink: 0;
    color: #1e3a8a;
    display: flex;
    align-items: center;
}
.fyp-trigger-text {
    flex: 1;
    font-size: 0.88rem;
    font-weight: 700;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.01em;
}
.fyp-trigger-arrow {
    color: #64748b;
    transition: transform 0.2s;
    flex-shrink: 0;
    display: flex;
}
.fyp-trigger-open .fyp-trigger-arrow {
    transform: rotate(180deg);
}

/* ── Dropdown Panel ── */
.fyp-panel {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 9999;
    min-width: 340px;
    max-width: 420px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
    overflow: hidden;
    animation: fypSlideIn 0.15s ease-out;
}
@keyframes fypSlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
}

/* ── Quick Presets ── */
.fyp-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0.65rem 0.75rem;
}
.fyp-preset-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.6rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
    font-family: inherit;
}
.fyp-preset-btn:hover {
    background: #eff6ff;
    border-color: #93c5fd;
}
.fyp-preset-active {
    background: #1e3a8a !important;
    border-color: #1e3a8a !important;
    color: #fff !important;
}
.fyp-preset-active .fyp-preset-label,
.fyp-preset-active .fyp-preset-sub {
    color: #fff !important;
}
.fyp-preset-icon {
    flex-shrink: 0;
    color: #64748b;
    display: flex;
    align-items: center;
}
.fyp-preset-active .fyp-preset-icon { color: #fff !important; }
.fyp-preset-label {
    font-size: 0.68rem;
    font-weight: 600;
    color: #1e293b;
}
.fyp-preset-sub {
    font-size: 0.58rem;
    font-weight: 500;
    color: #94a3b8;
    display: none;
}

/* ── Divider ── */
.fyp-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent);
}

/* ── Grid Area ── */
.fyp-grid-area {
    max-height: 280px;
    overflow-y: auto;
    padding: 0.5rem 0.75rem;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
}
.fyp-grid-area::-webkit-scrollbar { width: 4px; }
.fyp-grid-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

/* ── FY Block ── */
.fyp-fy-block {
    margin-bottom: 0.65rem;
}
.fyp-fy-block:last-child { margin-bottom: 0; }
.fyp-fy-block-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    font-size: 0.68rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.fyp-fy-current-badge {
    font-size: 0.55rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    background: #dbeafe;
    color: #1e40af;
    border-radius: 4px;
    text-transform: none;
    letter-spacing: 0;
}

/* ── Month Grid ── */
.fyp-month-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
}
.fyp-month-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.45rem 0.25rem;
    background: #f8fafc;
    border: 1.5px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}
.fyp-month-cell:hover {
    background: #eff6ff;
    border-color: #93c5fd;
    transform: translateY(-1px);
}
.fyp-month-cell.fyp-active {
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
    border-color: #1e3a8a;
    box-shadow: 0 2px 8px rgba(30,58,138,0.25);
}
.fyp-month-cell.fyp-active .fyp-month-name,
.fyp-month-cell.fyp-active .fyp-month-year {
    color: #fff;
}
.fyp-month-name {
    font-size: 0.75rem;
    font-weight: 700;
    color: #334155;
}
.fyp-month-year {
    font-size: 0.58rem;
    font-weight: 500;
    color: #94a3b8;
    margin-top: 1px;
}

/* ── FY Tile Grid (yearly mode) ── */
.fyp-fy-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
}
.fyp-fy-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.75rem 0.65rem;
    background: #f8fafc;
    border: 1.5px solid transparent;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
    font-family: inherit;
}
.fyp-fy-tile:hover {
    background: #eff6ff;
    border-color: #93c5fd;
    transform: translateY(-1px);
}
.fyp-fy-tile.current {
    border-color: #dbeafe;
    background: #f0f7ff;
}
.fyp-fy-tile.fyp-active {
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
    border-color: #1e3a8a;
    box-shadow: 0 3px 12px rgba(30,58,138,0.2);
}
.fyp-fy-tile.fyp-active .fyp-fy-label,
.fyp-fy-tile.fyp-active .fyp-fy-range {
    color: #fff;
}
.fyp-fy-tile.fyp-active .fyp-current-dot { color: #93c5fd; }
.fyp-fy-label {
    font-size: 0.88rem;
    font-weight: 700;
    color: #1e293b;
}
.fyp-fy-range {
    font-size: 0.62rem;
    font-weight: 500;
    color: #94a3b8;
}
.fyp-current-dot {
    position: absolute;
    top: 6px;
    right: 8px;
    font-size: 0.5rem;
    color: #3b82f6;
}

/* ── Quarter Grid ── */
.fyp-quarter-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
}
.fyp-quarter-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 0.55rem 0.35rem;
    background: #f8fafc;
    border: 1.5px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}
.fyp-quarter-cell:hover {
    background: #eff6ff;
    border-color: #93c5fd;
}
.fyp-quarter-cell.fyp-active {
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
    border-color: #1e3a8a;
}
.fyp-quarter-cell.fyp-active .fyp-q-label,
.fyp-quarter-cell.fyp-active .fyp-q-range {
    color: #fff;
}
.fyp-q-label {
    font-size: 0.78rem;
    font-weight: 700;
    color: #334155;
}
.fyp-q-range {
    font-size: 0.58rem;
    color: #94a3b8;
}

/* ── Footer / Date Range ── */
.fyp-footer {
    padding: 0.55rem 0.75rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
}
.fyp-date-range {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
}
.fyp-dr-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
}
.fyp-dr-label {
    font-size: 0.6rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.fyp-dr-val {
    font-size: 0.72rem;
    font-weight: 600;
    color: #1e293b;
    padding: 0.15rem 0.45rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
}
.fyp-dr-sep {
    color: #94a3b8;
    font-size: 0.7rem;
}

/* ── Responsive ── */
@media (max-width: 600px) {
    .fyp-panel { min-width: 280px; max-width: calc(100vw - 2rem); right: 0; left: auto; }
    .fyp-fy-grid { grid-template-columns: 1fr; }
}

/* ── Custom Date Range Section ── */
.fyp-custom-section {
    padding: 0.75rem;
    animation: fypSlideIn 0.15s ease-out;
}
.fyp-custom-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
}
.fyp-custom-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1e293b;
}
.fyp-custom-back {
    font-size: 0.68rem;
    font-weight: 600;
    color: #3b82f6;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 0.25rem 0.55rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
}
.fyp-custom-back:hover {
    background: #dbeafe;
    border-color: #93c5fd;
}
.fyp-custom-inputs {
    display: flex;
    gap: 0.65rem;
    margin-bottom: 0.75rem;
}
.fyp-custom-field {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
.fyp-custom-label {
    font-size: 0.62rem;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}
.fyp-custom-date {
    width: 100%;
    padding: 0.5rem 0.65rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.82rem;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    color: #1e293b;
    background: #f8fafc;
    transition: all 0.2s;
    cursor: pointer;
    box-sizing: border-box;
}
.fyp-custom-date:focus {
    outline: none;
    border-color: #3b82f6;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.fyp-custom-date::-webkit-calendar-picker-indicator {
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.15s;
}
.fyp-custom-date::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
}
.fyp-custom-apply {
    width: 100%;
    padding: 0.55rem 1rem;
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.02em;
}
.fyp-custom-apply:hover {
    box-shadow: 0 4px 12px rgba(30,58,138,0.3);
    transform: translateY(-1px);
}
        `;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════════════════

    return {
        mount,
        getSelected() { return _selected; },
        setSelected(value) { _selectValue(value); },

        // Core FY utilities
        getCurrentFY,
        getFYFromDate,
        getAY,
        getFYFromAY,
        getFYDateRange,
        isDateInFY,

        // Period generators
        getFYOptions,
        getAYOptions,
        getMonthlyPeriods,
        getQuarterlyPeriods,
        getHalfYearlyPeriods,

        isMounted() { return _mounted; },
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FYPeriod;
}
