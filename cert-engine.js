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

    renderStep2();
    goToStep(2);

    // Fetch template immediately to populate the live preview panel for Step 2
    const pb = document.getElementById('preview-body');
    if (pb) pb.innerHTML = '<div class="loading-center" style="height:100%;"><div class="spin"></div><p>Generating live preview...</p></div>';

    fetchTemplateForPreview(selectedTemplate.path);
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

    const fieldSections = getFieldSections();

    let formHtml = '';
    for (const section of fieldSections) {
        formHtml += `<div style="margin-bottom:1.25rem;">
                    <div style="font-weight:700;font-size:0.92rem;color:var(--g700);margin-bottom:0.6rem;padding-bottom:0.4rem;border-bottom:1px solid var(--g200);">${section.title}</div>
                    <div class="form-grid">`;
        for (const f of section.fields) {
            const isFullWidth = f.name === 'applicant_address' || f.name === 'ca_office_address' || f.name === 'gst_office_address';
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

    // Build replacement map: each blank pattern → field value or placeholder label
    // These map the actual ___ blanks in the DOCX HTML to our form fields
    const replacements = getReplacements(mkSpan);

    for (const r of replacements) {
        html = html.replace(r.find, r.replace());
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
    const displayVal = fieldName === 'refund_amount' || fieldName === 'tax_amount_paid'
        ? (val ? formatINR(val) : '')
        : (val || '');
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
