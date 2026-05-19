// webStorageBridge.js
// Conteúdo do script injetado pela extensão na página de configurações hospedada na web.
// Ele sincroniza os dados salvos via localStorage (options.js no site)
// com chrome.storage.local da extensão.

(function () {
    'use strict';

    // Garante que este script só rode na página de configurações do projeto web
    const host = window.location.hostname;
    const path = window.location.pathname || '';

    const isProdSite = host === 'uiautotool.vercel.app';
    const isSupabaseSite = host === 'bfjhgisfzdsefjjojbov.supabase.co';
    const isLocalDev = host === '127.0.0.1' || host === 'localhost';
    const isOptionsPage = path.endsWith('/options.html') || path.endsWith('options.html');

    if (!isOptionsPage || (!isProdSite && !isSupabaseSite && !isLocalDev)) {
        return;
    }

    // Chaves relevantes para sincronizar entre web e extensão
    // IMPORTANTE: incluir também autoClickConfig e blacklist para que
    // as automações e blacklist usadas pelo background/content script
    // reflitam exatamente o que foi salvo na página de opções web.
    const SYNC_KEYS = [
        'configurations',
        'activeConfigId',
        'uiLanguage',
        'acfhPreferredLanguage',
        'configMode',
        'sandboxMode',
        'contentScriptApi',
        'blacklist',
        'blacklistSites',
        'feedbackMode',
        'autoClickConfig',
        'ocrRules',
        'ocrSettings',
        'activeAutomationMode',
        'independentUserScript',
        'independentUserScriptLastEdited',
        'userScripts',
        'activeUserScriptId',
        // Sincroniza também o estado global da extensão para que a página
        // de opções web consiga exibir corretamente se a automação está
        // habilitada ou desabilitada (popup ON/OFF).
        'autoClickerEnabled',
        'userScriptEditorEnabled',
        'acfhUserscriptEditorExpanded',
        'acfhFreshInstallAt'
    ];

    // Prefixos de chaves adicionais que também devem ser espelhadas
    // entre a página web e a extensão (scripts personalizados, metadados
    // de edição, etc.). Qualquer chave que comece com um destes
    // prefixos será sincronizada automaticamente.
    const SYNC_PREFIXES = [
        'customScript_',
        'UserScript_',
        'scriptLastEdited_'
    ];

    const BRIDGE_MESSAGE_TYPE = 'acfh-storage-update';
    const RUNTIME_COMMAND_TYPE = 'acfh-runtime-command';
    const PING_MESSAGE_TYPE = 'acfh-ping';
    const RESET_ON_FRESH_INSTALL_KEYS = [
        'configurations',
        'activeConfigId',
        'autoClickConfig',
        'ocrRules',
        'ocrSettings',
        'independentUserScript',
        'independentUserScriptLastEdited',
        'userScripts',
        'activeUserScriptId'
    ];

    // Flag interna: se o contexto da extensão for invalidado (por exemplo,
    // extensão removida/atualizada enquanto a página web continua aberta),
    // evitamos novas tentativas de escrita em chrome.storage.local para não
    // gerar erros repetidos no painel de extensões.
    let extensionContextInvalidated = false;
    let extensionInvalidatedNotified = false;

    function notifyBridgeDisconnectedOnce() {
        if (extensionInvalidatedNotified) {
            return;
        }
        extensionInvalidatedNotified = true;
        try {
            window.postMessage({
                source: 'acfh-extension',
                type: 'acfh-bridge-disconnected',
                timestamp: Date.now()
            }, '*');
        } catch (e) {
            // ignore
        }
    }

    function keyIsSyncable(key) {
        if (SYNC_KEYS.includes(key)) {
            return true;
        }
        return SYNC_PREFIXES.some(prefix => key.startsWith(prefix));
    }

    function filterItems(items) {
        const filtered = {};
        if (!items) return filtered;
        Object.entries(items).forEach(([key, value]) => {
            if (keyIsSyncable(key)) {
                filtered[key] = value;
            }
        });
        return filtered;
    }

    function clearWebAutomationStateForFreshInstall(installMarker) {
        if (!installMarker) return;
        const lastApplied = localStorage.getItem('acfhFreshInstallAppliedAt');
        if (String(lastApplied || '') === String(installMarker)) return;
        RESET_ON_FRESH_INSTALL_KEYS.forEach((key) => {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                // ignore
            }
        });
        try {
            Object.keys(localStorage).forEach((key) => {
                if (SYNC_PREFIXES.some(prefix => key.startsWith(prefix))) {
                    localStorage.removeItem(key);
                }
            });
            localStorage.setItem('userScriptEditorEnabled', JSON.stringify(false));
            localStorage.setItem('acfhUserscriptEditorExpanded', JSON.stringify(true));
            localStorage.setItem('acfhFreshInstallAppliedAt', String(installMarker));
        } catch (e) {
            // ignore
        }
    }

    function syncFromChromeToLocal() {
        try {
            // Carrega todas as chaves e, em seguida, filtra apenas as
            // que são relevantes (incluindo scripts personalizados).
            chrome.storage.local.get(null, (data) => {
                if (chrome.runtime.lastError) {
                    console.warn('Erro ao ler chrome.storage.local para sync inicial:', chrome.runtime.lastError.message);
                    return;
                }

                if (!data) {
                    return;
                }

                clearWebAutomationStateForFreshInstall(data.acfhFreshInstallAt);
                const filteredChanges = {};
                Object.keys(data).forEach((key) => {
                    if (!keyIsSyncable(key)) {
                        return;
                    }
                    try {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                        filteredChanges[key] = { newValue: data[key] };
                    } catch (e) {
                        console.warn('Falha ao salvar chave em localStorage durante sync inicial', key, e);
                    }
                });

                if (Object.keys(filteredChanges).length) {
                    try {
                        window.postMessage({
                            source: 'acfh-extension',
                            type: 'acfh-chrome-storage-changed',
                            changes: filteredChanges,
                            initialSync: true,
                            timestamp: Date.now()
                        }, '*');
                    } catch (e) {
                        console.warn('Falha ao notificar página sobre sync inicial:', e);
                    }
                }
            });
        } catch (e) {
            console.warn('Exceção ao sincronizar dados iniciais da extensão para a página web:', e);
        }
    }

    function mirrorItemsToChrome(items) {
        const filtered = filterItems(items);
        if (!Object.keys(filtered).length) {
            return;
        }
        if (extensionContextInvalidated || !chrome || !chrome.storage || !chrome.storage.local) {
            return;
        }
        try {
            chrome.storage.local.set(filtered, () => {
                if (chrome.runtime.lastError) {
                    const msg = chrome.runtime.lastError.message || '';
                    if (msg.includes('Extension context invalidated')) {
                        extensionContextInvalidated = true;
                        // This commonly happens during development when the extension is reloaded
                        // while the options page stays open. Avoid surfacing as an extension error.
                        notifyBridgeDisconnectedOnce();
                    } else {
                        console.warn('Erro ao espelhar dados da página web para chrome.storage.local:', msg);
                    }
                }
            });
        } catch (e) {
            const msg = (e && e.message) || String(e);
            if (msg.includes('Extension context invalidated')) {
                extensionContextInvalidated = true;
                // Avoid surfacing as an extension error; page can re-sync after refresh.
                notifyBridgeDisconnectedOnce();
            } else {
                console.warn('Exceção ao escrever em chrome.storage.local a partir da página web:', e);
            }
        }
    }

    function removeKeysFromChrome(keys) {
        const normalizedKeys = Array.isArray(keys) ? keys : [keys];
        const keysToRemove = normalizedKeys.filter((k) => keyIsSyncable(k));
        if (!keysToRemove.length) {
            return;
        }
        if (extensionContextInvalidated || !chrome || !chrome.storage || !chrome.storage.local) {
            return;
        }
        try {
            chrome.storage.local.remove(keysToRemove, () => {
                if (chrome.runtime.lastError) {
                    const msg = chrome.runtime.lastError.message || '';
                    if (msg.includes('Extension context invalidated')) {
                        extensionContextInvalidated = true;
                        notifyBridgeDisconnectedOnce();
                    } else {
                        console.warn('Erro ao remover chaves de chrome.storage.local:', msg);
                    }
                }
            });
        } catch (e) {
            const msg = (e && e.message) || String(e);
            if (msg.includes('Extension context invalidated')) {
                extensionContextInvalidated = true;
                notifyBridgeDisconnectedOnce();
            } else {
                console.warn('Exceção ao remover chaves de chrome.storage.local:', e);
            }
        }
    }

    // Ouve mensagens vindas da página (options.js) via window.postMessage
    window.addEventListener('message', (event) => {
        // Garante que a mensagem venha da própria página, não de outros frames
        if (event.source !== window) return;

        const data = event.data || {};
        if (!data || data.source !== 'acfh-options-page') {
            return;
        }

        // Handshake: responde ao ping da página para indicar que a extensão está conectada
        if (data.type === PING_MESSAGE_TYPE) {
            try {
                chrome.storage.local.get(['autoClickerEnabled'], (state) => {
                    const hasAutoClickerEnabledState = !!(state && Object.prototype.hasOwnProperty.call(state, 'autoClickerEnabled'));
                    window.postMessage({
                        source: 'acfh-extension',
                        type: 'acfh-pong',
                        hasAutoClickerEnabledState,
                        autoClickerEnabled: hasAutoClickerEnabledState ? !!state.autoClickerEnabled : null,
                        timestamp: Date.now()
                    }, '*');
                });
            } catch (e) {
                try {
                    window.postMessage({
                        source: 'acfh-extension',
                        type: 'acfh-pong',
                        hasAutoClickerEnabledState: false,
                        autoClickerEnabled: null,
                        timestamp: Date.now()
                    }, '*');
                } catch (innerError) {
                    console.warn('Failed to send options ping response:', innerError);
                }
            }
            return;
        }

        if (data.type === RUNTIME_COMMAND_TYPE) {
            const requestId = data.requestId;
            const command = data.command || {};
            try {
                chrome.runtime.sendMessage(command, (response) => {
                    const error = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
                    window.postMessage({
                        source: 'acfh-extension',
                        type: 'acfh-runtime-response',
                        requestId,
                        response: response || { success: !error, error }
                    }, '*');
                });
            } catch (e) {
                window.postMessage({
                    source: 'acfh-extension',
                    type: 'acfh-runtime-response',
                    requestId,
                    response: { success: false, error: e && e.message ? e.message : String(e) }
                }, '*');
            }
            return;
        }

        if (data.type !== BRIDGE_MESSAGE_TYPE) {
            return;
        }

        if (data.items) {
            mirrorItemsToChrome(data.items);
        }
        if (data.removedKeys) {
            removeKeysFromChrome(data.removedKeys);
        }
    });

    // Na carga inicial, carrega configs atuais da extensão para o localStorage do site
    syncFromChromeToLocal();

    // Mantém o site sincronizado em tempo real quando algo muda no
    // chrome.storage.local (ex.: o usuário liga/desliga o toggle na popup).
    try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (extensionContextInvalidated) {
                return;
            }
            if (areaName !== 'local' || !changes) {
                return;
            }

            const filteredChanges = {};

            Object.entries(changes).forEach(([key, change]) => {
                if (!keyIsSyncable(key)) {
                    return;
                }

                const newValue = change ? change.newValue : undefined;

                // Atualiza localStorage do site.
                try {
                    if (typeof newValue === 'undefined') {
                        localStorage.removeItem(key);
                    } else {
                        localStorage.setItem(key, JSON.stringify(newValue));
                    }
                } catch (e) {
                    console.warn('Falha ao espelhar alteração para localStorage:', key, e);
                }

                filteredChanges[key] = { newValue };
            });

            // Notifica a página para que o UI possa reagir imediatamente.
            if (Object.keys(filteredChanges).length) {
                try {
                    window.postMessage({
                        source: 'acfh-extension',
                        type: 'acfh-chrome-storage-changed',
                        changes: filteredChanges,
                        timestamp: Date.now()
                    }, '*');
                } catch (e) {
                    console.warn('Falha ao notificar página sobre mudanças de storage:', e);
                }
            }
        });
    } catch (e) {
        console.warn('Exceção ao registrar listener de chrome.storage.onChanged no bridge:', e);
    }
})();
