(function () {
    'use strict';

    const EVENT_NAME = '__ACFH_USERSCRIPT_INJECT__';
    const DEACTIVATE_EVENT_NAME = '__ACFH_USERSCRIPT_DEACTIVATE__';
    const REGISTRY_NAME = '__ACFH_USERSCRIPT_INJECTIONS__';
    const CLEANUP_REGISTRY_NAME = '__ACFH_USERSCRIPT_CLEANUP__';
    const HOOKS_NAME = '__ACFH_USERSCRIPT_RESOURCE_HOOKS__';

    if (window.__ACFH_USERSCRIPT_MAIN_WORLD_READY__) {
        return;
    }
    window.__ACFH_USERSCRIPT_MAIN_WORLD_READY__ = true;

    function getCleanupRegistry() {
        window[CLEANUP_REGISTRY_NAME] = window[CLEANUP_REGISTRY_NAME] || Object.create(null);
        return window[CLEANUP_REGISTRY_NAME];
    }

    function getCleanupController(injectionKey) {
        const registry = getCleanupRegistry();
        if (!registry[injectionKey]) {
            registry[injectionKey] = {
                active: true,
                timeouts: new Set(),
                intervals: new Set(),
                listeners: [],
                nodes: new Set()
            };
        }
        registry[injectionKey].active = true;
        return registry[injectionKey];
    }

    function withActiveUserScriptToken(injectionKey, callback, thisArg, args) {
        const previousToken = window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
        window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__ = injectionKey;
        try {
            return callback.apply(thisArg, args || []);
        } finally {
            if (previousToken) {
                window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__ = previousToken;
            } else if (window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__ === injectionKey) {
                delete window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
            }
        }
    }

    function installResourceTracker() {
        if (window[HOOKS_NAME]) return window[HOOKS_NAME];

        const hooks = {
            setTimeout: window.setTimeout,
            clearTimeout: window.clearTimeout,
            setInterval: window.setInterval,
            clearInterval: window.clearInterval,
            addEventListener: EventTarget.prototype.addEventListener,
            removeEventListener: EventTarget.prototype.removeEventListener
        };

        window.setTimeout = function (handler, timeout, ...args) {
            const token = window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
            const controller = token ? getCleanupController(token) : null;
            if (!controller) {
                return hooks.setTimeout.call(this, handler, timeout, ...args);
            }
            const wrapped = typeof handler === 'function'
                ? function (...callbackArgs) {
                    controller.timeouts.delete(timeoutId);
                    if (!controller.active) return undefined;
                    return withActiveUserScriptToken(token, handler, this, callbackArgs);
                }
                : handler;
            const timeoutId = hooks.setTimeout.call(this, wrapped, timeout, ...args);
            controller.timeouts.add(timeoutId);
            return timeoutId;
        };

        window.clearTimeout = function (timeoutId) {
            Object.values(getCleanupRegistry()).forEach((controller) => {
                if (controller && controller.timeouts) controller.timeouts.delete(timeoutId);
            });
            return hooks.clearTimeout.call(this, timeoutId);
        };

        window.setInterval = function (handler, timeout, ...args) {
            const token = window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
            const controller = token ? getCleanupController(token) : null;
            if (!controller) {
                return hooks.setInterval.call(this, handler, timeout, ...args);
            }
            const wrapped = typeof handler === 'function'
                ? function (...callbackArgs) {
                    if (!controller.active) return undefined;
                    return withActiveUserScriptToken(token, handler, this, callbackArgs);
                }
                : handler;
            const intervalId = hooks.setInterval.call(this, wrapped, timeout, ...args);
            controller.intervals.add(intervalId);
            return intervalId;
        };

        window.clearInterval = function (intervalId) {
            Object.values(getCleanupRegistry()).forEach((controller) => {
                if (controller && controller.intervals) controller.intervals.delete(intervalId);
            });
            return hooks.clearInterval.call(this, intervalId);
        };

        EventTarget.prototype.addEventListener = function (type, listener, options) {
            const token = window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
            const controller = token && listener ? getCleanupController(token) : null;
            if (!controller) {
                return hooks.addEventListener.call(this, type, listener, options);
            }
            const wrapped = typeof listener === 'function'
                ? function (...eventArgs) {
                    if (!controller.active) return undefined;
                    return withActiveUserScriptToken(token, listener, this, eventArgs);
                }
                : {
                    handleEvent: (event) => {
                        if (!controller.active || !listener || typeof listener.handleEvent !== 'function') return undefined;
                        return withActiveUserScriptToken(token, listener.handleEvent, listener, [event]);
                    }
                };
            controller.listeners.push({ target: this, type, listener, wrapped, options });
            return hooks.addEventListener.call(this, type, wrapped, options);
        };

        EventTarget.prototype.removeEventListener = function (type, listener, options) {
            const token = window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
            const controller = token ? getCleanupController(token) : null;
            if (controller) {
                const match = controller.listeners.find((entry) => entry.target === this && entry.type === type && entry.listener === listener);
                if (match) {
                    controller.listeners = controller.listeners.filter((entry) => entry !== match);
                    return hooks.removeEventListener.call(this, type, match.wrapped, options);
                }
            }
            return hooks.removeEventListener.call(this, type, listener, options);
        };

        window[HOOKS_NAME] = hooks;
        return hooks;
    }

    function cleanupUserScript(injectionKey) {
        const registry = getCleanupRegistry();
        const keys = injectionKey ? [injectionKey] : Object.keys(registry);
        const hooks = window[HOOKS_NAME] || installResourceTracker();

        keys.forEach((key) => {
            const controller = registry[key];
            if (!controller) return;
            controller.active = false;
            controller.timeouts.forEach((timeoutId) => hooks.clearTimeout.call(window, timeoutId));
            controller.intervals.forEach((intervalId) => hooks.clearInterval.call(window, intervalId));
            controller.listeners.forEach((entry) => {
                try {
                    hooks.removeEventListener.call(entry.target, entry.type, entry.wrapped, entry.options);
                } catch (e) {}
            });
            controller.nodes.forEach((node) => {
                try {
                    if (node && node.parentNode) node.parentNode.removeChild(node);
                } catch (e) {}
            });
            delete registry[key];
            if (window[REGISTRY_NAME]) {
                delete window[REGISTRY_NAME][key];
            }
        });

        if (!injectionKey && window[REGISTRY_NAME]) {
            Object.keys(window[REGISTRY_NAME]).forEach((key) => delete window[REGISTRY_NAME][key]);
        }
        delete window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
    }

    function prepareInlineScriptBridge(injectionKey) {
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
                    const inlineCode = node.text || node.textContent || '';
                    if (!inlineCode) return;
                    node.__acfhUserScriptInlineExecuted = true;
                    (0, eval)(`${inlineCode}\n//# sourceURL=acfh-inline-${node.__acfhUserScriptToken}.js`);
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
        setTimeout(() => {
            if (window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__ === injectionKey) {
                delete window.__ACFH_USERSCRIPT_ACTIVE_SCRIPT_TOKEN__;
            }
        }, 0);
    }

    function runUserScript(payload) {
        if (!payload || typeof payload.code !== 'string' || !payload.code) {
            return false;
        }

        const injectionKey = String(payload.injectionKey || 'default');
        const runAt = String(payload.runAt || 'document-idle').toLowerCase();
        const sourceName = String(payload.sourceName || 'acfh-userscript.user.js');

        const runScript = () => {
            installResourceTracker();
            window[REGISTRY_NAME] = window[REGISTRY_NAME] || Object.create(null);
            if (window[REGISTRY_NAME][injectionKey]) {
                return false;
            }
            window[REGISTRY_NAME][injectionKey] = Date.now();
            const cleanupController = getCleanupController(injectionKey);

            const unsafeWindow = window;
            const storagePrefix = `__ACFH_GM_${injectionKey}_`;
            const GM_info = {
                scriptHandler: 'Auto Clicker - Form Helper',
                version: '1.0.5',
                script: payload.meta || {}
            };
            const GM_addStyle = (cssText) => {
                const style = document.createElement('style');
                style.textContent = String(cssText || '');
                (document.head || document.documentElement || document).appendChild(style);
                cleanupController.nodes.add(style);
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
                    const responsePayload = {
                        finalUrl: response.url,
                        readyState: 4,
                        response,
                        responseHeaders: Array.from(response.headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\n'),
                        responseText,
                        status: response.status,
                        statusText: response.statusText
                    };
                    if (typeof details.onload === 'function') details.onload(responsePayload);
                    if (typeof details.onreadystatechange === 'function') details.onreadystatechange(responsePayload);
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
                prepareInlineScriptBridge(injectionKey);
                eval(`${payload.code}\n//# sourceURL=${sourceName}`);
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
    }

    window.addEventListener(EVENT_NAME, (event) => {
        try {
            const payload = typeof event.detail === 'string'
                ? JSON.parse(event.detail)
                : event.detail;
            runUserScript(payload);
        } catch (error) {
            console.error('[ACFH UserScript] injection event failed:', error);
        }
    });

    window.addEventListener(DEACTIVATE_EVENT_NAME, (event) => {
        try {
            const detail = typeof event.detail === 'string'
                ? JSON.parse(event.detail || '{}')
                : (event.detail || {});
            cleanupUserScript(detail && detail.injectionKey ? String(detail.injectionKey) : null);
        } catch (error) {
            cleanupUserScript(null);
        }
    });

    window.dispatchEvent(new CustomEvent('__ACFH_USERSCRIPT_READY__'));
})();
