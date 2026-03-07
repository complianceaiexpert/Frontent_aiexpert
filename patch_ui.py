import os
import re

files = [
    "cert-financial.html",
    "cert-networth.html",
    "cert-gst.html",
    "cert-bank.html",
    "cert-fema.html",
    "cert-general.html"
]

templates_db = {
    "cert-financial.html": """
const templates = {
    "Turnover Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">TO WHOMSOEVER IT MAY CONCERN</div>
<p>This is to certify that the turnover of <strong>[Entity Name]</strong> having its registered office at <strong>[Address]</strong> and PAN <strong>[PAN]</strong> for the financial year(s) mentioned below is as per the books of accounts and records produced before us:</p>
<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;" border="1">
    <tr>
        <th style="padding: 8px; text-align: left;">Financial Year</th>
        <th style="padding: 8px; text-align: right;">Turnover (in Rs.)</th>
    </tr>
    <tr>
        <td style="padding: 8px;">2022-23</td>
        <td style="padding: 8px; text-align: right;">[Amount]</td>
    </tr>
</table>
<p>This certificate is being issued at the specific request of the management for the purpose of <strong>[Purpose, e.g., Bank Loan/Tender]</strong>.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong><br>Chartered Accountants<br>FRN: [FRN Number]</p>
    <br><br>
    <p><strong>[CA Name]</strong><br>Partner / Proprietor<br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
    <p>Place: [City]<br>Date: [Date]</p>
</div>`,
    "Net Profit / Profitability Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">NET PROFIT CERTIFICATE</div>
<p>We have examined the books of accounts and records of <strong>[Entity Name]</strong>, having PAN <strong>[PAN]</strong>.</p>
<p>Based on our verification, we certify that the Net Profit of the entity for the past years is as follows:</p>
<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;" border="1">
    <tr>
        <th style="padding: 8px; text-align: left;">Financial Year</th>
        <th style="padding: 8px; text-align: right;">Net Profit (in Rs.)</th>
    </tr>
    <tr>
        <td style="padding: 8px;">[Year]</td>
        <td style="padding: 8px; text-align: right;">[Amount]</td>
    </tr>
</table>
<p>This certificate has been issued for <strong>[Purpose]</strong> based on the audited/unaudited financial statements.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong><br>Chartered Accountants<br>FRN: [FRN Number]</p>
    <br><br>
    <p><strong>[CA Name]</strong><br>Partner / Proprietor<br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Cost of Project / Production Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">PROJECT COST CERTIFICATE</div>
<p>This is to certify that M/s <strong>[Entity Name]</strong> has incurred the following expenditure towards the project <strong>[Project Name]</strong> up to <strong>[Date]</strong>.</p>
<ul style="margin: 1.5rem 0; line-height: 1.8;">
    <li>Land & Building: Rs. [Amount]</li>
    <li>Plant & Machinery: Rs. [Amount]</li>
    <li>Pre-operative Expenses: Rs. [Amount]</li>
    <li><strong>Total Incurred Cost: Rs. [Total Amount]</strong></li>
</ul>
<p>We have verified the above details from the invoices, ledgers, and bank statements produced to us.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Profit & Loss (P&L) Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">PROFIT & LOSS HIGHLIGHTS CERTIFICATE</div>
<p>This is to certify that as per the audited financial statements of <strong>[Entity Name]</strong> for FY <strong>[Year]</strong>, the key highlights of the Profit & Loss statement are as below:</p>
<p>Revenue from Operations: Rs. [Amount]<br>Other Income: Rs. [Amount]<br>Total Expenses: Rs. [Amount]<br><strong>Net Profit before Tax: Rs. [Amount]</strong></p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`
};
""",
    "cert-networth.html": """
const templates = {
    "Net Worth Certificate (Bank / Loan)": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">NET WORTH CERTIFICATE</div>
<p>This is to certify that the Net Worth of <strong>[Applicant Name]</strong> having PAN <strong>[PAN]</strong> as on <strong>[Date of Valuation]</strong> is <strong>Rs. [Net Worth Amount]</strong>.</p>
<p><strong>Computation of Net Worth:</strong></p>
<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;" border="1">
    <tr><th style="padding: 8px; text-align: left;">Total Assets (A)</th><td style="padding: 8px; text-align: right;">Rs. [Assets]</td></tr>
    <tr><th style="padding: 8px; text-align: left;">Total Liabilities (B)</th><td style="padding: 8px; text-align: right;">Rs. [Liabilities]</td></tr>
    <tr><th style="padding: 8px; text-align: left;">Net Worth (A - B)</th><td style="padding: 8px; text-align: right;"><strong>Rs. [Net Worth]</strong></td></tr>
</table>
<p>This certificate is issued for the purpose of availing a Bank Loan/Facility from <strong>[Bank Name]</strong>.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Net Worth Certificate (VISA / Immigration)": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">NET WEALTH / NET WORTH CERTIFICATE (VISA PURPOSE)</div>
<p>This is to certify that Mr./Ms. <strong>[Applicant Name]</strong>, residing at <strong>[Address]</strong> and holding Passport No. <strong>[Passport No]</strong> possesses a total net wealth of <strong>[Amount in INR & Foreign Currency Equivalent]</strong> as on [Date].</p>
<p>The assets comprise bank balances, fixed deposits, real estate property, and mutual funds, verified by us based on original documents and statements.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Net Worth Certificate (Tender)": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">NET WORTH CERTIFICATE FOR TENDER</div>
<p>This is to certify that the Net Worth of M/s <strong>[Entity Name]</strong> as per the audited financial statements for the year ending 31st March [Year] is <strong>Rs. [Amount]</strong>.</p>
<p>This certificate is issued for the purpose of participating in the tender floated by <strong>[Tender Authority]</strong>.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Net Worth Certificate (ROC / FEMA)": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">NET WORTH CERTIFICATE</div>
<p>We certify that the Net Worth of <strong>[Entity Name]</strong> computed in accordance with the provisions of the Companies Act, 2013 / FEMA regulations as on [Date] stands at <strong>Rs. [Amount]</strong>.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`
};
""",
    "cert-gst.html": """
const templates = {
    "GST Refund Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">CERTIFICATE FOR GST REFUND</div>
<p>This is to certify that M/s <strong>[Entity Name]</strong> holding GSTIN <strong>[GSTIN]</strong> has claimed a GST refund of <strong>Rs. [Amount]</strong> for the period <strong>[Period]</strong>.</p>
<p>We have examined the books of accounts, GSTR-1, GSTR-3B, and GSTR-2A/2B. We certify that:</p>
<ol style="margin-left: 1.5rem; line-height: 1.6;">
    <li>The refund amount is correctly computed in accordance with Section 54 of the CGST Act, 2017.</li>
    <li>The incidence of tax and interest has not been passed on to any other person (Unjust Enrichment clause satisfied).</li>
</ol>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong><br>Chartered Accountants</p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "ITC Reconciliation Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">ITC RECONCILIATION CERTIFICATE</div>
<p>We certify that the Input Tax Credit (ITC) of <strong>Rs. [Amount]</strong> availed by <strong>[Entity]</strong> (GSTIN: <strong>[GSTIN]</strong>) during the period <strong>[Period]</strong> is fully reconciled with GSTR-2B and eligible under Section 16 of the CGST Act.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Certificate for Non-Applicability of GST": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">TO WHOMSOEVER IT MAY CONCERN</div>
<p>This is to certify that the aggregate turnover of <strong>[Entity]</strong> having PAN <strong>[PAN]</strong> during the financial year <strong>[Year]</strong> was <strong>Rs. [Amount]</strong>, which is below the threshold limit required for mandatory GST registration under Section 22 of the CGST Act, 2017.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "GST Audit Certificate (GSTR-9C)": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">GST RECONCILIATION CERTIFICATE (GSTR-9C FORMAT)</div>
<p>We have reconciled the registered turnover and tax paid as declared in the Annual Return (GSTR-9) with the audited financial statements of <strong>[Entity]</strong> for the FY <strong>[Year]</strong>.</p>
<p>The un-reconciled differences (if any) have been duly explained in Part V of the GSTR-9C format.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Tax Audit Report (Form 3CA / 3CB / 3CD)": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">FORMAT 3CB SUMMARY</div>
<p>We have examined the balance sheet of <strong>[Entity]</strong> as at 31st March <strong>[Year]</strong>. In our opinion, the books of account are maintained properly, and the particulars given in Form 3CD are true and correct subject to the following qualifications:</p>
<p>1. None</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`
};
""",
    "cert-bank.html": """
const templates = {
    "Fund Utilization Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">FUND UTILIZATION CERTIFICATE</div>
<p>This is to certify that M/s <strong>[Entity Name]</strong> has utilized the loan amount of <strong>Rs. [Amount]</strong> sanctioned by <strong>[Bank Name]</strong> via sanction letter dated [Date] solely for the purpose of <strong>[Purpose]</strong>.</p>
<p>We further certify that the funds have not been diverted to any sister concern or used for any unintended purpose.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Stock / Inventory Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">STOCK & BOOK DEBTS CERTIFICATE</div>
<p>We certify that the stock and book debts position of <strong>[Entity Name]</strong> as on <strong>[Date]</strong> submitted to <strong>[Bank Name]</strong> is true and correct as per the books of accounts:</p>
<p>Total Stock: Rs. [Amount]<br>Eligible Book Debts: Rs. [Amount]<br><strong>Total DP Coverage Limit: Rs. [Amount]</strong></p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "CMA Data Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">CERTIFICATE ON CMA DATA</div>
<p>This is to certify that we have prepared the CMA (Credit Monitoring Arrangement) Data of <strong>[Entity Name]</strong> comprising historical financials, estimates covering the period [Year] to [Year]. The assumptions used are reasonable and consistent with past trends.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Drawing Power Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">DRAWING POWER CERTIFICATE</div>
<p>We certify that based on the stock, receivables, and credtiors position of <strong>[Entity Name]</strong> as on [Date], the calculated Drawing Power against the Cash Credit facility from <strong>[Bank Name]</strong> works out to <strong>Rs. [Amount]</strong>.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Project Cost Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">PROJECT COST CERTIFICATE</div>
<p>We certify that the estimated project cost of <strong>[Entity Name]</strong>'s new facility is <strong>Rs. [Amount]</strong>, to be funded via equity of Rs. [Amount] and term loan of Rs. [Amount].</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`
};
""",
    "cert-fema.html": """
const templates = {
    "Form 15CB Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">FORM NO. 15CB</div>
<p><em>(See rule 37BB)</em></p>
<p>Certificate of an accountant</p>
<p>I/We have examined the agreement between <strong>[Remitter]</strong> and <strong>[Beneficiary]</strong> requiring the remittance of <strong>[Amount in Foreign Currency]</strong> (INR [Amount]).</p>
<p>I/We certify that the applicable tax has been deducted at source at the rate of <strong>[Rate]%</strong> under section <strong>[Section]</strong> of the Income-tax Act, 1961.</p>
<p>Benefit of DTAA between India and <strong>[Country]</strong> is/is not being claimed.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Foreign Remittance Compliance Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">FOREIGN REMITTANCE CERTIFICATE</div>
<p>We certify that the remittance of <strong>[Amount]</strong> by <strong>[Remitter]</strong> to <strong>[Beneficiary]</strong> towards <strong>[Purpose]</strong> complies with the Foreign Exchange Management Act (FEMA), 1999 and the relevant Master Directions issued by the RBI.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "FEMA Valuation Certificate (Shares)": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">VALUATION CERTIFICATE UNDER FEMA</div>
<p>This is to certify that we have determined the fair market value of the equity shares of <strong>[Company Name]</strong> as per the internationally accepted pricing methodology (DCF Method).</p>
<p>The fair value per equity share works out to <strong>Rs. [Amount]</strong> as on the valuation date <strong>[Date]</strong>.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`
};
""",
    "cert-general.html": """
const templates = {
    "Certificate of Compliance": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">CERTIFICATE OF COMPLIANCE</div>
<p>We certify that <strong>[Company Name]</strong> (CIN: <strong>[CIN]</strong>) has complied with all statutory requirements under the Companies Act, 2013 and relevant secretarial standards up to <strong>[Date]</strong>.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Capital / Shareholding Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">SHAREHOLDING PATTERN CERTIFICATE</div>
<p>This is to certify that the Shareholding Pattern of <strong>[Company Name]</strong> as on <strong>[Date]</strong> based on the Register of Members is as follows:</p>
<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0;" border="1">
    <tr><th style="padding: 8px;">Name of Shareholder</th><th style="padding: 8px;">No. of Shares</th><th style="padding: 8px;">% Holding</th></tr>
    <tr><td style="padding: 8px;">[Name 1]</td><td style="padding: 8px; text-align:center;">[Quantity]</td><td style="padding: 8px; text-align:center;">[Percentage]</td></tr>
</table>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Director / Partner List Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">CERTIFICATE OF DIRECTORS</div>
<p>We certify that as per MCA records, the following persons are the active Directors of <strong>[Company Name]</strong>:</p>
<ul style="margin: 1.5rem 0; line-height: 1.8;">
    <li>[Director Name] - DIN: [DIN]</li>
    <li>[Director Name] - DIN: [DIN]</li>
</ul>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`,
    "Authorized Representative Certificate": `<div style="text-align: center; font-weight: bold; text-decoration: underline; margin-bottom: 2rem; font-size: 1.25rem;">AUTHORIZATION CERTIFICATE</div>
<p>This is to certify that Mr./Ms. <strong>[Name]</strong> is the authorized signatory of <strong>[Company Name]</strong> as per the Board Resolution passed on <strong>[Date]</strong>.</p>
<div style="margin-top: 3rem;">
    <p><strong>For [CA Firm Name]</strong></p>
    <p><strong>[CA Name]</strong><br>M. No.: [Membership No.]<br>UDIN: [UDIN]</p>
</div>`
};
"""
}

js_addition_template = '''{templates_js}
        function generateCert(e) {{
            e.preventDefault();
            const selects = document.querySelectorAll('select');
            let found = false;
            selects.forEach(sel => {{
                if(templates[sel.value]) {{
                    found = true;
                    document.getElementById('certificate-template').innerHTML = templates[sel.value];
                }}
            }});
            if(!found) {{
                alert("Please select a valid certificate type first.");
            }}
        }}
        
        document.addEventListener('DOMContentLoaded', function() {{
            const selects = document.querySelectorAll('select');
            selects.forEach(sel => {{
                sel.addEventListener('change', function(e) {{
                    const selected = e.target.value;
                    const paper = document.getElementById('certificate-template');
                    if (paper && templates[selected]) {{
                        paper.innerHTML = templates[selected];
                    }} else if (paper && selected === "") {{
                        paper.innerHTML = '<div style="text-align: center; color: var(--gray-400); margin-top: 100px;"><em>Please select a valid certificate type to view the template.</em></div>';
                    }}
                }});
            }});
        }});
'''

import sys
for filename in files:
    path = f"/Users/rahulgupta/Frontent_aiexpert/{filename}"
    with open(path, "r") as f:
        content = f.read()

    # 1. Update widths in CSS
    content = content.replace('.workflow-panel {\\n            width: 50%;', '.workflow-panel {\\n            width: 40%;')
    # Use re to safely replace the form-panel block
    content = re.sub(
        r'\.form-panel \{[\s\S]*?overflow-y: auto;\s*\}', 
        '''.document-panel {
            width: 60%;
            background: #f1f5f9;
            padding: 2rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .document-toolbar {
            width: 100%;
            max-width: 210mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .document-paper {
            width: 100%;
            max-width: 210mm;
            min-height: 297mm;
            background: white;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            padding: 20mm;
            box-sizing: border-box;
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #000;
        }

        .document-paper:focus {
            outline: 2px solid var(--primary-blue-light);
        }''',
        content
    )

    # 2. Extract the form content 
    match = re.search(r'<!-- Right Panel: The Form -->\s*<div class="form-panel">\s*<div class="form-container">(.*?)</div>\s*</div>\s*</div>', content, flags=re.DOTALL)
    if not match:
        # Some don't have form-container if replace was different
        match = re.search(r'<!-- Right Panel: The Form -->\s*<div class="form-panel">\s*(<h2[\s\S]*?</form>)\s*</div>\s*</div>', content, flags=re.DOTALL)
    
    if match:
        form_content = match.group(1).strip()
        
        replacement_html = """        </div>
        
        <div class="form-container" style="box-shadow: none; border: 1px solid var(--gray-200); padding: 1.5rem; margin-top: 2rem;">
            {form_content}
        </div>
    </div>

    <!-- Right Panel: The Document Preview -->
    <div class="document-panel">
        <div class="document-toolbar">
            <div style="font-weight: 600; color: var(--gray-700);">Live Certificate Draft</div>
            <button type="button" class="btn-submit" style="margin-top: 0; padding: 0.5rem 1rem; width: auto;" onclick="window.print()">Download PDF</button>
        </div>
        <div class="document-paper" contenteditable="true" id="certificate-template">
            <div style="text-align: center; color: var(--gray-400); margin-top: 100px;">
                <em>Please select a certificate type to view and edit its template.</em>
            </div>
        </div>
    </div>
</div>""".format(form_content=form_content)

        # Replace the entire block from end of workflow steps to the end of service-page div
        content = re.sub(r'            </div>\s*</div>\s*<!-- Right Panel: The Form -->.*?</div>\s*</div>', replacement_html, content, flags=re.DOTALL)

    # 3. Replace JS functions
    old_js1 = 'function generateCert(e) { e.preventDefault(); alert("Draft generation initiated!"); }'
    old_js2 = 'function generateCert(e) { e.preventDefault(); alert("15CB Draft generation initiated!"); }'
    
    content = content.replace(old_js1, '')
    content = content.replace(old_js2, '')
    
    # In some places it was formatted differently
    content = re.sub(r'function generateCert\(e\) { [^}]+?alert[^}]+?}', '', content)

    # Inject our new JS before </script>
    js_to_add = js_addition_template.format(templates_js=templates_db[filename])
    
    content = content.replace('</script>', js_to_add + '</script>')
    
    with open(path, "w") as f:
        f.write(content)
    print(f"Patched {filename}")
