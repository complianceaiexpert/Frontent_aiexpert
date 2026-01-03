# PowerShell script to add footer and Home links to all HTML pages

$footer = @"
    <!-- Footer -->
    <footer style="background: var(--gray-100); padding: 1.5rem 2rem; text-align: center; border-top: 1px solid var(--gray-200); margin-top: 4rem;">
        <p style="color: var(--gray-600); font-size: 0.875rem; margin: 0;">
            If you need more assistance, write an email to us at 
            <a href="mailto:complianceAIExpert@gmail.com" style="color: var(--primary-orange); font-weight: 600; text-decoration: none;">complianceAIExpert@gmail.com</a>
        </p>
    </footer>
"@

# Pages to update
$pages = @(
    "clients.html",
    "services-dashboard.html",
    "profile.html",
    "service-gst-refund.html",
    "web-view.html",
    "semichat-view.html"
)

foreach ($page in $pages) {
    $filePath = Join-Path $PSScriptRoot $page
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Add footer before </body> if not already present
        if ($content -notmatch "complianceAIExpert@gmail.com") {
            $content = $content -replace '</body>', "$footer`n</body>"
            Set-Content -Path $filePath -Value $content -NoNewline
            Write-Host "Added footer to $page"
        }
    }
}

Write-Host "Footer addition complete!"
"@
