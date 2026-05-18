(function () {
    'use strict';

    function setMenuOpen(open) {
        const menu = document.querySelector('.topbar-menu');
        const overlay = document.querySelector('.topbar-menu-overlay');
        const button = document.querySelector('.topbar-menu-btn');
        if (!menu || !overlay || !button) return;

        menu.hidden = false;
        overlay.hidden = false;
        menu.dataset.open = open ? 'true' : 'false';
        overlay.dataset.open = open ? 'true' : 'false';
        button.setAttribute('aria-expanded', open ? 'true' : 'false');

        if (!open) {
            window.setTimeout(() => {
                if (menu.dataset.open !== 'true') menu.hidden = true;
                if (overlay.dataset.open !== 'true') overlay.hidden = true;
            }, 230);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const button = document.querySelector('.topbar-menu-btn');
        const close = document.querySelector('.topbar-menu-close');
        const overlay = document.querySelector('.topbar-menu-overlay');
        const menu = document.querySelector('.topbar-menu');

        if (button) {
            button.addEventListener('click', () => {
                const isOpen = menu && menu.dataset.open === 'true';
                setMenuOpen(!isOpen);
            });
        }
        if (close) close.addEventListener('click', () => setMenuOpen(false));
        if (overlay) overlay.addEventListener('click', () => setMenuOpen(false));

        document.querySelectorAll('.topbar-menu a').forEach((link) => {
            link.addEventListener('click', () => setMenuOpen(false));
        });
    });
})();
