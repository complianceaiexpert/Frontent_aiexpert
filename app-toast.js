/**
 * app-toast.js — Global Toast Notification System
 * Replaces window.alert() with elegant inline toast notifications.
 *
 * Usage:
 *   showToast('Report generated successfully', 'success');
 *   showToast('Upload failed — try again', 'error');
 *   showToast('Processing your file...', 'info');
 *   showToast('Large file — may take longer', 'warning');
 */
(function () {
    // Create toast container
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column-reverse;
        gap: 10px;
        pointer-events: none;
        max-width: 420px;
    `;
    document.body.appendChild(container);

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        .app-toast {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 16px;
            border-radius: 10px;
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 0.82rem;
            font-weight: 500;
            line-height: 1.45;
            color: #1e293b;
            background: #fff;
            border: 1px solid #e2e8f0;
            box-shadow: 0 8px 30px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04);
            pointer-events: auto;
            transform: translateX(120%);
            opacity: 0;
            transition: all .35s cubic-bezier(.4, 0, .2, 1);
            cursor: pointer;
            max-width: 420px;
            backdrop-filter: blur(12px);
        }
        .app-toast.show {
            transform: translateX(0);
            opacity: 1;
        }
        .app-toast.hide {
            transform: translateX(120%);
            opacity: 0;
        }
        .app-toast-icon {
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 1px;
        }
        .app-toast-icon svg {
            width: 13px;
            height: 13px;
        }
        .app-toast-body {
            flex: 1;
            min-width: 0;
        }
        .app-toast-close {
            flex-shrink: 0;
            background: none;
            border: none;
            cursor: pointer;
            color: #94a3b8;
            padding: 2px;
            border-radius: 4px;
            transition: all .15s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .app-toast-close:hover {
            color: #475569;
            background: #f1f5f9;
        }
        /* Types */
        .app-toast.success { border-left: 3px solid #22c55e; }
        .app-toast.success .app-toast-icon { background: #f0fdf4; color: #16a34a; }
        .app-toast.error { border-left: 3px solid #ef4444; }
        .app-toast.error .app-toast-icon { background: #fef2f2; color: #dc2626; }
        .app-toast.warning { border-left: 3px solid #f59e0b; }
        .app-toast.warning .app-toast-icon { background: #fffbeb; color: #d97706; }
        .app-toast.info { border-left: 3px solid #3b82f6; }
        .app-toast.info .app-toast-icon { background: #eff6ff; color: #2563eb; }
    `;
    document.head.appendChild(style);

    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
    };

    window.showToast = function (message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `app-toast ${type}`;
        toast.innerHTML = `
            <div class="app-toast-icon">${icons[type] || icons.info}</div>
            <div class="app-toast-body">${message}</div>
            <button class="app-toast-close" onclick="this.parentElement.classList.replace('show','hide');setTimeout(()=>this.parentElement.remove(),350)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        `;
        toast.onclick = (e) => {
            if (e.target.closest('.app-toast-close')) return;
            toast.classList.replace('show', 'hide');
            setTimeout(() => toast.remove(), 350);
        };
        container.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.classList.replace('show', 'hide');
                    setTimeout(() => toast.remove(), 350);
                }
            }, duration);
        }
        return toast;
    };

    // Override window.alert with toast (backward compat)
    window._originalAlert = window.alert;
    window.alert = function (msg) {
        showToast(String(msg), 'info', 5000);
    };
})();
