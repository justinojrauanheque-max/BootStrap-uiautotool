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

    function readableTextFromRect(rect, fallbackTarget) {
        const pieces = [];
        const seen = new Set();
        const width = Math.max(1, rect.width || 1);
        const height = Math.max(1, rect.height || 1);
        const sampleX = Math.min(6, Math.max(2, Math.ceil(width / 120)));
        const sampleY = Math.min(6, Math.max(2, Math.ceil(height / 80)));

        for (let y = 0; y <= sampleY; y++) {
            for (let x = 0; x <= sampleX; x++) {
                const px = rect.left + (width * x / sampleX);
                const py = rect.top + (height * y / sampleY);
                const element = document.elementFromPoint(px, py);
                if (!element) continue;
                const candidates = [element, element.closest('input,textarea,button,a,label,[role],p,span,div,td,th,li,h1,h2,h3,h4,h5,h6')].filter(Boolean);
                candidates.forEach((candidate) => {
                    if (seen.has(candidate)) return;
                    seen.add(candidate);
                    const text = readableText(candidate);
                    if (text && !pieces.includes(text)) pieces.push(text);
                });
            }
        }

        const selected = String(window.getSelection && window.getSelection() || '').trim().replace(/\s+/g, ' ');
        if (selected && !pieces.includes(selected)) {
            pieces.unshift(selected);
        }

        if (!pieces.length) {
            const fallback = readableText(fallbackTarget);
            if (fallback) pieces.push(fallback);
        }
        return pieces.join('\n').slice(0, 5000);
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
            const rectText = readableTextFromRect(captureRect, target);
            const capture = {
                url: location.href,
                title: document.title,
                rect: captureRect,
                matchText: readableText(target) || rectText,
                capturedText: rectText || readableText(target),
                selectorHint: cssPath(target),
                role: target ? (target.getAttribute('role') || target.getAttribute('type') || '') : '',
                tagName: target ? target.tagName.toLowerCase() : ''
            };

            if (defaults.action === 'fill') {
                const fillValue = await showFillValueBox(defaults.fillValue || readableText(target));
                if (fillValue === null) return;
                capture.fillValue = fillValue;
            }

            if (defaults.textOnly === true || defaults.noCreateAction === true) {
                showCapturedTextPanel(capture.capturedText || capture.matchText || '');
                return;
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

    function showCapturedTextPanel(text) {
        const existing = document.getElementById('acfh-ocr-text-panel');
        if (existing) existing.remove();

        const shell = document.createElement('div');
        shell.id = 'acfh-ocr-text-panel';
        shell.style.cssText = [
            'position:fixed',
            'right:18px',
            'bottom:18px',
            'z-index:2147483647',
            'width:min(520px,calc(100vw - 36px))',
            'padding:14px',
            'border:1px solid rgba(56,189,248,.45)',
            'border-radius:10px',
            'background:rgba(15,23,42,.98)',
            'box-shadow:0 24px 70px rgba(0,0,0,.48)',
            'color:#e5e7eb',
            'font-family:Segoe UI,Arial,sans-serif',
            'user-select:text',
            'pointer-events:auto'
        ].join(';');

        const title = document.createElement('strong');
        title.textContent = 'Captured text';
        title.style.cssText = 'display:block;margin:0 0 10px;font-size:14px';

        const textarea = document.createElement('textarea');
        textarea.value = text || 'No text found.';
        textarea.readOnly = true;
        textarea.style.cssText = [
            'width:100%',
            'height:160px',
            'resize:vertical',
            'box-sizing:border-box',
            'border:1px solid rgba(148,163,184,.35)',
            'border-radius:8px',
            'background:#020617',
            'color:#f8fafc',
            'padding:10px',
            'font:13px/1.5 Consolas,monospace',
            'user-select:text',
            'cursor:text'
        ].join(';');

        const actions = document.createElement('div');
        actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:10px';

        const copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Copy';
        copy.style.cssText = 'min-height:36px;border:0;border-radius:8px;background:#2563eb;color:white;padding:0 14px;font-weight:700;cursor:pointer';

        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = 'Close';
        close.style.cssText = 'min-height:36px;border:1px solid rgba(148,163,184,.35);border-radius:8px;background:#111827;color:#e5e7eb;padding:0 14px;cursor:pointer';

        copy.addEventListener('click', async () => {
            textarea.focus();
            textarea.select();
            try {
                await navigator.clipboard.writeText(textarea.value);
                copy.textContent = 'Copied';
            } catch (e) {
                document.execCommand('copy');
                copy.textContent = 'Copied';
            }
        });
        textarea.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
                event.preventDefault();
                textarea.focus();
                textarea.select();
            }
        });
        close.addEventListener('click', () => shell.remove());

        actions.append(copy, close);
        shell.append(title, textarea, actions);
        document.body.appendChild(shell);
        textarea.focus();
        textarea.select();
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.action === 'startOcrCaptureOverlay') {
            startCapture(message.defaults || {});
            sendResponse({ success: true });
        }
    });
})();
