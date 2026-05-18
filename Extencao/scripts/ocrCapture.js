(function () {
    'use strict';

    if (window.__acfhOcrCaptureLoaded) return;
    window.__acfhOcrCaptureLoaded = true;

    function cssPath(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return '';
        if (element.id) return `#${CSS.escape(element.id)}`;

        const parts = [];
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
            let selector = current.localName.toLowerCase();
            if (current.classList && current.classList.length) {
                selector += `.${Array.from(current.classList).slice(0, 2).map(cls => CSS.escape(cls)).join('.')}`;
            }
            let index = 1;
            let sibling = current.previousElementSibling;
            while (sibling) {
                if (sibling.localName === current.localName) index++;
                sibling = sibling.previousElementSibling;
            }
            if (index > 1) selector += `:nth-of-type(${index})`;
            parts.unshift(selector);
            current = current.parentElement;
        }
        return parts.join(' > ');
    }

    function readableText(element) {
        if (!element) return '';
        return (
            element.getAttribute('aria-label') ||
            element.getAttribute('title') ||
            element.getAttribute('placeholder') ||
            element.value ||
            element.innerText ||
            element.textContent ||
            ''
        ).trim().replace(/\s+/g, ' ').slice(0, 160);
    }

    function showFillValueBox(initialValue = '') {
        return new Promise((resolve) => {
            const shell = document.createElement('div');
            shell.style.cssText = [
                'position:fixed',
                'right:18px',
                'bottom:18px',
                'z-index:2147483647',
                'padding:10px',
                'border-radius:10px',
                'background:#1f2937',
                'border:1px solid rgba(56,189,248,.45)',
                'box-shadow:0 18px 50px rgba(0,0,0,.38)',
                'font-family:Segoe UI,Arial,sans-serif',
                'display:flex',
                'gap:8px',
                'align-items:center'
            ].join(';');

            const input = document.createElement('input');
            input.type = 'text';
            input.value = initialValue || '';
            input.placeholder = 'Fill value';
            input.style.cssText = [
                'width:260px',
                'min-height:34px',
                'border-radius:7px',
                'border:1px solid rgba(148,163,184,.45)',
                'background:#0f172a',
                'color:#f8fafc',
                'padding:6px 9px',
                'outline:none'
            ].join(';');

            const save = document.createElement('button');
            save.type = 'button';
            save.textContent = 'Save';
            save.style.cssText = 'min-height:34px;border:0;border-radius:7px;background:#0ea5e9;color:white;padding:0 12px;cursor:pointer';

            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.textContent = 'Cancel';
            cancel.style.cssText = 'min-height:34px;border:1px solid rgba(148,163,184,.35);border-radius:7px;background:#111827;color:#e5e7eb;padding:0 12px;cursor:pointer';

            function cleanup(value) {
                shell.remove();
                resolve(value);
            }

            save.addEventListener('click', () => cleanup(input.value));
            cancel.addEventListener('click', () => cleanup(null));
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') cleanup(input.value);
                if (event.key === 'Escape') cleanup(null);
            });

            shell.append(input, save, cancel);
            document.body.appendChild(shell);
            input.focus();
        });
    }

    function startCapture(defaults = {}) {
        if (document.getElementById('acfh-ocr-capture-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'acfh-ocr-capture-overlay';
        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:2147483647',
            'cursor:crosshair',
            'background:rgba(2,6,23,0.24)'
        ].join(';');

        const box = document.createElement('div');
        box.style.cssText = [
            'position:fixed',
            'display:none',
            'border:2px solid #38bdf8',
            'background:rgba(56,189,248,0.16)',
            'box-shadow:0 0 0 9999px rgba(2,6,23,0.35)',
            'pointer-events:none'
        ].join(';');
        overlay.appendChild(box);

        let startX = 0;
        let startY = 0;
        let dragging = false;

        function updateBox(clientX, clientY) {
            const left = Math.min(startX, clientX);
            const top = Math.min(startY, clientY);
            const width = Math.abs(clientX - startX);
            const height = Math.abs(clientY - startY);
            box.style.left = `${left}px`;
            box.style.top = `${top}px`;
            box.style.width = `${width}px`;
            box.style.height = `${height}px`;
        }

        overlay.addEventListener('mousedown', (event) => {
            dragging = true;
            startX = event.clientX;
            startY = event.clientY;
            box.style.display = 'block';
            updateBox(event.clientX, event.clientY);
        });

        overlay.addEventListener('mousemove', (event) => {
            if (!dragging) return;
            updateBox(event.clientX, event.clientY);
        });

        overlay.addEventListener('mouseup', async (event) => {
            if (!dragging) return;
            dragging = false;

            const left = Math.min(startX, event.clientX);
            const top = Math.min(startY, event.clientY);
            const width = Math.abs(event.clientX - startX);
            const height = Math.abs(event.clientY - startY);
            overlay.remove();

            const centerX = width < 4 || height < 4 ? event.clientX : left + width / 2;
            const centerY = width < 4 || height < 4 ? event.clientY : top + height / 2;
            const target = document.elementFromPoint(centerX, centerY);
            const targetRect = target ? target.getBoundingClientRect() : null;
            const captureRect = width < 4 || height < 4
                ? {
                    left: targetRect ? targetRect.left : centerX,
                    top: targetRect ? targetRect.top : centerY,
                    width: targetRect ? targetRect.width : 1,
                    height: targetRect ? targetRect.height : 1
                }
                : { left, top, width, height };
            const capture = {
                url: location.href,
                title: document.title,
                rect: captureRect,
                matchText: readableText(target),
                capturedText: readableText(target),
                selectorHint: cssPath(target),
                role: target ? (target.getAttribute('role') || target.getAttribute('type') || '') : '',
                tagName: target ? target.tagName.toLowerCase() : ''
            };

            if (defaults.action === 'fill') {
                const fillValue = await showFillValueBox(defaults.fillValue || readableText(target));
                if (fillValue === null) return;
                capture.fillValue = fillValue;
            }

            chrome.runtime.sendMessage({ action: 'ocrCaptureComplete', capture });
        });

        overlay.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                overlay.remove();
            }
        });

        document.body.appendChild(overlay);
        overlay.tabIndex = -1;
        overlay.focus();
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.action === 'startOcrCaptureOverlay') {
            startCapture(message.defaults || {});
            sendResponse({ success: true });
        }
    });
})();
