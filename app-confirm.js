/**
 * app-confirm.js — Global Confirm & Alert Dialog System
 * Replaces window.confirm() and window.alert() with premium, animated modals.
 *
 * Usage:
 *   // Confirm dialog (returns Promise<boolean>)
 *   const ok = await showConfirm({
 *       title: 'Delete Transaction?',
 *       message: 'This will permanently remove this invoice and its data.',
 *       type: 'danger',          // 'confirm' | 'danger' | 'warning' | 'info'
 *       confirmText: 'Delete',   // optional, default: 'Confirm'
 *       cancelText: 'Cancel',    // optional, default: 'Cancel'
 *   });
 *   if (ok) { ... }
 *
 *   // Quick helpers
 *   await showAlert({ title: 'Success', message: 'Invoice saved', type: 'info' });
 *   const ok = await showDangerConfirm('Delete this file?', 'This is permanent.');
 */
(function () {
    // ═══ INJECT STYLES ═══
    const style = document.createElement('style');
    style.textContent = `
        /* ═══ OVERLAY ═══ */
        .app-dialog-overlay {
            position: fixed;
            inset: 0;
            z-index: 100000;
            background: rgba(15, 23, 42, 0);
            backdrop-filter: blur(0px);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all .25s cubic-bezier(.4,0,.2,1);
            pointer-events: none;
        }
        .app-dialog-overlay.visible {
            background: rgba(15, 23, 42, .45);
            backdrop-filter: blur(6px);
            pointer-events: auto;
        }

        /* ═══ DIALOG ═══ */
        .app-dialog {
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 25px 60px rgba(0,0,0,.18), 0 8px 24px rgba(0,0,0,.08);
            width: 92%;
            max-width: 420px;
            padding: 0;
            transform: scale(.92) translateY(12px);
            opacity: 0;
            transition: all .3s cubic-bezier(.34,1.56,.64,1);
            overflow: hidden;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .app-dialog-overlay.visible .app-dialog {
            transform: scale(1) translateY(0);
            opacity: 1;
        }

        /* ═══ ICON HEADER ═══ */
        .app-dialog-icon-bar {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.6rem 1.5rem .4rem;
        }
        .app-dialog-icon-circle {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
        }
        /* Type colors */
        .app-dialog.type-confirm .app-dialog-icon-circle   { background: linear-gradient(135deg, #eff6ff, #dbeafe); }
        .app-dialog.type-danger .app-dialog-icon-circle     { background: linear-gradient(135deg, #fef2f2, #fee2e2); }
        .app-dialog.type-warning .app-dialog-icon-circle    { background: linear-gradient(135deg, #fffbeb, #fef3c7); }
        .app-dialog.type-info .app-dialog-icon-circle       { background: linear-gradient(135deg, #f0fdf4, #dcfce7); }
        .app-dialog.type-success .app-dialog-icon-circle    { background: linear-gradient(135deg, #f0fdf4, #dcfce7); }

        /* ═══ BODY ═══ */
        .app-dialog-body {
            padding: .75rem 1.75rem 1rem;
            text-align: center;
        }
        .app-dialog-title {
            font-family: 'Outfit', 'Inter', sans-serif;
            font-size: 1.05rem;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 .35rem;
            line-height: 1.4;
        }
        .app-dialog-message {
            font-size: .84rem;
            color: #64748b;
            line-height: 1.6;
            margin: 0;
        }

        /* ═══ ACTIONS ═══ */
        .app-dialog-actions {
            display: flex;
            gap: .5rem;
            padding: .75rem 1.5rem 1.35rem;
            justify-content: center;
        }
        .app-dialog-btn {
            flex: 1;
            padding: .6rem 1rem;
            border-radius: 10px;
            font-size: .85rem;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            border: 1px solid #e2e8f0;
            transition: all .2s cubic-bezier(.4,0,.2,1);
            position: relative;
            overflow: hidden;
        }
        .app-dialog-btn:active { transform: scale(.97); }
        .app-dialog-btn.cancel {
            background: #f8fafc;
            color: #475569;
            border-color: #e2e8f0;
        }
        .app-dialog-btn.cancel:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
            color: #1e293b;
        }
        /* Confirm type buttons */
        .app-dialog.type-confirm .app-dialog-btn.action {
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: #fff; border-color: transparent;
        }
        .app-dialog.type-confirm .app-dialog-btn.action:hover {
            box-shadow: 0 4px 16px rgba(30,58,138,.35);
            transform: translateY(-1px);
        }
        .app-dialog.type-danger .app-dialog-btn.action {
            background: linear-gradient(135deg, #dc2626, #ef4444);
            color: #fff; border-color: transparent;
        }
        .app-dialog.type-danger .app-dialog-btn.action:hover {
            box-shadow: 0 4px 16px rgba(220,38,38,.35);
            transform: translateY(-1px);
        }
        .app-dialog.type-warning .app-dialog-btn.action {
            background: linear-gradient(135deg, #d97706, #f59e0b);
            color: #fff; border-color: transparent;
        }
        .app-dialog.type-warning .app-dialog-btn.action:hover {
            box-shadow: 0 4px 16px rgba(217,119,6,.35);
            transform: translateY(-1px);
        }
        .app-dialog.type-info .app-dialog-btn.action,
        .app-dialog.type-success .app-dialog-btn.action {
            background: linear-gradient(135deg, #059669, #10b981);
            color: #fff; border-color: transparent;
        }
        .app-dialog.type-info .app-dialog-btn.action:hover,
        .app-dialog.type-success .app-dialog-btn.action:hover {
            box-shadow: 0 4px 16px rgba(5,150,105,.35);
            transform: translateY(-1px);
        }
        .app-dialog-btn:active { transform: scale(.97) !important; }

        /* ═══ KEYBOARD HINT ═══ */
        .app-dialog-kbd {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: .75rem;
            padding: 0 1.5rem .75rem;
            font-size: .62rem;
            color: #cbd5e1;
            letter-spacing: .02em;
        }
        .app-dialog-kbd kbd {
            display: inline-flex;
            padding: 1px 6px;
            border-radius: 4px;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            font-family: 'SF Mono', SFMono-Regular, monospace;
            font-size: .58rem;
            font-weight: 600;
            color: #94a3b8;
        }

        /* ═══ ANIMATION ═══ */
        .app-dialog-overlay.closing {
            background: rgba(15, 23, 42, 0);
            backdrop-filter: blur(0px);
        }
        .app-dialog-overlay.closing .app-dialog {
            transform: scale(.94) translateY(8px);
            opacity: 0;
            transition: all .2s ease-in;
        }
    `;
    document.head.appendChild(style);

    // ═══ ICON MAP ═══
    const iconMap = {
        confirm: '🔵',
        danger:  '🔴',
        warning: '⚠️',
        info:    '✅',
        success: '✅',
        delete:  '🗑️',
        reset:   '↻',
        sync:    '🔄',
    };

    // ═══ MAIN: showConfirm() ═══
    window.showConfirm = function (options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Are you sure?',
                message = '',
                type = 'confirm',       // confirm | danger | warning | info | success
                icon = null,            // override emoji icon
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                showCancel = true,
                focusCancel = false,    // focus cancel by default for danger
            } = options;

            // Create overlay
            const overlay = document.createElement('div');
            overlay.className = 'app-dialog-overlay';

            const dialogType = type === 'delete' ? 'danger' : type;
            const displayIcon = icon || iconMap[type] || iconMap.confirm;

            overlay.innerHTML = `
                <div class="app-dialog type-${dialogType}">
                    <div class="app-dialog-icon-bar">
                        <div class="app-dialog-icon-circle">${displayIcon}</div>
                    </div>
                    <div class="app-dialog-body">
                        <h3 class="app-dialog-title">${title}</h3>
                        ${message ? `<p class="app-dialog-message">${message}</p>` : ''}
                    </div>
                    <div class="app-dialog-actions">
                        ${showCancel ? `<button class="app-dialog-btn cancel" data-action="cancel">${cancelText}</button>` : ''}
                        <button class="app-dialog-btn action" data-action="confirm">${confirmText}</button>
                    </div>
                    <div class="app-dialog-kbd">
                        ${showCancel ? '<span><kbd>Esc</kbd> Cancel</span>' : ''}
                        <span><kbd>Enter</kbd> ${confirmText}</span>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Animate in
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.add('visible');
                });
            });

            // Focus the right button
            setTimeout(() => {
                const target = focusCancel || type === 'danger' || type === 'delete'
                    ? overlay.querySelector('[data-action="cancel"]')
                    : overlay.querySelector('[data-action="confirm"]');
                if (target) target.focus();
            }, 100);

            // ═══ CLOSE ═══
            function close(result) {
                overlay.classList.remove('visible');
                overlay.classList.add('closing');
                setTimeout(() => {
                    overlay.remove();
                    resolve(result);
                }, 250);
                document.removeEventListener('keydown', kbHandler);
            }

            // Button clicks
            overlay.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (btn) {
                    close(btn.dataset.action === 'confirm');
                    return;
                }
                // Click on backdrop
                if (e.target === overlay) {
                    close(false);
                }
            });

            // Keyboard
            function kbHandler(e) {
                if (e.key === 'Escape') { e.preventDefault(); close(false); }
                if (e.key === 'Enter') { e.preventDefault(); close(true); }
            }
            document.addEventListener('keydown', kbHandler);
        });
    };

    // ═══ QUICK HELPERS ═══

    /** Show a danger confirm dialog */
    window.showDangerConfirm = function (title, message, confirmText = 'Delete') {
        return showConfirm({ title, message, type: 'danger', confirmText, icon: '🗑️' });
    };

    /** Show a warning confirm dialog */
    window.showWarningConfirm = function (title, message, confirmText = 'Continue') {
        return showConfirm({ title, message, type: 'warning', confirmText });
    };

    /** Show an info-only alert (no cancel button) */
    window.showAlert = function (options = {}) {
        const defaults = {
            showCancel: false,
            confirmText: 'OK',
            type: 'info',
        };
        return showConfirm({ ...defaults, ...options });
    };

    // ═══ OVERRIDE window.confirm ═══
    // We DON'T override window.confirm because it's synchronous
    // and confirm() needs to return a boolean immediately.
    // Instead, pages should use `await showConfirm(...)` directly.
    // We log a warning if anyone still uses confirm() so we catch them.
    const _origConfirm = window.confirm;
    window.confirm = function (msg) {
        console.warn('[app-confirm] Native confirm() called — migrate to showConfirm(). Message:', msg);
        return _origConfirm.call(window, msg);
    };

})();
