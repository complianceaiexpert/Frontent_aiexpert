/**
 * FY Period Utility Module
 * ════════════════════════════════════════════════════════
 * Shared across all services — GST, ITR, Data Entry, FI, etc.
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
    const STORAGE_KEY = 'fy_period_selection';

    // ═══ TICKER CONFIG ═══
    const TICKER_CONFIG = {
        monthly:       { label: 'Monthly',      color: '#3b82f6', bg: '#eff6ff', icon: '🔵' },
        quarterly:     { label: 'Quarterly',     color: '#10b981', bg: '#ecfdf5', icon: '🟢' },
        'half-yearly': { label: 'Half-Yearly',   color: '#f43f5e', bg: '#fff1f2', icon: '🔴' },
        yearly:        { label: 'Yearly',         color: '#f59e0b', bg: '#fffbeb', icon: '🟠' },
    };

    // ═══ INTERNAL STATE ═══
    let _mounted = false;
    let _config = {};
    let _selected = null;
    let _containerId = null;

    // ═══════════════════════════════════════════════════════
    //  CORE FY LOGIC
    // ═══════════════════════════════════════════════════════

    /** Get current Financial Year as "YYYY-YY" (e.g., "2026-27") */
    function getCurrentFY() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        // FY starts April (month 3)
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

    /** Format FY string: 2025 → "2025-26" */
    function _formatFY(startYear) {
        return `${startYear}-${String(startYear + 1).slice(-2)}`;
    }

    /** Get start year from FY string: "2025-26" → 2025 */
    function _fyStartYear(fy) {
        return parseInt(fy.split('-')[0]);
    }

    // ═══════════════════════════════════════════════════════
    //  PERIOD GENERATORS
    // ═══════════════════════════════════════════════════════

    /** Generate list of FYs: [current-3, ..., current, current+1] */
    function getFYOptions(pastYears = 3, showNext = true) {
        const currentStartYear = _fyStartYear(getCurrentFY());
        const options = [];

        // Past FYs (oldest first)
        for (let i = pastYears; i >= 1; i--) {
            const y = currentStartYear - i;
            options.push({
                value: _formatFY(y),
                label: `FY ${_formatFY(y)}`,
                dateRange: getFYDateRange(_formatFY(y)),
                fy: _formatFY(y),
                isCurrent: false,
            });
        }

        // Current FY
        options.push({
            value: _formatFY(currentStartYear),
            label: `FY ${_formatFY(currentStartYear)}`,
            dateRange: getFYDateRange(_formatFY(currentStartYear)),
            fy: _formatFY(currentStartYear),
            isCurrent: true,
        });

        // Next FY
        if (showNext) {
            const nextYear = currentStartYear + 1;
            options.push({
                value: _formatFY(nextYear),
                label: `FY ${_formatFY(nextYear)}`,
                dateRange: getFYDateRange(_formatFY(nextYear)),
                fy: _formatFY(nextYear),
                isCurrent: false,
            });
        }

        return options;
    }

    /** Generate AY options (for ITR) */
    function getAYOptions(pastYears = 3, showNext = true) {
        return getFYOptions(pastYears, showNext).map(opt => ({
            ...opt,
            value: getAY(opt.value),
            label: `AY ${getAY(opt.value)}`,
        }));
    }

    /** Generate monthly periods for a FY */
    function getMonthlyPeriods(fy) {
        const startYear = _fyStartYear(fy || getCurrentFY());
        const periods = [];

        // April to December (same year)
        for (let m = 3; m <= 11; m++) {
            const monthStr = String(m + 1).padStart(2, '0');
            const daysInMonth = new Date(startYear, m + 1, 0).getDate();
            periods.push({
                value: `${startYear}-${monthStr}`,
                label: `${MONTHS[m]} ${startYear}`,
                shortLabel: `${MONTHS_SHORT[m]} ${startYear}`,
                dateRange: {
                    from: `${startYear}-${monthStr}-01`,
                    to: `${startYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`,
                },
                fy: fy || getCurrentFY(),
            });
        }

        // January to March (next year)
        for (let m = 0; m <= 2; m++) {
            const nextYear = startYear + 1;
            const monthStr = String(m + 1).padStart(2, '0');
            const daysInMonth = new Date(nextYear, m + 1, 0).getDate();
            periods.push({
                value: `${nextYear}-${monthStr}`,
                label: `${MONTHS[m]} ${nextYear}`,
                shortLabel: `${MONTHS_SHORT[m]} ${nextYear}`,
                dateRange: {
                    from: `${nextYear}-${monthStr}-01`,
                    to: `${nextYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`,
                },
                fy: fy || getCurrentFY(),
            });
        }

        return periods;
    }

    /** Generate quarterly periods for a FY */
    function getQuarterlyPeriods(fy) {
        const startYear = _fyStartYear(fy || getCurrentFY());
        const nextYear = startYear + 1;

        return [
            {
                value: `${startYear}-Q1`,
                label: `Q1 (Apr–Jun ${startYear})`,
                shortLabel: `Q1 ${startYear}`,
                dateRange: { from: `${startYear}-04-01`, to: `${startYear}-06-30` },
                fy: fy || getCurrentFY(),
            },
            {
                value: `${startYear}-Q2`,
                label: `Q2 (Jul–Sep ${startYear})`,
                shortLabel: `Q2 ${startYear}`,
                dateRange: { from: `${startYear}-07-01`, to: `${startYear}-09-30` },
                fy: fy || getCurrentFY(),
            },
            {
                value: `${startYear}-Q3`,
                label: `Q3 (Oct–Dec ${startYear})`,
                shortLabel: `Q3 ${startYear}`,
                dateRange: { from: `${startYear}-10-01`, to: `${startYear}-12-31` },
                fy: fy || getCurrentFY(),
            },
            {
                value: `${nextYear}-Q4`,
                label: `Q4 (Jan–Mar ${nextYear})`,
                shortLabel: `Q4 ${nextYear}`,
                dateRange: { from: `${nextYear}-01-01`, to: `${nextYear}-03-31` },
                fy: fy || getCurrentFY(),
            },
        ];
    }

    /** Generate half-yearly periods for a FY */
    function getHalfYearlyPeriods(fy) {
        const startYear = _fyStartYear(fy || getCurrentFY());
        const nextYear = startYear + 1;

        return [
            {
                value: `${startYear}-H1`,
                label: `H1 (Apr–Sep ${startYear})`,
                shortLabel: `H1 ${startYear}`,
                dateRange: { from: `${startYear}-04-01`, to: `${startYear}-09-30` },
                fy: fy || getCurrentFY(),
            },
            {
                value: `${startYear}-H2`,
                label: `H2 (Oct ${startYear}–Mar ${nextYear})`,
                shortLabel: `H2 ${startYear}-${String(nextYear).slice(-2)}`,
                dateRange: { from: `${startYear}-10-01`, to: `${nextYear}-03-31` },
                fy: fy || getCurrentFY(),
            },
        ];
    }

    /** Get all periods across all FYs for a given type */
    function _getAllPeriods(type, format, pastYears, showNext) {
        const fyList = getFYOptions(pastYears, showNext);
        let allPeriods = [];

        if (type === 'yearly') {
            return format === 'AY' ? getAYOptions(pastYears, showNext) : fyList;
        }

        // For monthly/quarterly/half-yearly — group by FY
        fyList.forEach(fyOpt => {
            let periods;
            if (type === 'monthly') periods = getMonthlyPeriods(fyOpt.value);
            else if (type === 'quarterly') periods = getQuarterlyPeriods(fyOpt.value);
            else if (type === 'half-yearly') periods = getHalfYearlyPeriods(fyOpt.value);
            else periods = [];

            allPeriods.push({
                groupLabel: fyOpt.label + (fyOpt.isCurrent ? ' (Current)' : ''),
                isCurrent: fyOpt.isCurrent,
                fy: fyOpt.value,
                periods,
            });
        });

        return allPeriods;
    }

    // ═══════════════════════════════════════════════════════
    //  UI RENDERING
    // ═══════════════════════════════════════════════════════

    /** Mount the period selector into a container */
    function mount(selector, config = {}) {
        const container = typeof selector === 'string'
            ? document.querySelector(selector)
            : selector;

        if (!container) {
            console.warn(`FYPeriod: Container "${selector}" not found`);
            return;
        }

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
            selectId: config.selectId || 'fyp-select',
            selectClass: config.selectClass || '',
        };

        _containerId = selector;
        _mounted = true;

        // Render
        container.innerHTML = '';
        container.className = (container.className || '').replace(/fyp-container/g, '').trim();
        container.classList.add('fyp-container');

        // Inject styles (once)
        _injectStyles();

        // Build the HTML
        const wrapper = document.createElement('div');
        wrapper.className = 'fyp-wrapper';

        // Label + Ticker
        const labelRow = document.createElement('div');
        labelRow.className = 'fyp-label-row';

        const labelEl = document.createElement('label');
        labelEl.className = 'fyp-label';
        labelEl.textContent = _config.label;
        labelEl.setAttribute('for', 'fyp-select');

        const tickerCfg = TICKER_CONFIG[_config.type] || TICKER_CONFIG.yearly;
        const ticker = document.createElement('span');
        ticker.className = 'fyp-ticker';
        ticker.style.color = tickerCfg.color;
        ticker.style.background = tickerCfg.bg;
        ticker.textContent = tickerCfg.label;

        labelRow.appendChild(labelEl);
        labelRow.appendChild(ticker);

        // Select dropdown
        const selectEl = document.createElement('select');
        selectEl.id = _config.selectId;
        selectEl.className = 'fyp-select' + (_config.selectClass ? ' ' + _config.selectClass : '');

        _populateSelect(selectEl);

        // Restore selection
        const savedValue = _config.persist ? _getSavedValue() : null;
        if (savedValue && selectEl.querySelector(`option[value="${savedValue}"]`)) {
            selectEl.value = savedValue;
        }

        // Event handler
        selectEl.addEventListener('change', () => {
            _onSelectionChange(selectEl.value);
        });

        wrapper.appendChild(labelRow);
        wrapper.appendChild(selectEl);
        container.appendChild(wrapper);

        // Set initial selection
        _onSelectionChange(selectEl.value, true);
    }

    /** Populate the select element with grouped options */
    function _populateSelect(selectEl) {
        const { type, format, pastYears, showNext } = _config;

        // Empty option
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = `— Select ${_config.label} —`;
        selectEl.appendChild(emptyOpt);

        if (type === 'yearly') {
            const options = format === 'AY'
                ? getAYOptions(pastYears, showNext)
                : getFYOptions(pastYears, showNext);

            options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label + (opt.isCurrent ? ' ●' : '');
                if (opt.isCurrent && _config.defaultValue === 'current') o.selected = true;
                selectEl.appendChild(o);
            });
        } else {
            // Grouped by FY (monthly, quarterly, half-yearly)
            const groups = _getAllPeriods(type, format, pastYears, showNext);

            groups.forEach(group => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = group.groupLabel;

                group.periods.forEach(p => {
                    const o = document.createElement('option');
                    o.value = p.value;
                    o.textContent = p.label;
                    optgroup.appendChild(o);
                });

                selectEl.appendChild(optgroup);
            });

            // Auto-select current month/quarter
            if (_config.defaultValue === 'current') {
                const now = new Date();
                const currentFY = getCurrentFY();
                let defaultVal = '';

                if (type === 'monthly') {
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

                if (defaultVal && selectEl.querySelector(`option[value="${defaultVal}"]`)) {
                    selectEl.value = defaultVal;
                }
            }
        }
    }

    /** Handle selection change */
    function _onSelectionChange(value, isInit = false) {
        if (!value) {
            _selected = null;
            if (_config.persist) sessionStorage.removeItem(STORAGE_KEY);
            if (_config.onChange && !isInit) _config.onChange(null);
            return;
        }

        // Find the period info
        _selected = _resolvePeriod(value);

        // Persist
        if (_config.persist) {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                value: value,
                type: _config.type,
                timestamp: Date.now(),
            }));
        }

        // Callback
        if (_config.onChange) {
            _config.onChange(_selected);
        }
    }

    /** Resolve a value to full period info */
    function _resolvePeriod(value) {
        const { type, format } = _config;

        if (type === 'yearly') {
            const fy = format === 'AY' ? getFYFromAY(value) : value;
            const range = getFYDateRange(fy);
            return {
                value,
                label: `${format} ${value}`,
                dateRange: range,
                fy,
                type,
            };
        }

        // Monthly: "2025-04"
        if (type === 'monthly') {
            const [year, month] = value.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const monthStr = String(month).padStart(2, '0');
            return {
                value,
                label: `${MONTHS[month - 1]} ${year}`,
                dateRange: {
                    from: `${year}-${monthStr}-01`,
                    to: `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`,
                },
                fy: getFYFromDate(new Date(year, month - 1, 15)),
                type,
            };
        }

        // Quarterly: "2025-Q1"
        if (type === 'quarterly') {
            const [yearStr, q] = value.split('-');
            const year = parseInt(yearStr);
            const ranges = {
                Q1: { from: `${year}-04-01`, to: `${year}-06-30` },
                Q2: { from: `${year}-07-01`, to: `${year}-09-30` },
                Q3: { from: `${year}-10-01`, to: `${year}-12-31` },
                Q4: { from: `${year}-01-01`, to: `${year}-03-31` },
            };
            const labels = {
                Q1: `Q1 (Apr–Jun ${year})`,
                Q2: `Q2 (Jul–Sep ${year})`,
                Q3: `Q3 (Oct–Dec ${year})`,
                Q4: `Q4 (Jan–Mar ${year})`,
            };
            return {
                value,
                label: labels[q] || value,
                dateRange: ranges[q],
                fy: getFYFromDate(new Date(ranges[q].from)),
                type,
            };
        }

        // Half-yearly: "2025-H1"
        if (type === 'half-yearly') {
            const [yearStr, h] = value.split('-');
            const year = parseInt(yearStr);
            const nextYear = year + 1;
            const ranges = {
                H1: { from: `${year}-04-01`, to: `${year}-09-30` },
                H2: { from: `${year}-10-01`, to: `${nextYear}-03-31` },
            };
            const labels = {
                H1: `H1 (Apr–Sep ${year})`,
                H2: `H2 (Oct ${year}–Mar ${nextYear})`,
            };
            return {
                value,
                label: labels[h] || value,
                dateRange: ranges[h],
                fy: _formatFY(year),
                type,
            };
        }

        return { value, label: value, dateRange: null, fy: null, type };
    }

    /** Get saved value from sessionStorage */
    function _getSavedValue() {
        try {
            const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
            if (saved && saved.type === _config.type) {
                return saved.value;
            }
        } catch (e) { }
        return null;
    }

    /** Get default label based on type */
    function _getDefaultLabel(type, format) {
        if (format === 'AY') return 'Assessment Year';
        const labels = {
            monthly: 'Tax Period',
            quarterly: 'Return Period',
            'half-yearly': 'Period',
            yearly: 'Financial Year',
        };
        return labels[type] || 'Period';
    }

    // ═══════════════════════════════════════════════════════
    //  STYLES (injected once)
    // ═══════════════════════════════════════════════════════

    let _stylesInjected = false;
    function _injectStyles() {
        if (_stylesInjected) return;
        _stylesInjected = true;

        const style = document.createElement('style');
        style.textContent = `
            .fyp-container {
                display: inline-block;
                min-width: 220px;
            }
            .fyp-wrapper {
                display: flex;
                flex-direction: column;
                gap: 0.4rem;
            }
            .fyp-label-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.75rem;
            }
            .fyp-label {
                font-size: 0.78rem;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .fyp-ticker {
                font-size: 0.65rem;
                font-weight: 700;
                padding: 0.15rem 0.55rem;
                border-radius: 20px;
                letter-spacing: 0.3px;
                white-space: nowrap;
                user-select: none;
            }
            .fyp-select {
                width: 100%;
                padding: 0.6rem 0.9rem;
                font-size: 0.88rem;
                font-family: inherit;
                font-weight: 500;
                color: #1e293b;
                background: #ffffff;
                border: 1.5px solid #e2e8f0;
                border-radius: 10px;
                outline: none;
                cursor: pointer;
                transition: border-color 0.2s, box-shadow 0.2s;
                appearance: none;
                -webkit-appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 0.75rem center;
                background-size: 12px;
                padding-right: 2rem;
            }
            .fyp-select:hover {
                border-color: #cbd5e1;
            }
            .fyp-select:focus {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            .fyp-select option {
                font-weight: 500;
                padding: 0.4rem;
            }
            .fyp-select optgroup {
                font-weight: 700;
                color: #475569;
                font-size: 0.82rem;
            }
        `;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════════════════

    return {
        // Mount UI
        mount,

        // Get current selection (for downloads, exports)
        getSelected() {
            return _selected;
        },

        // Set selection programmatically
        setSelected(value) {
            const selectEl = document.getElementById(_config.selectId || 'fyp-select');
            if (selectEl) {
                selectEl.value = value;
                _onSelectionChange(value);
            }
        },

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

        // Check if mounted
        isMounted() { return _mounted; },
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FYPeriod;
}
