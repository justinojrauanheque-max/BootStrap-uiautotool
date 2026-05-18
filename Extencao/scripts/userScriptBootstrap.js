(function () {
    'use strict';

    const INDEPENDENT_USERSCRIPT_KEY = 'independentUserScript';
    const ACTIVE_USER_SCRIPT_ID_KEY = 'activeUserScriptId';
    const ACTIVE_AUTOMATION_MODE_KEY = 'activeAutomationMode';
    const USER_SCRIPT_INJECTION_TIMING_KEY = 'userScriptInjectionTiming';
    const ACTIVE_AUTOMATION_MODE_USERSCRIPT = 'userscript';
    const USERSCRIPT_DEFAULT_ID = 'acfh-independent-userscript';
    const EVENT_NAME = '__ACFH_USERSCRIPT_INJECT__';
    const DEACTIVATE_EVENT_NAME = '__ACFH_USERSCRIPT_DEACTIVATE__';

    if (window.__ACFH_USERSCRIPT_BOOTSTRAP_STARTED__) {
        return;
    }
    window.__ACFH_USERSCRIPT_BOOTSTRAP_STARTED__ = true;

    function isInjectablePageUrl(url) {
        return typeof url === 'string' && /^https?:\/\//i.test(url);
    }

    function escapeRegExp(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function extractUserScriptHeaderValues(scriptContent, directive) {
        if (!scriptContent || typeof scriptContent !== 'string') return [];
        return Array.from(scriptContent.matchAll(new RegExp(`^\\s*//\\s*@${escapeRegExp(directive)}\\s+(.+)$`, 'gmi')))
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
            name: extractUserScriptHeaderValues(scriptContent, 'name')[0] || '',
            namespace: extractUserScriptHeaderValues(scriptContent, 'namespace')[0] || '',
            version: extractUserScriptHeaderValues(scriptContent, 'version')[0] || '',
            description: extractUserScriptHeaderValues(scriptContent, 'description')[0] || '',
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

    function urlMatchesUserScript(url, scriptContent) {
        const meta = extractUserScriptMeta(scriptContent);
        if (meta.noFrames && window.top !== window) return false;
        if (meta.excludes.some(pattern => userScriptPatternMatchesUrl(pattern, url))) return false;
        return meta.matches.some((pattern) => userScriptPatternMatchesUrl(pattern, url));
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

    function dispatchToMainWorld(scriptContent, scriptId) {
        if (!isInjectablePageUrl(location.href) || !scriptContent || !urlMatchesUserScript(location.href, scriptContent)) {
            return false;
        }

        const meta = extractUserScriptMeta(scriptContent);
        const safeSourceName = String(scriptId || USERSCRIPT_DEFAULT_ID).replace(/[^a-z0-9_.-]/gi, '_');
        const payload = {
            code: scriptContent,
            injectionKey: getUserScriptPageKey(scriptId, scriptContent),
            runAt: meta.runAt,
            sourceName: `${safeSourceName}.user.js`,
            meta
        };

        window.dispatchEvent(new CustomEvent(EVENT_NAME, {
            detail: JSON.stringify(payload)
        }));
        return true;
    }

    function dispatchDeactivateToMainWorld() {
        try {
            window.dispatchEvent(new CustomEvent(DEACTIVATE_EVENT_NAME, { detail: '{}' }));
        } catch (e) {
            // ignore
        }
    }

    function sendBackgroundFallback(reason) {
        try {
            chrome.runtime.sendMessage({
                action: 'acfhUserScriptDocumentStart',
                url: location.href,
                reason: reason || 'document-start'
            }, () => {
                void chrome.runtime.lastError;
            });
        } catch (e) {
            // ignore
        }
    }

    function domainIsBlacklisted(url, blacklist) {
        let domain = '';
        try {
            domain = new URL(url).hostname;
        } catch (e) {
            return true;
        }
        return (Array.isArray(blacklist) ? blacklist : [])
            .some(blocked => domain === blocked || domain.endsWith('.' + blocked));
    }

    function injectFromStorage(options = {}) {
        if (!isInjectablePageUrl(location.href)) {
            return;
        }

        chrome.storage.local.get([
            'autoClickerEnabled',
            'blacklist',
            ACTIVE_AUTOMATION_MODE_KEY,
            USER_SCRIPT_INJECTION_TIMING_KEY,
            INDEPENDENT_USERSCRIPT_KEY,
            ACTIVE_USER_SCRIPT_ID_KEY
        ], (data) => {
            if (chrome.runtime.lastError) {
                if (options.allowBackgroundFallback !== false) {
                    sendBackgroundFallback(options.reason);
                }
                return;
            }
            if (!data || data[ACTIVE_AUTOMATION_MODE_KEY] !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
                dispatchDeactivateToMainWorld();
                return;
            }
            if (options.requireLive === true && data[USER_SCRIPT_INJECTION_TIMING_KEY] !== 'live') {
                return;
            }
            if (!data || !data.autoClickerEnabled || !data[INDEPENDENT_USERSCRIPT_KEY]) {
                dispatchDeactivateToMainWorld();
                return;
            }
            if (domainIsBlacklisted(location.href, data.blacklist)) {
                return;
            }
            if (!dispatchToMainWorld(
                data[INDEPENDENT_USERSCRIPT_KEY],
                data[ACTIVE_USER_SCRIPT_ID_KEY] || USERSCRIPT_DEFAULT_ID
            )) {
                if (options.allowBackgroundFallback !== false) {
                    sendBackgroundFallback(options.reason);
                }
            }
        });
    }

    injectFromStorage({ reason: 'document-start' });

    try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== 'local' || !changes) return;
            if (
                changes.autoClickerEnabled ||
                changes.blacklist ||
                changes[ACTIVE_AUTOMATION_MODE_KEY] ||
                changes[USER_SCRIPT_INJECTION_TIMING_KEY] ||
                changes[INDEPENDENT_USERSCRIPT_KEY] ||
                changes[ACTIVE_USER_SCRIPT_ID_KEY]
            ) {
                injectFromStorage({
                    requireLive: true,
                    reason: 'storage-change'
                });
            }
        });
    } catch (e) {
        // ignore
    }
})();
