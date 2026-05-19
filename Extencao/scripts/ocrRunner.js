(function () {
    'use strict';

    if (window.__acfhOcrRunnerLoaded) return;
    window.__acfhOcrRunnerLoaded = true;

    const ACTIVE_MODE = 'ocr';
    const OCR_SETTINGS_KEY = 'ocrSettings';
    const OCR_INJECTION_TIMING_KEY = 'ocrInjectionTiming';
    let timers = [];
    let observers = [];
    let runToken = 0;
    let rulesState = [];
    let settingsState = { name: 'OCR configuration', url: '', initWait: '0' };
    let feedbackMode = 'none';
    let ocrInjectionTiming = 'reload';
    let allowFloatBoxForCurrentPage = false;
    let activeMode = '';
    let autoClickerEnabled = false;
    let floatBox = null;
    let floatStatus = null;
    let floatPlayButton = null;
    let floatStopButton = null;
    let nextRuleIndex = 0;
    let selectedCaptureAction = 'click';
    let playbackState = {
        running: false,
        paused: false,
        queue: [],
        ruleIndex: 0,
        repeatIndex: 0,
        token: 0
    };
    let ocrLang = 'en';
    const ocrText = {
        en: { ready: 'Ready', disabled: 'Disabled', stopped: 'Stopped', noActions: 'No OCR actions', noTarget: 'No target', actionSent: 'Action sent', runSent: 'Run sent', preview: 'Preview', noMatch: 'No match', deleted: 'Deleted', deleteFailed: 'Delete failed', noAction: 'No action', waiting: 'Waiting', captureMode: 'Capture mode', captureText: 'Capture text', click: 'Click', doubleClick: 'Double click', scroll: 'Scroll', fill: 'Fill', check: 'Check / switch' },
        pt: { ready: 'Pronto', disabled: 'Desativado', stopped: 'Parado', noActions: 'Sem acoes OCR', noTarget: 'Sem alvo', actionSent: 'Acao enviada', runSent: 'Execucao enviada', preview: 'Previa', noMatch: 'Sem correspondencia', deleted: 'Excluido', deleteFailed: 'Falha ao excluir', noAction: 'Sem acao', waiting: 'Aguardando', captureMode: 'Modo de captura', captureText: 'Capturar texto', click: 'Clique', doubleClick: 'Clique duplo', scroll: 'Scroll', fill: 'Preencher', check: 'Marcar / alternar' },
        es: { ready: 'Listo', disabled: 'Desactivado', stopped: 'Detenido', noActions: 'Sin acciones OCR', noTarget: 'Sin objetivo', actionSent: 'Accion enviada', runSent: 'Ejecucion enviada', preview: 'Vista previa', noMatch: 'Sin coincidencia', deleted: 'Eliminado', deleteFailed: 'Error al eliminar', noAction: 'Sin accion', waiting: 'Esperando', captureMode: 'Modo de captura', captureText: 'Capturar texto', click: 'Clic', doubleClick: 'Doble clic', scroll: 'Desplazar', fill: 'Rellenar', check: 'Marcar / cambiar' },
        fr: { ready: 'Pret', disabled: 'Desactive', stopped: 'Arrete', noActions: 'Aucune action OCR', noTarget: 'Aucune cible', actionSent: 'Action envoyee', runSent: 'Execution envoyee', preview: 'Apercu', noMatch: 'Aucune correspondance', deleted: 'Supprime', deleteFailed: 'Echec suppression', noAction: 'Aucune action', waiting: 'Attente', captureMode: 'Mode capture', captureText: 'Capturer texte', click: 'Clic', doubleClick: 'Double clic', scroll: 'Defiler', fill: 'Remplir', check: 'Cocher / basculer' }
    };

    function setOcrLanguage(lang) {
        const short = String(lang || '').toLowerCase().split('-')[0];
        ocrLang = ocrText[short] ? short : 'en';
    }

    function txt(key) {
        return (ocrText[ocrLang] && ocrText[ocrLang][key]) || ocrText.en[key] || key;
    }

    function normalizeOcrSettings(settings = {}) {
        return {
            name: settings.name || 'OCR configuration',
            url: settings.url || '',
            initWait: Number.isFinite(Number(settings.initWait)) ? String(Math.max(0, Number(settings.initWait))) : (settings.initWait || '0')
        };
    }

    function normalizeOcrTargetUrl(url) {
        if (!url || typeof url !== 'string') return '';
        return url.trim().replace(/\*+$/g, '').replace(/\/+$/g, '');
    }

    function urlMatchesTarget(targetUrl) {
        const target = normalizeOcrTargetUrl(targetUrl);
        if (!target || target === '*://*/*' || target === '<all_urls>') return false;
        try {
            const candidate = new URL(location.href);
            const targetWithScheme = /^[a-z][a-z\d+\-.]*:\/\//i.test(target) ? target : `https://${target}`;
            const parsed = new URL(targetWithScheme);
            const candidateHost = candidate.hostname.replace(/^www\./, '');
            const targetHost = parsed.hostname.replace(/^www\./, '');
            if (candidateHost !== targetHost && !candidateHost.endsWith(`.${targetHost}`)) return false;
            const targetPath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/+$/g, '') : '';
            if (!targetPath) return true;
            return candidate.pathname.replace(/\/+$/g, '').startsWith(targetPath);
        } catch (e) {
            return location.href.toLowerCase().includes(target.toLowerCase());
        }
    }

    function ruleTargetUrl(rule) {
        return rule.url || settingsState.url || '';
    }

    function runnableRules(ruleId = null) {
        return rulesState
            .filter(rule => rule && !rule.disabled)
            .filter(rule => !ruleId || rule.id === ruleId)
            .filter(rule => urlMatchesTarget(ruleTargetUrl(rule)))
            .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    }

    function clearTimers() {
        runToken++;
        playbackState.running = false;
        playbackState.paused = false;
        playbackState.queue = [];
        playbackState.ruleIndex = 0;
        playbackState.repeatIndex = 0;
        timers.forEach(timer => {
            clearInterval(timer);
            clearTimeout(timer);
        });
        timers = [];
        observers.forEach(observer => observer.disconnect());
        observers = [];
        updateFloatRunState();
    }

    function textFor(element) {
        if (!element) return '';
        return (
            element.getAttribute('aria-label') ||
            element.getAttribute('title') ||
            element.getAttribute('placeholder') ||
            element.value ||
            element.innerText ||
            element.textContent ||
            ''
        ).trim().replace(/\s+/g, ' ');
    }

    function isVisible(element) {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }

    function findByRect(rule) {
        if (!rule.rect) return null;
        const rect = rule.rect;
        const x = Math.max(0, Math.min(window.innerWidth - 1, Number(rect.left) + Number(rect.width) / 2));
        const y = Math.max(0, Math.min(window.innerHeight - 1, Number(rect.top) + Number(rect.height) / 2));
        const target = document.elementFromPoint(x, y);
        return isVisible(target) ? target : null;
    }

    function findTarget(rule) {
        if (rule.selectorHint) {
            try {
                const direct = document.querySelector(rule.selectorHint);
                if (isVisible(direct)) return direct;
            } catch (e) {
                // Text and rectangle matching are the fallback.
            }
        }

        const rectTarget = findByRect(rule);
        if (rectTarget) return rectTarget;

        const needle = String(rule.matchText || '').trim().toLowerCase();
        if (!needle) return null;

        const candidates = document.querySelectorAll('button,a,input,textarea,select,label,[role],summary,[contenteditable="true"],div,span');
        let best = null;
        let bestScore = 0;

        for (const element of candidates) {
            if (!isVisible(element)) continue;
            const haystack = textFor(element).toLowerCase();
            if (!haystack) continue;
            let score = 0;
            if (haystack === needle) score = 100;
            else if (haystack.includes(needle)) score = 80;
            else if (needle.includes(haystack) && haystack.length > 2) score = 55;
            if (score > bestScore) {
                bestScore = score;
                best = element;
            }
        }

        return bestScore >= 55 ? best : null;
    }

    function setNativeValue(element, value) {
        const tag = element.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') {
            element.focus();
            const prototype = tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
            if (descriptor && descriptor.set) {
                descriptor.set.call(element, value);
            } else {
                element.value = value;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (element.isContentEditable) {
            element.focus();
            element.textContent = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    function getScrollableTarget(element) {
        let current = element;
        while (current && current !== document.body && current !== document.documentElement) {
            const style = getComputedStyle(current);
            const canScrollY = /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight;
            const canScrollX = /(auto|scroll)/.test(style.overflowX) && current.scrollWidth > current.clientWidth;
            if (canScrollY || canScrollX) return current;
            current = current.parentElement;
        }
        return window;
    }

    function scrollTarget(element, rule) {
        const amount = Math.max(40, Number(rule.scrollAmount) || 520);
        const direction = rule.scrollDirection || 'down';
        const delta = {
            down: { top: amount, left: 0 },
            up: { top: -amount, left: 0 },
            right: { top: 0, left: amount },
            left: { top: 0, left: -amount }
        }[direction] || { top: amount, left: 0 };
        const scroller = getScrollableTarget(element);
        if (scroller === window) {
            window.scrollBy({ ...delta, behavior: 'smooth' });
        } else {
            scroller.scrollBy({ ...delta, behavior: 'smooth' });
        }
    }

    function activateCheckTarget(element, rule) {
        if ('checked' in element) {
            if (!element.checked) {
                element.checked = true;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }

        const aria = element.getAttribute('aria-checked');
        if (rule.checkKind === 'switch' || aria !== null) {
            if (aria !== 'true') element.click();
            return;
        }

        element.click();
    }

    async function captureTextTarget(element) {
        const value = textFor(element);
        if (!value) return false;
        try {
            await navigator.clipboard.writeText(value);
        } catch (e) {
            window.__acfhLastCapturedText = value;
        }
        return true;
    }

    function flashElement(element) {
        if (!element) return;
        const previousOutline = element.style.outline;
        const previousOffset = element.style.outlineOffset;
        element.style.outline = '3px solid #38bdf8';
        element.style.outlineOffset = '3px';
        setTimeout(() => {
            element.style.outline = previousOutline;
            element.style.outlineOffset = previousOffset;
        }, 1300);
    }

    function executeRule(rule, options = {}) {
        const target = findTarget(rule);
        if (!target) return false;

        if (options.preview) {
            flashElement(target);
            return true;
        }

        switch (rule.action) {
            case 'doubleClick':
                target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window }));
                break;
            case 'scroll':
                scrollTarget(target, rule);
                break;
            case 'fill':
                setNativeValue(target, rule.fillValue || '');
                break;
            case 'check':
                activateCheckTarget(target, rule);
                break;
            case 'captureText':
                captureTextTarget(target);
                break;
            case 'click':
            default:
                target.click();
                break;
        }

        flashElement(target);
        return true;
    }

    function repeatCount(rule) {
        return Number(rule.repeat) === -2 ? Infinity : Math.max(1, Number(rule.repeat) || 1);
    }

    function scheduleDefaultRule(rule, token) {
        let count = 0;
        const repeat = repeatCount(rule);
        const interval = Math.max(10, Number(rule.intervalMs) || 1000);
        const tick = () => {
            if (token !== runToken || count >= repeat) return;
            if (executeRule(rule)) {
                count++;
                setFloatStatus(`Action ${count}${repeat === Infinity ? '' : `/${repeat}`}`);
            }
            if (count >= repeat && repeat !== Infinity) {
                clearInterval(timer);
            }
        };
        const timer = setInterval(tick, interval);
        timers.push(timer);
        setTimeout(tick, 80);
    }

    function observeRule(rule, token) {
        let count = 0;
        const repeat = repeatCount(rule);
        const interval = Math.max(10, Number(rule.intervalMs) || 1000);
        let lastRun = 0;

        const tryRun = () => {
            if (token !== runToken || count >= repeat) return;
            const now = Date.now();
            if (now - lastRun < interval) return;
            if (executeRule(rule)) {
                lastRun = now;
                count++;
                setFloatStatus(`Watching ${count}${repeat === Infinity ? '' : `/${repeat}`}`);
                if (count >= repeat && repeat !== Infinity) {
                    observer.disconnect();
                }
            }
        };

        const observer = new MutationObserver(tryRun);
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true, attributes: true });
        observers.push(observer);
        tryRun();
    }

    function startRules(rules) {
        clearTimers();
        const runnable = rules.filter(rule => rule && !rule.disabled && urlMatchesTarget(ruleTargetUrl(rule)));
        if (!runnable.length) {
            setFloatStatus(txt('noActions'));
            return false;
        }

        const token = runToken;
        const initialDelayMs = Math.max(0, Number(settingsState.initWait) || 0) * 1000;
        const startTimer = setTimeout(() => {
            if (token !== runToken) return;
            runnable.forEach((rule) => {
                if (rule.actionMode === 'watcher' || rule.actionMode === 'mutationObserve') {
                    observeRule(rule, token);
                } else {
                    scheduleDefaultRule(rule, token);
                }
            });
        }, initialDelayMs);
        timers.push(startTimer);
        setFloatStatus(initialDelayMs ? `${txt('waiting')} ${Math.round(initialDelayMs / 1000)}s` : txt('ready'));
        return true;
    }

    function scheduleSequentialStep(delay = 0) {
        const token = playbackState.token;
        const timer = setTimeout(() => {
            if (token !== runToken || !playbackState.running) return;
            if (playbackState.paused) {
                scheduleSequentialStep(160);
                return;
            }

            const rule = playbackState.queue[playbackState.ruleIndex];
            if (!rule) {
                playbackState.running = false;
                playbackState.paused = false;
                updateFloatRunState();
                setFloatStatus(txt('ready'));
                return;
            }

            const repeat = repeatCount(rule);
            const current = playbackState.ruleIndex + 1;
            const total = playbackState.queue.length;
            const ok = executeRule(rule);
            if (ok) {
                playbackState.repeatIndex += 1;
                setFloatStatus(`${current}/${total} ${playbackState.repeatIndex}${repeat === Infinity ? '' : `/${repeat}`}`);
            } else {
                setFloatStatus(txt('noMatch'));
            }

            if (repeat !== Infinity && playbackState.repeatIndex >= repeat) {
                playbackState.ruleIndex += 1;
                playbackState.repeatIndex = 0;
                nextRuleIndex = playbackState.queue.length ? playbackState.ruleIndex % playbackState.queue.length : 0;
            }

            const nextRule = playbackState.queue[playbackState.ruleIndex] || rule;
            const interval = Math.max(10, Number(nextRule.intervalMs) || 1000);
            scheduleSequentialStep(interval);
        }, delay);
        timers.push(timer);
    }

    function startSequentialPlayback(ruleId = null) {
        clearTimers();
        const queue = runnableRules(ruleId);
        if (!queue.length) {
            setFloatStatus(txt('noActions'));
            return false;
        }
        playbackState.running = true;
        playbackState.paused = false;
        playbackState.queue = queue;
        playbackState.ruleIndex = ruleId ? 0 : Math.min(nextRuleIndex, queue.length - 1);
        playbackState.repeatIndex = 0;
        playbackState.token = runToken;
        updateFloatRunState();
        const initialDelayMs = Math.max(0, Number(settingsState.initWait) || 0) * 1000;
        setFloatStatus(initialDelayMs ? `${txt('waiting')} ${Math.round(initialDelayMs / 1000)}s` : `1/${queue.length}`);
        scheduleSequentialStep(initialDelayMs || 80);
        return true;
    }

    function toggleSequentialPlayback(ruleId = null) {
        if (!autoClickerEnabled) {
            setFloatStatus(txt('disabled'));
            return false;
        }
        if (!playbackState.running) {
            return startSequentialPlayback(ruleId);
        }
        playbackState.paused = !playbackState.paused;
        updateFloatRunState();
        setFloatStatus(playbackState.paused ? 'Pause' : 'Play');
        return true;
    }

    function playRules(ruleId = null) {
        if (!autoClickerEnabled) {
            setFloatStatus(txt('disabled'));
            return false;
        }

        return startSequentialPlayback(ruleId);
    }

    function refreshEnabledThen(callback) {
        if (!chrome || !chrome.storage || !chrome.storage.local) {
            callback();
            return;
        }
        chrome.storage.local.get(['autoClickerEnabled', 'activeAutomationMode', 'uiLanguage'], (data) => {
            if (chrome.runtime && chrome.runtime.lastError) {
                callback();
                return;
            }
            setOcrLanguage(data.uiLanguage || ocrLang);
            autoClickerEnabled = !!data.autoClickerEnabled;
            activeMode = data.activeAutomationMode || activeMode;
            if (!autoClickerEnabled) {
                setFloatStatus(txt('disabled'));
                updateFloatRunState();
                return;
            }
            callback();
        });
    }

    function runRulesOnce(ruleId = null) {
        const rules = runnableRules(ruleId);
        if (!rules.length) {
            setFloatStatus(txt('noTarget'));
            return false;
        }
        rules.forEach(rule => executeRule(rule));
        setFloatStatus(ruleId ? txt('actionSent') : txt('runSent'));
        return true;
    }

    function runNextRule() {
        const rules = runnableRules();
        if (!rules.length) {
            setFloatStatus(txt('noTarget'));
            return false;
        }
        if (playbackState.running) {
            if (!playbackState.queue.length) {
                return false;
            }
            playbackState.ruleIndex = (playbackState.ruleIndex + 1) % playbackState.queue.length;
            playbackState.repeatIndex = 0;
            nextRuleIndex = playbackState.ruleIndex;
            setFloatStatus(`${playbackState.ruleIndex + 1}/${playbackState.queue.length}`);
            return true;
        }
        const rule = rules[nextRuleIndex % rules.length];
        const currentIndex = nextRuleIndex % rules.length;
        nextRuleIndex = (currentIndex + 1) % rules.length;
        const ok = executeRule(rule);
        setFloatStatus(ok ? `${currentIndex + 1}/${rules.length}` : txt('noMatch'));
        return ok;
    }

    function previewRule(ruleId = null) {
        const rules = runnableRules(ruleId);
        if (!rules.length) {
            setFloatStatus(txt('noTarget'));
            return false;
        }
        const ok = executeRule(rules[0], { preview: true });
        setFloatStatus(ok ? txt('preview') : txt('noMatch'));
        return ok;
    }

    function stopOcr() {
        clearTimers();
        setFloatStatus(txt('stopped'));
    }

    function updateFloatRunState() {
        if (floatPlayButton) {
            floatPlayButton.classList.toggle('active', playbackState.running);
            floatPlayButton.setAttribute('aria-label', playbackState.running && !playbackState.paused ? 'Pause' : 'Play');
            floatPlayButton.title = playbackState.running && !playbackState.paused ? 'Pause' : 'Play';
            floatPlayButton.innerHTML = playbackState.running && !playbackState.paused
                ? '<svg viewBox="0 0 24 24"><path d="M8 5v14"></path><path d="M16 5v14"></path></svg>'
                : '<svg viewBox="0 0 24 24"><polygon points="8 5 19 12 8 19 8 5"></polygon></svg>';
        }
        if (floatStopButton) {
            floatStopButton.classList.toggle('active', playbackState.running);
        }
    }

    function makeIconButton(title, html, onClick, extraClass = '') {
        const button = document.createElement('button');
        button.type = 'button';
        button.title = title;
        button.setAttribute('aria-label', title);
        button.className = `acfh-ocr-float-btn ${extraClass}`.trim();
        button.innerHTML = html;
        button.addEventListener('click', onClick);
        return button;
    }

    function shouldShowFloatBox() {
        return allowFloatBoxForCurrentPage && activeMode === ACTIVE_MODE && urlMatchesTarget(settingsState.url);
    }

    function deleteCurrentRule() {
        const rules = runnableRules();
        const rule = rules.length
            ? rules[Math.max(0, nextRuleIndex - 1) % rules.length]
            : rulesState.find(item => item && !item.disabled);
        if (!rule || !rule.id) {
            setFloatStatus(txt('noAction'));
            return;
        }
        chrome.runtime.sendMessage({ action: 'deleteOcrRule', ruleId: rule.id }, (response) => {
            if (chrome.runtime.lastError || !response || !response.success) {
                setFloatStatus(txt('deleteFailed'));
                return;
            }
            rulesState = rulesState.filter(item => item && item.id !== rule.id);
            nextRuleIndex = 0;
            setFloatStatus(txt('deleted'));
        });
    }

    function ensureFloatStyle() {
        if (document.getElementById('acfh-ocr-float-style')) return;
        const style = document.createElement('style');
        style.id = 'acfh-ocr-float-style';
        style.textContent = `
            @keyframes acfhOcrFloatIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
            .acfh-ocr-floatbox {
                position: fixed;
                right: 0;
                bottom: 0;
                z-index: 2147483646;
                display: flex;
                align-items: stretch;
                gap: 2px;
                padding: 4px;
                border-radius: 8px 0 0 0;
                background: #2a2a2a;
                box-shadow: 0 4px 10px rgba(0,0,0,.4);
                font-family: "Segoe UI", Arial, sans-serif;
                animation: acfhOcrFloatIn .28s ease-out;
            }
            .acfh-ocr-float-status,
            .acfh-ocr-float-btn {
                min-height: 34px;
                border: 0;
                border-radius: 6px;
                background: #444;
                color: #fff;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }
            .acfh-ocr-float-status {
                min-width: 82px;
                padding: 0 10px;
                font-size: 12px;
                white-space: nowrap;
                background: #555;
            }
            .acfh-ocr-float-btn {
                width: 34px;
                cursor: pointer;
            }
            .acfh-ocr-float-btn:hover { background: #1d4ed8; }
            .acfh-ocr-float-btn.capture { background: #0f766e; }
            .acfh-ocr-float-btn.play.active { background: #991b1b; }
            .acfh-ocr-float-btn.stop.active { background: #991b1b; }
            .acfh-ocr-float-btn.danger { background: #991b1b; }
            .acfh-ocr-capture-wrap { position: relative; display: inline-flex; align-items: stretch; gap: 2px; }
            .acfh-ocr-float-btn.capture-mode {
                width: 22px;
                min-width: 22px;
                font-size: 18px;
                font-weight: 800;
                line-height: 1;
                background: #0f766e;
                border-radius: 6px;
                padding: 0;
            }
            .acfh-ocr-capture-menu {
                position: absolute;
                left: 0;
                bottom: calc(100% + 8px);
                min-width: 170px;
                padding: 6px;
                border: 1px solid rgba(148,163,184,.32);
                border-radius: 8px;
                background: #111827;
                box-shadow: 0 18px 45px rgba(0,0,0,.42);
                display: none;
                z-index: 2147483647;
            }
            .acfh-ocr-capture-wrap.open .acfh-ocr-capture-menu { display: grid; gap: 3px; }
            .acfh-ocr-capture-option {
                border: 0;
                border-radius: 6px;
                background: transparent;
                color: #e5e7eb;
                min-height: 30px;
                padding: 0 9px;
                text-align: left;
                cursor: pointer;
            }
            .acfh-ocr-capture-option:hover,
            .acfh-ocr-capture-option.active {
                background: #1d4ed8;
                color: #fff;
            }
            .acfh-ocr-float-btn svg {
                width: 17px;
                height: 17px;
                stroke: currentColor;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;
                fill: none;
            }
            .acfh-ocr-float-btn polygon { fill: currentColor; stroke: none; }
        `;
        document.head.appendChild(style);
    }

    function createFloatBox() {
        if (floatBox || !shouldShowFloatBox()) return;
        ensureFloatStyle();
        floatBox = document.createElement('div');
        floatBox.className = 'acfh-ocr-floatbox';

        floatStatus = document.createElement('div');
        floatStatus.className = 'acfh-ocr-float-status';
        floatStatus.textContent = 'OCR';

        const icons = {
            capture: '<svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>',
            play: '<svg viewBox="0 0 24 24"><polygon points="8 5 19 12 8 19 8 5"></polygon></svg>',
            next: '<svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"></polygon><path d="M19 5v14"></path></svg>',
            eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
            stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1"></rect></svg>',
            trash: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>'
        };

        const captureModes = [
            ['click', 'click'],
            ['doubleClick', 'doubleClick'],
            ['scroll', 'scroll'],
            ['fill', 'fill'],
            ['check', 'check'],
            ['captureText', 'captureText']
        ];

        const captureWrap = document.createElement('div');
        captureWrap.className = 'acfh-ocr-capture-wrap';

        const captureModeButton = makeIconButton(txt('captureMode'), '&lt;', (event) => {
            event.preventDefault();
            event.stopPropagation();
            captureWrap.classList.toggle('open');
        }, 'capture-mode');

        const captureMenu = document.createElement('div');
        captureMenu.className = 'acfh-ocr-capture-menu';
        const renderCaptureMenu = () => {
            captureMenu.innerHTML = '';
            captureModes.forEach(([value, labelKey]) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = `acfh-ocr-capture-option${selectedCaptureAction === value ? ' active' : ''}`;
                item.textContent = txt(labelKey);
                item.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    selectedCaptureAction = value;
                    captureWrap.classList.remove('open');
                    setFloatStatus(txt(labelKey));
                    renderCaptureMenu();
                });
                captureMenu.appendChild(item);
            });
        };
        renderCaptureMenu();

        const captureButton = makeIconButton('Capture', icons.capture, (event) => {
            event.preventDefault();
            event.stopPropagation();
            captureWrap.classList.remove('open');
            const defaults = firstRuleDefaults(selectedCaptureAction);
            if (selectedCaptureAction === 'captureText') {
                defaults.textOnly = true;
                defaults.noCreateAction = true;
            }
            chrome.runtime.sendMessage({ action: 'startOcrCapture', targetUrl: settingsState.url, defaults }, (response) => {
                if (chrome.runtime.lastError || !response || !response.success) {
                    setFloatStatus((response && response.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || txt('noTarget'));
                    return;
                }
                setFloatStatus(txt(selectedCaptureAction === 'captureText' ? 'captureText' : 'ready'));
            });
        }, 'capture');
        captureWrap.append(captureModeButton, captureButton, captureMenu);
        document.addEventListener('click', (event) => {
            if (!captureWrap.contains(event.target)) captureWrap.classList.remove('open');
        });

        floatPlayButton = makeIconButton('Play', icons.play, () => refreshEnabledThen(() => toggleSequentialPlayback()), 'play');
        const nextButton = makeIconButton('Next', icons.next, () => refreshEnabledThen(() => runNextRule()));
        const previewButton = makeIconButton('Preview', icons.eye, () => refreshEnabledThen(() => previewRule()));
        floatStopButton = makeIconButton('Stop', icons.stop, () => stopOcr(), 'stop');
        const deleteButton = makeIconButton('Delete action', icons.trash, () => deleteCurrentRule(), 'danger');

        floatBox.append(floatStatus, captureWrap, floatPlayButton, nextButton, previewButton, floatStopButton, deleteButton);
        document.body.appendChild(floatBox);
        updateFloatRunState();
    }

    function removeFloatBox() {
        if (floatBox) {
            floatBox.remove();
            floatBox = null;
            floatStatus = null;
            floatPlayButton = null;
            floatStopButton = null;
        }
    }

    function setFloatStatus(text) {
        createFloatBox();
        if (floatStatus) floatStatus.textContent = text || 'OCR';
    }

    function firstRuleDefaults(action = 'click') {
        return {
            action,
            actionMode: 'default',
            scrollDirection: 'down',
            scrollAmount: 520,
            checkKind: 'checkbox',
            fillValue: '',
            intervalMs: 1000,
            repeat: 1,
            targetUrl: settingsState.url,
            initWait: settingsState.initWait || '0'
        };
    }

    function applyState(data, options = {}) {
        settingsState = normalizeOcrSettings(data[OCR_SETTINGS_KEY] || data.ocrSettings || {});
        rulesState = Array.isArray(data.ocrRules) ? data.ocrRules : [];
        feedbackMode = data.feedbackMode || 'none';
        ocrInjectionTiming = data[OCR_INJECTION_TIMING_KEY] === 'live' ? 'live' : 'reload';
        activeMode = data.activeAutomationMode || '';
        autoClickerEnabled = !!data.autoClickerEnabled;

        if (activeMode !== ACTIVE_MODE || !urlMatchesTarget(settingsState.url)) {
            clearTimers();
            removeFloatBox();
            allowFloatBoxForCurrentPage = false;
            nextRuleIndex = 0;
            return;
        }

        if (options.initial || ocrInjectionTiming === 'live' || floatBox) {
            allowFloatBoxForCurrentPage = true;
        }

        if (!allowFloatBoxForCurrentPage) {
            clearTimers();
            removeFloatBox();
            return;
        }

        createFloatBox();
        clearTimers();
        setFloatStatus(autoClickerEnabled ? txt('ready') : txt('disabled'));
    }

    function loadAndRun() {
        chrome.storage.local.get(['autoClickerEnabled', 'activeAutomationMode', 'ocrRules', OCR_SETTINGS_KEY, OCR_INJECTION_TIMING_KEY, 'feedbackMode', 'uiLanguage'], (data) => {
            setOcrLanguage(data.uiLanguage || 'en');
            applyState(data, { initial: true });
        });
    }

    function isOcrActiveForPage() {
        return allowFloatBoxForCurrentPage && activeMode === ACTIVE_MODE && urlMatchesTarget(settingsState.url);
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message) return;

        if (message.action === 'runOcrNowInTab') {
            if (!isOcrActiveForPage()) {
                sendResponse({ success: false, error: 'OCR session is not active on this page.' });
                return;
            }
            sendResponse({ success: playRules(message.ruleId || null) });
            return;
        }
        if (message.action === 'runOcrRuleNowInTab') {
            if (!isOcrActiveForPage()) {
                sendResponse({ success: false, error: 'OCR session is not active on this page.' });
                return;
            }
            sendResponse({ success: playRules(message.ruleId || null) });
            return;
        }
        if (message.action === 'runOcrNextInTab') {
            if (!isOcrActiveForPage()) {
                sendResponse({ success: false, error: 'OCR session is not active on this page.' });
                return;
            }
            sendResponse({ success: runNextRule() });
            return;
        }
        if (message.action === 'previewOcrTargetInTab') {
            if (!isOcrActiveForPage()) {
                sendResponse({ success: false, error: 'OCR session is not active on this page.' });
                return;
            }
            sendResponse({ success: previewRule(message.ruleId || null) });
            return;
        }
        if (message.action === 'stopOcrNowInTab') {
            stopOcr();
            sendResponse({ success: true });
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if ('uiLanguage' in changes) {
            setOcrLanguage(changes.uiLanguage.newValue || 'en');
        }
        if ('ocrRules' in changes || OCR_SETTINGS_KEY in changes || OCR_INJECTION_TIMING_KEY in changes || 'autoClickerEnabled' in changes || 'activeAutomationMode' in changes || 'feedbackMode' in changes || 'uiLanguage' in changes) {
            chrome.storage.local.get(['autoClickerEnabled', 'activeAutomationMode', 'ocrRules', OCR_SETTINGS_KEY, OCR_INJECTION_TIMING_KEY, 'feedbackMode', 'uiLanguage'], (data) => {
                setOcrLanguage(data.uiLanguage || 'en');
                applyState(data, { initial: false });
            });
        }
    });

    loadAndRun();
})();
