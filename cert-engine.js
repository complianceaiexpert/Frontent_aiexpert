// ═══ STATE ═══
let remoteTemplates = [];
let selectedTemplate = null;
let currentStep = 1;
let fieldValues = {};

let previewDebounce = null;
let templateContentHtml = null; // cached built html
let isPDF = false;
let pdfURL = null;

const STEPS = [
    { num: 1, label: 'Select Template' },
    { num: 2, label: 'Fill Details' },
    { num: 3, label: 'Preview & Generate' },
];

// ═══ STEPPER ═══
function renderStepper() {
    document.getElementById('stepper').innerHTML = STEPS.map((s, i) => {
        const cls = s.num < currentStep ? 'done' : s.num === currentStep ? 'active' : '';
        const lineCls = s.num < currentStep ? 'done' : '';
        return `
                <div class="step-item ${cls}" onclick="${s.num < currentStep ? `goToStep(${s.num})` : ''}">
                    <div class="step-num">${s.num < currentStep ? '✓' : s.num}</div>
                    <span>${s.label}</span>
                </div>
                ${i < STEPS.length - 1 ? `<div class="step-line ${lineCls}"></div>` : ''}
            `;
    }).join('');
}

function goToStep(n) {
    currentStep = n;
    renderStepper();
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('visible'));
    document.getElementById(`step-${n}`).classList.add('visible');
    if (n >= 2) updatePreview();
}

function onFieldChange(field, val) {
    fieldValues[field] = val;
    schedulePreview();
}

// ═══ HELPER: format INR ═══
function formatINR(val) {
    const n = parseFloat(val);
    if (!val || isNaN(n)) return '';
    return n.toLocaleString('en-IN');
}

// ═══ STEP 1 — TEMPLATES ═══
async function loadCategories() {
    const el = document.getElementById('step-1');
    el.innerHTML = '<div class="loading-center"><div class="spin"></div><p>Loading templates...</p></div>';

    try {
        const resp = await authFetch('/tools/certificate-templates/remote?category=' + encodeURIComponent(CERT_CATEGORY));
        if (!resp || !resp.ok) throw new Error('Failed to load templates');

        remoteTemplates = await resp.json();

        if (!remoteTemplates || remoteTemplates.length === 0) {
            el.innerHTML = `
                    <div style="padding:4rem 2rem;text-align:center;color:var(--g500);background:white;border-radius:12px;border:1px dashed var(--g300);margin-top:2rem;">
                        <div style="font-size:3.5rem;margin-bottom:1rem;">📂</div>
                        <div style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;color:var(--g800);">New certificates will be added soon</div>
                        <p style="font-size:0.95rem;max-width:400px;margin:0 auto;line-height:1.5;">There are currently no templates available in this category. Our team is actively working on adding new standardized templates here.</p>
                    </div>`;
            return;
        }

        el.innerHTML = `
                <h2 class="step-title">Select Template</h2>
                <p class="step-subtitle">Choose a CA Certificate template to begin.</p>
                <div class="card-grid">
                    ${remoteTemplates.map((t, i) => {
            const isPdf = t.extension === '.pdf';
            return `
                        <div class="sel-card" data-name="${t.name}" onclick="selectTemplate('${t.name}')">
                            <div class="card-icon">${isPdf ? '📄' : '📝'}</div>
                            <div class="card-name">${t.name.replace(/_/g, ' ')}</div>
                            <div class="card-desc">Supabase Remote Template</div>
                        </div>
                    `}).join('')}
                </div>
            `;
    } catch (err) {
        el.innerHTML = `<div style="color:var(--danger);padding:2rem;">⚠️ ${err.message}</div>`;
    }
}

function selectTemplate(name) {
    selectedTemplate = remoteTemplates.find(t => t.name === name);
    // Highlight
    document.querySelectorAll('#step-1 .sel-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`#step-1 .sel-card[data-name="${name}"]`).classList.add('selected');

    // Set up fields based on actual DOCX template blanks
    fieldValues = getInitialFieldValues(selectedTemplate.name);

    // Default cert_date to today if not provided
    if (!fieldValues.cert_date) fieldValues.cert_date = new Date().toLocaleDateString('en-IN');
    if (!fieldValues.sign_date) fieldValues.sign_date = new Date().toLocaleDateString('en-IN');

    templateContentHtml = null;
    isPDF = selectedTemplate.extension === '.pdf';
    pdfURL = null;
    rawContent = null;
    dynamicFields = []; // reset

    renderStep2();
    goToStep(2);

    // Fetch template immediately to populate the live preview panel for Step 2
    const pb = document.getElementById('preview-body');
    if (pb) pb.innerHTML = '<div class="loading-center" style="height:100%;"><div class="spin"></div><p>Generating live preview...</p></div>';

    fetchTemplateForPreview(selectedTemplate.path);
}

// Auto-extract fields from template HTML by scanning for ___ blanks and context
let dynamicFields = [];
let dynamicSections = []; // grouped sections for nice UI
const _useManualFields = typeof USE_MANUAL_FIELDS !== 'undefined' && USE_MANUAL_FIELDS;

// Known CA certificate blank patterns: context text → { name, label, section, placeholder }
const KNOWN_PATTERNS = [
    // CA Firm Letterhead (always first 8 blanks in all templates)
    { ctx: /M\/s\./i, name: 'ca_firm_name', label: 'CA Firm Name', section: 'firm', placeholder: 'e.g. Gupta & Associates', required: true },
    { ctx: /^_{3,}$/i, name: 'ca_address', label: 'CA Firm Address', section: 'firm', placeholder: 'Full office address', fullWidth: true },
    { ctx: /Tel/i, name: 'ca_tel', label: 'Telephone', section: 'firm', placeholder: 'e.g. 022-12345678' },
    { ctx: /Email/i, name: 'ca_email', label: 'Email', section: 'firm', placeholder: 'e.g. ca@firm.com' },
    { ctx: /FRN/i, name: 'frn', label: 'FRN', section: 'firm', placeholder: 'e.g. 123456N' },
    { ctx: /GSTIN/i, name: 'gstin_firm', label: 'GSTIN', section: 'firm', placeholder: 'e.g. 27AABCU9603R1ZM' },
    { ctx: /Ref\.?\s*No/i, name: 'ref_no', label: 'Reference No.', section: 'ref', placeholder: 'e.g. CERT/2024/001' },
    { ctx: /Date/i, name: 'cert_date', label: 'Date', section: 'ref', placeholder: 'DD/MM/YYYY' },
    // Subject Entity
    { ctx: /Name of (Applicant|Company|Individual|Entity|Remitter|Grantee|Institution|Remittee|Trust)/i, name: 'entity_name', label: 'Name', section: 'entity', placeholder: 'Full name', required: true },
    { ctx: /Shri\s*\/\s*Smt|M\/s\./i, name: 'entity_name', label: 'Name of Person / Entity', section: 'entity', placeholder: 'Full name', required: true },
    { ctx: /\bPAN\b/i, name: 'pan', label: 'PAN', section: 'entity', placeholder: 'e.g. ABCDE1234F' },
    { ctx: /Aadhaar/i, name: 'aadhaar', label: 'Aadhaar No.', section: 'entity', placeholder: 'e.g. 1234 5678 9012' },
    { ctx: /\bCIN\b/i, name: 'cin', label: 'CIN', section: 'entity', placeholder: 'e.g. U74999MH2020PTC345678' },
    { ctx: /\bTAN\b/i, name: 'tan', label: 'TAN', section: 'entity', placeholder: 'e.g. MUMA12345A' },
    { ctx: /LLP No/i, name: 'llp_no', label: 'CIN / LLP No.', section: 'entity', placeholder: 'e.g. AAA-1234' },
    { ctx: /Address/i, name: 'entity_address', label: 'Address', section: 'entity', placeholder: 'Full registered address', fullWidth: true },
    { ctx: /Registered Address/i, name: 'entity_address', label: 'Registered Address', section: 'entity', placeholder: 'Full registered address', fullWidth: true },
    { ctx: /Assessment Year/i, name: 'assessment_year', label: 'Assessment Year', section: 'entity', placeholder: 'e.g. 2024-25' },
    { ctx: /Financial Year/i, name: 'financial_year', label: 'Financial Year', section: 'details', placeholder: 'e.g. 2023-24' },
    { ctx: /Valuation Date/i, name: 'valuation_date', label: 'Valuation Date', section: 'details', placeholder: 'DD/MM/YYYY' },
    { ctx: /Class of Shares/i, name: 'share_class', label: 'Class of Shares', section: 'details', placeholder: 'Equity / Preference' },
    { ctx: /Paid.?up Shares/i, name: 'total_shares', label: 'Total Paid-up Shares', section: 'details', placeholder: 'e.g. 10,000' },
    { ctx: /Purpose/i, name: 'purpose', label: 'Purpose', section: 'details', placeholder: 'Purpose of certificate', fullWidth: true },
    { ctx: /Nature of Income/i, name: 'income_nature', label: 'Nature of Income / Payments', section: 'details', placeholder: 'e.g. Professional fees', fullWidth: true },
    { ctx: /TDS Section/i, name: 'tds_section', label: 'Applicable TDS Section', section: 'details', placeholder: 'e.g. 194J' },
    { ctx: /Normal Rate/i, name: 'normal_tds_rate', label: 'Normal Rate of TDS (%)', section: 'details', placeholder: 'e.g. 10' },
    { ctx: /Rate of/i, name: 'sought_rate', label: 'Sought Rate (%)', section: 'details', placeholder: 'e.g. 2 / NIL' },
    { ctx: /Amount.*certificate/i, name: 'cert_amount', label: 'Amount (₹)', section: 'details', placeholder: 'e.g. 50,00,000' },
    { ctx: /Status/i, name: 'entity_status', label: 'Status', section: 'entity', placeholder: 'Individual / Company / Firm' },
    { ctx: /Principal Place/i, name: 'principal_place', label: 'Place of Business', section: 'entity', placeholder: 'e.g. Mumbai', fullWidth: true },
    { ctx: /Country/i, name: 'country', label: 'Country', section: 'details', placeholder: 'e.g. United States' },
    { ctx: /Registration No/i, name: 'reg_no', label: 'Registration No.', section: 'entity', placeholder: 'e.g. REG/2024/001' },
    { ctx: /Grant.*Scheme/i, name: 'grant_scheme', label: 'Grant / Scheme Name', section: 'details', placeholder: 'e.g. CSR Grant 2024', fullWidth: true },
    { ctx: /Grantor|Funding/i, name: 'grantor_name', label: 'Grantor / Funding Agency', section: 'details', placeholder: 'e.g. Ministry of Finance', fullWidth: true },
    { ctx: /Grant Received|Amount of Grant/i, name: 'grant_amount', label: 'Grant Amount (₹)', section: 'details', placeholder: 'e.g. 10,00,000' },
    { ctx: /Period/i, name: 'period_from', label: 'Period From', section: 'details', placeholder: 'DD/MM/YYYY' },
    // Financial details
    { ctx: /Rs\.|Rupees/i, name: 'amount', label: 'Amount (₹)', section: 'details', placeholder: 'e.g. 50,00,000' },
    { ctx: /years\)/i, name: 'num_years', label: 'No. of Years', section: 'details', placeholder: 'e.g. 3' },
    { ctx: /only\)/i, name: 'amount_words', label: 'Amount (in words)', section: 'details', placeholder: 'e.g. Fifty Lakhs only', fullWidth: true },
    { ctx: /as at/i, name: 'statements_date', label: 'Statements Date', section: 'details', placeholder: 'DD/MM/YYYY' },
    { ctx: /as on/i, name: 'cert_as_on_date', label: 'Certificate Date', section: 'details', placeholder: 'DD/MM/YYYY' },
    // Signatory (always last 6-7 blanks)
    { ctx: /For M\/s/i, name: 'sign_firm', label: 'CA Firm Name', section: 'sign', placeholder: 'e.g. Gupta & Associates' },
    { ctx: /Partner|Proprietor/i, name: 'ca_signatory', label: 'CA Signatory Name', section: 'sign', placeholder: 'Name of signing CA' },
    { ctx: /M\.\s*No/i, name: 'membership_no', label: 'Membership No.', section: 'sign', placeholder: 'e.g. 123456' },
    { ctx: /Place/i, name: 'sign_place', label: 'Place', section: 'sign', placeholder: 'e.g. Mumbai' },
    { ctx: /UDIN/i, name: 'udin', label: 'UDIN', section: 'sign', placeholder: 'e.g. 24123456ABCDEF1234', fullWidth: true },
];

// Section definitions for organizing the form
const SECTION_DEFS = {
    firm: { title: '🏢 CA / Firm Letterhead', order: 1 },
    ref: { title: '📋 Reference & Date', order: 2 },
    entity: { title: '👤 Subject / Entity Details', order: 3 },
    details: { title: '💰 Certificate Details', order: 4 },
    sign: { title: '✍️ Signatory', order: 5 },
};

function extractFieldsFromTemplate(html) {
    if (_useManualFields) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const fields = [];
    const usedNames = new Set();
    let detailCounter = 1;

    // Collect all blanks with their surrounding text context
    const blanks = [];
    const allElements = doc.body.querySelectorAll('p, td, th, h1, h2, h3, li');

    allElements.forEach(el => {
        const text = el.textContent;
        const blankRx = /_{3,}/g;
        if (!blankRx.test(text)) return;
        blankRx.lastIndex = 0;

        let lastEnd = 0;
        let m;
        while ((m = blankRx.exec(text)) !== null) {
            const before = text.substring(Math.max(0, lastEnd), m.index).trim();
            const after = text.substring(m.index + m[0].length, m.index + m[0].length + 60).trim();
            const fullContext = before + ' ' + after;
            blanks.push({ before, after, fullContext, element: el.tagName });
            lastEnd = m.index + m[0].length;
        }
    });

    // Match each blank against known patterns
    for (const blank of blanks) {
        let matched = false;
        for (const pat of KNOWN_PATTERNS) {
            if (pat.ctx.test(blank.before) || pat.ctx.test(blank.after) || pat.ctx.test(blank.fullContext)) {
                let name = pat.name;
                // Avoid duplicates
                if (usedNames.has(name)) {
                    name = `${name}_${usedNames.size}`;
                }
                usedNames.add(name);
                fields.push({
                    name,
                    label: pat.label,
                    type: /amount|income|tax|worth|shares|grant/i.test(pat.label) ? 'number' : 'text',
                    placeholder: pat.placeholder || '',
                    section: pat.section,
                    required: pat.required || false,
                    fullWidth: pat.fullWidth || false,
                });
                matched = true;
                break;
            }
        }
        if (!matched) {
            // Try to extract a simple label from context
            let label = '';
            const beforeClean = blank.before.replace(/_{2,}/g, '').replace(/[|,;]/g, '').trim();
            if (beforeClean.length > 2) {
                // Take last meaningful segment
                const parts = beforeClean.split(/\s{2,}|\t/);
                label = parts[parts.length - 1].replace(/[:.]$/, '').trim();
            }
            if (!label || label.length < 2) {
                const afterClean = blank.after.replace(/_{2,}/g, '').replace(/^[-–—]\s*/, '').trim();
                if (afterClean.length > 2 && afterClean.length < 40) {
                    label = afterClean.split(/[,;|]/)[0].replace(/[:.]$/, '').trim();
                }
            }
            if (!label || label.length < 2) label = `Detail ${detailCounter++}`;

            let name = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 30) || `detail_${detailCounter}`;
            if (usedNames.has(name)) name = `${name}_${usedNames.size}`;
            usedNames.add(name);

            fields.push({
                name, label,
                type: /amount|income|tax|worth|value/i.test(label) ? 'number' : 'text',
                placeholder: '', section: 'details',
                required: false, fullWidth: false,
            });
        }
    }

    // Group into sections
    dynamicSections = [];
    const sectionMap = {};
    for (const f of fields) {
        const sec = f.section || 'details';
        if (!sectionMap[sec]) sectionMap[sec] = [];
        sectionMap[sec].push(f);
    }
    for (const [key, def] of Object.entries(SECTION_DEFS)) {
        if (sectionMap[key] && sectionMap[key].length > 0) {
            dynamicSections.push({ title: def.title, fields: sectionMap[key] });
        }
    }

    return fields;
}

async function fetchTemplateForPreview(filePath) {
    try {
        const urlRes = await authFetch(`/tools/certificate-templates/remote/url?filename=${encodeURIComponent(filePath)}`);
        if (!urlRes.ok) throw new Error("Failed to get remote template URL");

        const { url } = await urlRes.json();

        if (isPDF) {
            pdfURL = url;
        } else {
            const previewRes = await authFetch(`/tools/certificate-templates/remote/preview?filename=${encodeURIComponent(filePath)}`);
            if (!previewRes.ok) throw new Error("Failed to get remote template preview from Python backend");
            const { html } = await previewRes.json();
            rawContent = html;

            // Auto-extract fields from the actual template and re-render form
            // (only if page does NOT define USE_MANUAL_FIELDS = true)
            if (!_useManualFields) {
                dynamicFields = extractFieldsFromTemplate(html);
                if (dynamicFields.length > 0) {
                    const today = new Date().toLocaleDateString('en-IN');
                    for (const f of dynamicFields) {
                        if (!(f.name in fieldValues)) {
                            // Set default date for date fields
                            if (f.name === 'cert_date' || f.name === 'sign_date') {
                                fieldValues[f.name] = today;
                            } else {
                                fieldValues[f.name] = '';
                            }
                        }
                    }
                    renderStep2();
                }
            }
        }
        updatePreview();
    } catch (err) {
        console.error(err);
        const pb = document.getElementById('preview-body');
        if (pb) pb.innerHTML = `<div style="color:var(--danger);padding:2rem;">⚠️ Error loading preview: ${err.message}</div>`;
    }
}

// ═══ STEP 2 — FILL DETAILS ═══
function renderStep2() {
    if (!selectedTemplate) return;
    const el = document.getElementById('step-2');

    // Use dynamic fields from template if available, otherwise fall back to static getFieldSections
    let fieldSections;
    if (dynamicSections && dynamicSections.length > 0) {
        fieldSections = dynamicSections;
    } else if (dynamicFields && dynamicFields.length > 0) {
        fieldSections = [{ title: '📝 Document Fields', fields: dynamicFields }];
    } else {
        fieldSections = getFieldSections();
    }

    let formHtml = '';
    for (const section of fieldSections) {
        formHtml += `<div style="margin-bottom:1.25rem;">
                    <div style="font-weight:700;font-size:0.92rem;color:var(--g700);margin-bottom:0.6rem;padding-bottom:0.4rem;border-bottom:1px solid var(--g200);">${section.title}</div>
                    <div class="form-grid">`;
        for (const f of section.fields) {
            const isFullWidth = f.fullWidth || f.name === 'applicant_address' || f.name === 'ca_office_address' || f.name === 'gst_office_address' || f.name === 'address';
            formHtml += `<div class="form-group ${isFullWidth ? 'full' : ''}">
                        <label class="form-label">${f.label}${f.required ? '<span class="req">*</span>' : ''}</label>
                        ${f.type === 'select'
                    ? `<select class="form-select" data-field="${f.name}" onchange="onFieldChange('${f.name}', this.value)">
                                ${(f.options || []).map(o => `<option value="${o}" ${fieldValues[f.name] === o ? 'selected' : ''}>${o || 'Select...'}</option>`).join('')}
                           </select>`
                    : `<input class="form-input" type="${f.type === 'number' ? 'number' : 'text'}" data-field="${f.name}"
                                placeholder="${f.placeholder || ''}" value="${fieldValues[f.name] || ''}"
                                oninput="onFieldChange('${f.name}', this.value)">`
                }
                    </div>`;
        }
        formHtml += '</div></div>';
    }

    el.innerHTML = `
            <h2 class="step-title">${isPDF ? '📄' : '📝'} ${selectedTemplate.name.replace(/_/g, ' ')}</h2>
            <p class="step-subtitle">Fill in the details below — the live preview on the right updates as you type.</p>

            ${formHtml}
            
            <div style="background:var(--g50);padding:1rem;border-radius:10px;border:1px solid var(--g200);margin-bottom:1.5rem;">
                <p style="font-size:0.85rem;color:var(--g600);margin:0;">
                    ${isPDF ? '⚠️ <b>Note:</b> This template is a PDF. You will fill in details, but live text editing is not supported.' : '✨ <b>Live Editing:</b> This is a DOCX template. The preview updates as you type. You can also directly edit the text in the preview.'}
                </p>
            </div>

            <div class="btn-row">
                <button class="btn btn-outline" onclick="goToStep(1)">← Back</button>
                <div class="spacer"></div>
                <button class="btn btn-primary" onclick="generateAndGoToStep3()">Generate & Review →</button>
            </div>
        `;
}

async function generateAndGoToStep3() {
    // Fetch preview here if not already loaded, but we actually do it dynamically in updatePreview
    renderStep3();
    goToStep(3);
}

// ═══ STEP 3 — GENERATE & PREVIEW ═══
function renderStep3() {
    const el = document.getElementById('step-3');
    el.innerHTML = `
            <h2 class="step-title">Preview & Generate</h2>
            <p class="step-subtitle">Review your certificate on the right. ${!isPDF ? 'You can directly edit the text in the preview.' : ''}</p>

            <div style="background:white;border-radius:14px;padding:1.5rem;border:1px solid var(--g200);margin-bottom:1.5rem;">
                <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
                    <span style="font-size:1.5rem;">${isPDF ? '📄' : '📝'}</span>
                    <div>
                        <div style="font-weight:700;font-size:1.1rem;">${selectedTemplate.name.replace(/_/g, ' ')}</div>
                        <div style="font-size:0.8rem;color:var(--g400);">CA Certificate</div>
                    </div>
                </div>
                <div style="font-size:0.82rem;color:var(--g500);line-height:1.5;display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
                    ${Object.entries(fieldValues).filter(([k, v]) => v).map(([k, v]) => `
                        <div><strong>${k.replace(/_/g, ' ')}:</strong> ${v}</div>
                    `).join('')}
                </div>
            </div>

            <div class="btn-row">
                <button class="btn btn-outline" onclick="goToStep(2)">← Back to Edit</button>
                <div class="spacer"></div>
                ${!isPDF ? `
                <button class="btn btn-outline" id="btn-edit-preview" onclick="togglePreviewEdit()">
                    ✏️ Edit Document
                </button>
                ` : ''}
                <button class="btn btn-primary" onclick="window.print()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download PDF
                </button>
            </div>
        `;
    schedulePreview();
}

// ═══ EDIT PREVIEW (STEP 4) ═══
function togglePreviewEdit() {
    const pb = document.getElementById('preview-body');
    const iframe = pb.querySelector('iframe');
    if (!iframe) {
        showToast('⚠️ No preview to edit', 'error');
        return;
    }

    const btn = document.getElementById('btn-edit-preview');
    const doc = iframe.contentDocument;
    const isEditing = doc.body.getAttribute('contenteditable') === 'true';

    if (isEditing) {
        // Disable editing
        doc.body.setAttribute('contenteditable', 'false');
        doc.body.style.backgroundColor = '';
        btn.innerHTML = '✏️ Edit Document';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline');

        // For template previews, when finished editing, update the html cache so it gets saved on docx generation
        if (templatePreviewHtml) {
            templatePreviewHtml = doc.documentElement.outerHTML;
            // Note: downloading docx from server will STILL use the original template with form fields, 
            // NOT the raw HTML edits. Word extraction of raw HTML is complex. 
            // But downloading PDF will capture all edits!
        }

        showToast('Editing disabled. Download PDF to capture exact visual edits.', '');
    } else {
        // Enable editing
        doc.body.setAttribute('contenteditable', 'true');
        doc.body.focus();
        doc.body.style.backgroundColor = '#fefefe';
        doc.body.style.borderRadius = '4px';
        doc.body.style.boxShadow = 'inset 0 0 0 2px var(--primary)';

        btn.innerHTML = '💾 Finish Editing';
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-success');
        showToast('✅ You can now edit the entire document directly! Click anywhere in the preview.', 'success');
    }
}

// ═══ PREVIEW ═══
function schedulePreview() {
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(updatePreview, 150);
}

async function updatePreview() {
    const pb = document.getElementById('preview-body');
    const badge = document.getElementById('preview-badge');
    if (!pb) return;

    if (!selectedTemplate) {
        pb.innerHTML = `
                <div class="preview-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    </svg>
                    <p>Select a certificate template to see a live preview here</p>
                </div>`;
        if (badge) badge.style.display = 'none';
        return;
    }

    if (isPDF) {
        if (pdfURL) {
            pb.innerHTML = `<iframe src="${pdfURL}" style="width:100%;height:calc(100vh - 130px);border:none;border-radius:12px;"></iframe>`;
            if (badge) badge.style.display = 'inline';
        }
        return;
    }

    // For DOCX, we do client-side replacement of ___ blanks with editable spans
    let html = rawContent || '';
    if (!html) return;

    // Use dynamic fields to replace ___ blanks in document order (1:1 mapping)
    if (dynamicFields && dynamicFields.length > 0) {
        let dynIdx = 0;
        html = html.replace(/_{3,}/g, (match) => {
            if (dynIdx < dynamicFields.length) {
                const f = dynamicFields[dynIdx++];
                return mkSpan(f.name, f.label);
            }
            return match; // leave as-is if no more fields
        });
    } else {
        // Legacy path: use getReplacements regex (works for cert-gst etc.)
        const replacements = getReplacements(mkSpan);
        for (const r of replacements) {
            html = html.replace(r.find, r.replace());
        }

        // Then auto-detect remaining ___ blanks with unused static fields
        const allFields = getFieldSections().flatMap(s => s.fields.map(f => f.name));
        const usedFields = new Set();
        html.replace(/data-field="([^"]+)"/g, (_, f) => { usedFields.add(f); return _; });
        const unusedFields = allFields.filter(f => !usedFields.has(f));
        let unusedIdx = 0;

        html = html.replace(/_{3,}/g, (match) => {
            if (unusedIdx < unusedFields.length) {
                const fname = unusedFields[unusedIdx++];
                const label = fname.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return mkSpan(fname, label);
            }
            const gname = `blank_${unusedIdx++}`;
            return mkSpan(gname, '___');
        });
    }

    // Write to iframe
    let iframe = pb.querySelector('iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = 'calc(100vh - 130px)';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '12px';
        iframe.style.backgroundColor = 'white';
        pb.innerHTML = '';
        pb.appendChild(iframe);
    }

    iframe.setAttribute('data-doc-name', selectedTemplate.name);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();

    // Make all tpl-ph spans editable and sync back on blur
    const doc = iframe.contentDocument;
    doc.querySelectorAll('.tpl-ph[data-field]').forEach(span => {
        span.setAttribute('contenteditable', 'true');
        span.setAttribute('spellcheck', 'false');
        span.style.cursor = 'text';
        span.style.outline = 'none';
        span.style.minWidth = '60px';

        span.addEventListener('focus', function () {
            if (!this.classList.contains('filled')) this.textContent = '';
            this.style.background = '#fef3c7';
            this.style.borderColor = '#f59e0b';
            this.style.color = '#92400e';
        });

        span.addEventListener('blur', function () {
            const newVal = this.textContent.trim();
            const field = this.getAttribute('data-field');
            if (newVal) {
                fieldValues[field] = newVal;
                this.classList.add('filled');
                this.style.background = '#f0fdf4';
                this.style.borderColor = '#86efac';
                this.style.color = '#166534';
            } else {
                delete fieldValues[field];
                this.textContent = this.getAttribute('data-label') || field;
                this.classList.remove('filled');
                this.style.background = '#eff6ff';
                this.style.borderColor = '#93c5fd';
                this.style.color = '#1e40af';
            }
            // Sync back to form input
            const formInput = document.querySelector(`[data-field="${field}"]`);
            if (formInput) formInput.value = newVal;
        });

        span.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
        });
    });

    if (badge) badge.style.display = 'inline';
}

// Helper: create a placeholder span
function mkSpan(fieldName, label) {
    const val = fieldValues[fieldName];
    const isMoneyField = /amount|worth|turnover|value|deposit|rent|fee|salary|charges/i.test(fieldName);
    const displayVal = isMoneyField ? (val ? formatINR(val) : '') : (val || '');
    const isFilled = !!displayVal;
    const cls = isFilled ? 'tpl-ph filled' : 'tpl-ph';
    return `<span class="${cls}" data-field="${fieldName}" data-label="${label}">${isFilled ? displayVal : label}</span>`;
}

// ═══ DRAFT / EXPORT ═══
function saveDraft() {
    showToast('Draft feature for CA certificates coming soon.', '');
}

// ═══ HELPERS ═══
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast show ${type}`;
    setTimeout(() => t.className = 'toast', 3000);
}

function escapeHTML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Override goToStep to also render step 4
const _origGoToStep = goToStep;
goToStep = function (n) {
    if (n === 4) renderStep4();
    _origGoToStep(n);
};

// ═══ INIT ═══
renderStepper();
loadCategories();

// Check URL params for direct type access
const urlParams = new URLSearchParams(window.location.search);
const directTemplate = urlParams.get('template');
if (directTemplate) {
    // Load templates then auto-select
    (async () => {
        await loadCategories();
        if (remoteTemplates.find(t => t.name === directTemplate)) {
            selectTemplate(directTemplate);
        }
    })();
}
