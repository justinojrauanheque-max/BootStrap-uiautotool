const translationsEn = {
    contextMenuTitle: "Load Element - Auto Clicker - Form Helper",
    contextMenuXPath: "Load via XPath",
    contextMenuCSS: "Load via CSS selector",
    scriptInjectedLog: "âœ… Script injected in:",
    reloadMessage: "ðŸ”„ Page will be reloaded for reinjection.",
    automationStopped: "ðŸ›‘ Automation stopped."
};
const translationsByLang = {
    en: translationsEn,
    pt: {
        contextMenuTitle: "Carregar elemento - Auto Clicker - Form Helper",
        contextMenuXPath: "Carregar via XPath",
        contextMenuCSS: "Carregar via seletor CSS",
        scriptInjectedLog: "Script injetado em:",
        reloadMessage: "A pagina sera recarregada para reinjecao.",
        automationStopped: "Automacao parada."
    },
    es: {
        contextMenuTitle: "Cargar elemento - Auto Clicker - Form Helper",
        contextMenuXPath: "Cargar via XPath",
        contextMenuCSS: "Cargar via selector CSS",
        scriptInjectedLog: "Script inyectado en:",
        reloadMessage: "La pagina se recargara para reinyectar.",
        automationStopped: "Automatizacion detenida."
    },
    fr: {
        contextMenuTitle: "Charger l element - Auto Clicker - Form Helper",
        contextMenuXPath: "Charger via XPath",
        contextMenuCSS: "Charger via selecteur CSS",
        scriptInjectedLog: "Script injecte dans :",
        reloadMessage: "La page sera rechargee pour reinjection.",
        automationStopped: "Automatisation arretee."
    }
};

let currentUiLanguageBg = 'en';
let translations = translationsEn;

// Define context menu IDs
const CONTEXT_MENU_ID = "loadElement";
const CONTEXT_MENU_XPATH_ID = "loadXPath";
const CONTEXT_MENU_CSS_ID = "loadCSS";
const ACTIVE_AUTOMATION_MODE_CLICK_FILL = 'click-fill';
const ACTIVE_AUTOMATION_MODE_USERSCRIPT = 'userscript';
const ACTIVE_AUTOMATION_MODE_OCR = 'ocr';
const INDEPENDENT_USERSCRIPT_KEY = 'independentUserScript';
const ACTIVE_USER_SCRIPT_ID_KEY = 'activeUserScriptId';
const OCR_SETTINGS_KEY = 'ocrSettings';
const USER_SCRIPT_INJECTION_TIMING_KEY = 'userScriptInjectionTiming';
const SELECTOR_CAPTURE_SCRIPT = 'scripts/selectorCapture.js';
const USERSCRIPT_DEFAULT_ID = 'acfh-independent-userscript';
const NATIVE_USERSCRIPT_PREFIX = 'acfh_native_userscript_';
const USERSCRIPT_DEDUPE_TTL_MS = 10 * 60 * 1000;
const USERSCRIPT_DEACTIVATE_EVENT = '__ACFH_USERSCRIPT_DEACTIVATE__';

// VariÃ¡veis globais (nÃ£o representam automaÃ§Ã£o ativa, apenas utilitÃ¡rios)
let lastXPath = "";
let lastCSSSelector = "";
let currentContextMenuPatterns = []; // PadrÃµes de URL usados para limitar o menu de contexto Ã s URLs configuradas.
const injectedUserScriptDocuments = new Map();
const pendingOcrCaptureDefaultsByTab = new Map();

function ocrPendingKey(tabId, frameId = 0) {
    return `${tabId}:${Number.isInteger(frameId) ? frameId : 0}`;
}

function normalizeActiveAutomationMode(mode) {
    if (mode === ACTIVE_AUTOMATION_MODE_USERSCRIPT) return ACTIVE_AUTOMATION_MODE_USERSCRIPT;
    if (mode === ACTIVE_AUTOMATION_MODE_OCR) return ACTIVE_AUTOMATION_MODE_OCR;
    return ACTIVE_AUTOMATION_MODE_CLICK_FILL;
}

function shouldInjectUserScriptLive(data = {}) {
    return data[USER_SCRIPT_INJECTION_TIMING_KEY] === 'live';
}

function respondToRuntime(sendResponse, payload) {
    if (typeof sendResponse === 'function') {
        sendResponse(payload);
    }
}

function setBackgroundTranslations(lang) {
    const short = String(lang || '').toLowerCase().split('-')[0];
    currentUiLanguageBg = translationsByLang[short] ? short : 'en';
    translations = translationsByLang[currentUiLanguageBg] || translationsEn;
}
// Normaliza a URL configurada removendo curingas e barras finais extras
function normalizeConfigUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let cleaned = url.trim();
    cleaned = cleaned.replace(/\*+$/g, '');
    cleaned = cleaned.replace(/\/+$/g, '');
    return cleaned;
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

function urlMatchesOcrTarget(tabUrl, targetUrl) {
    const target = normalizeOcrTargetUrl(targetUrl);
    if (!tabUrl || !target || target === '*://*/*' || target === '<all_urls>') return false;
    try {
        const candidate = new URL(tabUrl);
        const targetWithScheme = /^[a-z][a-z\d+\-.]*:\/\//i.test(target) ? target : `https://${target}`;
        const targetParsed = new URL(targetWithScheme);
        const candidateHost = candidate.hostname.replace(/^www\./, '');
        const targetHost = targetParsed.hostname.replace(/^www\./, '');
        if (candidateHost !== targetHost && !candidateHost.endsWith(`.${targetHost}`)) {
            return false;
        }
        const targetPath = targetParsed.pathname && targetParsed.pathname !== '/' ? targetParsed.pathname.replace(/\/+$/g, '') : '';
        if (!targetPath) return true;
        return candidate.pathname.replace(/\/+$/g, '').startsWith(targetPath);
    } catch (e) {
        return tabUrl.toLowerCase().includes(target.toLowerCase());
    }
}

function getOcrTargetUrlFromState(data = {}, explicitTargetUrl = '') {
    const settings = normalizeOcrSettings(data[OCR_SETTINGS_KEY] || {});
    if (explicitTargetUrl) return explicitTargetUrl;
    if (settings.url) return settings.url;
    const rules = Array.isArray(data.ocrRules) ? data.ocrRules : [];
    const firstRule = rules.find(rule => rule && !rule.disabled && rule.url);
    return firstRule ? firstRule.url : '';
}

chrome.storage.local.get(['uiLanguage', 'acfhPreferredLanguage'], (data) => {
    setBackgroundTranslations(data.uiLanguage || data.acfhPreferredLanguage || 'en');
    updateContextMenuPatternsFromConfigs();
});

// Atualizar idioma e padrÃµes do menu quando opÃ§Ãµes mudarem
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') {
        return;
    }

    if ('uiLanguage' in changes || 'acfhPreferredLanguage' in changes) {
        const next = (changes.uiLanguage && changes.uiLanguage.newValue) ||
            (changes.acfhPreferredLanguage && changes.acfhPreferredLanguage.newValue) ||
            'en';
        setBackgroundTranslations(next);
        updateContextMenuPatternsFromConfigs();
    }

    // Sempre que o estado ON/OFF mudar, o menu de contexto Ã© recalculado.
    // Mantemos o menu disponÃ­vel em qualquer site quando a extensÃ£o estÃ¡
    // ligada, para permitir criar/editar configuraÃ§Ãµes em qualquer URL.
    if ('autoClickerEnabled' in changes || 'activeAutomationMode' in changes) {
        updateContextMenuPatternsFromConfigs();
        primeSelectorCaptureForOpenTabs();
        chrome.storage.local.get([INDEPENDENT_USERSCRIPT_KEY, ACTIVE_USER_SCRIPT_ID_KEY, 'activeAutomationMode'], (data) => {
            if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
                deactivateInjectedUserScriptsInOpenTabs(() => {
                    unregisterNativeIndependentUserScripts();
                });
                return;
            }

            syncNativeIndependentUserScriptRegistration(data[INDEPENDENT_USERSCRIPT_KEY], {
                scriptId: data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
            });
        });
    }

    if ('independentUserScript' in changes || 'activeUserScriptId' in changes || USER_SCRIPT_INJECTION_TIMING_KEY in changes) {
        const nextScript = changes.independentUserScript && changes.independentUserScript.newValue;
        if (nextScript) {
            chrome.storage.local.get([ACTIVE_USER_SCRIPT_ID_KEY, 'activeAutomationMode', USER_SCRIPT_INJECTION_TIMING_KEY], (data) => {
                if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
                    deactivateInjectedUserScriptsInOpenTabs(() => {
                        unregisterNativeIndependentUserScripts();
                    });
                    return;
                }

                const nextScriptId = (changes.activeUserScriptId && changes.activeUserScriptId.newValue) ||
                    data[ACTIVE_USER_SCRIPT_ID_KEY] ||
                    USERSCRIPT_DEFAULT_ID;
                syncNativeIndependentUserScriptRegistration(nextScript, {
                    scriptId: nextScriptId
                });
                if (shouldInjectUserScriptLive(data)) {
                    injectActiveUserScriptIntoOpenTabs(nextScript, { force: true, scriptId: nextScriptId });
                } else {
                    deactivateInjectedUserScriptsInOpenTabs();
                }
            });
        } else if (changes.independentUserScript) {
            deactivateInjectedUserScriptsInOpenTabs(() => {
                unregisterNativeIndependentUserScripts();
            });
        } else {
            chrome.storage.local.get([INDEPENDENT_USERSCRIPT_KEY, ACTIVE_USER_SCRIPT_ID_KEY, 'activeAutomationMode', USER_SCRIPT_INJECTION_TIMING_KEY], (data) => {
                if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
                    deactivateInjectedUserScriptsInOpenTabs(() => {
                        unregisterNativeIndependentUserScripts();
                    });
                    return;
                }

                syncNativeIndependentUserScriptRegistration(data[INDEPENDENT_USERSCRIPT_KEY], {
                    scriptId: data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
                });
                if (shouldInjectUserScriptLive(data)) {
                    injectActiveUserScriptIntoOpenTabs(data[INDEPENDENT_USERSCRIPT_KEY], {
                        force: true,
                        scriptId: data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
                    });
                } else {
                    deactivateInjectedUserScriptsInOpenTabs();
                }
            });
        }
    }
});

function isInjectablePageUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function injectSelectorCaptureIntoTab(tabId, url) {
    if (!tabId || !isInjectablePageUrl(url)) {
        return;
    }

    chrome.scripting.executeScript(
        {
            target: { tabId, allFrames: true },
            files: [SELECTOR_CAPTURE_SCRIPT],
        },
        () => {
            if (chrome.runtime.lastError) {
                const msg = chrome.runtime.lastError.message || '';
                if (!msg.includes('Cannot access') && !msg.includes('No tab with id')) {
                    console.warn('Selector capture injection skipped:', msg);
                }
            }
        }
    );
}

function primeSelectorCaptureForOpenTabs() {
    chrome.storage.local.get(['autoClickerEnabled', 'activeAutomationMode', 'blacklist'], (data) => {
        if (chrome.runtime.lastError) {
            console.warn('Erro ao preparar captura de seletores:', chrome.runtime.lastError.message);
            return;
        }

        const mode = normalizeActiveAutomationMode(data.activeAutomationMode);

        if (!data.autoClickerEnabled || mode !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
            return;
        }

        const blacklist = Array.isArray(data.blacklist) ? data.blacklist : [];
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (!tab.id || !isInjectablePageUrl(tab.url)) {
                    return;
                }
                let domain = '';
                try {
                    domain = new URL(tab.url).hostname;
                } catch (e) {
                    return;
                }
                if (blacklist.some(blocked => domain === blocked || domain.endsWith('.' + blocked))) {
                    return;
                }
                injectSelectorCaptureIntoTab(tab.id, tab.url);
            });
        });
    });
}

// FunÃ§Ã£o para criar ou atualizar o menu de contexto
function createOrUpdateContextMenu(visible) {
    chrome.contextMenus.removeAll(() => {
        if (visible) {
            chrome.contextMenus.create({
                id: CONTEXT_MENU_ID,
                title: translations.contextMenuTitle,
                contexts: ["all"],
                type: "normal",
                documentUrlPatterns: currentContextMenuPatterns.length ? currentContextMenuPatterns : ["<all_urls>"]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.warn("Error creating main context menu:", chrome.runtime.lastError.message);
                }
            });
            chrome.contextMenus.create({
                id: CONTEXT_MENU_XPATH_ID,
                title: translations.contextMenuXPath,
                parentId: CONTEXT_MENU_ID,
                contexts: ["all"]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.warn("Error creating XPath submenu:", chrome.runtime.lastError.message);
                }
            });
            chrome.contextMenus.create({
                id: CONTEXT_MENU_CSS_ID,
                title: translations.contextMenuCSS,
                parentId: CONTEXT_MENU_ID,
                contexts: ["all"]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.warn("Error creating CSS submenu:", chrome.runtime.lastError.message);
                }
            });
            console.log("Context menu created.");
        } else {
            console.log("Context menu removed.");
        }
    });
}

// Recalcula os padrÃµes de URL do menu de contexto a partir das
// configuraÃ§Ãµes salvas (blueprints).
function updateContextMenuPatternsFromConfigs() {
    chrome.storage.local.get(['autoClickerEnabled', 'activeAutomationMode'], (data) => {
        if (chrome.runtime.lastError) {
            console.warn('Erro ao ler storage para atualizar menu de contexto:', chrome.runtime.lastError.message);
            return;
        }

        const isEnabled = !!data.autoClickerEnabled;
        const mode = normalizeActiveAutomationMode(data.activeAutomationMode);
        if (!isEnabled || mode !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
            currentContextMenuPatterns = [];
            createOrUpdateContextMenu(false);
            return;
        }

        // Com a extensÃ£o ligada, permitimos o botÃ£o "Carregar XPath/CSS"
        // em qualquer site. A lÃ³gica do onClicked Ã© que decide em qual
        // configuraÃ§Ã£o (existente ou nova) o seletor serÃ¡ salvo.
        currentContextMenuPatterns = ["<all_urls>"];
        createOrUpdateContextMenu(true);
    });
}

chrome.runtime.onInstalled.addListener(() => {
    updateContextMenuPatternsFromConfigs();
    primeSelectorCaptureForOpenTabs();
});

chrome.runtime.onStartup.addListener(() => {
    updateContextMenuPatternsFromConfigs();
    primeSelectorCaptureForOpenTabs();
});

updateContextMenuPatternsFromConfigs();
primeSelectorCaptureForOpenTabs();

// FunÃ§Ã£o para validar e formatar URL
function validateAndFormatUrl(url) {
    if (!url || url.trim() === '') {
        return '*://*/*';
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.match(/^https?:\/\//)) {
        formattedUrl = 'https://' + formattedUrl;
    }

    if (!formattedUrl.endsWith('/*')) {
        formattedUrl = formattedUrl.replace(/\/*$/, '/*');
    }

    try {
        const testUrl = formattedUrl.replace('/*', '');
        new URL(testUrl);
        const validPatternRegex = /^(https?:\/\/[^\/]+\/.*|\*:\/\/\*\/\*)$/;
        if (!validPatternRegex.test(formattedUrl)) {
            return '*://*/*';
        }
        return formattedUrl;
    } catch (e) {
        return '*://*/*';
    }
}

// ConstrÃ³i um "snapshot" de configuraÃ§Ã£o a partir de uma Ãºnica
// configuraÃ§Ã£o salva. Este objeto Ã© consumido por scripts/content.js
// e Ã© sempre independente por aba.
function buildAutoClickConfigFromConfig(config) {
    if (!config) return null;

    const activeActions = (config.actions || []).filter(action => !action.disabled && action.elementFinder);
    if (activeActions.length === 0) {
        return null;
    }

    return {
        iframe: config.url,
        waitInit: config.initWait,
        actionType: activeActions.some(action => action.fillMethod === 'type') ? 'typeOption' : 'copyOption',
        xpaths: activeActions.map(action => ({
            value: action.elementFinder,
            checked: true,
            interval: action.actionMode === 'mutationObserve' ? null : action.intervalMs,
            repetitions: action.actionMode === 'mutationObserve' ? null : action.repeat,
            fillValue: action.fillValue,
            waitInitModal: action.actionInitWait,
            isCSSSelector: action.isCSSSelector || false,
            actionMode: action.actionMode || 'default'
        }))
    };
}

// Verifica se a URL da aba casa com a URL de uma configuraÃ§Ã£o.
function urlMatchesConfig(tabUrl, configUrl) {
    if (!tabUrl || !configUrl) return false;
    const cleaned = normalizeConfigUrl(configUrl);
    if (!cleaned) return false;
    return tabUrl.includes(cleaned);
}

// Encontra a primeira configuraÃ§Ã£o compatÃ­vel com a URL da aba.
function findMatchingConfigurationForUrl(tabUrl, configurations, options = {}) {
    if (!tabUrl || !Array.isArray(configurations)) return null;
    const requireActions = options.requireActions !== false;

    for (const cfg of configurations) {
        if (!cfg || !cfg.url) continue;
        const activeActions = (cfg.actions || []).filter(action => !action.disabled && action.elementFinder);
        if (requireActions && activeActions.length === 0) continue;
        if (urlMatchesConfig(tabUrl, cfg.url)) {
            return cfg;
        }
    }
    return null;
}

function extractUserScriptMatches(scriptContent) {
    if (!scriptContent || typeof scriptContent !== 'string') return [];
    return extractUserScriptHeaderValues(scriptContent, 'match');
}

function extractUserScriptHeaderValues(scriptContent, directive) {
    if (!scriptContent || typeof scriptContent !== 'string') return [];
    const escapedDirective = String(directive).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return Array.from(scriptContent.matchAll(new RegExp(`^\\s*//\\s*@${escapedDirective}\\s+(.+)$`, 'gmi')))
        .map(match => match[1].trim())
        .filter(Boolean);
}

function extractUserScriptMeta(scriptContent) {
    const matches = [
        ...extractUserScriptHeaderValues(scriptContent, 'match'),
        ...extractUserScriptHeaderValues(scriptContent, 'include')
    ];
    const excludes = [
        ...extractUserScriptHeaderValues(scriptContent, 'exclude'),
        ...extractUserScriptHeaderValues(scriptContent, 'exclude-match')
    ];
    const runAt = (extractUserScriptHeaderValues(scriptContent, 'run-at')[0] || 'document-idle').toLowerCase();
    return {
        matches: matches.length ? matches : ['*://*/*'],
        excludes,
        runAt: ['document-start', 'document-end', 'document-idle'].includes(runAt) ? runAt : 'document-idle',
        noFrames: /^\s*\/\/\s*@noframes\b/mi.test(scriptContent || '')
    };
}

function userScriptPatternToRegExp(pattern) {
    const normalized = String(pattern || '').trim() === '<all_urls>' ? '*://*/*' : String(pattern || '').trim();
    const escaped = normalized
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i');
}

function userScriptPatternMatchesUrl(pattern, url) {
    try {
        const raw = String(pattern || '').trim();
        const regexMatch = raw.match(/^\/(.+)\/([gimsuy]*)$/);
        if (regexMatch) {
            return new RegExp(regexMatch[1], regexMatch[2]).test(url);
        }
        return userScriptPatternToRegExp(pattern).test(url);
    } catch (e) {
        console.warn('Invalid UserScript URL pattern ignored:', pattern, e.message);
        return false;
    }
}

function urlMatchesUserScript(url, scriptContent, frameId = 0) {
    const meta = extractUserScriptMeta(scriptContent);
    if (meta.noFrames && frameId !== 0) return false;
    if (meta.excludes.some(pattern => userScriptPatternMatchesUrl(pattern, url))) return false;
    return meta.matches.some((pattern) => userScriptPatternMatchesUrl(pattern, url));
}

function isChromeUserScriptMatchPattern(pattern) {
    const raw = String(pattern || '').trim();
    if (raw === '<all_urls>') return true;
    return /^(?:\*|http|https):\/\/(?:\*|\*\.[^/*]+|[^/*]+)\/.*$/i.test(raw);
}

function getChromeUserScriptPatterns(patterns, fallback = ['*://*/*']) {
    const validPatterns = (Array.isArray(patterns) ? patterns : [])
        .map(pattern => String(pattern || '').trim())
        .filter(isChromeUserScriptMatchPattern);
    return validPatterns.length ? validPatterns : fallback;
}

function hashUserScriptContent(scriptContent) {
    const text = String(scriptContent || '');
    let hash = 5381;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
}

function getUserScriptPageKey(scriptId, scriptContent) {
    const safeId = String(scriptId || USERSCRIPT_DEFAULT_ID).replace(/[^a-z0-9_-]/gi, '_');
    return `${safeId}:${hashUserScriptContent(scriptContent)}`;
}

function getNativeUserScriptId(scriptId) {
    return `${NATIVE_USERSCRIPT_PREFIX}${String(scriptId || USERSCRIPT_DEFAULT_ID).replace(/[^a-z0-9_-]/gi, '_')}`;
}

function userScriptRunAtToChrome(runAt) {
    if (runAt === 'document-start') return 'document_start';
    if (runAt === 'document-end') return 'document_end';
    return 'document_idle';
}

function buildRegisteredUserScriptCode(scriptContent, scriptId) {
    const meta = extractUserScriptMeta(scriptContent);
    const pageKey = getUserScriptPageKey(scriptId, scriptContent);
    const safeSourceName = String(scriptId || USERSCRIPT_DEFAULT_ID).replace(/[^a-z0-9_.-]/gi, '_');
    const sourceName = `${safeSourceName}.user.js`;

    return `
(function () {
    'use strict';
    const payload = ${JSON.stringify(JSON.stringify({
            code: scriptContent,
            injectionKey: pageKey,
            runAt: meta.runAt,
            sourceName,
            meta
        }))};
    let fired = false;
    const fire = () => {
        if (fired) return;
        fired = true;
        window.dispatchEvent(new CustomEvent('__ACFH_USERSCRIPT_INJECT__', { detail: payload }));
    };
    if (window.__ACFH_USERSCRIPT_MAIN_WORLD_READY__) {
        fire();
    } else {
        window.addEventListener('__ACFH_USERSCRIPT_READY__', fire, { once: true });
        setTimeout(fire, 0);
    }
})();
//# sourceURL=${sourceName}`;

    return `
if ((function () {
    'use strict';
    const injectionKey = ${JSON.stringify(pageKey)};
    const registryName = '__ACFH_USERSCRIPT_INJECTIONS__';
    window[registryName] = window[registryName] || Object.create(null);
    if (window[registryName][injectionKey]) {
        return false;
    }
    window[registryName][injectionKey] = Date.now();

    if (!window.__ACFH_USERSCRIPT_SCRIPT_TAG_BRIDGE__) {
        window.__ACFH_USERSCRIPT_SCRIPT_TAG_BRIDGE__ = true;
        const originalCreateElement = Document.prototype.createElement;
        const originalAppendChild = Node.prototype.appendChild;
        const originalInsertBefore = Node.prototype.insertBefore;
        const originalReplaceChild = Node.prototype.replaceChild;

        const markScriptElement = (element) => {
            try {
                const token = window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
                if (token && element && String(element.tagName || '').toLowerCase() === 'script') {
                    Object.defineProperty(element, '__acfhUserScriptToken', {
                        value: token,
                        configurable: true
                    });
                }
            } catch (e) {}
            return element;
        };

        const runInlineScriptFallback = (node) => {
            try {
                if (!node || node.__acfhUserScriptInlineExecuted || !node.__acfhUserScriptToken) return;
                if (String(node.tagName || '').toLowerCase() !== 'script' || node.src) return;
                const code = node.text || node.textContent || '';
                if (!code) return;
                node.__acfhUserScriptInlineExecuted = true;
                (0, eval)(code + '\\n//# sourceURL=acfh-inline-' + node.__acfhUserScriptToken + '.js');
            } catch (error) {
                console.error('[ACFH UserScript] inline script fallback failed:', error);
            }
        };

        Document.prototype.createElement = function (tagName, options) {
            return markScriptElement(originalCreateElement.call(this, tagName, options));
        };

        Node.prototype.appendChild = function (child) {
            const result = originalAppendChild.call(this, child);
            runInlineScriptFallback(child);
            return result;
        };

        Node.prototype.insertBefore = function (child, referenceNode) {
            const result = originalInsertBefore.call(this, child, referenceNode);
            runInlineScriptFallback(child);
            return result;
        };

        Node.prototype.replaceChild = function (newChild, oldChild) {
            const result = originalReplaceChild.call(this, newChild, oldChild);
            runInlineScriptFallback(newChild);
            return result;
        };
    }

    window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__ = injectionKey;
    queueMicrotask(() => {
        if (window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__ === injectionKey) {
            delete window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
        }
    });
    return true;
})()) {
    const unsafeWindow = window;
    const GM_info = {
        scriptHandler: 'Auto Clicker - Form Helper',
        version: '1.0.5',
        script: ${JSON.stringify(meta)}
    };
    const GM_addStyle = (cssText) => {
        const style = document.createElement('style');
        style.textContent = String(cssText || '');
        (document.head || document.documentElement || document).appendChild(style);
        return style;
    };
    const GM_getValue = (name, defaultValue = undefined) => {
        try {
            const raw = localStorage.getItem('__ACFH_GM_${pageKey}_' + name);
            return raw === null ? defaultValue : JSON.parse(raw);
        } catch (e) {
            return defaultValue;
        }
    };
    const GM_setValue = (name, value) => localStorage.setItem('__ACFH_GM_${pageKey}_' + name, JSON.stringify(value));
    const GM_deleteValue = (name) => localStorage.removeItem('__ACFH_GM_${pageKey}_' + name);
    const GM_listValues = () => Object.keys(localStorage)
        .filter(key => key.startsWith('__ACFH_GM_${pageKey}_'))
        .map(key => key.slice(${JSON.stringify(`__ACFH_GM_${pageKey}_`)}.length));
    const GM_xmlhttpRequest = (details = {}) => {
        const method = details.method || 'GET';
        const headers = details.headers || {};
        const body = 'data' in details ? details.data : details.body;
        fetch(details.url, {
            method,
            headers,
            body,
            credentials: details.anonymous ? 'omit' : 'include'
        }).then(async (response) => {
            const responseText = await response.text();
            const payload = {
                finalUrl: response.url,
                readyState: 4,
                response,
                responseHeaders: Array.from(response.headers.entries()).map(([key, value]) => key + ': ' + value).join('\\n'),
                responseText,
                status: response.status,
                statusText: response.statusText
            };
            if (typeof details.onload === 'function') details.onload(payload);
            if (typeof details.onreadystatechange === 'function') details.onreadystatechange(payload);
        }).catch((error) => {
            if (typeof details.onerror === 'function') {
                details.onerror({ error, status: 0, statusText: String(error && error.message || error) });
            }
        });
        return { abort() {} };
    };
    const GM_openInTab = (url) => window.open(url, '_blank', 'noopener');
    const GM_registerMenuCommand = () => 0;
    const GM_unregisterMenuCommand = () => {};
    const GM_setClipboard = (text) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(String(text));
        }
        return undefined;
    };
    const GM = {
        addStyle: GM_addStyle,
        getValue: GM_getValue,
        setValue: GM_setValue,
        deleteValue: GM_deleteValue,
        listValues: GM_listValues,
        xmlHttpRequest: GM_xmlhttpRequest,
        openInTab: GM_openInTab,
        registerMenuCommand: GM_registerMenuCommand,
        unregisterMenuCommand: GM_unregisterMenuCommand,
        setClipboard: GM_setClipboard
    };

${scriptContent}
}
//# sourceURL=${sourceName}`;
}

function pruneUserScriptInjectionDedupe() {
    const now = Date.now();
    for (const [key, timestamp] of injectedUserScriptDocuments.entries()) {
        if (now - timestamp > USERSCRIPT_DEDUPE_TTL_MS) {
            injectedUserScriptDocuments.delete(key);
        }
    }
}

function getUserScriptDocumentKey(tabId, frameId, documentId, url, pageKey) {
    return [
        tabId,
        Number.isInteger(frameId) ? frameId : 0,
        documentId || url || 'unknown-document',
        pageKey
    ].join(':');
}

function getRuntimeInjectionSettings() {
    return Promise.resolve({
        contentScriptApi: 'mainWorld',
        sandboxMode: 'forceDOM'
    });
}

function executeUserScriptInMainWorld(tabId, details, scriptContent, options = {}) {
    const tabUrl = details && details.url;
    const frameId = Number.isInteger(details && details.frameId) ? details.frameId : 0;
    const documentId = details && details.documentId;
    const scriptId = options.scriptId || USERSCRIPT_DEFAULT_ID;
    const meta = extractUserScriptMeta(scriptContent);

    if (!tabId || !tabUrl || !scriptContent || !urlMatchesUserScript(tabUrl, scriptContent, frameId)) {
        return Promise.resolve(false);
    }

    pruneUserScriptInjectionDedupe();

    const pageKey = getUserScriptPageKey(scriptId, scriptContent);
    const documentKey = getUserScriptDocumentKey(tabId, frameId, documentId, tabUrl, pageKey);
    if (!options.force && injectedUserScriptDocuments.has(documentKey)) {
        return Promise.resolve(false);
    }
    injectedUserScriptDocuments.set(documentKey, Date.now());

    const safeSourceName = String(scriptId || USERSCRIPT_DEFAULT_ID).replace(/[^a-z0-9_.-]/gi, '_');
    const sourceURL = `${safeSourceName}.user.js`;

    return chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        world: 'MAIN',
        func: (eventName, payload) => {
            let fired = false;
            const fire = () => {
                if (fired) return;
                fired = true;
                window.dispatchEvent(new CustomEvent(eventName, {
                    detail: JSON.stringify(payload)
                }));
            };
            if (window.__ACFH_USERSCRIPT_MAIN_WORLD_READY__) {
                fire();
            } else {
                window.addEventListener('__ACFH_USERSCRIPT_READY__', fire, { once: true });
                setTimeout(fire, 0);
            }
            return true;
        },
        args: ['__ACFH_USERSCRIPT_INJECT__', {
            code: scriptContent,
            injectionKey: pageKey,
            runAt: meta.runAt,
            sourceName: sourceURL,
            meta
        }]
    }).then(() => true).catch((e) => {
        injectedUserScriptDocuments.delete(documentKey);
        const message = e && e.message ? e.message : String(e);
        console.warn('[ACFH UserScript] MAIN world dispatch failed:', message);
        return false;
    });

    return chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        world: 'MAIN',
        func: (code, injectionKey, runAt, sourceName) => {
            const registryName = '__ACFH_USERSCRIPT_INJECTIONS__';
            const runScript = () => {
                window[registryName] = window[registryName] || Object.create(null);
                if (window[registryName][injectionKey]) {
                    return false;
                }
                window[registryName][injectionKey] = Date.now();

                const unsafeWindow = window;
                const storagePrefix = `__ACFH_GM_${injectionKey}_`;
                const GM_info = {
                    scriptHandler: 'Auto Clicker - Form Helper',
                    version: '1.0.5',
                    script: {}
                };
                const GM_addStyle = (cssText) => {
                    const style = document.createElement('style');
                    style.textContent = String(cssText || '');
                    (document.head || document.documentElement || document).appendChild(style);
                    return style;
                };
                const GM_getValue = (name, defaultValue = undefined) => {
                    try {
                        const raw = localStorage.getItem(storagePrefix + name);
                        return raw === null ? defaultValue : JSON.parse(raw);
                    } catch (e) {
                        return defaultValue;
                    }
                };
                const GM_setValue = (name, value) => {
                    localStorage.setItem(storagePrefix + name, JSON.stringify(value));
                };
                const GM_deleteValue = (name) => {
                    localStorage.removeItem(storagePrefix + name);
                };
                const GM_listValues = () => {
                    return Object.keys(localStorage)
                        .filter(key => key.startsWith(storagePrefix))
                        .map(key => key.slice(storagePrefix.length));
                };
                const GM_xmlhttpRequest = (details = {}) => {
                    const method = details.method || 'GET';
                    const headers = details.headers || {};
                    const body = 'data' in details ? details.data : details.body;
                    fetch(details.url, {
                        method,
                        headers,
                        body,
                        credentials: details.anonymous ? 'omit' : 'include'
                    }).then(async (response) => {
                        const responseText = await response.text();
                        const payload = {
                            finalUrl: response.url,
                            readyState: 4,
                            response,
                            responseHeaders: Array.from(response.headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\n'),
                            responseText,
                            status: response.status,
                            statusText: response.statusText
                        };
                        if (typeof details.onload === 'function') details.onload(payload);
                        if (typeof details.onreadystatechange === 'function') details.onreadystatechange(payload);
                    }).catch((error) => {
                        if (typeof details.onerror === 'function') {
                            details.onerror({ error, status: 0, statusText: String(error && error.message || error) });
                        }
                    });
                    return { abort() {} };
                };
                const GM_openInTab = (url) => window.open(url, '_blank', 'noopener');
                const GM_registerMenuCommand = () => 0;
                const GM_unregisterMenuCommand = () => {};
                const GM_setClipboard = (text) => {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        return navigator.clipboard.writeText(String(text));
                    }
                    return undefined;
                };
                const GM = {
                    addStyle: GM_addStyle,
                    getValue: GM_getValue,
                    setValue: GM_setValue,
                    deleteValue: GM_deleteValue,
                    listValues: GM_listValues,
                    xmlHttpRequest: GM_xmlhttpRequest,
                    openInTab: GM_openInTab,
                    registerMenuCommand: GM_registerMenuCommand,
                    unregisterMenuCommand: GM_unregisterMenuCommand,
                    setClipboard: GM_setClipboard
                };

                try {
                    eval(`${code}\n//# sourceURL=${sourceName}`);
                    return true;
                } catch (error) {
                    console.error('[ACFH UserScript] execution failed:', error);
                    throw error;
                }
            };

            if (runAt === 'document-start') {
                return runScript();
            }
            if (runAt === 'document-end') {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', runScript, { once: true });
                    return true;
                }
                return runScript();
            }
            if (document.readyState === 'complete') {
                setTimeout(runScript, 0);
                return true;
            }
            window.addEventListener('load', () => setTimeout(runScript, 0), { once: true });
            return true;
        },
        args: [scriptContent, pageKey, meta.runAt, sourceURL]
    }).then(() => true).catch((e) => {
        injectedUserScriptDocuments.delete(documentKey);
        const message = e && e.message ? e.message : String(e);
        console.warn('[ACFH UserScript] MAIN world injection failed:', message);
        return false;
    });
}

function injectIndependentUserScriptIntoTab(tabId, tabUrl, scriptContent, details = {}, options = {}) {
    if (!tabId || !tabUrl || !scriptContent) {
        return Promise.resolve(false);
    }

    const injectionDetails = {
        tabId,
        url: tabUrl,
        frameId: Number.isInteger(details.frameId) ? details.frameId : 0,
        documentId: details.documentId || null
    };

    return executeUserScriptInMainWorld(tabId, injectionDetails, scriptContent, {
        scriptId: options.scriptId || details.scriptId || USERSCRIPT_DEFAULT_ID,
        force: options.force === true
    }).then((success) => {
        if (success) {
            console.log('Independent UserScript injected once:', tabUrl, injectionDetails);
        }
        return success;
    });
}

function injectActiveUserScriptIntoOpenTabs(scriptContent, options = {}) {
    if (!scriptContent) return;

    chrome.storage.local.get(['autoClickerEnabled', 'activeAutomationMode', ACTIVE_USER_SCRIPT_ID_KEY], (data) => {
        if (!data.autoClickerEnabled || normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
            return;
        }

        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (!tab.id || !tab.url || !isInjectablePageUrl(tab.url)) return;
                injectIndependentUserScriptIntoTab(tab.id, tab.url, scriptContent, {
                    frameId: 0,
                    scriptId: data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
                }, options).catch((e) => {
                    console.warn('Independent UserScript injection failed:', e && e.message ? e.message : e);
                });
            });
        });
    });
}

function deactivateUserScriptsInTab(tabId) {
    if (!tabId) return Promise.resolve(false);
    return chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        world: 'MAIN',
        func: (eventName) => {
            try {
                window.dispatchEvent(new CustomEvent(eventName, { detail: '{}' }));
                if (window.__ACFH_USERSCRIPT_INJECTIONS__) {
                    Object.keys(window.__ACFH_USERSCRIPT_INJECTIONS__).forEach((key) => {
                        delete window.__ACFH_USERSCRIPT_INJECTIONS__[key];
                    });
                }
                delete window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
                return true;
            } catch (e) {
                return false;
            }
        },
        args: [USERSCRIPT_DEACTIVATE_EVENT]
    }).then(() => true).catch(() => false);
}

function deactivateInjectedUserScriptsInOpenTabs(callback) {
    injectedUserScriptDocuments.clear();
    chrome.tabs.query({}, (tabs) => {
        const targets = (Array.isArray(tabs) ? tabs : [])
            .filter(tab => tab && tab.id && isInjectablePageUrl(tab.url));

        if (!targets.length) {
            if (typeof callback === 'function') callback();
            return;
        }

        let pending = targets.length;
        targets.forEach((tab) => {
            deactivateUserScriptsInTab(tab.id).finally(() => {
                pending -= 1;
                if (pending === 0 && typeof callback === 'function') callback();
            });
        });
    });
}

chrome.tabs.onRemoved.addListener((tabId) => {
    for (const key of injectedUserScriptDocuments.keys()) {
        if (key.startsWith(`${tabId}:`)) {
            injectedUserScriptDocuments.delete(key);
        }
    }
});

/*
 * Legacy injection helpers below are kept for older Click and Fill custom
 * scripts, but the independent UserScript editor now uses only the MAIN-world
 * pipeline above. That keeps execution close to Tampermonkey's @grant none
 * behavior and avoids duplicate DOM/isolated/background injections.
 */

function legacyUrlMatchesUserScript(url, scriptContent) {
    const matches = extractUserScriptMatches(scriptContent);
    if (!matches.length) return false;
    return matches.some((pattern) => {
        try {
            return userScriptPatternToRegExp(pattern).test(url);
        } catch (e) {
            console.warn('Invalid UserScript @match pattern ignored:', pattern, e.message);
            return false;
        }
    });
}

// FunÃ§Ã£o para validar sintaxe do script
function isValidScript(scriptContent) {
    // Skip dynamic evaluation to avoid CSP 'unsafe-eval' violation
    // Basic validation: check for UserScript headers and non-empty content
    if (!scriptContent || typeof scriptContent !== 'string' || scriptContent.trim() === '') {
        console.error('[isValidScript] Invalid script: empty or not a string');
        return false;
    }

    const headerMatch = scriptContent.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
    if (!headerMatch) {
        return false;
    }

    // Additional lightweight checks (optional, can be expanded based on needs)
    try {
        // Check for basic JavaScript syntax issues (e.g., unbalanced braces)
        let braceCount = 0;
        for (let char of scriptContent) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
        }
        if (braceCount !== 0) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}


// FunÃ§Ã£o para injetar script via userScripts API (DESATIVADA)
// Mantida apenas por compatibilidade, mas retornando sempre false
// para forÃ§ar o uso dos mÃ©todos de injeÃ§Ã£o via DOM/sandbox/RAW.
// Isso evita que scripts antigos permaneÃ§am registrados de forma
// persistente em domÃ­nios que jÃ¡ nÃ£o correspondem mais Ã  URL da
// configuraÃ§Ã£o.
async function injectScriptViaUserScripts(tabId, scriptKey, scriptContent, matchUrl) {
    return false;
}

// FunÃ§Ã£o para injetar script no DOM
async function injectScriptToDOM(tabId, scriptContent) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId, allFrames: true },
            func: (code) => {
                const scriptElement = document.createElement('script');
                scriptElement.textContent = code;
                (document.head || document.documentElement).appendChild(scriptElement);
                scriptElement.remove();
            },
            args: [scriptContent],
            world: 'MAIN'
        });
        return true;
    } catch (e) {
        return false;
    }
}

// FunÃ§Ã£o para injetar script em sandbox (ISOLATED)
async function injectScriptToSandbox(tabId, scriptContent) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId, allFrames: true },
            func: (code) => {
                try {
                    eval(code);
                } catch (e) {
                    throw e;
                }
            },
            args: [scriptContent],
            world: 'ISOLATED'
        });
        return true;
    } catch (e) {
        console.error('[Sandbox Injection] Failed to execute script:', e.message);
        return false;
    }
}

// FunÃ§Ã£o para executar script no contexto RAW (background)
function injectScriptRaw(scriptContent, scriptKey) {
    try {
        eval(scriptContent);
        console.log(`[RAW Injection] Script ${scriptKey} executed successfully in background context.`);
        return true;
    } catch (e) {
        console.error(`[RAW Injection] Error executing script ${scriptKey}:`, e.message);
        return false;
    }
}

// FunÃ§Ã£o para tentar injetar script com fallback
// matchUrl Ã© opcional e define onde o script deverÃ¡ ser executado.
async function tryInjectScript(tabId, scriptKey, scriptContent, matchUrl) {
    let success = false;

    // Log script content for debugging
    console.log(`[tryInjectScript] Attempting to inject script ${scriptKey}`);

    // Try userScripts API first when available.
    console.log(`[tryInjectScript] Attempting userScripts injection for ${scriptKey}...`);
    try {
        success = await injectScriptViaUserScripts(tabId, scriptKey, scriptContent, matchUrl);
        if (success) {
            console.log(`[tryInjectScript] UserScripts injection successful for ${scriptKey}.`);
            return true;
        }
    } catch (e) {
    }

    // Fallback to DOM injection
    console.log(`[tryInjectScript] Attempting DOM injection for ${scriptKey}...`);
    try {
        success = await injectScriptToDOM(tabId, scriptContent);
        if (success) {
            console.log(`[tryInjectScript] DOM injection successful for ${scriptKey}.`);
            return true;
        }
    } catch (e) {
        console.error(`[tryInjectScript] DOM injection failed for ${scriptKey}:`, e.message);
        saveUserScript(scriptContent, scriptKey, `DOM injection error: ${e.message}`);
    }

    // Fallback to Sandbox injection
    console.log(`[tryInjectScript] Attempting sandbox injection for ${scriptKey}...`);
    try {
        success = await injectScriptToSandbox(tabId, scriptContent);
        if (success) {
            console.log(`[tryInjectScript] Sandbox injection successful for ${scriptKey}.`);
            return true;
        }
    } catch (e) {
        console.error(`[tryInjectScript] Sandbox injection failed for ${scriptKey}:`, e.message);
        saveUserScript(scriptContent, scriptKey, `Sandbox injection error: ${e.message}`);
    }

    // Fallback to RAW injection
    console.log(`[tryInjectScript] Attempting RAW injection for ${scriptKey}...`);
    try {
        success = injectScriptRaw(scriptContent, scriptKey);
        if (success) {
            console.log(`[tryInjectScript] RAW injection successful for ${scriptKey}.`);
            return true;
        }
    } catch (e) {
        console.error(`[tryInjectScript] RAW injection failed for ${scriptKey}:`, e.message);
        saveUserScript(scriptContent, scriptKey, `RAW injection error: ${e.message}`);
    }

    console.error(`[tryInjectScript] All injection methods failed for ${scriptKey}.`);
    chrome.storage.local.get(scriptKey, (data) => {
        console.error(`[tryInjectScript] Failed script content:`, data[scriptKey]?.scriptContent || data[scriptKey]);
    });
    return false;
}

// FunÃ§Ã£o para extrair configuraÃ§Ã£o de um script
function extractConfigFromScript(script, configId = null) {
    // Check for valid UserScript headers
    const headerMatch = script.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
    if (!headerMatch) {
        saveUserScript(script, configId, 'Missing UserScript headers');
        return {
            id: configId || `independent-script-${Date.now()}`,
            name: 'Independent Script',
            url: '*://*/*',
            initWait: '0',
            actions: []
        };
    }

    // Extract name and match from headers
    let scriptName = 'Unnamed Script';
    let scriptUrl = '*://*/*';
    const nameMatch = script.match(/\/\/ @name\s+(.+)/);
    const matchMatch = script.match(/\/\/ @match\s+(.+)/);
    if (nameMatch && nameMatch[1]) {
        scriptName = nameMatch[1].trim();
    }
    if (matchMatch && matchMatch[1]) {
        scriptUrl = validateAndFormatUrl(matchMatch[1].trim());
    }

    // Try to extract config object
    const configMatch = script.match(/const config = \{[\s\S]*?\};/);
    if (!configMatch) {
        console.warn('No config object found in script. Treating as dynamic script.');
        return {
            id: configId || `independent-script-${Date.now()}`,
            name: scriptName,
            url: scriptUrl,
            initWait: '0',
            actions: []
        };
    }

    let configStr = configMatch[0];
    configStr = configStr.replace(/^const config =\s*/, '').replace(/;$/, '');
    configStr = configStr.replace(/Infinity/g, 'null');

    try {
        const configObj = JSON.parse(configStr);

        // Validate essential fields
        if (!configObj.name || !configObj.url) {
            console.warn('Invalid configuration: missing name or URL.');
            saveUserScript(script, configId, 'Missing name or URL in config');
            return {
                id: configId || `independent-script-${Date.now()}`,
                name: scriptName,
                url: scriptUrl,
                initWait: '0',
                actions: []
            };
        }

        const formattedActions = (configObj.actions || []).map((action, index) => {
            if (!action.selector) {
                throw new Error(`Invalid action at index ${index}: missing selector.`);
            }
            const interval = action.actionMode === 'mutationObserve' ? null : String(action.interval || 1000);
            const repeat = action.actionMode === 'mutationObserve' ? null : (action.repeat === null ? -2 : action.repeat || 1);
            return {
                name: action.name || ``,
                elementFinder: action.selector || '',
                mode: action.mode || 'click',
                intervalMs: interval,
                repeat: repeat,
                fillValue: action.value || '',
                fillMethod: action.mode === 'fill' ? (action.fillMethod || 'paste') : 'paste',
                actionInitWait: String(action.waitBefore / 1000 || 0),
                disabled: action.disabled || false,
                isCSSSelector: action.isCSS || false,
                actionMode: action.actionMode || 'default'
            };
        });

        return {
            id: configId || Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
            name: configObj.name || scriptName,
            url: validateAndFormatUrl(configObj.url || scriptUrl),
            initWait: String(configObj.initWait / 1000 || 0),
            actions: formattedActions
        };
    } catch (e) {
        console.warn('Error parsing config from script:', e.message);
        saveUserScript(script, configId, `Parsing error: ${e.message}`);
        return {
            id: configId || `independent-script-${Date.now()}`,
            name: scriptName,
            url: scriptUrl,
            initWait: '0',
            actions: []
        };
    }
}

// FunÃ§Ã£o para registrar scripts personalizados
function registerCustomScripts(configurations) {
    chrome.storage.local.get(null, (allData) => {
        Object.keys(allData).forEach(key => {
            if (key.startsWith('customScript_') || key.startsWith('UserScript_')) {
                const configId = key.replace(/(customScript_|UserScript_)/, '');
                const config = configurations.find(cfg => cfg.id === configId) || {
                    id: configId,
                    name: configId.startsWith('independent-script-') ? 'Independent Script' : 'Unnamed Configuration',
                    url: '*://*/*'
                };
                    const scriptContent = allData[key].scriptContent || allData[key];
                    const extractedConfig = extractConfigFromScript(scriptContent, configId);
                    if (extractedConfig) {
                        registerUserScript(
                            configId,
                            extractedConfig.name,
                            validateAndFormatUrl(extractedConfig.url),
                            scriptContent
                        );
                    } else {
                        console.warn(`Skipping registration of invalid script: ${key}`);
                    }
            }
        });
    });
}

function unregisterNativeIndependentUserScripts(callback) {
    if (!chrome.userScripts || !chrome.userScripts.getScripts || !chrome.userScripts.unregister) {
        if (typeof callback === 'function') callback();
        return;
    }

    chrome.userScripts.getScripts((scripts) => {
        if (chrome.runtime.lastError || !Array.isArray(scripts)) {
            if (typeof callback === 'function') callback();
            return;
        }

        const ids = scripts
            .map(script => script && script.id)
            .filter(id => id && id.startsWith(NATIVE_USERSCRIPT_PREFIX));

        if (!ids.length) {
            if (typeof callback === 'function') callback();
            return;
        }

        chrome.userScripts.unregister({ ids }, () => {
            if (chrome.runtime.lastError) {
                console.warn('Error unregistering native UserScripts:', chrome.runtime.lastError.message);
            }
            if (typeof callback === 'function') callback();
        });
    });
}

function registerUserScriptMainWorld(scriptId, scriptContent, options = {}, callback) {
    if (!chrome.userScripts || !chrome.userScripts.register || !scriptContent) {
        if (typeof callback === 'function') callback(false);
        return;
    }

    const meta = extractUserScriptMeta(scriptContent);
    const id = options.nativeId || getNativeUserScriptId(scriptId);
    const matches = getChromeUserScriptPatterns(options.matches || meta.matches);
    const excludeMatches = getChromeUserScriptPatterns(options.excludeMatches || meta.excludes, [])
        .filter(pattern => matches.indexOf(pattern) === -1);
    const registration = {
        id,
        matches,
        js: [{ code: buildRegisteredUserScriptCode(scriptContent, scriptId || id) }],
        runAt: userScriptRunAtToChrome(meta.runAt),
        allFrames: !meta.noFrames,
        world: 'MAIN'
    };

    if (excludeMatches.length) {
        registration.excludeMatches = excludeMatches;
    }

    chrome.userScripts.unregister({ ids: [id] }, () => {
        void chrome.runtime.lastError;
        chrome.userScripts.register([registration], () => {
            if (chrome.runtime.lastError) {
                console.error(`Error registering MAIN-world UserScript ${id}:`, chrome.runtime.lastError.message);
                if (typeof callback === 'function') callback(false);
                return;
            }
            console.log(`MAIN-world UserScript registered: ${id}`, {
                matches,
                excludeMatches,
                runAt: registration.runAt,
                allFrames: registration.allFrames
            });
            if (typeof callback === 'function') callback(true);
        });
    });
}

function syncNativeIndependentUserScriptRegistration(scriptContent, options = {}, callback) {
    if (!chrome.userScripts || !chrome.userScripts.register) {
        if (typeof callback === 'function') callback(false);
        return;
    }

    chrome.storage.local.get(['autoClickerEnabled', 'activeAutomationMode', ACTIVE_USER_SCRIPT_ID_KEY], (data) => {
        if (chrome.runtime.lastError) {
            if (typeof callback === 'function') callback(false);
            return;
        }

        const enabled = Boolean(data.autoClickerEnabled);
        const mode = normalizeActiveAutomationMode(data.activeAutomationMode);

        if (!enabled || mode !== ACTIVE_AUTOMATION_MODE_USERSCRIPT || !scriptContent) {
            unregisterNativeIndependentUserScripts(() => {
                if (typeof callback === 'function') callback(false);
            });
            return;
        }

        const scriptId = options.scriptId || data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID;
        unregisterNativeIndependentUserScripts(() => {
            registerUserScriptMainWorld(scriptId, scriptContent, {}, callback);
        });
    });
}

// FunÃ§Ã£o para registrar user scripts
function registerUserScript(configId, configName, url, scriptContent, callback) {
    registerUserScriptMainWorld(configId, scriptContent, {
        nativeId: configId,
        matches: [url]
    }, (success) => {
        if (success) {
            console.log(`Script registered for: ${configName} with ID ${configId} on ${url}`);
        } else {
            console.error(`Error registering script for ${configName} (ID: ${configId})`);
        }
        if (typeof callback === 'function') callback(success);
    });
}

function unregisterManagedUserScripts(callback) {
    if (!chrome.userScripts || !chrome.userScripts.getScripts) {
        if (typeof callback === 'function') callback();
        return;
    }

    chrome.userScripts.getScripts((scripts) => {
        if (chrome.runtime.lastError || !Array.isArray(scripts)) {
            if (typeof callback === 'function') callback();
            return;
        }

        const idsToRemove = scripts
            .map(s => s.id)
            .filter(id =>
                id && (
                    id === INDEPENDENT_USERSCRIPT_KEY ||
                    id.startsWith(NATIVE_USERSCRIPT_PREFIX) ||
                    id.startsWith('customScript_') ||
                    id.startsWith('UserScript_') ||
                    id.startsWith('script-')
                )
            );

        if (idsToRemove.length) {
            chrome.userScripts.unregister({ ids: idsToRemove }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('Erro ao limpar userScripts antigos:', chrome.runtime.lastError.message);
                } else {
                    console.log('userScripts antigos removidos:', idsToRemove);
                }
                if (typeof callback === 'function') callback();
            });
            return;
        }

        if (typeof callback === 'function') callback();
    });
}

unregisterManagedUserScripts(() => {
    chrome.storage.local.get([INDEPENDENT_USERSCRIPT_KEY, ACTIVE_USER_SCRIPT_ID_KEY, 'activeAutomationMode'], (data) => {
        if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
            unregisterNativeIndependentUserScripts();
            return;
        }

        syncNativeIndependentUserScriptRegistration(data[INDEPENDENT_USERSCRIPT_KEY], {
            scriptId: data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
        });
    });
});

// FunÃ§Ã£o para injetar content script apenas no frame correspondente ao
// evento de navegaÃ§Ã£o (main frame ou iframe). Isso evita que o
// scripts/content.js rode ao mesmo tempo na pÃ¡gina principal e dentro
// de iframes, o que causava FloatBox duplicada.
function injectContentScript(details) {
    const target = { tabId: details.tabId, frameIds: [details.frameId] };

    chrome.scripting.executeScript(
        {
            target,
            files: ["scripts/content.js"],
        },
        () => {
            if (chrome.runtime.lastError) {
                console.error("Error injecting content.js:", chrome.runtime.lastError.message);
                return;
            }
            console.log(translations.scriptInjectedLog, details.url, "frameId=", details.frameId);
        }
    );
}

function normalizeOcrDefaults(defaults = {}) {
    return {
        action: ['click', 'doubleClick', 'scroll', 'fill', 'check', 'captureText'].includes(defaults.action) ? defaults.action : 'click',
        actionMode: defaults.actionMode === 'watcher' || defaults.actionMode === 'mutationObserve' ? 'watcher' : 'default',
        scrollDirection: ['down', 'up', 'left', 'right'].includes(defaults.scrollDirection) ? defaults.scrollDirection : 'down',
        scrollAmount: Number.isFinite(Number(defaults.scrollAmount)) ? Math.max(40, Number(defaults.scrollAmount)) : 520,
        checkKind: defaults.checkKind === 'switch' ? 'switch' : 'checkbox',
        fillValue: defaults.fillValue || '',
        intervalMs: Number.isFinite(Number(defaults.intervalMs)) ? Math.max(10, Number(defaults.intervalMs)) : 1000,
        repeat: Number.isFinite(Number(defaults.repeat)) ? Number(defaults.repeat) : 1,
        targetUrl: defaults.targetUrl || '',
        initWait: defaults.initWait || '0'
    };
}

function appendOcrRuleFromCapture(capture, defaults = {}, sendResponse) {
    const normalizedDefaults = normalizeOcrDefaults(defaults);
    chrome.storage.local.get(['ocrRules', OCR_SETTINGS_KEY], (data) => {
        const rules = Array.isArray(data.ocrRules) ? data.ocrRules : [];
        const settings = normalizeOcrSettings(data[OCR_SETTINGS_KEY] || {});
        const targetUrl = normalizedDefaults.targetUrl || settings.url || capture.url || '';
        const nextRule = {
            id: `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: `OCR action ${String(rules.length + 1).padStart(2, '0')}`,
            url: targetUrl,
            matchText: capture.matchText || '',
            selectorHint: capture.selectorHint || '',
            role: capture.role || '',
            tagName: capture.tagName || '',
            rect: capture.rect || null,
            disabled: false,
            createdAt: new Date().toISOString(),
            ...normalizedDefaults,
            fillValue: capture.fillValue || normalizedDefaults.fillValue,
            capturedText: capture.capturedText || capture.matchText || ''
        };
        rules.push(nextRule);
        chrome.storage.local.set({
            ocrRules: rules,
            [OCR_SETTINGS_KEY]: settings.url ? settings : { ...settings, url: targetUrl },
            activeAutomationMode: ACTIVE_AUTOMATION_MODE_OCR
        }, () => {
            respondToRuntime(sendResponse, { success: true, rule: nextRule });
        });
    });
}

function deleteOcrRule(ruleId, sendResponse) {
    if (!ruleId) {
        respondToRuntime(sendResponse, { success: false, error: 'No OCR action selected.' });
        return;
    }
    chrome.storage.local.get(['ocrRules'], (data) => {
        const rules = Array.isArray(data.ocrRules) ? data.ocrRules : [];
        const nextRules = rules.filter(rule => rule && rule.id !== ruleId);
        chrome.storage.local.set({ ocrRules: nextRules }, () => {
            respondToRuntime(sendResponse, { success: nextRules.length !== rules.length });
        });
    });
}

function findOcrTargetTab(targetUrl, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        const activeTab = activeTabs && activeTabs[0];
        if (activeTab && activeTab.id && isInjectablePageUrl(activeTab.url || '') && urlMatchesOcrTarget(activeTab.url || '', targetUrl)) {
            callback(activeTab);
            return;
        }

        chrome.tabs.query({}, (tabs) => {
            const match = (tabs || []).find(tab => tab && tab.id && isInjectablePageUrl(tab.url || '') && urlMatchesOcrTarget(tab.url || '', targetUrl));
            callback(match || null);
        });
    });
}

function getFramesForTab(tabId, callback) {
    if (!chrome.webNavigation || !chrome.webNavigation.getAllFrames) {
        callback([]);
        return;
    }
    chrome.webNavigation.getAllFrames({ tabId }, (frames) => {
        if (chrome.runtime.lastError || !Array.isArray(frames)) {
            callback([]);
            return;
        }
        callback(frames);
    });
}

function findOcrTargetFrame(targetUrl, callback) {
    const inspectTab = (tab, done) => {
        if (!tab || !tab.id || !isInjectablePageUrl(tab.url || '')) {
            done(null);
            return;
        }
        if (urlMatchesOcrTarget(tab.url || '', targetUrl)) {
            done({ tab, frameId: 0, url: tab.url || '' });
            return;
        }
        getFramesForTab(tab.id, (frames) => {
            const match = (frames || []).find(frame => frame && isInjectablePageUrl(frame.url || '') && urlMatchesOcrTarget(frame.url || '', targetUrl));
            done(match ? { tab, frameId: match.frameId, url: match.url || '' } : null);
        });
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        const activeTab = activeTabs && activeTabs[0];
        inspectTab(activeTab, (activeMatch) => {
            if (activeMatch) {
                callback(activeMatch);
                return;
            }
            chrome.tabs.query({}, (tabs) => {
                const list = (tabs || []).filter(tab => tab && tab.id && isInjectablePageUrl(tab.url || ''));
                let index = 0;
                const next = () => {
                    if (index >= list.length) {
                        callback(null);
                        return;
                    }
                    inspectTab(list[index++], (match) => {
                        if (match) callback(match);
                        else next();
                    });
                };
                next();
            });
        });
    });
}

function sendOcrMessageToTarget(targetUrl, message, sendResponse) {
    if (!targetUrl) {
        respondToRuntime(sendResponse, { success: false, error: 'Set an OCR URL first.' });
        return;
    }

    findOcrTargetFrame(targetUrl, (target) => {
        if (!target || !target.tab || !target.tab.id) {
            respondToRuntime(sendResponse, { success: false, error: `Open the OCR target URL first: ${targetUrl}` });
            return;
        }
        const options = Number.isInteger(target.frameId) ? { frameId: target.frameId } : undefined;
        chrome.tabs.sendMessage(target.tab.id, message, options, (response) => {
            if (chrome.runtime.lastError) {
                respondToRuntime(sendResponse, { success: false, error: chrome.runtime.lastError.message });
                return;
            }
            respondToRuntime(sendResponse, response || { success: true });
        });
    });
}

function startOcrCaptureOnTab(tab, defaults, targetUrl, sendResponse, frameId = 0, frameUrl = '') {
    const targetFrameId = Number.isInteger(frameId) ? frameId : 0;
    const effectiveUrl = frameUrl || (tab && tab.url) || '';
    if (!tab || !tab.id || !isInjectablePageUrl(effectiveUrl)) {
        respondToRuntime(sendResponse, { success: false, error: 'Open a normal web page before starting OCR capture.' });
        return;
    }

    if (!targetUrl || !urlMatchesOcrTarget(effectiveUrl, targetUrl)) {
        respondToRuntime(sendResponse, { success: false, error: `OCR capture only runs on the configured URL: ${targetUrl || 'not set'}` });
        return;
    }

    const normalizedDefaults = normalizeOcrDefaults({ ...defaults, targetUrl });
    pendingOcrCaptureDefaultsByTab.set(ocrPendingKey(tab.id, targetFrameId), normalizedDefaults);
    chrome.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [targetFrameId] },
        files: ['scripts/ocrCapture.js']
    }, () => {
        if (chrome.runtime.lastError) {
            respondToRuntime(sendResponse, { success: false, error: chrome.runtime.lastError.message });
            return;
        }
        chrome.tabs.update(tab.id, { active: true }, () => {});
        chrome.tabs.sendMessage(tab.id, { action: 'startOcrCaptureOverlay', defaults: normalizedDefaults }, { frameId: targetFrameId }, (response) => {
            if (chrome.runtime.lastError) {
                respondToRuntime(sendResponse, { success: false, error: chrome.runtime.lastError.message });
                return;
            }
            respondToRuntime(sendResponse, response || { success: true });
        });
    });
}

function startOcrCapture(defaults, explicitTargetUrl, sendResponse) {
    chrome.storage.local.get([OCR_SETTINGS_KEY, 'ocrRules'], (data) => {
        const targetUrl = getOcrTargetUrlFromState(data, explicitTargetUrl || defaults.targetUrl || '');
        if (!targetUrl) {
            respondToRuntime(sendResponse, { success: false, error: 'Set the OCR URL before capturing.' });
            return;
        }
        findOcrTargetFrame(targetUrl, (target) => {
            startOcrCaptureOnTab(target && target.tab, defaults, targetUrl, sendResponse, target ? target.frameId : 0, target ? target.url : '');
        });
    });
}

function runWhenOcrModeActive(sendResponse, callback) {
    chrome.storage.local.get(['activeAutomationMode'], (data) => {
        if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_OCR) {
            respondToRuntime(sendResponse, { success: false, error: 'OCR session is not active.' });
            return;
        }
        callback();
    });
}

// ManipulaÃ§Ã£o de mensagens
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startOcrCapture') {
        runWhenOcrModeActive(sendResponse, () => {
            startOcrCapture(message.defaults || {}, message.targetUrl || '', sendResponse);
        });
        return true;
    }

    if (message.action === 'ocrCaptureComplete') {
        const tabId = sender && sender.tab && sender.tab.id;
        const frameId = Number.isInteger(sender && sender.frameId) ? sender.frameId : 0;
        const pendingKey = tabId ? ocrPendingKey(tabId, frameId) : '';
        const defaults = pendingKey ? (pendingOcrCaptureDefaultsByTab.get(pendingKey) || {}) : {};
        if (tabId) {
            pendingOcrCaptureDefaultsByTab.delete(pendingKey);
        }
        appendOcrRuleFromCapture(message.capture || {}, defaults, sendResponse);
        return true;
    }

    if (['runOcrNow', 'runOcrNext', 'previewOcrTarget', 'stopOcrNow', 'runOcrRuleNow'].includes(message.action)) {
        runWhenOcrModeActive(sendResponse, () => {
            chrome.storage.local.get([OCR_SETTINGS_KEY, 'ocrRules'], (data) => {
                const targetUrl = getOcrTargetUrlFromState(data, message.targetUrl || '');
                const actionMap = {
                    runOcrNow: 'runOcrNowInTab',
                    runOcrNext: 'runOcrNextInTab',
                    previewOcrTarget: 'previewOcrTargetInTab',
                    stopOcrNow: 'stopOcrNowInTab',
                    runOcrRuleNow: 'runOcrRuleNowInTab'
                };
                sendOcrMessageToTarget(targetUrl, {
                    action: actionMap[message.action],
                    ruleId: message.ruleId || null
                }, sendResponse);
            });
        });
        return true;
    }

    if (message.action === 'deleteOcrRule') {
        deleteOcrRule(message.ruleId || '', sendResponse);
        return true;
    }

    if (message.action === 'getTabConfigSnapshot') {
        const tabId = sender && sender.tab && sender.tab.id;
        if (!tabId) {
            sendResponse({ config: null, feedbackMode: null, autoClickerEnabled: false });
            return;
        }

        const tabKey = `autoClickConfig_tab_${tabId}`;
        chrome.storage.local.get([tabKey, 'feedbackMode', 'autoClickerEnabled', 'activeAutomationMode'], (data) => {
            if (chrome.runtime.lastError) {
                console.warn('Erro ao obter snapshot de configuraÃ§Ã£o para a aba:', chrome.runtime.lastError.message);
            }
            const mode = normalizeActiveAutomationMode(data.activeAutomationMode);
            sendResponse({
                config: mode === ACTIVE_AUTOMATION_MODE_CLICK_FILL ? (data[tabKey] || null) : null,
                feedbackMode: data.feedbackMode,
                autoClickerEnabled: !!data.autoClickerEnabled
            });
        });
        return true; // resposta assÃ­ncrona
    }

    if (message.action === 'acfhUserScriptDocumentStart') {
        const tabId = sender && sender.tab && sender.tab.id;
        const frameId = Number.isInteger(sender && sender.frameId) ? sender.frameId : 0;
        const url = message.url || (sender && sender.url) || (sender && sender.tab && sender.tab.url);
        if (!tabId || !isInjectablePageUrl(url)) {
            sendResponse({ injected: false });
            return;
        }

        chrome.storage.local.get(["autoClickerEnabled", "blacklist", "activeAutomationMode", INDEPENDENT_USERSCRIPT_KEY, ACTIVE_USER_SCRIPT_ID_KEY], (data) => {
            if (!data.autoClickerEnabled || normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_USERSCRIPT || !data[INDEPENDENT_USERSCRIPT_KEY]) {
                sendResponse({ injected: false });
                return;
            }

            let domain = null;
            try {
                domain = new URL(url).hostname;
            } catch (e) {
                sendResponse({ injected: false });
                return;
            }

            const blacklist = Array.isArray(data.blacklist) ? data.blacklist : [];
            if (blacklist.some(blocked => domain === blocked || domain.endsWith('.' + blocked))) {
                sendResponse({ injected: false });
                return;
            }

            injectIndependentUserScriptIntoTab(tabId, url, data[INDEPENDENT_USERSCRIPT_KEY], {
                frameId,
                documentId: sender && sender.documentId,
                scriptId: data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
            }).then((success) => {
                sendResponse({ injected: success });
            }).catch((e) => {
                sendResponse({ injected: false, error: e && e.message ? e.message : String(e) });
            });
        });
        return true;
    }

    if (message.action === 'executeUserScripts' && message.scripts) {
        chrome.storage.local.get(['activeAutomationMode', INDEPENDENT_USERSCRIPT_KEY], (data) => {
            if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
                sendResponse({ status: 'UserScript session is not active' });
                return;
            }

            if (!data[INDEPENDENT_USERSCRIPT_KEY]) {
                sendResponse({ status: 'No active UserScript saved' });
                return;
            }

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs && tabs[0];
                if (!tab || !tab.id || !tab.url) {
                    sendResponse({ status: 'No active tab' });
                    return;
                }

                injectIndependentUserScriptIntoTab(tab.id, tab.url, data[INDEPENDENT_USERSCRIPT_KEY])
                    .then((success) => {
                        sendResponse({ status: success ? 'Active script injected' : 'Active script skipped' });
                    })
                    .catch((e) => {
                        sendResponse({ status: 'Injection error', error: e && e.message ? e.message : String(e) });
                    });
            });
        });
        return true;
    }

    if (message.action === 'configureUserScriptWorld') {
        chrome.userScripts.configureWorld({
            csp: "script-src 'self'",
            messaging: true
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error configuring user script world:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('User script world configured successfully.');
                sendResponse({ success: true });
            }
        });
        return true;
    }

    if (message.action === "startAutoclick") {
        chrome.storage.local.get(["autoClickerEnabled", "blacklist"], (data) => {
            if (!data.autoClickerEnabled) {
                console.log("Start autoclick ignored: extension disabled.");
                return;
            }
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length === 0 || 
                    tabs[0].url.startsWith("chrome-extension://") || 
                    tabs[0].url.startsWith("chrome://")) {
                    console.log("Injection ignored: active tab is an extension page or chrome://.");
                    return;
                }

                const tab = tabs[0];
                const urlObj = new URL(tab.url);
                const domain = urlObj.hostname;
                const blacklist = data.blacklist || [];

                if (blacklist.some(blocked => domain === blocked || domain.endsWith('.' + blocked))) {
                    console.log(`Action blocked: site ${domain} is blacklisted.`);
                    return;
                }

                chrome.scripting.executeScript(
                    {
                        target: { tabId: tab.id },
                        func: (message) => {
                            console.clear();
                            console.log(message);
                        },
                        args: [translations.reloadMessage]
                    },
                    () => {
                        if (chrome.runtime.lastError) {
                            console.error("Error executing reload script:", chrome.runtime.lastError.message);
                            return;
                        }
                        chrome.tabs.reload(tab.id);
                    }
                );
            });
        });
    } else if (message.action === "stopAutomation") {
        createOrUpdateContextMenu(false);
        console.log(translations.automationStopped);
    } else if (message.action === "configUpdated") {
        // Quando uma configuraÃ§Ã£o Ã© atualizada nas opÃ§Ãµes e a extensÃ£o
        // estÃ¡ ligada, propagamos o novo snapshot para todas as abas
        // cujo URL corresponde Ã  URL configurada e pedimos para o
        // content script recarregar a automaÃ§Ã£o, sem exigir refresh.

        const updatedSnapshot = message.config;
        const updatedConfigId = message.activeConfigId;

        if (!updatedSnapshot || !updatedSnapshot.iframe || !Array.isArray(updatedSnapshot.xpaths) || updatedSnapshot.xpaths.length === 0) {
            console.log("configUpdated recebido, mas snapshot invÃ¡lido ou sem iframe.");
            return;
        }

        chrome.storage.local.get(["autoClickerEnabled", "blacklist", "activeAutomationMode"], (data) => {
            if (chrome.runtime.lastError) {
                console.warn("Erro ao ler storage em configUpdated:", chrome.runtime.lastError.message);
                return;
            }

            const isEnabled = !!data.autoClickerEnabled;
            const blacklist = data.blacklist || [];

            if (!isEnabled) {
                console.log("configUpdated ignorado: extensÃ£o desativada.");
                return;
            }

            if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
                console.log("configUpdated ignored: Click and Fill mode is not active.");
                return;
            }

            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    if (!tab.id || !tab.url) return;

                    let domain = null;
                    try {
                        const urlObj = new URL(tab.url);
                        domain = urlObj.hostname;
                    } catch (e) {
                        return;
                    }

                    if (blacklist.some(blocked => domain === blocked || domain.endsWith('.' + blocked))) {
                        return;
                    }

                    if (!urlMatchesConfig(tab.url, updatedSnapshot.iframe)) {
                        return;
                    }

                    const tabKey = `autoClickConfig_tab_${tab.id}`;
                    chrome.storage.local.set({ [tabKey]: updatedSnapshot }, () => {
                        if (chrome.runtime.lastError) {
                            console.warn('Erro ao atualizar snapshot de configuraÃ§Ã£o para a aba:', chrome.runtime.lastError.message);
                        }

                        chrome.tabs.sendMessage(tab.id, {
                            action: "reloadConfig",
                            activeConfigId: updatedConfigId
                        }, () => {
                            // Se o content script ainda nÃ£o estiver injetado,
                            // ignoramos o erro "Receiving end does not exist".
                            if (chrome.runtime.lastError) {
                                const msg = chrome.runtime.lastError.message || "";
                                if (!msg.includes("Receiving end does not exist")) {
                                    console.warn("Erro ao enviar reloadConfig para content.js:", msg);
                                }
                            }
                        });
                    });
                });
            });
        });
    } else if (message.action === "toggleStateChanged") {
        if (!message.isEnabled) {
            // Popup já atualizou autoClickerEnabled no storage. Aqui
            // apenas garantimos que nenhum novo menu de contexto fique
            // visível.
            createOrUpdateContextMenu(false);
            deactivateInjectedUserScriptsInOpenTabs(() => {
                unregisterNativeIndependentUserScripts();
            });
            console.log(translations.automationStopped);
        } else {
            // Quando a extensão é ligada, propagamos a configuração ativa
            // para todas as abas cujo URL corresponde à URL configurada.
            // Depois, as próximas navegações também injetarão automaticamente.
            chrome.storage.local.get(['configurations', 'activeConfigId', 'activeAutomationMode', INDEPENDENT_USERSCRIPT_KEY, ACTIVE_USER_SCRIPT_ID_KEY, USER_SCRIPT_INJECTION_TIMING_KEY], (data) => {
                const mode = normalizeActiveAutomationMode(data.activeAutomationMode);

                const scriptContent = data[INDEPENDENT_USERSCRIPT_KEY];
                if (mode === ACTIVE_AUTOMATION_MODE_USERSCRIPT && scriptContent) {
                    syncNativeIndependentUserScriptRegistration(scriptContent, {
                        scriptId: data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
                    });
                    if (shouldInjectUserScriptLive(data)) {
                        injectActiveUserScriptIntoOpenTabs(scriptContent);
                    }
                }

                if (mode === ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
                    if (!scriptContent) {
                        console.log("UserScript mode enabled, but no independent script is saved.");
                    }
                    return;
                }

                if (mode === ACTIVE_AUTOMATION_MODE_OCR) {
                    unregisterNativeIndependentUserScripts();
                    console.log("OCR mode enabled; OCR runner handles saved captures independently.");
                    return;
                }

                const configurations = Array.isArray(data.configurations) ? data.configurations : [];
                const activeConfigId = data.activeConfigId;
                const activeConfig = configurations.find(cfg => cfg && cfg.id == activeConfigId);

                if (activeConfig && activeConfig.url) {
                    const snapshot = buildAutoClickConfigFromConfig(activeConfig);
                    if (!snapshot) {
                        console.log("Click and Fill mode enabled, but the active configuration has no actions.");
                        return;
                    }
                    
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach((tab) => {
                            if (!tab.id || !tab.url) return;
                            
                            // Verificar se a URL da aba corresponde à URL da configuração ativa
                            if (!urlMatchesConfig(tab.url, activeConfig.url)) {
                                return;
                            }
                            
                            // Salvar snapshot para esta aba
                            const tabKey = `autoClickConfig_tab_${tab.id}`;
                            chrome.storage.local.set({ [tabKey]: snapshot || {} }, () => {
                                if (chrome.runtime.lastError) {
                                    console.warn('Erro ao salvar snapshot para a aba:', chrome.runtime.lastError.message);
                                }
                                
                                // Injetar content.js se ainda não estiver injetado
                                chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
                                    if (chrome.runtime.lastError && chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
                                        // Content script não injetado, injetar agora
                                        injectContentScript({ tabId: tab.id, frameId: 0, url: tab.url });
                                    }
                                });
                            });
                        });
                    });
                } else {
                    console.log("Nenhuma configuração ativa para propagar ao toggle.");
                }
            });
            
            updateContextMenuPatternsFromConfigs();
            primeSelectorCaptureForOpenTabs();
            console.log("Toggle ativado; propagando configuração para abas correspondentes.");
        }
    } else if (message.action === "activeAutomationModeChanged") {
        updateContextMenuPatternsFromConfigs();
        if (message.mode === ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
            createOrUpdateContextMenu(false);
            chrome.storage.local.get([INDEPENDENT_USERSCRIPT_KEY, ACTIVE_USER_SCRIPT_ID_KEY, USER_SCRIPT_INJECTION_TIMING_KEY], (data) => {
                syncNativeIndependentUserScriptRegistration(data[INDEPENDENT_USERSCRIPT_KEY], {
                    scriptId: data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
                });
                if (shouldInjectUserScriptLive(data)) {
                    injectActiveUserScriptIntoOpenTabs(data[INDEPENDENT_USERSCRIPT_KEY]);
                }
            });
        } else if (message.mode === ACTIVE_AUTOMATION_MODE_OCR) {
            createOrUpdateContextMenu(false);
            deactivateInjectedUserScriptsInOpenTabs(() => {
                unregisterNativeIndependentUserScripts();
            });
        } else {
            deactivateInjectedUserScriptsInOpenTabs(() => {
                unregisterNativeIndependentUserScripts();
            });
            primeSelectorCaptureForOpenTabs();
        }
        sendResponse({ success: true });
        return;
    } else if (message.action === "independentUserScriptUpdated") {
        updateContextMenuPatternsFromConfigs();
        chrome.storage.local.get(['activeAutomationMode', USER_SCRIPT_INJECTION_TIMING_KEY], (data) => {
            if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
                deactivateInjectedUserScriptsInOpenTabs(() => {
                    unregisterNativeIndependentUserScripts();
                });
                return;
            }

            syncNativeIndependentUserScriptRegistration(message.scriptContent || "", {
                scriptId: message.scriptId || USERSCRIPT_DEFAULT_ID
            });
            if (shouldInjectUserScriptLive(data)) {
                injectActiveUserScriptIntoOpenTabs(message.scriptContent || "", { force: true, scriptId: message.scriptId || USERSCRIPT_DEFAULT_ID });
            } else {
                deactivateInjectedUserScriptsInOpenTabs();
            }
        });
        sendResponse({ success: true });
        return;
    } else if (message.action === "independentUserScriptDeleted") {
        updateContextMenuPatternsFromConfigs();
        deactivateInjectedUserScriptsInOpenTabs(() => {
            unregisterNativeIndependentUserScripts();
            unregisterManagedUserScripts();
        });
        sendResponse({ success: true });
        return;
    } else if (message.action === "executeIndependentUserScriptNow") {
        const scriptContent = message.scriptContent || "";
        if (!scriptContent) {
            sendResponse({ success: false, error: "No script content." });
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs && tabs[0];
            if (!tab || !tab.id || !tab.url) {
                sendResponse({ success: false, error: "No active tab found." });
                return;
            }

            if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
                sendResponse({ success: false, error: "Cannot execute on this browser page." });
                return;
            }

            if (!urlMatchesUserScript(tab.url, scriptContent)) {
                sendResponse({ success: false, error: "The active tab does not match this script @match." });
                return;
            }

            injectIndependentUserScriptIntoTab(tab.id, tab.url, scriptContent, {
                frameId: 0,
                scriptId: message.scriptId || USERSCRIPT_DEFAULT_ID
            }, { force: true })
                .then((success) => {
                    sendResponse(success
                        ? { success: true }
                        : { success: false, error: "Injection failed." });
                })
                .catch((e) => {
                    sendResponse({ success: false, error: e && e.message ? e.message : String(e) });
                });
        });
        return true;
    } else if (message.action === "registerUserScript") {
        if (!isValidScript(message.scriptContent)) {
            console.warn('Invalid script received in registerUserScript for config', message.configId);
            sendResponse({ success: false, error: 'invalid script' });
        } else {
            registerUserScript(
                message.configId,
                message.configName || message.configId,
                message.url || '*://*/*',
                message.scriptContent,
                (success) => {
                    sendResponse(success
                        ? { success: true }
                        : { success: false, error: 'registration failed' });
                }
            );
            return true;
        }
    } else if (message.action === "unregisterUserScript") {
        chrome.userScripts.unregister({ ids: [message.configId] }, () => {
            if (chrome.runtime.lastError) {
                console.warn(`No existing script with ID ${message.configId} to unregister:`, chrome.runtime.lastError.message);
            } else {
                console.log(`User script unregistered for config ID ${message.configId}.`);
            }
            sendResponse({ success: true });
        });
        return true;
    }

    sendResponse({ received: true });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    const isXPathMenu = info.menuItemId === CONTEXT_MENU_XPATH_ID;
    const isCSSMenu = info.menuItemId === CONTEXT_MENU_CSS_ID;

    if (isXPathMenu || isCSSMenu) {
        chrome.storage.local.get(["autoClickerEnabled", "activeAutomationMode", "configurations", "activeConfigId"], (data) => {
            if (!data.autoClickerEnabled) {
                console.log("Context action ignored: extension disabled.");
                return;
            }
            if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
                console.log("Context action ignored: Click and Fill mode is not active.");
                return;
            }

            let configurations = data.configurations || [];

            // Tenta primeiro encontrar uma configuraÃ§Ã£o cujo URL
            // corresponda ao site atual. Assim, qualquer site
            // configurado passa a ser o alvo natural do carregamento
            // de XPath/CSS.
            let targetConfig = findMatchingConfigurationForUrl(tab.url, configurations, { requireActions: false });

            // Se nenhuma configuraÃ§Ã£o casar com a URL atual, cai para
            // a configuraÃ§Ã£o ativa existente, se houver.
            if (!targetConfig && data.activeConfigId) {
                targetConfig = configurations.find(cfg => cfg && cfg.id === data.activeConfigId) || null;
            }

            // Se ainda assim nÃ£o houver config, cria uma nova usando a
            // URL atual da aba e define como ativa.
            if (!targetConfig) {
                console.log("No matching/active configuration found. Creating new configuration for this site.");

                const existingNumbers = configurations
                    .map(cfg => {
                        const match = cfg.name && cfg.name.match(/Default Configuration (\d+)/);
                        return match ? parseInt(match[1], 10) : null;
                    })
                    .filter(num => num !== null)
                    .sort((a, b) => a - b);

                let nextNum = 1;
                for (let i = 0; i < existingNumbers.length; i++) {
                    if (existingNumbers[i] === nextNum) {
                        nextNum++;
                    } else if (existingNumbers[i] > nextNum) {
                        break;
                    }
                }

                const configName = `Default Configuration ${String(nextNum).padStart(2, '0')}`;
                const newConfigId = Date.now().toString();
                targetConfig = {
                    id: newConfigId,
                    name: configName,
                    url: tab.url,
                    initWait: "0",
                    actions: []
                };
                configurations.push(targetConfig);
                data.activeConfigId = newConfigId;
                data.configurations = configurations;

                chrome.storage.local.set({
                    configurations: configurations,
                    activeConfigId: newConfigId
                });
            } else if (data.activeConfigId !== targetConfig.id) {
                // Se encontramos uma configuraÃ§Ã£o que casa com a URL
                // atual mas ela nÃ£o era a ativa, tornamos essa
                // configuraÃ§Ã£o a ativa.
                data.activeConfigId = targetConfig.id;
                chrome.storage.local.set({ activeConfigId: targetConfig.id });
            }

            const requestAction = isXPathMenu ? "getXPathAtClick" : "getCSSAtClick";
            const selectorFrameId = Number.isInteger(info.frameId) ? info.frameId : null;
            const selectorMessageOptions = selectorFrameId !== null ? { frameId: selectorFrameId } : null;
            const selectorInjectionTarget = selectorFrameId !== null
                ? { tabId: tab.id, frameIds: [selectorFrameId] }
                : { tabId: tab.id, allFrames: true };

            const sendSelectorMessage = (callback) => {
                if (selectorMessageOptions) {
                    chrome.tabs.sendMessage(tab.id, { action: requestAction }, selectorMessageOptions, callback);
                    return;
                }
                chrome.tabs.sendMessage(tab.id, { action: requestAction }, callback);
            };

            const handleSelectorResponse = (response) => {
                if (!response || (!response.xpath && !response.cssSelector)) {
                    return;
                }

                lastXPath = response.xpath || "";
                lastCSSSelector = response.cssSelector || "";

                let configurations = data.configurations || [];
                const activeConfig = configurations.find(cfg => cfg && cfg.id === data.activeConfigId);

                if (activeConfig) {
                    const actionCount = activeConfig.actions.length + 1;
                    const newAction = {
                        name: `Action ${actionCount}`,
                        elementFinder: isXPathMenu ? response.xpath : response.cssSelector,
                        mode: "click",
                        intervalMs: "0.01",
                        repeat: 1,
                        fillValue: "",
                        fillMethod: "paste",
                        actionInitWait: "0",
                        disabled: false,
                        isCSSSelector: isCSSMenu,
                        actionMode: "default"
                    };
                    activeConfig.actions.push(newAction);

                    chrome.storage.local.set({
                        configurations,
                        activeConfigId: data.activeConfigId,
                        xpathLoaded: isXPathMenu ? response.xpath : response.cssSelector,
                        isCSSSelector: isCSSMenu
                    }, () => {
                        chrome.runtime.sendMessage({
                            action: "actionAdded",
                            activeConfigId: data.activeConfigId,
                            newAction: newAction
                        }, () => {
                            console.log("actionAdded message sent to options.js.");
                        });

                        const devUrl = "https://uiautotool.vercel.app/options.html";
                        const prodUrl = "https://uiautotool.vercel.app/options.html";
                        const configUrl = devUrl; // ajuste para prodUrl quando publicar

                        chrome.tabs.create({ url: configUrl }, () => {
                            if (chrome.runtime.lastError) {
                                console.warn('Erro ao abrir pÃ¡gina de opÃ§Ãµes web:', chrome.runtime.lastError.message);
                            } else {
                                console.log(`Options page (web) opened with new action added to config: ${activeConfig.name}`);
                            }
                        });
                    });
                }
            };

            const sendSelectorRequest = () => {
                sendSelectorMessage((response) => {
                    if (chrome.runtime.lastError) {
                        const msg = chrome.runtime.lastError.message || "";
                        if (msg.includes("Receiving end does not exist")) {
                            // Capturador ainda nÃ£o foi injetado neste frame.
                            chrome.scripting.executeScript(
                                {
                                    target: selectorInjectionTarget,
                                    files: [SELECTOR_CAPTURE_SCRIPT],
                                },
                                () => {
                                    if (chrome.runtime.lastError) {
                                        console.error("Error injecting selector capture script:", chrome.runtime.lastError.message);
                                        return;
                                    }
                                    // Se esta injeÃ§Ã£o foi necessÃ¡ria, o clique direito atual
                                    // provavelmente jÃ¡ passou. A tentativa abaixo ainda cobre
                                    // abas onde outro frame jÃ¡ havia capturado o alvo.
                                    sendSelectorMessage((response2) => {
                                        if (chrome.runtime.lastError) {
                                            console.error("Error sending message to selector capture after injection:", chrome.runtime.lastError.message);
                                            return;
                                        }
                                        handleSelectorResponse(response2);
                                    });
                                }
                            );
                        } else {
                            console.error("Error sending message to content.js:", msg);
                        }
                        return;
                    }
                    handleSelectorResponse(response);
                });
            };

            sendSelectorRequest();
        });
    }
});

if (chrome.commands && chrome.commands.onCommand) {
    chrome.commands.onCommand.addListener((command) => {
        if (command !== 'start-ocr-capture') {
            return;
        }
        chrome.storage.local.get([OCR_SETTINGS_KEY, 'ocrRules', 'activeAutomationMode'], (data) => {
            if (normalizeActiveAutomationMode(data.activeAutomationMode) !== ACTIVE_AUTOMATION_MODE_OCR) {
                return;
            }
            const targetUrl = getOcrTargetUrlFromState(data);
            if (!targetUrl) return;
            findOcrTargetFrame(targetUrl, (target) => {
                if (!target || !target.tab) {
                    return;
                }
                startOcrCaptureOnTab(target.tab, {}, targetUrl, null, target.frameId, target.url);
            });
        });
    });
}

// UserScript injection is independent from the Click and Fill configuration.
// It follows the active UserScript's own @match/@include/@exclude metadata and
// runs in the page MAIN world once per document, similar to Tampermonkey's
// @grant none behavior.
chrome.webNavigation.onCommitted.addListener(
    (details) => {
        if (!details || !isInjectablePageUrl(details.url)) {
            return;
        }

        chrome.storage.local.get(["autoClickerEnabled", "blacklist", "activeAutomationMode", INDEPENDENT_USERSCRIPT_KEY, ACTIVE_USER_SCRIPT_ID_KEY], (data) => {
            const mode = normalizeActiveAutomationMode(data.activeAutomationMode);
            if (!data.autoClickerEnabled || mode !== ACTIVE_AUTOMATION_MODE_USERSCRIPT || !data[INDEPENDENT_USERSCRIPT_KEY]) {
                return;
            }

            let domain = null;
            try {
                domain = new URL(details.url).hostname;
            } catch (e) {
                return;
            }

            const blacklist = Array.isArray(data.blacklist) ? data.blacklist : [];
            if (blacklist.some(blocked => domain === blocked || domain.endsWith('.' + blocked))) {
                console.log(`UserScript blocked: site ${domain} is blacklisted.`);
                return;
            }

            injectIndependentUserScriptIntoTab(details.tabId, details.url, data[INDEPENDENT_USERSCRIPT_KEY], {
                frameId: details.frameId,
                documentId: details.documentId,
                scriptId: data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
            }).catch((e) => {
                const msg = e && e.message ? e.message : e;
                console.warn('Error injecting independent UserScript on navigation:', msg);
            });
        });
    },
    { url: [{ schemes: ["http", "https"] }] }
);

// Handle web navigation completion: decide por aba usando apenas a
// configuraÃ§Ã£o ATIVA como blueprint. Outras configs sÃ£o apenas rascunhos
// e nÃ£o disparam novas injeÃ§Ãµes.
chrome.webNavigation.onCompleted.addListener(
    (details) => {
        chrome.storage.local.get(["configurations", "activeConfigId", "autoClickerEnabled", "blacklist", "activeAutomationMode", INDEPENDENT_USERSCRIPT_KEY], (data) => {
            const isEnabled = !!data.autoClickerEnabled;
            const blacklist = data.blacklist || [];

            if (!isEnabled) {
                return;
            }

            let domain = null;
            try {
                const urlObj = new URL(details.url);
                domain = urlObj.hostname;
            } catch (e) {
                return;
            }

            if (blacklist.some(blocked => domain === blocked || domain.endsWith('.' + blocked))) {
                console.log(`Injection blocked: site ${domain} is blacklisted.`);
                return;
            }

            const mode = normalizeActiveAutomationMode(data.activeAutomationMode);

            if (mode !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
                // UserScripts and OCR are handled by their own runners, without
                // the Click and Fill URL/session snapshot.
                return;
            }

            const configurations = Array.isArray(data.configurations) ? data.configurations : [];
            const activeConfigId = data.activeConfigId;
            const activeConfig = configurations.find(cfg => cfg && cfg.id == activeConfigId);
            if (!activeConfig || !activeConfig.url) {
                return;
            }

            // Garante que sÃ³ hÃ¡ injeÃ§Ã£o se a URL da aba CASAR com a URL
            // da configuraÃ§Ã£o ativa. Outras configuraÃ§Ãµes salvas nÃ£o
            // participam desta decisÃ£o.
            if (!urlMatchesConfig(details.url, activeConfig.url)) {
                return;
            }

            const snapshot = buildAutoClickConfigFromConfig(activeConfig);

            if (!snapshot) {
                console.log("Click and Fill configuration has no active actions; nothing will be injected.");
                return;
                // ConfiguraÃ§Ã£o ativa sem aÃ§Ãµes: tenta injetar um script
                // personalizado associado a esta configuraÃ§Ã£o e, em
                // seguida, garante que o content.js tambÃ©m seja injetado
                // com um snapshot vazio para permitir captura de seletores.
                const customKey = `customScript_${activeConfig.id}`;
                const userKey = `UserScript_${activeConfig.id}`;

                chrome.storage.local.get([customKey, userKey], (scriptsData) => {
                    if (chrome.runtime.lastError) {
                        console.warn('Erro ao ler scripts personalizados para a configuraÃ§Ã£o ativa:', chrome.runtime.lastError.message);
                    } else {
                        let storedKey = null;
                        let stored = null;

                        if (scriptsData[customKey]) {
                            storedKey = customKey;
                            stored = scriptsData[customKey];
                        } else if (scriptsData[userKey]) {
                            storedKey = userKey;
                            stored = scriptsData[userKey];
                        }

                        if (stored) {
                            const scriptContent = typeof stored === 'string' ? stored : stored.scriptContent;
                            if (scriptContent) {
                                // ValidaÃ§Ã£o apenas para log; nÃ£o bloqueia a injeÃ§Ã£o.
                                if (!isValidScript(scriptContent)) {
                                    console.warn('Script personalizado nÃ£o passou na validaÃ§Ã£o bÃ¡sica; tentando injetar mesmo assim.');
                                }

                                // Usa o pipeline completo de injeÃ§Ã£o (userScripts, DOM, sandbox, RAW)
                                // e restringe o match Ã  URL configurada.
                                tryInjectScript(details.tabId, storedKey, scriptContent, activeConfig.url)
                                    .then((success) => {
                                        if (success) {
                                            console.log(`Custom script injected for active configuration (no actions): ${activeConfig.name || activeConfig.id}`);
                                        } else {
                                            console.warn(`All injection methods failed for custom script of configuration: ${activeConfig.name || activeConfig.id}`);
                                        }
                                    })
                                    .catch((e) => {
                                        const msg = e && e.message ? e.message : e;
                                        console.warn(`Error injecting custom script for active configuration ${activeConfig.id}:`, msg);
                                    });
                            } else {
                                console.warn('Script personalizado vazio para a configuraÃ§Ã£o ativa; nada a injetar.');
                            }
                        }
                    }

                    // Independente de haver script personalizado ou nÃ£o,
                    // criamos um snapshot mÃ­nimo (sem aÃ§Ãµes) para que o
                    // scripts/content.js seja injetado e possa cuidar de
                    // funcionalidades como captura de XPath/CSS.
                    const minimalSnapshot = {
                        iframe: activeConfig.url,
                        waitInit: activeConfig.initWait,
                        actionType: 'copyOption',
                        xpaths: []
                    };

                    const tabKey = `autoClickConfig_tab_${details.tabId}`;
                    chrome.storage.local.set({ [tabKey]: minimalSnapshot }, () => {
                        if (chrome.runtime.lastError) {
                            console.warn('Erro ao salvar snapshot mÃ­nimo de configuraÃ§Ã£o para a aba:', chrome.runtime.lastError.message);
                        }
                        injectContentScript(details, activeConfig);
                    });
                });

                return;
            }

            const tabKey = `autoClickConfig_tab_${details.tabId}`;
            chrome.storage.local.set({ [tabKey]: snapshot }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('Erro ao salvar snapshot de configuraÃ§Ã£o para a aba:', chrome.runtime.lastError.message);
                }
                injectContentScript(details, activeConfig);
            });
        });
    },
    { url: [{ schemes: ["http", "https"] }] }
);

// Generate user script content
function generateScriptContent(config) {
    let scriptContent = `// ==UserScript==
// @name         Auto Clicker - ${config.name || 'Unnamed Configuration'}
// @namespace    Auto Clicker - Form Helper
// @version      1.0
// @description  Automated actions for ${config.url}
// @author       Auto Clicker Extension
// @match        ${validateAndFormatUrl(config.url)}
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('Auto Clicker script loaded for: ${config.name}');
    \n`;

    if (config.actions && config.actions.length > 0) {
        scriptContent += `    // Configuration from Auto Clicker
    const config = {
        initWait: ${config.initWait || 0} * 1000,
        actions: [\n`;
        
        config.actions.forEach((action, index) => {
            scriptContent += `            {
                name: '${action.name || `Action ${index + 1}`}',
                selector: '${action.elementFinder || ''}',
                isCSS: ${action.isCSSSelector || false},
                mode: '${action.mode || 'click'}',
                value: '${action.fillValue || ''}',
                interval: ${action.intervalMs || 1000},
                repeat: ${action.repeat === -2 ? 'Infinity' : action.repeat || 1},
                waitBefore: ${action.actionInitWait || 0} * 1000
            }${index < config.actions.length - 1 ? ',' : ''}\n`;
        });
        
        scriptContent += `        ]
    };\n\n`;

        scriptContent += `    // Wait for initial delay
    setTimeout(executeActions, config.initWait);
    
    function executeActions() {
        config.actions.forEach((action, index) => {
            setTimeout(() => performAction(action), index * 100);
        });
    }
    
    function performAction(action) {
        // Find element
        const element = action.isCSS ? 
            document.querySelector(action.selector) :
            document.evaluate(action.selector, document, null, 
                XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        \n`;
        
        scriptContent += `        if (!element) {
            console.warn('Element not found:', action.selector);
            return;
        }
        \n`;
        
        scriptContent += `        // Execute action
        if (action.mode === 'click') {
            element.click();
            console.log('Clicked:', action.selector);
        } else if (action.mode === 'fill') {
            element.value = action.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Filled:', action.selector, 'with:', action.value);
        }
    }\n`;
    } else {
        scriptContent += `    // No actions configured - add your custom code below
    \n    console.log('No actions configured. Add your custom automation code here.');
    \n    // Example: document.querySelector('button').click();\n`;
    }
    
    scriptContent += `})();`;
    return scriptContent;
    }

