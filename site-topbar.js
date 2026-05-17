(function() {
  const container = document.createElement('div');
  container.id = 'site-topbar-container';
  
  // Inject CSS for centering and styles
  const style = document.createElement('style');
  style.textContent = `
    .site-navbar {
      background: rgba(7,8,13,.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,.06);
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 1000;
      height: 64px;
      display: flex;
      align-items: center;
      font-family: 'Inter', sans-serif;
    }
    .site-container {
      max-width: 1280px;
      margin: 0 auto;
      width: 100%;
      display: flex;
      align-items: center;
      padding: 0 2rem;
    }
    .site-logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: #fff;
      font-weight: 800;
      font-size: 1.2rem;
      font-family: 'Outfit', sans-serif;
    }
    .site-logo-icon {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #EB6711, #f5841a);
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 800;
    }
    .site-nav-links {
      display: flex;
      gap: 2.5rem;
      list-style: none;
      align-items: center;
      margin: 0 auto; /* CENTERED */
      padding: 0;
    }
    .site-nav-links a {
      color: rgba(255,255,255,.7);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.95rem;
      transition: color 0.2s;
    }
    .site-nav-links a:hover, .site-nav-links a.active {
      color: #fff;
    }
    .site-nav-links a.active {
      font-weight: 600;
    }
    .site-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1.2rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      text-decoration: none;
      color: #fff;
      background: linear-gradient(135deg, #EB6711, #f5841a);
      box-shadow: 0 2px 10px rgba(235,103,17,.3);
      transition: all 0.2s;
      font-family: inherit;
    }
    .site-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(235,103,17,.4);
    }
    @media (max-width: 768px) {
      .site-nav-links { display: none; } /* Hide on mobile for simplicity */
    }
  `;
  document.head.appendChild(style);

  const curPage = window.location.pathname.split('/').pop() || 'index.html';
  
  container.innerHTML = `
    <nav class="site-navbar">
      <div class="site-container">
        <a href="index.html" class="site-logo">
          <div class="site-logo-icon">SA</div>
          <span>Suvidha<span style="color: #f5841a;">AI</span></span>
        </a>
        <ul class="site-nav-links">
          <li><a href="index.html" class="${curPage === 'index.html' || curPage === '' ? 'active' : ''}">Home</a></li>
          <li><a href="services.html" class="${curPage === 'services.html' ? 'active' : ''}">Services</a></li>
          <li><a href="features.html" class="${curPage === 'features.html' ? 'active' : ''}">Features</a></li>
          <li><a href="how-it-works.html" class="${curPage === 'how-it-works.html' ? 'active' : ''}">How It Works</a></li>
          <li><a href="blog.html" class="${curPage === 'blog.html' ? 'active' : ''}">Blog</a></li>
          <li><a href="about-us.html" class="${curPage === 'about-us.html' ? 'active' : ''}">About Us</a></li>
          <li><a href="pricing.html" class="${curPage === 'pricing.html' ? 'active' : ''}">Pricing</a></li>
        </ul>
        <div class="site-actions">
          <a href="sign-in.html" class="site-btn">Sign In</a>
        </div>
      </div>
    </nav>
    <div style="height: 64px;"></div> <!-- Spacer -->
  `;
  
  document.body.insertBefore(container, document.body.firstChild);
})();
