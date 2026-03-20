/**
 * app-footer.js — Shared App Footer Component
 * 
 * Usage: Place <div id="app-footer"></div> before </body>,
 *        then include this script.
 */
(function () {
    const container = document.getElementById('app-footer');
    if (!container) return;

    container.innerHTML = `
  <footer class="app-footer">
    <div class="app-footer-inner">
      <p class="app-footer-copy">&copy; ${new Date().getFullYear()} Suvidha AI. All rights reserved.</p>
      <div class="app-footer-links">
        <a href="mailto:complianceAIExpert@gmail.com">Support</a>
        <span class="app-footer-dot">·</span>
        <a href="about-us.html">About</a>
        <span class="app-footer-dot">·</span>
        <a href="contact-us.html">Contact</a>
      </div>
    </div>
  </footer>`;
})();
