// options.js
document.addEventListener('DOMContentLoaded', function() {
    window.acfhHoldProcessing = true;
    function closeOpenModals() {
        const modals = document.querySelectorAll('.modal, .popup-modal');
        modals.forEach((modal) => {
            modal.style.display = 'none';
        });
    }
    closeOpenModals();
    const langRoot = document.documentElement;
    window.setTimeout(() => {
        if (langRoot && langRoot.classList.contains('acfh-lang-init-pending')) {
            langRoot.classList.remove('acfh-lang-init-pending');
            langRoot.classList.add('acfh-lang-init-ready');
        }
    }, 1200);
    // Detecta se estamos em ambiente de extensão (chrome.* disponível)
    const isChromeExtensionEnv = (typeof chrome !== 'undefined' &&
        chrome && chrome.storage && chrome.storage.local);

    const EXTENSION_INSTALL_URL = 'https://chromewebstore.google.com/detail/jgkeppcdhlodchbjljdiajbieephocnb?utm_source=item-share-cb';
    const IS_LOCAL_OPTIONS_PAGE = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const ALLOW_STANDALONE_OPTIONS = false;


    // Flag global para indicar se a extensão está realmente conectada
    // à página de opções (via handshake com o content script).
    let acfhExtensionConnected = isChromeExtensionEnv;

    // Recebe atualizações do content script (webStorageBridge.js) quando
    // chrome.storage.local muda (ex.: toggle ON/OFF na popup) e aplica
    // imediatamente na UI sem precisar de refresh.
    function handleExtensionBridgeUpdates(event) {
        if (event.source !== window) return;
        const data = event.data || {};

        if (data.source === 'acfh-extension' && data.type === 'acfh-bridge-disconnected') {
            handleExtensionNotDetected();
            return;
        }

        if (data.source !== 'acfh-extension' || data.type !== 'acfh-chrome-storage-changed') {
            return;
        }

        const changes = data.changes || {};

        // Em ambiente web puro, o app usa localStorage como backend.
        // Espelha as alterações recebidas para manter o estado local consistente.
        try {
            Object.entries(changes).forEach(([key, payload]) => {
                if (!payload || !('newValue' in payload)) return;
                const newValue = payload.newValue;
                if (typeof newValue === 'undefined') {
                    localStorage.removeItem(key);
                } else {
                    localStorage.setItem(key, JSON.stringify(newValue));
                }
            });
        } catch (e) {
            console.warn('[ACFH] Failed to mirror bridge updates into localStorage:', e);
        }

        if ('autoClickerEnabled' in changes) {
            updateExtensionStatus();
        }

        handleRealtimeStorageChanges(changes);
    }

    window.addEventListener('message', handleExtensionBridgeUpdates);

    // Fallback para ambiente web puro: implementa um chrome.storage.local simples usando localStorage
    // e envia mensagens via window.postMessage para que a extensão (via content script)
    // possa espelhar os dados em chrome.storage.local
    if (!isChromeExtensionEnv) {
        const BRIDGE_MESSAGE_TYPE = 'acfh-storage-update';

        window.chrome = window.chrome || {};
        chrome.storage = chrome.storage || {};
        if (!chrome.storage.local) {
            chrome.storage.local = {
                get(keys, callback) {
                    const normalizedKeys = Array.isArray(keys) ? keys : Object.keys(keys || {});
                    const result = {};
                    normalizedKeys.forEach((key) => {
                        const raw = localStorage.getItem(key);
                        if (raw !== null) {
                            try {
                                result[key] = JSON.parse(raw);
                            } catch (e) {
                                result[key] = raw;
                            }
                        }
                    });
                    if (typeof callback === 'function') callback(result);
                },
                set(items, callback) {
                if (!acfhExtensionConnected) {
    console.warn('[ACFH] Modo web ativo - salvando localmente');

    Object.entries(items || {}).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
    });

    if (typeof callback === 'function') callback();
    return;
}
                    const storedItems = {};
                    Object.entries(items || {}).forEach(([key, value]) => {
                        try {
                            localStorage.setItem(key, JSON.stringify(value));
                            storedItems[key] = value;
                        } catch (e) {
                            console.warn('Falha ao salvar em localStorage para a chave', key, e);
                        }
                    });

                    // Notifica a extensão (content script) sobre alterações
                    try {
                        window.postMessage({
                            source: 'acfh-options-page',
                            type: BRIDGE_MESSAGE_TYPE,
                            items: storedItems
                        }, '*');
                    } catch (e) {
                        console.warn('Falha ao enviar mensagem de sincronização de storage', e);
                    }

                    if (typeof callback === 'function') callback();
                },
                remove(keys, callback) {
                    const normalizedKeys = Array.isArray(keys) ? keys : [keys];
                    if (!acfhExtensionConnected) {
                        normalizedKeys.forEach((key) => localStorage.removeItem(key));
                        console.warn('[ACFH] Extensão não detectada - remoção de configurações desativada.');
                        if (typeof callback === 'function') callback();
                        return;
                    }
                    normalizedKeys.forEach((key) => localStorage.removeItem(key));

                    try {
                        window.postMessage({
                            source: 'acfh-options-page',
                            type: BRIDGE_MESSAGE_TYPE,
                            removedKeys: normalizedKeys
                        }, '*');
                    } catch (e) {
                        console.warn('Falha ao enviar mensagem de remoção de storage', e);
                    }

                    if (typeof callback === 'function') callback();
                }
            };
        }

        // Shims adicionais para evitar erros em ambiente web puro
        // chrome.storage.onChanged: usado apenas em contexto de extensão; aqui vira no-op
        chrome.storage.onChanged = chrome.storage.onChanged || {
            addListener: function () { /* no-op em página web */ }
        };

        // chrome.runtime: usado para sendMessage/onMessage; aqui vira no-op seguro
        chrome.runtime = chrome.runtime || {
            sendMessage: function () { /* no-op em página web */ },
            onMessage: {
                addListener: function () { /* no-op em página web */ }
            },
            lastError: null
        };

        // chrome.userScripts: apenas existe em contexto da extensão; aqui fornecemos stubs
        chrome.userScripts = chrome.userScripts || {
            getScripts: function (callback) {
                if (typeof callback === 'function') callback([]);
            },
            register: function (config, callback) {
                if (typeof callback === 'function') callback();
            },
            unregister: function (config, callback) {
                if (typeof callback === 'function') callback();
            }
        };
    }

    // Wrapper unificado de storage: usa chrome.storage.local quando disponível
    // (rodando dentro da extensão) e, caso contrário, usa o shim baseado em
    // localStorage configurado acima.
    const acfhStorage = isChromeExtensionEnv && chrome && chrome.storage && chrome.storage.local
        ? chrome.storage.local
        : (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local
            ? chrome.storage.local
            : {
                get(keys, cb) { console.warn('acfhStorage shim GET não inicializado corretamente'); cb && cb({}); },
                set(items, cb) { console.warn('acfhStorage shim SET não inicializado corretamente', items); cb && cb(); },
                remove(keys, cb) { console.warn('acfhStorage shim REMOVE não inicializado corretamente', keys); cb && cb(); }
            });
    function removeExtensionInstallNotices() {
        document.getElementById('acfh-extension-warning')?.remove();
        document.getElementById('acfh-extension-footer-notice')?.remove();
        document.getElementById('acfh-extension-blocker')?.remove();
        document.documentElement.classList.remove('acfh-extension-missing');
    }
    // Exibe um aviso visual simples quando a extensão não é detectada
    function showExtensionWarningBanner() {
        if (document.getElementById('acfh-extension-warning')) return;

        const banner = document.createElement('div');
        banner.id = 'acfh-extension-warning';
        banner.innerHTML = '<strong>Auto Clicker - Form Helper</strong>: The extension is not installed. '
            + `<a id="acfh-install-link" href="${EXTENSION_INSTALL_URL}" target="_blank" rel="noopener noreferrer">Install</a>`;
        banner.style.position = 'fixed';
        banner.style.right = '18px';
        banner.style.bottom = '18px';
        banner.style.zIndex = '100001';
        banner.style.maxWidth = '360px';
        banner.style.padding = '10px 12px';
        banner.style.border = '1px solid rgba(148, 163, 184, 0.32)';
        banner.style.borderRadius = '10px';
        banner.style.background = 'rgba(15, 23, 42, 0.96)';
        banner.style.color = '#e5e7eb';
        banner.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        banner.style.fontSize = '13px';
        banner.style.textAlign = 'left';
        banner.style.boxShadow = '0 18px 40px rgba(0,0,0,0.34)';

        document.body.appendChild(banner);

    }

    function showExtensionBlockedScreen() {
        if (document.getElementById('acfh-extension-blocker')) return;
        document.documentElement.classList.add('acfh-extension-missing');

        const blocker = document.createElement('div');
        blocker.id = 'acfh-extension-blocker';
        blocker.innerHTML = `
            <div class="acfh-extension-card">
                <h2>Extension not installed</h2>
                <p>Install <strong>Auto Clicker - Form Helper</strong> to edit, save, and run these configurations.</p>
                <a class="acfh-install-btn" href="${EXTENSION_INSTALL_URL}" target="_blank" rel="noopener noreferrer">Install extension</a>
            </div>
        `;

        document.body.appendChild(blocker);
    }

    function showExtensionFooterNotice() {
        if (document.getElementById('acfh-extension-footer-notice')) return;
        const notice = document.createElement('div');
        notice.id = 'acfh-extension-footer-notice';
        notice.innerHTML = `<strong>The extension is not installed.</strong> <a href="${EXTENSION_INSTALL_URL}" target="_blank" rel="noopener noreferrer">Install</a>`;
        notice.style.position = 'fixed';
        notice.style.left = '0';
        notice.style.right = '0';
        notice.style.top = '58px';
        notice.style.zIndex = '100002';
        notice.style.padding = '11px 18px';
        notice.style.background = 'linear-gradient(90deg, #991b1b, #dc2626)';
        notice.style.borderBottom = '1px solid rgba(254, 202, 202, 0.35)';
        notice.style.color = '#fff';
        notice.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        notice.style.fontSize = '14px';
        notice.style.textAlign = 'center';
        notice.style.boxShadow = '0 12px 30px rgba(127, 29, 29, 0.36)';
        notice.style.animation = 'acfhMissingSlide 420ms ease-out both';
        document.body.appendChild(notice);
    }

    function hideProcessingOverlay() {
        window.acfhHoldProcessing = false;
        const overlay = document.querySelector('.settings-processing-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.remove('quick');
        }

        // Signal to the local bootstrap loader that the app is ready to be revealed.
        try {
            if (!window.__acfhAppReadyFired) {
                window.__acfhAppReadyFired = true;
                window.dispatchEvent(new Event('acfh:app-ready'));
            }
        } catch (e) {
            // ignore
        }
    }

    // Remove quaisquer dados locais deixados pela extensão quando ela
    // não está mais instalada/ativa e desabilita a interface de configs.
    function handleExtensionNotDetected() {
        if (ALLOW_STANDALONE_OPTIONS) {
            acfhExtensionConnected = false;
            hideProcessingOverlay();
            closeOpenModals();
            startOptionsApp();
            return;
        }

        acfhExtensionConnected = false;

        try {
            const keysToClear = [
                'configurations',
                'activeConfigId',
                'configMode',
                'sandboxMode',
                'contentScriptApi',
                'blacklist',
                'blacklistSites',
                'feedbackMode',
                'autoClickConfig',
                'activeAutomationMode',
                'acfhOptionsSession',
                'ocrRules',
                'ocrSettings',
                'ocrInjectionTiming',
                'userScripts',
                'activeUserScriptId',
                'independentUserScript',
                'independentUserScriptLastEdited',
                'userScriptInjectionTiming'
            ];
            keysToClear.forEach((k) => localStorage.removeItem(k));
            for (let i = localStorage.length - 1; i >= 0; i -= 1) {
                const key = localStorage.key(i);
                if (
                    key &&
                    (key.startsWith('action_name_') ||
                        key.startsWith('customScript_') ||
                        key.startsWith('UserScript_') ||
                        key.startsWith('scriptLastEdited_') ||
                        (key.startsWith('acfh') && key !== 'acfhPreferredLanguage' && key !== 'acfhOptionsSession'))
                ) {
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            console.warn('[ACFH] Falha ao limpar localStorage após detectar ausência da extensão:', e);
        }

        showExtensionFooterNotice();
        showExtensionBlockedScreen();
        hideProcessingOverlay();
        closeOpenModals();
        return;

        // Cria uma camada visual sobre a área de configurações indicando
        // que elas estão indisponíveis sem a extensão instalada.
        const configContent = document.querySelector('.config-content');
        if (configContent && !document.getElementById('acfh-disabled-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'acfh-disabled-overlay';
            overlay.style.position = 'absolute';
            overlay.style.inset = '0';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.background = 'rgba(15,15,20,0.85)';
            overlay.style.zIndex = '9000';
            overlay.style.backdropFilter = 'blur(2px)';
            overlay.style.color = '#e5e7eb';
            overlay.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            overlay.style.textAlign = 'center';
            overlay.innerHTML = '<div style="max-width:420px;padding:16px;">'
                + '<h3 style="margin:0 0 8px;font-size:16px;">Extensão necessária</h3>'
                + '<p style="margin:0;font-size:13px;line-height:1.5;">'
                + 'Instale e ative a extensão <strong>Auto Clicker - Form Helper</strong> no seu navegador '
                + 'para criar, salvar e aplicar configurações de automação.</p>'
                + '</div>';

            // Garante que o contêiner pai permita posicionamento absoluto
            const parent = configContent.parentElement || configContent;
            if (getComputedStyle(parent).position === 'static') {
                parent.style.position = 'relative';
            }
            parent.appendChild(overlay);
        }
    }

    // Inicia handshake com o content script para detectar se a extensão está ativa
    function initExtensionHandshake() {
        if (isChromeExtensionEnv) {
            // Já estamos dentro do contexto da extensão; não é necessário handshake
            return;
        }

        const PING_MESSAGE_TYPE = 'acfh-ping';
        let pongReceived = false;

        function handlePong(event) {
            if (event.source !== window) return;
            const data = event.data || {};
            if (data.source === 'acfh-extension' && data.type === 'acfh-pong') {
                pongReceived = true;
                acfhExtensionConnected = true;
                removeExtensionInstallNotices();
                window.removeEventListener('message', handlePong);
                console.log('[ACFH] Extensão conectada à página de opções.');
                startOptionsApp();
            }
        }

        window.addEventListener('message', handlePong);

        try {
            window.postMessage({
                source: 'acfh-options-page',
                type: PING_MESSAGE_TYPE,
                timestamp: Date.now()
            }, '*');
        } catch (e) {
            console.warn('[ACFH] Falha ao enviar ping para verificar extensão:', e);
        }

        // Se nenhum pong chegar em 1500ms, assume que a extensão não está conectada
        setTimeout(() => {
            if (!pongReceived) {
                console.warn('[ACFH] Extensão não detectada para a página de opções.');
                handleExtensionNotDetected();
            }
        }, 1500);
    }

    // Dispara o handshake apenas quando estamos no modo página web
    if (!isChromeExtensionEnv) {
        initExtensionHandshake();
    }

    const actionConfigModal = document.getElementById('actionConfigModal');
    const cancelModalButton = document.querySelector('.btn-cancel-modal');
    const saveModalButton = document.querySelector('.btn-save-modal');
    const btnAddAction = document.querySelector('.btn-add-action');
    const xpathActionsContainer = document.getElementById('xpath-actions-container');
    const xpathActionTemplate = document.getElementById('xpath-action-template');
    const configNameInput = document.getElementById('configName');
    const configUrlInput = document.getElementById('configUrl');
    const configList = document.querySelector('.config-list-desktop');
    const configSelect = document.getElementById('configuration-list');
    const configListItemTemplate = document.getElementById('config-list-item-template');
    const initWaitInput = document.getElementById('initWait');
    const saveNotification = document.getElementById('saveNotification');
    const moreOptionsBtn = document.querySelector('.more-options-btn');
    const bulkActionsMenu = document.getElementById('bulkActionsMenu');
    const bulkExportBtn = document.getElementById('bulkExportBtn');
    const bulkImportBtn = document.getElementById('bulkImportBtn');
    const bulkRemoveActiveBtn = document.getElementById('bulkRemoveActiveBtn');
    const importConfigIconBtn = document.getElementById('importConfigIconBtn');
    const exportConfigIconBtn = document.getElementById('exportConfigIconBtn');
    const configColorIconBtn = document.getElementById('configColorIconBtn');
    const configColorPalette = document.getElementById('configColorPalette');
    const optionsSessionButtons = document.querySelectorAll('button[data-options-session]');
    const optionsPanels = document.querySelectorAll('[data-options-panel]');
    const scriptEditorContainer = document.getElementById('scriptEditor');
    const scriptEditorEmpty = document.getElementById('scriptEditorEmpty');
    const scriptNamespaceLabel = document.getElementById('scriptNamespace');
    const scriptUrlMatchLabel = document.getElementById('scriptUrlMatch');
    const saveUserscriptBtn = document.querySelector('.btn-save-userscript');
    const discardUserscriptBtn = document.querySelector('.btn-discard-userscript');
    const userscriptExpandToggle = document.getElementById('userscriptExpandToggle');
    const ocrCaptureBtn = document.getElementById('ocrCaptureBtn');
    const ocrRunNowBtn = document.getElementById('ocrRunNowBtn');
    const ocrNextBtn = document.getElementById('ocrNextBtn');
    const ocrPreviewBtn = document.getElementById('ocrPreviewBtn');
    const ocrStopBtn = document.getElementById('ocrStopBtn');
    const ocrClearBtn = document.getElementById('ocrClearBtn');
    const ocrActionSelect = document.getElementById('ocrActionSelect');
    const ocrActionModeSelect = document.getElementById('ocrActionMode');
    const ocrScrollDirectionSelect = document.getElementById('ocrScrollDirection');
    const ocrScrollAmountInput = document.getElementById('ocrScrollAmount');
    const ocrCheckKindSelect = document.getElementById('ocrCheckKind');
    const ocrFillValueInput = document.getElementById('ocrFillValue');
    const ocrIntervalMsInput = document.getElementById('ocrIntervalMs');
    const ocrRepeatInput = document.getElementById('ocrRepeat');
    const ocrRulesList = document.getElementById('ocrRulesList');
    const sessionExpandButtons = document.querySelectorAll('[data-session-expand]');
    const sessionAddButtons = document.querySelectorAll('[data-session-add]');

    let currentEditingActionRow = null;
    let saveTimeout;
    let configurations = [];
    let activeConfigId = null;
    let userScripts = [];
    let activeUserScriptId = null;
    let ocrRules = [];
    let ocrSettings = null;
    let ocrSettingsSaveTimer = null;
    let hasUnsavedChanges = false;
    let lastClickFillActionPointerAt = 0;
    let lastOcrRuleInteractionAt = 0;
    let pendingOcrRulesRenderTimer = null;
    let lastUserScriptInteractionAt = 0;
    let pendingUserScriptReloadTimer = null;
let activeOptionsSession = ['click-fill', 'userscript', 'ocr'].includes(document.documentElement.dataset.optionsSession)
    ? document.documentElement.dataset.optionsSession
    : 'click-fill';
let inlineScriptEditor = null;
let inlineScriptConfigId = null;
let inlineScriptLoadToken = 0;
let isUserScriptEditorExpanded = false;
let userScriptSelectionMarks = [];
let userScriptWhitespaceMarks = [];
let userScriptFoldMarks = [];
let userScriptVisualRefreshTimer = null;
let userScriptFoldRefreshTimer = null;
let userScriptSyntaxTimer = null;
let userScriptSyntaxErrorLine = null;
let expandedSessionLists = {
    'click-fill': true,
    userscript: false,
    ocr: false
};
const ACTIVE_AUTOMATION_MODE_CLICK_FILL = 'click-fill';
const ACTIVE_AUTOMATION_MODE_USERSCRIPT = 'userscript';
const ACTIVE_AUTOMATION_MODE_OCR = 'ocr';
const INDEPENDENT_USERSCRIPT_KEY = 'independentUserScript';
const INDEPENDENT_USERSCRIPT_LAST_EDITED_KEY = 'independentUserScriptLastEdited';
const USER_SCRIPTS_KEY = 'userScripts';
const ACTIVE_USER_SCRIPT_ID_KEY = 'activeUserScriptId';
const OCR_RULES_KEY = 'ocrRules';
const OCR_SETTINGS_KEY = 'ocrSettings';
const USERSCRIPT_FOLD_GUTTER = 'CodeMirror-foldgutter';
const DEFAULT_CONFIG_COLOR = '#3b82f6';
const CONFIG_COLOR_PALETTE = [
    '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
    '#ec4899', '#94a3b8', '#f8fafc', '#111827'
];
const DEFAULT_BLACKLIST = ['google.com', 'facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'youtube.com'];
const SETTINGS_STORAGE_KEYS = [
    'uiLanguage',
    'acfhPreferredLanguage',
    'configMode',
    'contentScriptApi',
    'sandboxMode',
    'blacklist',
    'blacklistSites',
    'feedbackMode',
    'userScriptEditorEnabled',
    'userScriptEditorTheme',
    'userScriptEditorFontSize',
    'userScriptEditorKeyMap',
    'userScriptEditorIndentUnit',
    'userScriptEditorTabSize',
    'userScriptEditorIndentWith',
    'userScriptEditorTabMode',
    'userScriptEditorLineWrapping',
    'userScriptEditorMatchBrackets',
    'userScriptEditorAutoIndent',
    'userScriptEditorSelectionMatch',
    'userScriptEditorSaveOnBlur',
    'userScriptEditorSuppressSaveDialog',
    'userScriptEditorHighlightWhitespace',
    'userScriptEditorTrimTrailingWhitespace',
    'userScriptEditorAutoSyntaxCheck',
    'userScriptEditorSyntaxCheckMaxSize',
    'userScriptInjectionTiming',
    'ocrInjectionTiming'
];
const DEFAULT_INDEPENDENT_USERSCRIPT = `// ==UserScript==
// @name         Auto Clicker UserScript
// @namespace    Auto Clicker - Form Helper
// @version      1.0.0
// @description  Independent browser automation script
// @match        https://example.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('Auto Clicker UserScript running:', location.href);
})();
`;
let currentZoom = 100;
// English-only UI.
let currentUiLanguage = 'en';
let acfhOptionsInitialized = false;
let isRenderingClickFillConfig = false;



    const translationsPt = {
        initialWaitLabel: "Atraso inicial:",
        floatingBoxWaiting: "%time%",
        floatingBoxWaitingElements: "Aguardando elementos...",
        floatingBoxXpathClick: "Ações: %count%",
        floatingBoxXpathFinished: "Concluído",
        floatingBoxAllFinished: "Todas as tarefas foram concluídas!",
        reloadPageMessage: "A página será recarregada para reinjeção.",
        configSaved: "Configuração salva!",
        addXpathAlert: "Adicione uma configuração primeiro.",
        xpathLabel: "XP",
        clickLabel: "Ações",
        intervalLabel: "Intervalo:",
        elementsLabel: "Elementos",
        xpathWaitLabel: "Atraso do XP:",
        floatingBoxXPathInvalid: "XPath inválido",
        floatingBoxAllXpathsInvalid: "Todos os XPaths são inválidos",
        popupTitle: "Auto Clicker - Form Helper",
        appTitle: "Auto Clicker - Form Helper",
        deleteSettingsTitle: "Excluir configurações",
        importSettingsTitle: "Importar configurações",
        exportSettingsTitle: "Exportar configurações",
        iframeSelectorLabel: "Página principal (URL)",
        iframeSelectorPlaceholder: "ex.: http://www.exemplo.com",
        noElementsLabel: "Sem ações",
        xpathElementsLabel: "════════════════ Elemento XPath ════════════ Intervalo (ms) ════ Repetir ═══════",
        addXpathButton: "+ Adicionar XPath",
        saveButton: "Salvar",
        configImported: "✔ Configurações importadas com sucesso!",
        importError: "Erro ao importar o JSON.",
        configDeleted: "⚠ Configurações excluídas.",
        modalYesButton: "Sim!",
        modalCancelButton: "Cancelar",
        modalDeleteConfirm: "Tem certeza de que deseja excluir TODAS as configurações?",
        modalOneXpathActive: "Pelo menos um XPath deve estar ativo.",
        modalXpathLimit: "O número máximo de XPaths foi atingido.",
        xpathInputPlaceholder: "ex.: //button[@id='start']",
        emptyConfigExport: "Nenhuma configuração para exportar.",
        incompleteConfigExport: "Configurações incompletas! A URL ou seletor principal é obrigatório para exportar.",
        editFillButtonTitle: "Editar preenchimento",
        toggleModeButtonTitle: "Alternar modo",
        fillModeTitle: "Modo preencher",
        clickModeTitle: "Modo clique",
        fillModalTitle: "Configurar ação de preenchimento",
        fillSaveButton: "Salvar",
        fillCancelButton: "Cancelar",
        fillInputPlaceholder: "ex.: usuario",
        initialWaitInputLabel: "Atraso inicial (s):",
        clickOptionLabel: "Clique",
        typeOptionLabel: "Digitar",
        copyOptionLabel: "Copiar",
        disableAction: "Desativar",
        enableAction: "Ativar",
        invalidXPathInAction: "XPath inválido na ação:",
        invalidCSSSelectorInAction: "Seletor CSS inválido na ação:",
        editActionTitle: "#Editar ação",
        editActionDescription: "Configure os detalhes da ação aqui. Defina o valor a ser preenchido, o atraso inicial e o método de preenchimento.",
        editActionValueLabel: "Valor para preencher",
        editActionValuePlaceholder: "Ex: meu_usuario",
        editActionInitialDelayLabel: "Atraso inicial (s)",
        editActionInitialDelayTooltip: "Define o atraso inicial desta ação.",
        editActionPasteLabel: "Colar",
        editActionTypeLabel: "Digitar",
        modalSaveButtonLabel: "Salvar",
        modalCancelButtonLabel: "Cancelar",
        modeFillLabel: "Preencher",
        modeClickLabel: "Clique",
        headerElementFinderTooltip: "Localizador do elemento, pode ser XPath ou seletor CSS.",
        headerIntervalTooltip: "Intervalo em milissegundos entre repetições desta ação.",
        editMenuEdit: "Editar ação",
        editMenuDuplicate: "Duplicar",
        feedbackInfoTooltip: "Quando você habilita o modo FloatBox, uma caixa flutuante aparece no canto inferior direito da página mostrando as ações em tempo real.",
        statusEnabledLabel: "Ativada",
        statusDisabledLabel: "Desativada"
    };

    const translationsEn = {
        initialWaitLabel: "Initial Wait:",
        floatingBoxWaiting: "%time%",
        floatingBoxWaitingElements: "Waiting for elements...",
        floatingBoxXpathClick: "Actions: %count%",
        floatingBoxXpathFinished: "Completed",
        floatingBoxAllFinished: "All tasks completed!",
        reloadPageMessage: "Page will be reloaded for reinjection.",
        configSaved: "Configuration saved!",
        addXpathAlert: "Add a configuration first.",
        xpathLabel: "XP",
        clickLabel: "Actions",
        intervalLabel: "Interval:",
        elementsLabel: "Elements",
        xpathWaitLabel: "XP Delay:",
        floatingBoxXPathInvalid: "Invalid XPath",
        floatingBoxAllXpathsInvalid: "All XPaths are invalid",
        popupTitle: "Auto Clicker - Form Helper",
        appTitle: "Auto Clicker - Form Helper",
        deleteSettingsTitle: "Delete configurations",
        importSettingsTitle: "Import configurations",
        exportSettingsTitle: "Export configurations",
        iframeSelectorLabel: "Main page (URL)",
        iframeSelectorPlaceholder: "e.g., http://www.example.com",
        initialWaitPlaceholder: "Initial wait",
        noElementsLabel: "No actions",
        xpathElementsLabel: "════════════════ Element XPath ════════════ Interval (ms) ════ Repeat ═══════",
        addXpathButton: "+ Add XPath",
        saveButton: "Save",
        configImported: "✔ Configurations imported successfully!",
        importError: "Error importing JSON.",
        configDeleted: "⚠ All configurations deleted.",
        modalYesButton: "Yes!",
        modalCancelButton: "Cancel",
        modalDeleteConfirm: "Are you sure you want to delete ALL configurations?",
        modalOneXpathActive: "At least one XPath must be active.",
        modalXpathLimit: "The maximum number of XPaths has been reached.",
        xpathInputPlaceholder: "e.g., //button[@id='start']",
        emptyConfigExport: "No configurations to export.",
        incompleteConfigExport: "Incomplete configurations! Main URL or selector is required to export.",
        editFillButtonTitle: "Edit fill",
        toggleModeButtonTitle: "Toggle mode",
        fillModeTitle: "Fill mode",
        clickModeTitle: "Click mode",
        fillModalTitle: "Configure fill action",
        fillSaveButton: "Save",
        fillCancelButton: "Cancel",
        fillInputPlaceholder: "e.g., username",
        initialWaitInputLabel: "Initial Wait (s):",
        clickOptionLabel: "Click",
        typeOptionLabel: "Type",
        copyOptionLabel: "Copy",
        disableAction: "Disable",
        enableAction: "Enable",
        invalidXPathInAction: "Invalid XPath in action:",
        invalidCSSSelectorInAction: "Invalid CSS Selector in action:",
        editActionTitle: "#Edit action",
        editActionDescription: "Configure the action details here. Set the value to fill, the initial delay and the fill method.",
        editActionValueLabel: "Value to fill",
        editActionValuePlaceholder: "E.g.: my_user",
        editActionInitialDelayLabel: "Initial delay (s)",
        editActionInitialDelayTooltip: "Defines this action's initial delay.",
        editActionPasteLabel: "Paste",
        editActionTypeLabel: "Type",
        modalSaveButtonLabel: "Save",
        modalCancelButtonLabel: "Cancel",
        modeFillLabel: "Fill",
        modeClickLabel: "Click",
        headerElementFinderTooltip: "Element locator, can be XPath or CSS selector.",
        headerIntervalTooltip: "Interval in milliseconds between repetitions of this action.",
        editMenuEdit: "Edit action",
        editMenuDuplicate: "Duplicate",
        feedbackInfoTooltip: "When you enable FloatBox mode, a floating box appears in the bottom-right corner of the page showing actions in real time.",
        statusEnabledLabel: "Enabled",
        statusDisabledLabel: "Disabled"
    };

    let translations = translationsEn;

    function setTranslationsByLanguage(lang) {
        const normalize = window.ACFH_I18N && typeof window.ACFH_I18N.normalizeLang === 'function'
            ? window.ACFH_I18N.normalizeLang
            : (value) => {
                const short = String(value || '').toLowerCase().split('-')[0];
                return ['en', 'pt', 'es', 'fr'].includes(short) ? short : 'en';
            };
        currentUiLanguage = normalize(lang || 'en');
        translations = currentUiLanguage === 'pt' ? translationsPt : translationsEn;
        if (window.ACFH_I18N && currentUiLanguage !== 'en') {
            translations = {
                ...translations,
                statusEnabledLabel: window.ACFH_I18N.t('Enabled', currentUiLanguage),
                statusDisabledLabel: window.ACFH_I18N.t('Disabled', currentUiLanguage),
                modeFillLabel: window.ACFH_I18N.t('Fill', currentUiLanguage),
                modeClickLabel: window.ACFH_I18N.t('Click', currentUiLanguage),
                configSaved: window.ACFH_I18N.t('Configuration saved!', currentUiLanguage),
                addXpathAlert: window.ACFH_I18N.t('Add a configuration first.', currentUiLanguage)
            };
        }
    }

    function applyInterfaceLanguage(lang) {
        setTranslationsByLanguage(lang);

        if (document.documentElement) {
            document.documentElement.setAttribute('lang', currentUiLanguage);
        }

        const isEn = currentUiLanguage === 'en';
        const tr = (en, pt) => {
            if (currentUiLanguage === 'pt') return pt;
            return window.ACFH_I18N && typeof window.ACFH_I18N.t === 'function'
                ? window.ACFH_I18N.t(en, currentUiLanguage)
                : en;
        };

        const map = [
            { sel: '.status-label', pt: 'Status', en: 'Status' },
            { sel: '.btn-new-config', pt: 'Nova Config', en: 'New Config' },
            { sel: '#bulkExportBtn', pt: 'Exportar todas as configurações', en: 'Export all configurations' },
            { sel: '#bulkImportBtn', pt: 'Importar configurações', en: 'Import configurations' },
            { sel: '#bulkRemoveActiveBtn', pt: 'Remover todas as configurações', en: 'Remove all configurations' },
            { sel: '.config-title-bold', pt: 'Configurações', en: 'Settings' },
            { sel: '.action-title', pt: 'Ações', en: 'Action' },
            // Labels principais do formulário de configuração
            { sel: 'label[for="configName"]', pt: 'Nome', en: 'Name' },
            { sel: 'label[for="configUrl"]', pt: 'URL', en: 'URL' },
            { sel: 'label[for="initWait"]', pt: 'Atraso inicial (s)', en: 'Initial delay (s)' },
            // Cabeçalhos da tabela de ações
            { sel: '.header-item.header-name', pt: 'Nome', en: 'Name' },
            { sel: '.header-item.header-element-finder', pt: 'Localizador de elemento', en: 'Element Finder' },
            { sel: '.header-item.header-mode', pt: 'Modo', en: 'Mode' },
            { sel: '.header-item.header-interval-ms', pt: 'Intervalo (ms)', en: 'Inter. (ms)' },
            { sel: '.header-item.header-repeat', pt: 'Repet.', en: 'Repeat' },
            // Botão "Adicionar ação"
            { sel: '.btn-add-action', pt: 'Adicionar ação', en: 'Add action' },
            { sel: '#settingsPopup h3', pt: 'Configurações', en: 'Settings' },
            { sel: 'label[for="configMode"]', pt: 'Modo de configuração:', en: 'Configuration mode:' },
            { sel: '#securitySection h4', pt: 'Recursos', en: 'Resources' },
            { sel: '#blacklistTitle', pt: 'Lista de bloqueio', en: 'Blacklist' },
            { sel: 'label[for="sandboxMode"]', pt: 'Modo sandbox:', en: 'Sandbox mode:' },
            { sel: 'label[for="blacklistSites"]', pt: 'Sites bloqueados:', en: 'Blocked sites:' },
            { sel: '#settingsPopup h4.title-with-icon', pt: 'Feedback', en: 'Feedback' },
            { sel: 'label[for="feedbackNone"]', pt: 'Nenhum', en: 'None' },
            { sel: 'label[for="feedbackFloatbox"]', pt: 'FloatBox', en: 'FloatBox' },
            { sel: '.popup-footer .btn-save-popup', pt: 'Salvar', en: 'Save' },
            { sel: '.popup-footer .btn-cancel-popup', pt: 'Cancelar', en: 'Cancel' }
        ];

        map.forEach(item => {
            const el = document.querySelector(item.sel);
            if (!el) return;
            const text = tr(item.en, item.pt);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
            } else {
                const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) {
                    textNodes[0].textContent = text;
                    for (let i = 1; i < textNodes.length; i++) {
                        textNodes[i].textContent = textNodes[i].textContent.trim() ? ' ' : '';
                    }
                } else {
                    el.textContent = text;
                }
            }
        });

        const searchInput = document.getElementById('searchConfig');
        if (searchInput) {
            searchInput.placeholder = tr('Search configuration', 'Buscar configuracao');
        }

        // Ajustar opções dos selects de configuração de acordo com o idioma
        const configModeSelect = document.getElementById('configMode');
        if (configModeSelect) {
            Array.from(configModeSelect.options).forEach(opt => {
                if (opt.value === 'beginner') {
                    opt.textContent = tr('Beginner', 'Iniciante');
                } else if (opt.value === 'advanced') {
                    opt.textContent = tr('Advanced', 'Avancado');
                }
            });
        }

        const contentScriptSelect = document.getElementById('contentScriptApi');
        if (contentScriptSelect) {
            Array.from(contentScriptSelect.options).forEach(opt => {
                if (opt.value === 'dynamicUserScriptApi') {
                    opt.textContent = tr('None', 'Nenhum');
                } else if (opt.value === 'userScriptApi') {
                    opt.textContent = 'UserScripts';
                }
            });
        }

        const sandboxModeSelect = document.getElementById('sandboxMode');
        if (sandboxModeSelect) {
            Array.from(sandboxModeSelect.options).forEach(opt => {
                if (opt.value === 'default') {
                    opt.textContent = tr('Default', 'Padrao');
                } else if (opt.value === 'forceDOM') {
                    opt.textContent = tr('Force DOM', 'Forcar DOM');
                }
            });
        }

        // Pill do popup de configurações (Settings / Configurações)
        const settingsPill = document.querySelector('#settingsPopup .settings-title-group .modal-pill');
        if (settingsPill) {
            settingsPill.textContent = tr('SETTINGS', 'CONFIGURACOES');
        }

        // -------- Modal "Editar ação" --------
        const editTitle = document.querySelector('#actionConfigModal .modal-header h3');
        if (editTitle) {
            editTitle.textContent = translations.editActionTitle;
        }

        const editDescription = document.querySelector('#actionConfigModal .modal-description');
        if (editDescription) {
            editDescription.textContent = translations.editActionDescription;
        }

        const valueLabel = document.querySelector('label[for="modalValueInput"]');
        if (valueLabel) {
            valueLabel.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) node.textContent = translations.editActionValueLabel;
            });
        }

        const valueInput = document.getElementById('modalValueInput');
        if (valueInput) {
            valueInput.placeholder = translations.editActionValuePlaceholder;
        }

        const delayLabel = document.querySelector('label[for="modalActionInitialWait"]');
        if (delayLabel) {
            const textNodes = Array.from(delayLabel.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
            if (textNodes.length > 0) {
                textNodes[0].textContent = translations.editActionInitialDelayLabel + ' ';
                for (let i = 1; i < textNodes.length; i++) {
                    textNodes[i].textContent = '';
                }
            }
        }
        const delayInfoIcon = delayLabel ? delayLabel.querySelector('.info-icon') : null;
        if (delayInfoIcon) {
            delayInfoIcon.title = translations.editActionInitialDelayTooltip;
        }

        const pasteLabel = document.querySelector('label[for="pasteOption"]');
        if (pasteLabel) {
            pasteLabel.textContent = translations.editActionPasteLabel;
        }
        const typeLabel = document.querySelector('label[for="typeOption"]');
        if (typeLabel) {
            typeLabel.textContent = translations.editActionTypeLabel;
        }

        const modalSaveBtn = document.querySelector('#actionConfigModal .btn-save-modal');
        if (modalSaveBtn) {
            modalSaveBtn.textContent = translations.modalSaveButtonLabel;
        }
        const modalCancelBtn = document.querySelector('#actionConfigModal .btn-cancel-modal');
        if (modalCancelBtn) {
            modalCancelBtn.textContent = translations.modalCancelButtonLabel;
        }

        // Tooltips dos cabeçalhos da tabela de ações
        const headerElementInfo = document.querySelector('.header-item.header-element-finder .info-icon');
        if (headerElementInfo) {
            headerElementInfo.title = translations.headerElementFinderTooltip || translations.headerElementFinderTooltip;
        }
        const headerIntervalInfo = document.querySelector('.header-item.header-interval-ms .info-icon');
        if (headerIntervalInfo) {
            headerIntervalInfo.title = translations.headerIntervalTooltip;
        }

        // Menu de edição da ação
        const editMenuEdit = document.querySelector('#edit-action-menu-template .edit-action-option');
        if (editMenuEdit) {
            const textNode = Array.from(editMenuEdit.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
            if (textNode) textNode.textContent = ' ' + translations.editMenuEdit;
        }
        const editMenuDuplicate = document.querySelector('#edit-action-menu-template .duplicate-action-option');
        if (editMenuDuplicate) {
            const textNode = Array.from(editMenuDuplicate.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
            if (textNode) textNode.textContent = ' ' + translations.editMenuDuplicate;
        }
        const editMenuDisableSpan = document.querySelector('#edit-action-menu-template .disable-action-option .action-text');
        if (editMenuDisableSpan) {
            editMenuDisableSpan.textContent = translations.disableAction;
        }

        // Tooltip da seção Feedback nas configurações
        const feedbackInfoIcon = document.querySelector('#settingsPopup h4.title-with-icon .info-icon');
        if (feedbackInfoIcon) {
            feedbackInfoIcon.title = translations.feedbackInfoTooltip;
        }

        // Atualizar labels do select de modo (Preencher/Clique ou Fill/Click)
        const modeSelects = document.querySelectorAll('.action-mode-select');
        modeSelects.forEach(select => {
            Array.from(select.options).forEach(opt => {
                if (opt.value === 'fill') {
                    opt.textContent = translations.modeFillLabel;
                } else if (opt.value === 'click') {
                    opt.textContent = translations.modeClickLabel;
                }
            });
        });

        // Atualiza o badge de status da extensão com o texto correto no idioma atual
        updateExtensionStatus();

        // Marca a página como inicializada para evitar o flash
        // do HTML no idioma padrão antes da tradução ser aplicada.
        const root = document.documentElement;
        if (root.classList.contains('acfh-lang-init-pending')) {
            root.classList.remove('acfh-lang-init-pending');
        }
        root.classList.add('acfh-lang-init-ready');

        if (window.ACFH_I18N && typeof window.ACFH_I18N.refresh === 'function') {
            window.ACFH_I18N.refresh(currentUiLanguage);
        }
    }

    const svgs = {
        waitingTime: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8V12L15 15" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="9" stroke="#ABB2BF" stroke-width="2"/>
            </svg>
        `,
        waitingElements: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M21 21L16.65 16.65" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        xpathClick: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#00FF00"/>
            </svg>
        `,
        xpathFinished: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        allFinished: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        invalidXpath: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13" stroke="#FF5722" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 17H12.01" stroke="#FF5722" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10.29 3.86L2.3 17.51C1.63 18.66 2.43 20 3.79 20H20.21C21.57 20 22.37 18.66 21.7 17.51L13.71 3.86C13.39 3.32 12.61 3.32 12.29 3.86Z" stroke="#FF5722" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        trashIcon: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H21" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11V17" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M14 11V17" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        penIcon: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 20H20" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.0001 2.00008C18.2653 1.73489 18.5835 1.52733 18.9381 1.38874C19.2927 1.25016 19.6766 1.18344 20.0631 1.19245C20.4496 1.20147 20.8291 1.28607 21.1824 1.44023C21.5356 1.59439 21.8596 1.81599 22.1462 2.1026C22.4328 2.38921 22.6544 2.71324 22.8086 3.06649C22.9627 3.41975 23.0473 3.79924 23.0564 4.18579C23.0654 4.57234 22.9987 4.95625 22.8601 5.31086C22.7215 5.66547 22.5140 5.98366 22.2488 6.24885L7.5 21L2 22L3 16.5L18.0001 2.00008Z" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        mouseClick: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.686 2 6 4.686 6 8V16C6 19.314 8.686 22 12 22C15.314 22 18 19.314 18 16V8C18 4.686 15.314 2 12 2Z" stroke="#ABB2BF" stroke-width="2"/>
              <path d="M12 2V8" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `,
        ballIcon: `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#007BFF"/>
            </svg>
        `,
        typeIcon: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4H8C5.79086 4 4 5.79086 4 8V16C4 18.2091 5.79086 20 8 20H16C18.2091 20 20 18.2091 20 16V8C20 5.79086 18.2091 4 16 4Z" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 10L15 10" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 10V14" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        copyIcon: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="#ABB2BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `
    };

    toggleMutationObserveOption();

    function showFillModal(currentFillValue, currentWaitInitModal) {
        const fillModal = document.getElementById("actionConfigModal");
        const fillTextInput = document.getElementById("modalValueInput");
        const initialWaitInput = document.getElementById("modalActionInitialWait");
        const fillSaveButton = document.querySelector(".btn-save-modal");
        const fillCancelButton = document.querySelector(".btn-cancel-modal");

        if (!fillModal || !fillTextInput || !initialWaitInput || !fillSaveButton || !fillCancelButton) {
            console.error("Error: Fill modal elements not found.");
            return Promise.resolve(undefined);
        }

        fillTextInput.value = currentFillValue;
        initialWaitInput.value = currentWaitInitModal;
        fillModal.style.display = "block";

        return new Promise((resolve) => {
            const onSave = () => {
                const newValue = fillTextInput.value;
                const newWaitInitModal = parseFloat(initialWaitInput.value) || 0;
                fillModal.style.display = "none";
                fillSaveButton.removeEventListener("click", onSave);
                fillCancelButton.removeEventListener("click", onCancel);
                resolve({ newValue, newWaitInitModal });
            };

            const onCancel = () => {
                fillModal.style.display = "none";
                fillSaveButton.removeEventListener("click", onSave);
                fillCancelButton.removeEventListener("click", onCancel);
                resolve(undefined);
            };

            fillSaveButton.addEventListener("click", onSave);
            fillCancelButton.addEventListener("click", onCancel);
        });
    }

    function hasClickFillDraftInput() {
        return Boolean(
            (configNameInput && configNameInput.value.trim()) ||
            (configUrlInput && configUrlInput.value.trim()) ||
            (initWaitInput && initWaitInput.value && initWaitInput.value !== '0') ||
            (xpathActionsContainer && xpathActionsContainer.querySelector('.xpath-action-row'))
        );
    }

    function isClickFillActionInteractionActive() {
        const activeElement = document.activeElement;
        const modalOpen = actionConfigModal && actionConfigModal.style.display === 'block';
        const focusInsideActions = Boolean(activeElement && activeElement.closest && activeElement.closest('#xpath-actions-container'));
        const recentPointerInsideActions = Date.now() - lastClickFillActionPointerAt < 1500;
        return Boolean(modalOpen || focusInsideActions || recentPointerInsideActions);
    }

    function isOcrRuleInteractionActive() {
        const activeElement = document.activeElement;
        const focusInsideRules = Boolean(activeElement && activeElement.closest && activeElement.closest('#ocrRulesList'));
        const recentPointerInsideRules = Date.now() - lastOcrRuleInteractionAt < 1500;
        return Boolean(focusInsideRules || recentPointerInsideRules);
    }

    function isUserScriptInteractionActive() {
        const activeElement = document.activeElement;
        const focusInsideUserScript = Boolean(activeElement && activeElement.closest && activeElement.closest('#userscript-tab'));
        const recentPointerInsideUserScript = Date.now() - lastUserScriptInteractionAt < 1500;
        return Boolean(focusInsideUserScript || recentPointerInsideUserScript);
    }

    function persistClickFillConfigurations(callback) {
        acfhStorage.set({
            configurations,
            activeConfigId,
            activeAutomationMode: ACTIVE_AUTOMATION_MODE_CLICK_FILL
        }, () => {
            updateConfigListAndDropdown();
            if (typeof callback === 'function') {
                callback();
            }
        });
    }

    function ensureActiveClickFillConfig(options = {}) {
        if (activeConfigId) {
            const existing = configurations.find(cfg => cfg.id == activeConfigId);
            if (existing) {
                return existing;
            }
        }

        if (options.force !== true && !hasClickFillDraftInput()) {
            return null;
        }

        const newConfig = {
            id: Date.now().toString(),
            name: configNameInput.value.trim() || 'Untitled configuration',
            url: configUrlInput.value.trim() || '',
            initWait: initWaitInput.value || '0',
            actions: [],
            color: DEFAULT_CONFIG_COLOR,
            applyColorToSession: false,
            createdAt: new Date().toISOString()
        };

        configurations.push(newConfig);
        activeConfigId = newConfig.id;
        persistClickFillConfigurations();
        console.log("Click and Fill configuration created:", newConfig);
        return newConfig;
    }

    function createConfigIfNotExists() {
    if (activeOptionsSession !== 'click-fill') return;
    const ensuredConfig = ensureActiveClickFillConfig();
    if (ensuredConfig) {
        hasUnsavedChanges = true;
        saveCurrentConfiguration(false);
    }
    return;
    const name = configNameInput.value.trim();
    const url = configUrlInput.value.trim();

    if (!name || !url) return;

    // Verifica se já existe
    const exists = configurations.find(c => c.name === name);

    if (exists) {
        activeConfigId = exists.id;
        return;
    }

    // Criar nova config automaticamente
    const newConfig = {
        id: Date.now().toString(),
        name: name,
        url: url,
        initWait: initWaitInput.value || '0',
        actions: [],
        color: DEFAULT_CONFIG_COLOR,
        applyColorToSession: false,
        createdAt: new Date().toISOString()
    };

    configurations.push(newConfig);
    activeConfigId = newConfig.id;

    // Salvar
    acfhStorage.set({ configurations, activeConfigId }, () => {
        // Propagar a nova configuração para as abas ativas se a extensão estiver ativa
        chrome.storage.local.get(['autoClickerEnabled'], (data) => {
            if (data.autoClickerEnabled && chrome.runtime && chrome.runtime.sendMessage) {
                // Construir o snapshot no mesmo formato que background.js espera
                const snapshot = {
                    iframe: newConfig.url,
                    waitInit: newConfig.initWait || '0',
                    actionType: 'copyOption',
                    xpaths: []
                };
                
                chrome.runtime.sendMessage({
                    action: "configUpdated",
                    activeConfigId: newConfig.id,
                    config: snapshot
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('[Auto-create] Erro ao enviar configUpdated:', chrome.runtime.lastError.message);
                    } else {
                        console.log('[Auto-create] Configuração propagada para background.js');
                    }
                });
            }
        });
    });

    console.log("Config criada automaticamente:", newConfig);
}

configNameInput.addEventListener('blur', createConfigIfNotExists);
configUrlInput.addEventListener('blur', createConfigIfNotExists);

let typingTimer;

function autoCreateOnTyping() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(createConfigIfNotExists, 800);
}

configNameInput.addEventListener('input', autoCreateOnTyping);
configUrlInput.addEventListener('input', autoCreateOnTyping);

// Detectar mudanças em name/URL de config existente e marcar para salvar
configNameInput.addEventListener('change', () => {
    if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
        persistOcrSettings(null, { showMessage: true });
        return;
    }
    if (activeOptionsSession !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) return;
    if (activeConfigId) {
        hasUnsavedChanges = true;
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveCurrentConfiguration(false);
        }, 500);
    }
});

configUrlInput.addEventListener('change', () => {
    if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
        persistOcrSettings(null, { showMessage: true });
        return;
    }
    if (activeOptionsSession !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) return;
    if (activeConfigId) {
        hasUnsavedChanges = true;
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveCurrentConfiguration(false);
        }, 500);
    }
});

initWaitInput.addEventListener('change', () => {
    if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
        persistOcrSettings(null, { showMessage: true });
        return;
    }
    if (activeOptionsSession !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) return;
    if (activeConfigId) {
        hasUnsavedChanges = true;
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveCurrentConfiguration(false);
        }, 500);
    }
});
    

    // Função para carregar o Action name do localStorage
function loadActionNameFromLocalStorage(actionRow) {
    if (!actionRow || !activeConfigId) return;
    
    const actionIndex = Array.from(xpathActionsContainer.querySelectorAll('.xpath-action-row')).indexOf(actionRow);
    const actionNameInput = actionRow.querySelector('.col-name input');
    
    if (!actionNameInput) return;
    
    // Tenta carregar do localStorage
    const savedActionName = localStorage.getItem(`action_name_${activeConfigId}_${actionIndex}`);
    
    if (savedActionName) {
        actionNameInput.value = savedActionName;
        console.log(`Action name "${savedActionName}" carregado do localStorage para configuração ${activeConfigId}, ação ${actionIndex}`);
    }
}

// Função para limpar Action names do localStorage quando uma configuração é excluída
// Função para limpar Action names do localStorage quando uma configuração é excluída
// Função para limpar Action names do localStorage quando uma configuração é excluída
function clearActionNamesFromLocalStorage(configId) {
    if (!configId) return;
    
    console.log(`Iniciando limpeza do localStorage para config ${configId}`);
    
    // Remover todas as chaves relacionadas a esta configuração
    const keysToRemove = [];
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key) {
            // Verifica se a chave está relacionada à configuração
            if (key.startsWith(`action_name_${configId}_`) || 
                key === `scriptLastEdited_${configId}` ||
                key === `customScript_${configId}` ||
                key === `UserScript_${configId}`) {
                keysToRemove.push(key);
            }
        }

        try {
            window.dispatchEvent(new CustomEvent('acfh-language-change', { detail: { lang: currentUiLanguage } }));
        } catch {
            // ignore
        }
    }
    
    // Remover todas as chaves encontradas
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removido do localStorage: ${key}`);
    });
    
    // Log se nada foi encontrado
    if (keysToRemove.length === 0) {
        console.log(`Nenhuma chave relacionada à config ${configId} encontrada no localStorage`);
    }
}
// Função para atualizar Action names ao carregar uma configuração
function loadAllActionNamesForConfig() {
    if (!activeConfigId) return;
    
    const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
    actionRows.forEach((row, index) => {
        loadActionNameFromLocalStorage(row);
    });
}







    function saveActionNameToLocalStorage(actionRow) {
    if (!actionRow || !activeConfigId) return;
    
    const actionNameInput = actionRow.querySelector('.col-name input');
    if (!actionNameInput) return;
    
    const actionName = actionNameInput.value.trim();
    const actionIndex = Array.from(xpathActionsContainer.querySelectorAll('.xpath-action-row')).indexOf(actionRow);
    
    // Salva no localStorage usando a chave composta
    localStorage.setItem(`action_name_${activeConfigId}_${actionIndex}`, actionName);
    console.log(`Action name "${actionName}" salvo no localStorage para configuração ${activeConfigId}, ação ${actionIndex}`);
}

    function showModal(message, withCancel = false) {
        return new Promise((resolve) => {
            const existingModal = document.querySelector('.modal');
            if (existingModal) {
                existingModal.remove();
            }

            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${translations.appTitle}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary modal-ok">${translations.modalYesButton}</button>
                        ${withCancel ? `<button class="btn btn-danger modal-cancel">${translations.modalCancelButton}</button>` : ''}
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const okBtn = modal.querySelector('.modal-ok');
            const cancelBtn = modal.querySelector('.modal-cancel');

            const close = (result) => {
                modal.remove();
                okBtn.removeEventListener('click', okHandler);
                if (cancelBtn) {
                    cancelBtn.removeEventListener('click', cancelHandler);
                }
                resolve(result);
            };

            const okHandler = () => {
                console.log('Yes! clicked');
                close(true);
            };
            const cancelHandler = () => {
                console.log('Cancel clicked');
                close(false);
            };

            okBtn.addEventListener('click', okHandler);
            if (withCancel && cancelBtn) {
                cancelBtn.addEventListener('click', cancelHandler);
            } else {
                setTimeout(() => close(undefined), 3000);
            }
        });
    }

    function showTemporaryMessage(message, type = 'success', duration = 1500) {
        if (!saveNotification) {
            console.error("saveNotification element not found.");
            return;
        }

        clearTimeout(saveTimeout);
        saveNotification.classList.remove('show', 'save-error');

        const textElement = saveNotification.querySelector('.save-text');
        if (textElement) {
            textElement.textContent = message;
        } else {
            console.error(".save-text element not found in saveNotification.");
            return;
        }

        const progressBar = document.querySelector('.save-progress-bar');
        if (progressBar) {
            progressBar.style.transition = 'none';
            progressBar.style.width = '0';
            progressBar.offsetWidth;
            progressBar.style.transition = 'width 1.2s linear';
            progressBar.style.backgroundColor = type === 'error' ? 'var(--red-btn, #dc3545)' : 'var(--green-btn, #28a745)';
        }

        if (type === 'error') {
            saveNotification.classList.add('save-error');
        }

        saveNotification.classList.add('show');
        if (progressBar) {
            progressBar.style.width = '100%';
        }

        saveTimeout = setTimeout(() => {
            saveNotification.classList.remove('show', 'save-error');
            if (progressBar) {
                progressBar.style.width = '0';
            }
        }, duration);
    }

    function maybeShowReviewReminder() {
        if (!acfhExtensionConnected) return;

        const countKey = 'acfhOptionsVisitCount';
        const key = 'acfhReviewReminderLastShown';
        const now = Date.now();
        const minInterval = 5 * 24 * 60 * 60 * 1000;
        let lastShown = 0;
        let visitCount = 0;

        try {
            lastShown = Number(localStorage.getItem(key) || 0);
            visitCount = Number(localStorage.getItem(countKey) || 0) + 1;
            localStorage.setItem(countKey, String(visitCount));
        } catch (e) {
            lastShown = 0;
            visitCount = 1;
        }

        if (visitCount < 3 || (lastShown && now - lastShown < minInterval)) {
            return;
        }

        setTimeout(() => {
            if (!acfhExtensionConnected || document.querySelector('.review-reminder-modal')) return;

            const reminder = document.createElement('div');
            reminder.className = 'review-reminder-modal';
            reminder.innerHTML = `
                <div class="review-reminder-dialog" role="dialog" aria-modal="true" aria-label="Review Auto Clicker">
                    <div>
                        <strong>Enjoying Auto Clicker?</strong>
                        <span>A quick Chrome Web Store review helps keep the extension improving.</span>
                    </div>
                    <div class="review-reminder-actions">
                        <a href="${EXTENSION_INSTALL_URL}" target="_blank" rel="noopener noreferrer">Review</a>
                        <button type="button">Later</button>
                    </div>
                </div>
            `;

            const rememberAndClose = () => {
                try {
                    localStorage.setItem(key, String(Date.now()));
                } catch (e) {
                    // ignore
                }
                reminder.classList.add('is-closing');
                window.setTimeout(() => reminder.remove(), 180);
            };

            reminder.querySelector('a')?.addEventListener('click', rememberAndClose);
            reminder.querySelector('button')?.addEventListener('click', rememberAndClose);
            reminder.addEventListener('click', (event) => {
                if (event.target === reminder) {
                    rememberAndClose();
                }
            });
            document.body.appendChild(reminder);

            try {
                localStorage.setItem(key, String(now));
            } catch (e) {
                // ignore
            }
        }, 2200);
    }

    function splitBlacklistText(value) {
        if (Array.isArray(value)) {
            return value.map(item => String(item).trim()).filter(Boolean);
        }
        if (typeof value === 'string') {
            return value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
        }
        return DEFAULT_BLACKLIST.slice();
    }

    function getBlacklistSourceInputs() {
        return [
            document.getElementById('blacklistSites'),
            document.getElementById('userScriptBlacklistSites')
        ].filter(Boolean);
    }

    function getBlacklistEditorSource(editor) {
        if (!editor) return null;
        const targetId = editor.getAttribute('data-target');
        return targetId ? document.getElementById(targetId) : editor.querySelector('.blacklist-source');
    }

    function setBlacklistValues(values, options = {}) {
        const nextList = splitBlacklistText(values);
        const nextText = nextList.join('\n');
        getBlacklistSourceInputs().forEach((input) => {
            input.value = nextText;
        });
        refreshBlacklistChipEditors(nextList);

        if (options.dispatchInput !== false) {
            const source = options.sourceInput || getBlacklistSourceInputs()[0];
            if (source) {
                source.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    function renderBlacklistChipEditor(editor, values = null) {
        const source = getBlacklistEditorSource(editor);
        const listEl = editor ? editor.querySelector('[data-blacklist-list]') : null;
        if (!editor || !source || !listEl) return;

        const sites = values ? splitBlacklistText(values) : splitBlacklistText(source.value);
        listEl.innerHTML = '';

        sites.forEach((site, index) => {
            const chip = document.createElement('span');
            chip.className = 'blacklist-chip';

            const label = document.createElement('span');
            label.className = 'blacklist-chip-text';
            label.textContent = site;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'blacklist-chip-remove';
            removeButton.setAttribute('aria-label', `Remove ${site}`);
            removeButton.addEventListener('click', () => {
                const nextSites = sites.filter((_, siteIndex) => siteIndex !== index);
                editor.dataset.adding = 'false';
                setBlacklistValues(nextSites, { sourceInput: source });
            });

            chip.append(label, removeButton);
            listEl.appendChild(chip);
        });

        if (editor.dataset.adding === 'true') {
            const draft = document.createElement('input');
            draft.type = 'text';
            draft.className = 'blacklist-chip-input';
            draft.placeholder = 'site.com';
            draft.setAttribute('aria-label', 'Blocked site');

            const commitDraft = () => {
                if (draft.dataset.committed === 'true') return;
                draft.dataset.committed = 'true';
                const nextSite = draft.value.trim();
                editor.dataset.adding = 'false';

                if (!nextSite) {
                    renderBlacklistChipEditor(editor);
                    return;
                }

                const currentSites = splitBlacklistText(source.value);
                const alreadyExists = currentSites.some(site => site.toLowerCase() === nextSite.toLowerCase());
                if (!alreadyExists) {
                    currentSites.push(nextSite);
                    setBlacklistValues(currentSites, { sourceInput: source });
                    return;
                }

                renderBlacklistChipEditor(editor);
            };

            draft.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    commitDraft();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    draft.dataset.committed = 'true';
                    editor.dataset.adding = 'false';
                    renderBlacklistChipEditor(editor);
                }
            });
            draft.addEventListener('blur', commitDraft);

            listEl.appendChild(draft);
            requestAnimationFrame(() => draft.focus());
        }
    }

    function refreshBlacklistChipEditors(values = null) {
        document.querySelectorAll('[data-blacklist-editor]').forEach((editor) => {
            renderBlacklistChipEditor(editor, values);
        });
    }

    function initBlacklistChipEditors() {
        document.querySelectorAll('[data-blacklist-editor]').forEach((editor) => {
            if (editor.dataset.blacklistBound !== 'true') {
                const addButton = editor.querySelector('[data-blacklist-add]');
                if (addButton) {
                    addButton.addEventListener('click', () => {
                        editor.dataset.adding = 'true';
                        renderBlacklistChipEditor(editor);
                    });
                }
                editor.dataset.blacklistBound = 'true';
            }
            renderBlacklistChipEditor(editor);
        });
    }

    function getSettingsElements() {
        return {
            configMode: document.getElementById('configMode'),
            contentScriptApi: document.getElementById('contentScriptApi'),
            sandboxMode: document.getElementById('sandboxMode'),
            blacklistSites: document.getElementById('blacklistSites'),
            userScriptEditorEnabled: document.getElementById('userScriptEditorEnabled'),
            userScriptEditorTheme: document.getElementById('userScriptEditorTheme'),
            userScriptEditorFontSize: document.getElementById('userScriptEditorFontSize'),
            userScriptEditorKeyMap: document.getElementById('userScriptEditorKeyMap'),
            userScriptEditorIndentUnit: document.getElementById('userScriptEditorIndentUnit'),
            userScriptEditorTabSize: document.getElementById('userScriptEditorTabSize'),
            userScriptEditorIndentWith: document.getElementById('userScriptEditorIndentWith'),
            userScriptEditorTabMode: document.getElementById('userScriptEditorTabMode'),
            userScriptEditorLineWrapping: document.getElementById('userScriptEditorLineWrapping'),
            userScriptEditorMatchBrackets: document.getElementById('userScriptEditorMatchBrackets'),
            userScriptEditorAutoIndent: document.getElementById('userScriptEditorAutoIndent'),
            userScriptEditorSelectionMatch: document.getElementById('userScriptEditorSelectionMatch'),
            userScriptEditorSaveOnBlur: document.getElementById('userScriptEditorSaveOnBlur'),
            userScriptEditorSuppressSaveDialog: document.getElementById('userScriptEditorSuppressSaveDialog'),
            userScriptEditorHighlightWhitespace: document.getElementById('userScriptEditorHighlightWhitespace'),
            userScriptEditorTrimTrailingWhitespace: document.getElementById('userScriptEditorTrimTrailingWhitespace'),
            userScriptEditorAutoSyntaxCheck: document.getElementById('userScriptEditorAutoSyntaxCheck'),
            userScriptEditorSyntaxCheckMaxSize: document.getElementById('userScriptEditorSyntaxCheckMaxSize'),
            userScriptInjectionTiming: document.getElementById('userScriptInjectionTiming'),
            userScriptSandboxMode: document.getElementById('userScriptSandboxMode'),
            userScriptBlacklistSites: document.getElementById('userScriptBlacklistSites'),
            ocrInjectionTiming: document.getElementById('ocrInjectionTiming'),
            feedbackNone: document.getElementById('feedbackNone'),
            feedbackFloatbox: document.getElementById('feedbackFloatbox'),
            securitySection: document.getElementById('securitySection')
        };
    }

    function normalizeSettings(data = {}) {
        const blacklist = Array.isArray(data.blacklist)
            ? splitBlacklistText(data.blacklist)
            : splitBlacklistText(data.blacklistSites || data.blacklist);
        const editorTheme = ['default', 'monokai', 'solarized', 'mdn-like', 'eclipse', 'railscasts', 'zenburn'].includes(data.userScriptEditorTheme)
            ? data.userScriptEditorTheme
            : 'monokai';
        const editorFontSize = ['50', '70', '80', '90', '100', '110', '120', '150'].includes(String(data.userScriptEditorFontSize))
            ? String(data.userScriptEditorFontSize)
            : '100';
        const editorIndentUnit = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].includes(String(data.userScriptEditorIndentUnit))
            ? String(data.userScriptEditorIndentUnit)
            : '4';
        const editorTabSize = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].includes(String(data.userScriptEditorTabSize))
            ? String(data.userScriptEditorTabSize)
            : '4';
        const editorKeyMap = ['windows', 'vscode', 'sublime', 'emacs', 'vim'].includes(data.userScriptEditorKeyMap)
            ? data.userScriptEditorKeyMap
            : 'vscode';
        const editorTabMode = ['classic', 'smart', 'indent'].includes(data.userScriptEditorTabMode)
            ? data.userScriptEditorTabMode
            : 'indent';
        const editorSelectionMatch = ['cursor', 'selection', 'off'].includes(data.userScriptEditorSelectionMatch)
            ? data.userScriptEditorSelectionMatch
            : 'cursor';
        const syntaxCheckMaxSize = Number.parseInt(data.userScriptEditorSyntaxCheckMaxSize, 10);

        return {
            uiLanguage: data.uiLanguage || data.acfhPreferredLanguage || currentUiLanguage || (document.documentElement && document.documentElement.lang) || 'en',
            configMode: data.configMode === 'advanced' ? 'advanced' : 'beginner',
            contentScriptApi: data.contentScriptApi === 'userScriptApi' ? 'userScriptApi' : 'dynamicUserScriptApi',
            sandboxMode: data.sandboxMode === 'forceDOM' ? 'forceDOM' : 'default',
            blacklist,
            blacklistSites: blacklist.join('\n'),
            feedbackMode: data.feedbackMode === 'floatbox' ? 'floatbox' : 'none',
            userScriptEditorEnabled: data.userScriptEditorEnabled !== false,
            userScriptEditorTheme: editorTheme,
            userScriptEditorFontSize: editorFontSize,
            userScriptEditorKeyMap: editorKeyMap,
            userScriptEditorIndentUnit: editorIndentUnit,
            userScriptEditorTabSize: editorTabSize,
            userScriptEditorIndentWith: data.userScriptEditorIndentWith === 'tabs' ? 'tabs' : 'spaces',
            userScriptEditorTabMode: editorTabMode,
            userScriptEditorLineWrapping: data.userScriptEditorLineWrapping !== false,
            userScriptEditorMatchBrackets: data.userScriptEditorMatchBrackets !== false,
            userScriptEditorAutoIndent: data.userScriptEditorAutoIndent !== false,
            userScriptEditorSelectionMatch: editorSelectionMatch,
            userScriptEditorSaveOnBlur: data.userScriptEditorSaveOnBlur === true,
            userScriptEditorSuppressSaveDialog: data.userScriptEditorSuppressSaveDialog !== false,
            userScriptEditorHighlightWhitespace: data.userScriptEditorHighlightWhitespace !== false,
            userScriptEditorTrimTrailingWhitespace: data.userScriptEditorTrimTrailingWhitespace !== false,
            userScriptEditorAutoSyntaxCheck: data.userScriptEditorAutoSyntaxCheck !== false,
            userScriptEditorSyntaxCheckMaxSize: Number.isFinite(syntaxCheckMaxSize) && syntaxCheckMaxSize > 0
                ? syntaxCheckMaxSize
                : 1000000,
            userScriptInjectionTiming: data.userScriptInjectionTiming === 'live' ? 'live' : 'reload',
            ocrInjectionTiming: data.ocrInjectionTiming === 'live' ? 'live' : 'reload'
        };
    }

    function readSettingsFromUi() {
        const elements = getSettingsElements();
        const activeBlacklistInput = activeOptionsSession === ACTIVE_AUTOMATION_MODE_USERSCRIPT && elements.userScriptBlacklistSites
            ? elements.userScriptBlacklistSites
            : elements.blacklistSites;
        const activeSandboxSelect = activeOptionsSession === ACTIVE_AUTOMATION_MODE_USERSCRIPT && elements.userScriptSandboxMode
            ? elements.userScriptSandboxMode
            : elements.sandboxMode;
        const blacklist = splitBlacklistText(activeBlacklistInput ? activeBlacklistInput.value : '');
        return normalizeSettings({
            uiLanguage: currentUiLanguage || (document.documentElement && document.documentElement.lang) || 'en',
            acfhPreferredLanguage: currentUiLanguage || (document.documentElement && document.documentElement.lang) || 'en',
            configMode: elements.configMode ? elements.configMode.value : 'beginner',
            contentScriptApi: elements.contentScriptApi ? elements.contentScriptApi.value : 'dynamicUserScriptApi',
            sandboxMode: activeSandboxSelect ? activeSandboxSelect.value : 'default',
            blacklist,
            feedbackMode: elements.feedbackFloatbox && elements.feedbackFloatbox.checked ? 'floatbox' : 'none',
            userScriptEditorEnabled: elements.userScriptEditorEnabled ? elements.userScriptEditorEnabled.checked : true,
            userScriptEditorTheme: elements.userScriptEditorTheme ? elements.userScriptEditorTheme.value : 'monokai',
            userScriptEditorFontSize: elements.userScriptEditorFontSize ? elements.userScriptEditorFontSize.value : '100',
            userScriptEditorKeyMap: elements.userScriptEditorKeyMap ? elements.userScriptEditorKeyMap.value : 'vscode',
            userScriptEditorIndentUnit: elements.userScriptEditorIndentUnit ? elements.userScriptEditorIndentUnit.value : '4',
            userScriptEditorTabSize: elements.userScriptEditorTabSize ? elements.userScriptEditorTabSize.value : '4',
            userScriptEditorIndentWith: elements.userScriptEditorIndentWith ? elements.userScriptEditorIndentWith.value : 'spaces',
            userScriptEditorTabMode: elements.userScriptEditorTabMode ? elements.userScriptEditorTabMode.value : 'indent',
            userScriptEditorLineWrapping: elements.userScriptEditorLineWrapping ? elements.userScriptEditorLineWrapping.checked : true,
            userScriptEditorMatchBrackets: elements.userScriptEditorMatchBrackets ? elements.userScriptEditorMatchBrackets.checked : true,
            userScriptEditorAutoIndent: elements.userScriptEditorAutoIndent ? elements.userScriptEditorAutoIndent.checked : true,
            userScriptEditorSelectionMatch: elements.userScriptEditorSelectionMatch ? elements.userScriptEditorSelectionMatch.value : 'cursor',
            userScriptEditorSaveOnBlur: elements.userScriptEditorSaveOnBlur ? elements.userScriptEditorSaveOnBlur.checked : false,
            userScriptEditorSuppressSaveDialog: elements.userScriptEditorSuppressSaveDialog ? elements.userScriptEditorSuppressSaveDialog.checked : true,
            userScriptEditorHighlightWhitespace: elements.userScriptEditorHighlightWhitespace ? elements.userScriptEditorHighlightWhitespace.checked : true,
            userScriptEditorTrimTrailingWhitespace: elements.userScriptEditorTrimTrailingWhitespace ? elements.userScriptEditorTrimTrailingWhitespace.checked : true,
            userScriptEditorAutoSyntaxCheck: elements.userScriptEditorAutoSyntaxCheck ? elements.userScriptEditorAutoSyntaxCheck.checked : true,
            userScriptEditorSyntaxCheckMaxSize: elements.userScriptEditorSyntaxCheckMaxSize ? elements.userScriptEditorSyntaxCheckMaxSize.value : 1000000,
            userScriptInjectionTiming: elements.userScriptInjectionTiming ? elements.userScriptInjectionTiming.value : 'reload',
            ocrInjectionTiming: elements.ocrInjectionTiming ? elements.ocrInjectionTiming.value : 'reload'
        });
    }

    function updateFeedbackLabels(feedbackMode) {
        const elements = getSettingsElements();
        if (elements.feedbackNone) {
            elements.feedbackNone.checked = feedbackMode !== 'floatbox';
            elements.feedbackNone.nextElementSibling?.classList.toggle('checked', feedbackMode !== 'floatbox');
        }
        if (elements.feedbackFloatbox) {
            elements.feedbackFloatbox.checked = feedbackMode === 'floatbox';
            elements.feedbackFloatbox.nextElementSibling?.classList.toggle('checked', feedbackMode === 'floatbox');
        }
    }

    function applySettingsToUi(settingsData = {}, options = {}) {
        const settings = normalizeSettings(settingsData);
        const elements = getSettingsElements();
        const activeElement = document.activeElement;
        const preserveActiveInput = options.preserveActiveInput === true;

        if (elements.configMode && (!preserveActiveInput || activeElement !== elements.configMode)) {
            elements.configMode.value = settings.configMode;
        }
        if (elements.contentScriptApi && (!preserveActiveInput || activeElement !== elements.contentScriptApi)) {
            elements.contentScriptApi.value = settings.contentScriptApi;
        }
        if (elements.sandboxMode && (!preserveActiveInput || activeElement !== elements.sandboxMode)) {
            elements.sandboxMode.value = settings.sandboxMode;
        }
        if (elements.userScriptSandboxMode && (!preserveActiveInput || activeElement !== elements.userScriptSandboxMode)) {
            elements.userScriptSandboxMode.value = settings.sandboxMode;
        }
        if (elements.blacklistSites && (!preserveActiveInput || activeElement !== elements.blacklistSites)) {
            elements.blacklistSites.value = settings.blacklistSites;
        }
        if (elements.userScriptBlacklistSites && (!preserveActiveInput || activeElement !== elements.userScriptBlacklistSites)) {
            elements.userScriptBlacklistSites.value = settings.blacklistSites;
        }
        setBlacklistValues(settings.blacklist, { dispatchInput: false });
        if (elements.userScriptEditorEnabled && (!preserveActiveInput || activeElement !== elements.userScriptEditorEnabled)) {
            elements.userScriptEditorEnabled.checked = settings.userScriptEditorEnabled;
        }
        if (elements.userScriptEditorTheme && (!preserveActiveInput || activeElement !== elements.userScriptEditorTheme)) {
            elements.userScriptEditorTheme.value = settings.userScriptEditorTheme;
        }
        if (elements.userScriptEditorFontSize && (!preserveActiveInput || activeElement !== elements.userScriptEditorFontSize)) {
            elements.userScriptEditorFontSize.value = settings.userScriptEditorFontSize;
        }
        if (elements.userScriptEditorKeyMap && (!preserveActiveInput || activeElement !== elements.userScriptEditorKeyMap)) {
            elements.userScriptEditorKeyMap.value = settings.userScriptEditorKeyMap;
        }
        if (elements.userScriptEditorIndentUnit && (!preserveActiveInput || activeElement !== elements.userScriptEditorIndentUnit)) {
            elements.userScriptEditorIndentUnit.value = settings.userScriptEditorIndentUnit;
        }
        if (elements.userScriptEditorTabSize && (!preserveActiveInput || activeElement !== elements.userScriptEditorTabSize)) {
            elements.userScriptEditorTabSize.value = settings.userScriptEditorTabSize;
        }
        if (elements.userScriptEditorIndentWith && (!preserveActiveInput || activeElement !== elements.userScriptEditorIndentWith)) {
            elements.userScriptEditorIndentWith.value = settings.userScriptEditorIndentWith;
        }
        if (elements.userScriptEditorTabMode && (!preserveActiveInput || activeElement !== elements.userScriptEditorTabMode)) {
            elements.userScriptEditorTabMode.value = settings.userScriptEditorTabMode;
        }
        if (elements.userScriptEditorLineWrapping && (!preserveActiveInput || activeElement !== elements.userScriptEditorLineWrapping)) {
            elements.userScriptEditorLineWrapping.checked = settings.userScriptEditorLineWrapping;
        }
        if (elements.userScriptEditorMatchBrackets && (!preserveActiveInput || activeElement !== elements.userScriptEditorMatchBrackets)) {
            elements.userScriptEditorMatchBrackets.checked = settings.userScriptEditorMatchBrackets;
        }
        if (elements.userScriptEditorAutoIndent && (!preserveActiveInput || activeElement !== elements.userScriptEditorAutoIndent)) {
            elements.userScriptEditorAutoIndent.checked = settings.userScriptEditorAutoIndent;
        }
        if (elements.userScriptEditorSelectionMatch && (!preserveActiveInput || activeElement !== elements.userScriptEditorSelectionMatch)) {
            elements.userScriptEditorSelectionMatch.value = settings.userScriptEditorSelectionMatch;
        }
        if (elements.userScriptEditorSaveOnBlur && (!preserveActiveInput || activeElement !== elements.userScriptEditorSaveOnBlur)) {
            elements.userScriptEditorSaveOnBlur.checked = settings.userScriptEditorSaveOnBlur;
        }
        if (elements.userScriptEditorSuppressSaveDialog && (!preserveActiveInput || activeElement !== elements.userScriptEditorSuppressSaveDialog)) {
            elements.userScriptEditorSuppressSaveDialog.checked = settings.userScriptEditorSuppressSaveDialog;
        }
        if (elements.userScriptEditorHighlightWhitespace && (!preserveActiveInput || activeElement !== elements.userScriptEditorHighlightWhitespace)) {
            elements.userScriptEditorHighlightWhitespace.checked = settings.userScriptEditorHighlightWhitespace;
        }
        if (elements.userScriptEditorTrimTrailingWhitespace && (!preserveActiveInput || activeElement !== elements.userScriptEditorTrimTrailingWhitespace)) {
            elements.userScriptEditorTrimTrailingWhitespace.checked = settings.userScriptEditorTrimTrailingWhitespace;
        }
        if (elements.userScriptEditorAutoSyntaxCheck && (!preserveActiveInput || activeElement !== elements.userScriptEditorAutoSyntaxCheck)) {
            elements.userScriptEditorAutoSyntaxCheck.checked = settings.userScriptEditorAutoSyntaxCheck;
        }
        if (elements.userScriptEditorSyntaxCheckMaxSize && (!preserveActiveInput || activeElement !== elements.userScriptEditorSyntaxCheckMaxSize)) {
            elements.userScriptEditorSyntaxCheckMaxSize.value = settings.userScriptEditorSyntaxCheckMaxSize;
        }
        if (elements.userScriptInjectionTiming && (!preserveActiveInput || activeElement !== elements.userScriptInjectionTiming)) {
            elements.userScriptInjectionTiming.value = settings.userScriptInjectionTiming;
        }
        if (elements.ocrInjectionTiming && (!preserveActiveInput || activeElement !== elements.ocrInjectionTiming)) {
            elements.ocrInjectionTiming.value = settings.ocrInjectionTiming;
        }

        if (elements.securitySection) {
            elements.securitySection.style.display = settings.configMode === 'advanced' ? 'block' : 'none';
        }

        updateFeedbackLabels(settings.feedbackMode);
        toggleMutationObserveOption();
        updateScriptEditorButtonVisibility(settings);
        applyUserScriptEditorSettings(settings);
        applyInterfaceLanguage(settings.uiLanguage);
    }

    function mirrorSettingsToLocalStorage(settings) {
        try {
            Object.entries(settings).forEach(([key, value]) => {
                localStorage.setItem(key, JSON.stringify(value));
            });
        } catch (e) {
            console.warn('Failed to mirror settings to localStorage:', e);
        }
    }

    function revertMutationObserveWhenDisabled(settings, showWarning = true) {
        if (settings.configMode === 'advanced' && settings.sandboxMode === 'forceDOM') {
            return;
        }

        const actionRows = document.querySelectorAll('.xpath-action-row');
        let changesMade = false;
        actionRows.forEach(row => {
            if (row.getAttribute('data-action-mode') !== 'mutationObserve') return;
            row.setAttribute('data-action-mode', 'default');
            const modeSelect = row.querySelector('.action-mode-select');
            const intervalCol = row.querySelector('.col-interval-ms');
            const repeatCol = row.querySelector('.col-repeat');
            if (modeSelect) modeSelect.value = 'click';
            if (intervalCol) intervalCol.style.display = '';
            if (repeatCol) repeatCol.style.display = '';
            changesMade = true;
        });

        if (changesMade) {
            hasUnsavedChanges = true;
            saveCurrentConfiguration(false);
            if (showWarning) {
                showTemporaryMessage('Mutation Observe disabled. Affected actions reverted to Default mode.', 'warning');
            }
        }
    }

    function notifySettingsRuntime(settings) {
        chrome.runtime.sendMessage({
            action: "feedbackModeChanged",
            feedbackMode: settings.feedbackMode
        }, () => {});
    }

    function saveSettingsRealtime(options = {}) {
        const settings = readSettingsFromUi();
        const payload = {
            configMode: settings.configMode,
            contentScriptApi: settings.contentScriptApi,
            sandboxMode: settings.sandboxMode,
            blacklist: settings.blacklist,
            blacklistSites: settings.blacklistSites,
            uiLanguage: settings.uiLanguage,
            acfhPreferredLanguage: settings.uiLanguage,
            feedbackMode: settings.feedbackMode,
            userScriptEditorEnabled: settings.userScriptEditorEnabled,
            userScriptEditorTheme: settings.userScriptEditorTheme,
            userScriptEditorFontSize: settings.userScriptEditorFontSize,
            userScriptEditorKeyMap: settings.userScriptEditorKeyMap,
            userScriptEditorIndentUnit: settings.userScriptEditorIndentUnit,
            userScriptEditorTabSize: settings.userScriptEditorTabSize,
            userScriptEditorIndentWith: settings.userScriptEditorIndentWith,
            userScriptEditorTabMode: settings.userScriptEditorTabMode,
            userScriptEditorLineWrapping: settings.userScriptEditorLineWrapping,
            userScriptEditorMatchBrackets: settings.userScriptEditorMatchBrackets,
            userScriptEditorAutoIndent: settings.userScriptEditorAutoIndent,
            userScriptEditorSelectionMatch: settings.userScriptEditorSelectionMatch,
            userScriptEditorSaveOnBlur: settings.userScriptEditorSaveOnBlur,
            userScriptEditorSuppressSaveDialog: settings.userScriptEditorSuppressSaveDialog,
            userScriptEditorHighlightWhitespace: settings.userScriptEditorHighlightWhitespace,
            userScriptEditorTrimTrailingWhitespace: settings.userScriptEditorTrimTrailingWhitespace,
            userScriptEditorAutoSyntaxCheck: settings.userScriptEditorAutoSyntaxCheck,
            userScriptEditorSyntaxCheckMaxSize: settings.userScriptEditorSyntaxCheckMaxSize,
            userScriptInjectionTiming: settings.userScriptInjectionTiming,
            ocrInjectionTiming: settings.ocrInjectionTiming
        };

        mirrorSettingsToLocalStorage(payload);
        applySettingsToUi(payload, { preserveActiveInput: true });

        acfhStorage.set(payload, () => {
            toggleMutationObserveOption();
            updateScriptEditorButtonVisibility();
            revertMutationObserveWhenDisabled(settings, options.showMutationWarning !== false);
            notifySettingsRuntime(settings);

            if (options.showMessage !== false) {
                showTemporaryMessage(translations.configSaved, 'success');
            }
        });
    }

    function handleRealtimeStorageChanges(changes = {}) {
        const settingChanged = SETTINGS_STORAGE_KEYS.some(key => key in changes);
        if (settingChanged) {
            const settingsPatch = {};
            SETTINGS_STORAGE_KEYS.forEach((key) => {
                if (key in changes) {
                    settingsPatch[key] = changes[key]?.newValue;
                } else {
                    const raw = localStorage.getItem(key);
                    if (raw !== null) {
                        try {
                            settingsPatch[key] = JSON.parse(raw);
                        } catch (e) {
                            settingsPatch[key] = raw;
                        }
                    }
                }
            });
            applySettingsToUi(settingsPatch, { preserveActiveInput: true });
        }

        if ('activeAutomationMode' in changes) {
            const nextMode = changes.activeAutomationMode.newValue;
            const nextSession = nextMode === ACTIVE_AUTOMATION_MODE_USERSCRIPT
                ? ACTIVE_AUTOMATION_MODE_USERSCRIPT
                : nextMode === ACTIVE_AUTOMATION_MODE_OCR
                    ? ACTIVE_AUTOMATION_MODE_OCR
                    : (nextMode === ACTIVE_AUTOMATION_MODE_CLICK_FILL ? ACTIVE_AUTOMATION_MODE_CLICK_FILL : null);
            if (nextSession && nextSession !== activeOptionsSession) {
                setOptionsSession(nextSession, { persist: false, syncRuntime: false });
            }
        }

        if ('configurations' in changes && Array.isArray(changes.configurations.newValue)) {
            configurations = changes.configurations.newValue;
            if ('activeConfigId' in changes) {
                activeConfigId = changes.activeConfigId.newValue || null;
            }
            updateConfigListAndDropdown();
            const activeConfig = configurations.find(cfg => cfg && cfg.id == activeConfigId);
            if (activeConfig && !hasUnsavedChanges && activeOptionsSession === ACTIVE_AUTOMATION_MODE_CLICK_FILL && !isClickFillActionInteractionActive()) {
                aplicarDadosConfiguracao(activeConfig);
            }
        } else if ('activeConfigId' in changes) {
            activeConfigId = changes.activeConfigId.newValue || null;
            updateConfigListAndDropdown();
        }

        if ('userScripts' in changes && Array.isArray(changes.userScripts.newValue)) {
            userScripts = changes.userScripts.newValue.map((record, index) => normalizeUserScriptRecord(record, index + 1));
            if ('activeUserScriptId' in changes) {
                activeUserScriptId = changes.activeUserScriptId.newValue || null;
            }
            renderSessionConfigLists();
            refreshUserScriptSavedIndicatorFromState(
                changes.independentUserScript ? changes.independentUserScript.newValue : null
            );
            if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
                clearTimeout(pendingUserScriptReloadTimer);
                const reloadEditorWhenIdle = () => {
                    if (isUserScriptInteractionActive()) {
                        pendingUserScriptReloadTimer = setTimeout(reloadEditorWhenIdle, 700);
                        return;
                    }
                    loadInlineUserScriptEditor();
                };
                reloadEditorWhenIdle();
            }
        } else if ('activeUserScriptId' in changes) {
            activeUserScriptId = changes.activeUserScriptId.newValue || null;
            renderSessionConfigLists();
            refreshUserScriptSavedIndicatorFromState(
                changes.independentUserScript ? changes.independentUserScript.newValue : null
            );
        } else if ('independentUserScript' in changes) {
            refreshUserScriptSavedIndicatorFromState(changes.independentUserScript.newValue);
        }

        if (OCR_RULES_KEY in changes && Array.isArray(changes[OCR_RULES_KEY].newValue)) {
            ocrRules = changes[OCR_RULES_KEY].newValue.map((rule, index) => normalizeOcrRule(rule, index + 1));
            clearTimeout(pendingOcrRulesRenderTimer);
            const renderRulesWhenIdle = () => {
                if (isOcrRuleInteractionActive()) {
                    pendingOcrRulesRenderTimer = setTimeout(renderRulesWhenIdle, 700);
                    return;
                }
                renderOcrRules();
            };
            renderRulesWhenIdle();
            renderSessionConfigLists();
        }

        if (OCR_SETTINGS_KEY in changes) {
            ocrSettings = normalizeOcrSettings(changes[OCR_SETTINGS_KEY].newValue || {});
            if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
                applyOcrSettingsToUi({ preserveActiveInput: true });
            }
            renderSessionConfigLists();
        }

        if ('autoClickerEnabled' in changes) {
            updateExtensionStatus();
        }
    }

function deleteAllConfigurations() {
    showModal(translations.modalDeleteConfirm, true).then((confirmed) => {
        if (confirmed) {
            // Limpar todos os action names de todas as configurações
            configurations.forEach(config => {
                clearActionNamesFromLocalStorage(config.id);
            });
            
            configurations = [];
            activeConfigId = null;
            
            acfhStorage.set({ configurations, activeConfigId }, () => {
                updateConfigListAndDropdown();
                setActiveConfig(null);
                showTemporaryMessage(translations.configDeleted);
                
                // Limpar completamente o localStorage
                localStorage.clear();
                console.log('LocalStorage completamente limpo.');
            });
        }
    });
}


function cleanupOrphanedLocalStorageData() {
    const configIds = configurations.map(cfg => cfg.id);
    
    // Limpar action names de configurações que não existem mais
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('action_name_')) {
            const parts = key.split('_');
            if (parts.length >= 3) {
                const configId = parts[2]; // action_name_[configId]_[index]
                if (!configIds.includes(configId)) {
                    localStorage.removeItem(key);
                    console.log(`Removido dado órfão do localStorage: ${key}`);
                }
            }
        }
    }
}
// Adicionar limpeza de dados órfãos
    setTimeout(() => {
        cleanupOrphanedLocalStorageData();
    }, 1000);

    // Atualizar a função adicionarXPathInput para salvar automaticamente
function adicionarXPathInput(
    valor = "",
    isChecked = true,
    intervalo = 1000,
    repeticoes = 1,
    fillValue = "",
    waitInitModal = 0,
    mode = "click",
    fillMethod = "paste",
    isCSSSelector = false,
    actionMode = "default",
    actionName = "", // NOVO PARÂMETRO: nome específico da ação
    options = {}
) {
    if (!activeConfigId) {
        showTemporaryMessage(translations.addXpathAlert, 'error');
        return;
    }

    const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
    if (actionRows.length >= 9999999) {
        showModal(translations.modalXpathLimit, false);
        return;
    }

    let actionRowCreated = false;
    const createActionRowFromSettings = (data = {}) => {
        if (actionRowCreated) return;
        actionRowCreated = true;
        const configMode = data.configMode || 'beginner';
        const sandboxMode = data.sandboxMode || 'default';
        const isMutationObserveAllowed = configMode === 'advanced' && sandboxMode === 'forceDOM';
        
        if (actionMode === 'mutationObserve' && !isMutationObserveAllowed) {
            actionMode = 'default';
            showTemporaryMessage('Mutation Observe mode is disabled. Using Default mode.', 'warning');
        }

        const shouldPersist = options.persist !== false
            && !isRenderingClickFillConfig
            && (String(valor || '').trim() || options.persistDraft === true);
        const newActionRow = xpathActionTemplate.content.cloneNode(true);
        const actionRowDiv = newActionRow.querySelector('.xpath-action-row');
        actionRowDiv.dataset.actionId = options.actionId || `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // MUDANÇA AQUI: Usar o nome fornecido ou o padrão
        const nameInput = actionRowDiv.querySelector('.col-name input');
        nameInput.value = actionName || `Action ${actionRows.length + 1}`;

        const elementFinderInput = actionRowDiv.querySelector('.col-element-finder input');
        elementFinderInput.value = valor;
        elementFinderInput.placeholder = isCSSSelector
            ? "e.g., button#start, .btn-primary"
            : "//button[@id='start']";

        elementFinderInput.addEventListener('input', function () {
            const value = this.value.trim();
            const isCurrentCSS = !isXPath(value);
            actionRowDiv.setAttribute('data-is-css-selector', isCurrentCSS);
            elementFinderInput.placeholder = isCurrentCSS
                ? "e.g., button#start, .btn-primary"
                : "//button[@id='start']";
            hasUnsavedChanges = true;
            if (value && validateElementFinder(value)) {
                saveCurrentConfiguration(false);
            }
        });

        elementFinderInput.addEventListener('change', function () {
            if (this.value.trim()) {
                hasUnsavedChanges = true;
                saveCurrentConfiguration(false);
            }
        });

        const modeSelect = actionRowDiv.querySelector('.action-mode-select');
        if (modeSelect) {
            // Garante que o texto das opções respeita o idioma atual (Fill/Click ou Preencher/Clique)
            Array.from(modeSelect.options).forEach(opt => {
                if (opt.value === 'fill') {
                    opt.textContent = translations.modeFillLabel;
                } else if (opt.value === 'click') {
                    opt.textContent = translations.modeClickLabel;
                }
            });
            modeSelect.value = mode;

            // Atualiza o placeholder da coluna Name para refletir o modo atual
            const colNameInput = actionRowDiv.querySelector('.col-name input');
            if (colNameInput) {
                if (mode === 'fill') {
                    colNameInput.placeholder = translations.fillModeTitle || translations.modeFillLabel;
                } else {
                    colNameInput.placeholder = translations.clickModeTitle || translations.modeClickLabel;
                }
            }
        }
        const intervalCol = actionRowDiv.querySelector('.col-interval-ms');
        const repeatCol = actionRowDiv.querySelector('.col-repeat');
        const intervalInput = intervalCol ? intervalCol.querySelector('input') : null;
        const repeatInput = repeatCol ? repeatCol.querySelector('input') : null;
        if (intervalInput) intervalInput.value = intervalo;
        if (repeatInput) repeatInput.value = repeticoes;
        actionRowDiv.setAttribute('data-fill-value', fillValue);
        actionRowDiv.setAttribute('data-fill-method', fillMethod);
        actionRowDiv.setAttribute('data-action-init-wait', waitInitModal);
        actionRowDiv.setAttribute('data-is-css-selector', isCSSSelector);
        actionRowDiv.setAttribute('data-action-mode', actionMode);

        const isMutationObserve = actionMode === 'mutationObserve';
        if (intervalCol) intervalCol.style.display = isMutationObserve ? 'none' : '';
        if (repeatCol) repeatCol.style.display = isMutationObserve ? 'none' : '';

        const colMode = actionRowDiv.querySelector('.col-mode');
        const modeDisplay = document.createElement('div');
        modeDisplay.classList.add('mode-display');
        modeDisplay.classList.add(mode === 'click' ? 'click-mode' : 'fill-mode');
        modeDisplay.innerHTML = mode === 'click' ? svgs.mouseClick : '';
        colMode.appendChild(modeDisplay);

        xpathActionsContainer.appendChild(actionRowDiv);

        if (options.disabled === true) {
            actionRowDiv.classList.add('disabled');
            actionRowDiv.querySelectorAll('.input-inline, .action-mode-select').forEach(input => {
                input.disabled = true;
            });
        }

        updateActionNumbers();
        updateIntervalRepeatHeadersVisibility();
        addEventListenersToActionRow(actionRowDiv);
        if (options.loadStoredName === true) {
            loadActionNameFromLocalStorage(actionRowDiv);
        }
        if (typeof options.onCreated === 'function') {
            options.onCreated(actionRowDiv);
        }
        if (shouldPersist) {
            hasUnsavedChanges = true;
            saveCurrentConfiguration(false);
        } else if (!isRenderingClickFillConfig) {
            hasUnsavedChanges = true;
        }
        console.log(`New action added (${isCSSSelector ? 'CSS Selector' : 'XPath'}, Mode: ${actionMode}).`);
    };
    setTimeout(() => createActionRowFromSettings(readSettingsFromUi()), 350);
    acfhStorage.get(['configMode', 'sandboxMode'], createActionRowFromSettings);
}

    function isXPath(selector) {
        return selector.startsWith('/') || selector.startsWith('./') || selector.startsWith('(');
    }

    const scriptEditorIconBtn = document.getElementById('scriptEditorIconBtn');

function setScriptSavedIndicator(isSaved) {
    const shouldShowInjectedState = Boolean(isSaved) && activeOptionsSession === ACTIVE_AUTOMATION_MODE_USERSCRIPT;
    if (scriptEditorIconBtn) {
        scriptEditorIconBtn.classList.toggle('script-saved', shouldShowInjectedState);
    }

    const userscriptSessionButton = document.querySelector('button[data-options-session="userscript"]');
    if (userscriptSessionButton) {
        userscriptSessionButton.classList.toggle('script-saved', shouldShowInjectedState);
    }
}

function refreshUserScriptSavedIndicatorFromState(fallbackScript = null) {
    const activeRecord = getActiveUserScriptRecord();
    const hasSavedScript = Boolean(
        fallbackScript ||
        activeRecord ||
        (Array.isArray(userScripts) && userScripts.length)
    );
    setScriptSavedIndicator(hasSavedScript);
}

if (scriptEditorIconBtn) {
    scriptEditorIconBtn.addEventListener('click', async function() {
        const isAvailable = await isUserScriptsAvailable();
        if (!isAvailable) {
     showModal(
    '<b>Attention!</b><br>To use this feature, you need to enable <b>User Scripts</b> in the extension settings:<br>1. Open your extensions: chrome://extensions/<br>2. Find this extension and click <b>Details</b>.<br>3. Enable <b>Allow User Scripts</b>.<br>After that, everything should work normally!',
    false
);


            return;
        }

        if (!activeConfigId) {
            showTemporaryMessage('No active configuration. Create one first.', 'error');
            return;
        }

        // Salva qualquer mudança não salva na UI antes de abrir o editor
        if (hasUnsavedChanges) {
            saveCurrentConfiguration(false);
        }

        const config = configurations.find(cfg => cfg.id == activeConfigId);
        if (!config) {
            showTemporaryMessage('Active configuration not found.', 'error');
            return;
        }

        if (!config.name || !config.url) {
            showTemporaryMessage('Configuration name and URL are required.', 'error');
            return;
        }

        // Gera o script com base nos dados mais recentes da configuração
        const generatedScript = await generateDynamicUserScript(config, false);
        showScriptEditorModal(config, generatedScript);
    });
}

// Helper function to compare configurations
function areConfigsEquivalent(scriptConfig, uiConfig) {
    if (!scriptConfig || !uiConfig) return false;

    // Compare name, URL, and initWait
    if (scriptConfig.name !== uiConfig.name ||
        scriptConfig.url !== uiConfig.url ||
        scriptConfig.initWait !== uiConfig.initWait) {
        return false;
    }

    // Compare actions array
    if (!scriptConfig.actions || !uiConfig.actions ||
        scriptConfig.actions.length !== uiConfig.actions.length) {
        return false;
    }

    // Compare each action
    return scriptConfig.actions.every((scriptAction, index) => {
        const uiAction = uiConfig.actions[index];
        return scriptAction.name === uiAction.name &&
               scriptAction.selector === uiAction.elementFinder &&
               scriptAction.isCSS === uiAction.isCSSSelector &&
               scriptAction.mode === uiAction.mode &&
               scriptAction.value === uiAction.fillValue &&
               scriptAction.fillMethod === uiAction.fillMethod &&
               scriptAction.interval === uiAction.intervalMs &&
               scriptAction.repeat === uiAction.repeat &&
               scriptAction.waitBefore === uiAction.actionInitWait &&
               scriptAction.disabled === uiAction.disabled &&
               scriptAction.actionMode === uiAction.actionMode;
    });
}
    function isUserScriptsAvailable() {
        return new Promise(resolve => {
            if (!chrome.userScripts || !chrome.userScripts.getScripts || !chrome.userScripts.register) {
                resolve(false);
                return;
            }
            chrome.userScripts.getScripts(() => {
                if (chrome.runtime.lastError) {
                    console.error('User Scripts API not accessible:', chrome.runtime.lastError.message);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

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
                console.warn(`Invalid URL pattern: ${formattedUrl}. Falling back to default '*://*/*'.`);
                return '*://*/*';
            }

            return formattedUrl;
        } catch (e) {
            console.warn(`Invalid URL detected: ${formattedUrl}. Using default pattern '*://*/*'. Error: ${e.message}`);
            return '*://*/*';
        }
    }

    function extractConfigFromScript(script) {
        const configMatch = script.match(/const config = \{[\s\S]*?\};/);
        if (!configMatch) {
            return null;
        }

        let configStr = configMatch[0];
        configStr = configStr.replace(/^const config =\s*/, '').replace(/;$/, '');
        configStr = configStr.replace(/Infinity/g, 'null');

        try {
            const configObj = JSON.parse(configStr);
            
            if (!configObj.name || !configObj.url) {
                console.warn('Invalid configuration: missing name or URL. Saving script as invalid.');
                return null;
            }

            const formattedActions = (configObj.actions || []).map((action, index) => {
                if (!action.selector) {
                    throw new Error(`Invalid action at index ${index}: missing selector.`);
                }
                const interval = action.actionMode === 'mutationObserve' ? null : String(action.interval || 1000);
                const repeat = action.actionMode === 'mutationObserve' ? null : (action.repeat === null ? -2 : action.repeat || 1);
                return {
                    name: action.name || `Action ${index + 1}`,
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
                id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
                name: configObj.name || 'Unnamed Configuration',
                url: configObj.url || '*://*/*',
                initWait: String(configObj.initWait / 1000 || 0),
                actions: formattedActions
            };
        } catch (e) {
            console.warn('Error parsing config from script:', e);
            showTemporaryMessage('Invalid script configuration detected. Script saved to local storage.', 'error');
            return null;
        }
    }

function saveUserScript(script, configId = null) {
    // 1) Não considerar como "script salvo" quando o conteúdo é
    // apenas o template base (IIFE com console.log e comentários
    // padrão, sem código extra). Nesse caso, limpamos quaisquer
    // chaves e removemos o indicador visual.
    if (script && isBaseTemplateScript(script)) {
        console.log('Base template script detected (web options). Clearing saved script info.');

        if (configId) {
            const keysToRemove = [
                `customScript_${configId}`,
                `UserScript_${configId}`,
                `scriptLastEdited_${configId}`
            ];
            acfhStorage.remove(keysToRemove, () => {
                console.log('Removed base-template script keys for config', configId);
            });
        }

        setScriptSavedIndicator(false);
        return;
    }

    // 2) Qualquer outro script (com conteúdo próprio) mantém o
    // comportamento anterior: salvar e mostrar o pontinho.
    const UserScriptKey = configId ? `UserScript_${configId}` : `UserScript_${Date.now()}`;
    const storageData = {
        [UserScriptKey]: {
            scriptContent: script,
            timestamp: new Date().toISOString(),
            reason: 'Invalid config extraction'
        }
    };

    acfhStorage.set(storageData, () => {
        console.log(`Invalid script saved with key: ${UserScriptKey}`);
        showTemporaryMessage(`Saved as ${UserScriptKey}`, 'warning');
        setScriptSavedIndicator(true);
    });
}


  function showScriptEditorModal(config, initialScriptContent = null) {
    const existingModal = document.querySelector('.script-editor-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const UserScriptKey = `UserScript_${config.id}`;
    acfhStorage.get([UserScriptKey], (data) => {
        let scriptContentPromise;

        const hasActions = Array.isArray(config.actions) && config.actions.length > 0;

        // Regra desejada:
        // - Se HÁ ações configuradas, o editor deve sempre começar
        //   com o script gerado a partir dessas ações (ignora inválidos antigos).
        // - Se NÃO há nenhuma ação, aí sim usamos o último script
        //   inválido/personalizado salvo como ponto de partida.
        if (data[UserScriptKey] && !hasActions) {
            scriptContentPromise = Promise.resolve(data[UserScriptKey].scriptContent);
            showTemporaryMessage(`Loaded invalid script: ${UserScriptKey}`, 'warning');
        } else {
            scriptContentPromise = initialScriptContent
                ? Promise.resolve(initialScriptContent)
                : generateDynamicUserScript(config, false);
        }

        scriptContentPromise.then(scriptContent => {
            const modal = document.createElement('div');
            modal.className = 'modal script-editor-modal';
            modal.innerHTML = `
                <div class="modal-content script-editor-content">
                    <div class="modal-header">
                        <h3>UserScript Editor</h3>
                        <div class="modal-actions">
                            <span class="close-btn">&times;</span>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="script-info">
                            <p><strong>Namespace:</strong> ${config.name}</p>
                            <p><strong>URL Match:</strong> ${validateAndFormatUrl(config.url)}</p>
                        </div>
                        <div id="scriptEditor" class="script-editor"></div>
                    </div>
                    <div class="modal-footer">
                        <div class="script-editor-footer-hint">Ctrl+S para salvar</div>
                        <div class="script-editor-footer-actions">
                            <button class="btn btn-primary btn-save-script">Save</button>
                            <button class="btn btn-danger btn-cancel-script">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const editorElement = modal.querySelector('#scriptEditor');
            const createFallbackEditor = (container, value) => {
                const textarea = document.createElement('textarea');
                textarea.className = 'script-editor-fallback';
                textarea.value = value || '';
                textarea.spellcheck = false;
                textarea.style.width = '100%';
                textarea.style.minHeight = '240px';
                container.appendChild(textarea);

                return {
                    getValue: () => textarea.value,
                    setValue: (nextValue) => {
                        textarea.value = nextValue;
                    },
                    refresh: () => {},
                    setSize: (width, height) => {
                        if (width) {
                            textarea.style.width = typeof width === 'number' ? `${width}px` : width;
                        }
                        if (height) {
                            textarea.style.height = typeof height === 'number' ? `${height}px` : height;
                        }
                    },
                    getWrapperElement: () => textarea
                };
            };

            const editor = (typeof CodeMirror === 'function')
                ? CodeMirror(editorElement, {
                    value: scriptContent,
                    mode: 'javascript',
                    theme: 'monokai',
                    lineNumbers: true,
                    lineWrapping: true,
                    indentUnit: 4,
                    matchBrackets: true,
                    autoCloseBrackets: true
                })
                : createFallbackEditor(editorElement, scriptContent);

            // **SALVAR COM CTRL+S**
            const editorKeyTarget = typeof editor.getWrapperElement === 'function'
                ? editor.getWrapperElement()
                : editorElement;

            editorKeyTarget.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    saveBtn.click();
                }
            });

const resizeEditor = () => {
    const body = modal.querySelector('.modal-body');
    const header = modal.querySelector('.modal-header');
    const footer = modal.querySelector('.modal-footer');
    const scriptInfo = modal.querySelector('.script-info');
    
    const availableHeight = body.clientHeight - 
                          header.offsetHeight - 
                          footer.offsetHeight - 
                          scriptInfo.offsetHeight - 28; // margens
    
    editor.setSize("100%", `${Math.max(availableHeight, 200)}px`);
    editor.refresh();
};

// Chame o resize quando o modal abrir e na mudança de tamanho da janela
setTimeout(() => {
    resizeEditor();
    editor.refresh();
}, 100);

window.addEventListener("resize", resizeEditor);

            // Botões
            const closeBtn = modal.querySelector('.close-btn');
            const saveBtn = modal.querySelector('.btn-save-script');
            const cancelBtn = modal.querySelector('.btn-cancel-script');

            closeBtn.addEventListener('click', () => modal.remove());
            cancelBtn.addEventListener('click', () => modal.remove());

            saveBtn.addEventListener('click', () => {
                const updatedScript = editor.getValue();
                const validUrl = validateAndFormatUrl(config.url);

                if (!updatedScript.includes('==UserScript==') ||
                    !updatedScript.includes(config.name) ||
                    !updatedScript.includes(validUrl)) {
                    showTemporaryMessage('Script must include UserScript header with correct name and URL match.', 'error');
                    saveUserScript(updatedScript, config.id);
                    return;
                }

                const extractedConfig = extractConfigFromScript(updatedScript);
                if (extractedConfig) {
                    if (!extractedConfig.name || !extractedConfig.url) {
                        showTemporaryMessage('Invalid configuration: name and URL are required.', 'error');
                        saveUserScript(updatedScript, config.id);
                        return;
                    }

                    const configIndex = configurations.findIndex(cfg => cfg.id === config.id);
                    if (configIndex !== -1) {
                        configurations[configIndex] = {
                            id: config.id,
                            name: extractedConfig.name,
                            url: extractedConfig.url,
                            initWait: extractedConfig.initWait,
                            actions: extractedConfig.actions.map(action => ({
                                name: action.name,
                                elementFinder: action.elementFinder,
                                mode: action.mode,
                                intervalMs: action.intervalMs,
                                repeat: action.repeat,
                                fillValue: action.fillValue,
                                fillMethod: action.fillMethod,
                                actionInitWait: action.actionInitWait,
                                disabled: action.disabled,
                                isCSSSelector: action.isCSSSelector,
                                actionMode: action.actionMode
                            }))
                        };

                        acfhStorage.remove([`UserScript_${config.id}`], () => {
                            console.log(`Invalid script for config ${config.id} removed due to valid script save.`);
                        });

                        acfhStorage.set({
                            configurations,
                            [`customScript_${config.id}`]: updatedScript,
                            [`scriptLastEdited_${config.id}`]: new Date().toISOString()
                        }, () => {
                            if (activeConfigId === config.id) {
                                aplicarDadosConfiguracao(configurations[configIndex]);
                                updateActionNumbers();
                                configNameInput.value = configurations[configIndex].name;
                                configUrlInput.value = configurations[configIndex].url;
                                initWaitInput.value = configurations[configIndex].initWait;
                                setScriptSavedIndicator(true);
                            }

                            const hasActions = Array.isArray(extractedConfig.actions) && extractedConfig.actions.length > 0;

                            // Se houver ações, NÃO registrar o UserScript automático;
                            // em vez disso, garantir que qualquer script previamente
                            // registrado para esta configuração seja desregistrado.
                            if (hasActions) {
                                chrome.runtime.sendMessage({
                                    action: "unregisterUserScript",
                                    configId: config.id
                                });
                                showTemporaryMessage('Script saved and linked to actions. UserScript auto-injection disabled for this config.', 'success');
                            } else {
                                chrome.runtime.sendMessage({
                                    action: "registerUserScript",
                                    configId: config.id,
                                    configName: config.name,
                                    url: validUrl,
                                    scriptContent: updatedScript
                                }, (response) => {
                                    if (response && response.success) {
                                        showTemporaryMessage('Script saved and registered for injection.', 'success');
                                    } else {
                                        showTemporaryMessage('Error registering script.', 'error');
                                    }
                                });
                            }
                            modal.remove();
                        });
                    } else {
                        showTemporaryMessage('Configuration not found.', 'error');
                        modal.remove();
                    }
                } else {
                    saveUserScript(updatedScript, config.id);
                    modal.remove();
                }
            });

            modal.style.display = 'block';
            editor.refresh();
        });
    });
}



function getActiveConfiguration() {
    return configurations.find(cfg => cfg.id == activeConfigId) || null;
}

function setUserScriptEmptyState(message) {
    if (!message) {
        clearUserScriptEmptyState();
        return;
    }

    if (scriptEditorEmpty) {
        scriptEditorEmpty.textContent = message;
        scriptEditorEmpty.hidden = false;
    }

    if (scriptEditorContainer) {
        scriptEditorContainer.hidden = false;
    }
}

function clearUserScriptEmptyState() {
    if (scriptEditorEmpty) {
        scriptEditorEmpty.hidden = true;
        scriptEditorEmpty.textContent = '';
    }

    if (scriptEditorContainer) {
        scriptEditorContainer.hidden = false;
    }
}

function createInlineFallbackEditor(container, value) {
    const textarea = document.createElement('textarea');
    textarea.className = 'script-editor-fallback';
    textarea.value = value || '';
    textarea.spellcheck = false;
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.resize = 'none';
    textarea.style.boxSizing = 'border-box';
    container.appendChild(textarea);

    return {
        getValue: () => textarea.value,
        setValue: (nextValue) => {
            textarea.value = nextValue;
        },
        refresh: () => {},
        setSize: (width, height) => {
            if (width) {
                textarea.style.width = typeof width === 'number' ? `${width}px` : width;
            }
            if (height) {
                textarea.style.height = typeof height === 'number' ? `${height}px` : height;
            }
        },
        getWrapperElement: () => textarea
    };
}

function getUserScriptFoldMarkAtLine(lineNumber) {
    userScriptFoldMarks = userScriptFoldMarks.filter((mark) => mark && typeof mark.find === 'function' && mark.find());
    return userScriptFoldMarks.find((mark) => {
        const range = mark.find();
        return range && range.from && range.from.line === lineNumber;
    }) || null;
}

function clearUserScriptFoldMarks() {
    userScriptFoldMarks.splice(0).forEach((mark) => {
        if (mark && typeof mark.clear === 'function') {
            mark.clear();
        }
    });
}

function findUserScriptFoldRange(cm, lineNumber) {
    const doc = cm && (typeof cm.getDoc === 'function' ? cm.getDoc() : cm);
    if (!doc || typeof doc.getLine !== 'function' || typeof doc.lineCount !== 'function') return null;

    const startLineText = doc.getLine(lineNumber) || '';
    const openCh = startLineText.indexOf('{');
    if (openCh < 0) return null;

    let depth = 0;
    let inString = null;
    let escaping = false;
    let inBlockComment = false;

    for (let line = lineNumber; line < doc.lineCount(); line += 1) {
        const text = doc.getLine(line) || '';
        for (let ch = line === lineNumber ? openCh : 0; ch < text.length; ch += 1) {
            const char = text[ch];
            const next = text[ch + 1];

            if (inBlockComment) {
                if (char === '*' && next === '/') {
                    inBlockComment = false;
                    ch += 1;
                }
                continue;
            }

            if (inString) {
                if (escaping) {
                    escaping = false;
                } else if (char === '\\') {
                    escaping = true;
                } else if (char === inString) {
                    inString = null;
                }
                continue;
            }

            if (char === '/' && next === '/') break;
            if (char === '/' && next === '*') {
                inBlockComment = true;
                ch += 1;
                continue;
            }
            if (char === '"' || char === "'" || char === '`') {
                inString = char;
                continue;
            }
            if (char === '{') {
                depth += 1;
                continue;
            }
            if (char === '}') {
                depth -= 1;
                if (depth === 0) {
                    if (line <= lineNumber) return null;
                    return {
                        from: { line: lineNumber, ch: openCh + 1 },
                        to: { line, ch }
                    };
                }
            }
        }
    }

    return null;
}

function createUserScriptFoldMarker(isFolded) {
    const marker = document.createElement('span');
    marker.className = `cm-userscript-fold-marker${isFolded ? ' folded' : ''}`;
    marker.setAttribute('title', isFolded ? 'Expand block' : 'Collapse block');
    return marker;
}

function updateUserScriptFoldGutter(cm = inlineScriptEditor) {
    if (!cm || typeof cm.clearGutter !== 'function' || typeof cm.setGutterMarker !== 'function') return;
    const doc = typeof cm.getDoc === 'function' ? cm.getDoc() : cm;
    if (!doc || typeof doc.lineCount !== 'function') return;

    cm.clearGutter(USERSCRIPT_FOLD_GUTTER);
    userScriptFoldMarks = userScriptFoldMarks.filter((mark) => mark && typeof mark.find === 'function' && mark.find());

    const viewport = typeof cm.getViewport === 'function'
        ? cm.getViewport()
        : { from: 0, to: doc.lineCount() };
    const from = Math.max(0, viewport.from - 20);
    const to = Math.min(doc.lineCount(), viewport.to + 60);

    for (let line = from; line < to; line += 1) {
        const foldedMark = getUserScriptFoldMarkAtLine(line);
        if (foldedMark || findUserScriptFoldRange(cm, line)) {
            cm.setGutterMarker(line, USERSCRIPT_FOLD_GUTTER, createUserScriptFoldMarker(Boolean(foldedMark)));
        }
    }
}

function scheduleUserScriptFoldGutterRefresh(cm = inlineScriptEditor) {
    clearTimeout(userScriptFoldRefreshTimer);
    userScriptFoldRefreshTimer = setTimeout(() => updateUserScriptFoldGutter(cm), 80);
}

function toggleUserScriptFold(cm, lineNumber) {
    const existingMark = getUserScriptFoldMarkAtLine(lineNumber);
    if (existingMark) {
        existingMark.clear();
        updateUserScriptFoldGutter(cm);
        return;
    }

    const range = findUserScriptFoldRange(cm, lineNumber);
    if (!range || typeof cm.markText !== 'function') return;

    const replacement = document.createElement('span');
    replacement.className = 'cm-userscript-fold-placeholder';
    replacement.textContent = '...';

    const mark = cm.markText(range.from, range.to, {
        collapsed: true,
        replacedWith: replacement,
        clearOnEnter: true,
        inclusiveLeft: false,
        inclusiveRight: false
    });
    userScriptFoldMarks.push(mark);
    updateUserScriptFoldGutter(cm);
}

function setupUserScriptFoldGutter(cm) {
    if (!cm || typeof cm.on !== 'function' || cm.state?.acfhFoldGutterReady) return;
    cm.state.acfhFoldGutterReady = true;

    cm.on('gutterClick', (instance, lineNumber, gutter) => {
        if (gutter !== USERSCRIPT_FOLD_GUTTER) return;
        toggleUserScriptFold(instance, lineNumber);
    });
    cm.on('changes', (instance) => {
        clearUserScriptFoldMarks();
        scheduleUserScriptFoldGutterRefresh(instance);
    });
    cm.on('viewportChange', (instance) => scheduleUserScriptFoldGutterRefresh(instance));

    updateUserScriptFoldGutter(cm);
}

function getUserScriptCodeMirrorTheme(settings) {
    return normalizeSettings(settings).userScriptEditorTheme || 'monokai';
}

function getUserScriptCodeMirrorKeyMap(settings) {
    const normalized = normalizeSettings(settings);
    return normalized.userScriptEditorKeyMap === 'emacs' && typeof CodeMirror !== 'undefined'
        ? 'default'
        : 'default';
}

function insertUserScriptIndent(cm, settings) {
    const normalized = normalizeSettings(settings);
    const indentUnit = Math.max(1, Number(normalized.userScriptEditorIndentUnit) || 4);
    const indentation = normalized.userScriptEditorIndentWith === 'tabs' ? '\t' : ' '.repeat(indentUnit);
    cm.replaceSelection(indentation, 'end', '+input');
}

function handleUserScriptTabKey(cm, settings) {
    const normalized = normalizeSettings(settings);
    const hasSelection = cm.somethingSelected && cm.somethingSelected();

    if (normalized.userScriptEditorTabMode === 'classic') {
        if (hasSelection && cm.indentSelection) {
            cm.indentSelection('add');
            return;
        }
        insertUserScriptIndent(cm, normalized);
        return;
    }

    if (normalized.userScriptEditorTabMode === 'smart') {
        if (hasSelection && cm.indentSelection) {
            cm.indentSelection('add');
            return;
        }
        const cursor = cm.getCursor ? cm.getCursor() : { line: 0 };
        if (cm.indentLine) cm.indentLine(cursor.line, 'smart');
        return;
    }

    if (hasSelection && cm.indentSelection) {
        cm.indentSelection('add');
        return;
    }
    const cursor = cm.getCursor ? cm.getCursor() : { line: 0 };
    if (cm.indentLine) cm.indentLine(cursor.line, 'add');
}

function buildUserScriptEditorExtraKeys(settings) {
    const normalized = normalizeSettings(settings);
    const extraKeys = {
        'Ctrl-S': () => executeUserScriptEditorCommand('saveScript'),
        'Cmd-S': () => executeUserScriptEditorCommand('saveScript'),
        'Ctrl-N': () => executeUserScriptEditorCommand('newScript'),
        'Cmd-N': () => executeUserScriptEditorCommand('newScript'),
        'Ctrl-F': () => executeUserScriptEditorCommand('find'),
        'Cmd-F': () => executeUserScriptEditorCommand('find'),
        'Ctrl-R': () => executeUserScriptEditorCommand('replace'),
        'Cmd-R': () => executeUserScriptEditorCommand('replace'),
        'Shift-Ctrl-R': () => executeUserScriptEditorCommand('replaceAll'),
        'Shift-Cmd-R': () => executeUserScriptEditorCommand('replaceAll'),
        'Ctrl-G': () => executeUserScriptEditorCommand('goLine'),
        'Cmd-G': () => executeUserScriptEditorCommand('goLine'),
        'Ctrl-/': () => executeUserScriptEditorCommand('toggleLineComment'),
        'Cmd-/': () => executeUserScriptEditorCommand('toggleLineComment'),
        'Ctrl-K': () => executeUserScriptEditorCommand('toggleIndentedComment'),
        'Shift-Ctrl-K': () => executeUserScriptEditorCommand('toggleBlockComment'),
        'F3': () => executeUserScriptEditorCommand('findNext'),
        'Shift-F3': () => executeUserScriptEditorCommand('findPrev'),
        'Alt-F': () => executeUserScriptEditorCommand('findIncremental'),
        'Tab': (cm) => handleUserScriptTabKey(cm, normalized),
        'Shift-Tab': (cm) => cm.indentSelection && cm.indentSelection('subtract')
    };

    if (normalized.userScriptEditorKeyMap === 'emacs') {
        Object.assign(extraKeys, {
            'Ctrl-P': 'goLineUp',
            'Ctrl-N': 'goLineDown',
            'Ctrl-B': 'goCharLeft',
            'Ctrl-F': 'goCharRight',
            'Ctrl-A': 'goLineStart',
            'Ctrl-E': 'goLineEnd',
            'Ctrl-D': 'delCharAfter'
        });
    }

    if (normalized.userScriptEditorKeyMap === 'sublime') {
        Object.assign(extraKeys, {
            'Ctrl-D': () => executeUserScriptEditorCommand('findSelection'),
            'Shift-Ctrl-D': () => executeUserScriptEditorCommand('duplicateLine'),
            'Ctrl-L': () => executeUserScriptEditorCommand('selectLine')
        });
    }

    if (normalized.userScriptEditorKeyMap === 'vscode') {
        Object.assign(extraKeys, {
            'Shift-Alt-Down': () => executeUserScriptEditorCommand('duplicateLine'),
            'Ctrl-L': () => executeUserScriptEditorCommand('selectLine')
        });
    }

    if (normalized.userScriptEditorKeyMap === 'vim') {
        extraKeys.Esc = (cm) => {
            if (cm && cm.getInputField) cm.getInputField().blur();
        };
    }

    return extraKeys;
}

function clearUserScriptMarks(markStore) {
    markStore.splice(0).forEach((mark) => {
        if (mark && typeof mark.clear === 'function') {
            mark.clear();
        }
    });
}

function updateUserScriptSelectionHighlights(settingsData = null) {
    if (!inlineScriptEditor || typeof inlineScriptEditor.markText !== 'function') return;
    const settings = normalizeSettings(settingsData || readSettingsFromUi());
    const doc = getInlineEditorDoc();
    clearUserScriptMarks(userScriptSelectionMarks);

    if (!doc || settings.userScriptEditorSelectionMatch === 'off') return;

    let query = inlineScriptEditor.getSelection ? inlineScriptEditor.getSelection() : '';
    if (!query && settings.userScriptEditorSelectionMatch === 'cursor' && inlineScriptEditor.getCursor) {
        const cursor = inlineScriptEditor.getCursor();
        const lineText = doc.getLine(cursor.line) || '';
        const left = lineText.slice(0, cursor.ch).match(/[A-Za-z0-9_$]+$/);
        const right = lineText.slice(cursor.ch).match(/^[A-Za-z0-9_$]+/);
        query = `${left ? left[0] : ''}${right ? right[0] : ''}`;
    }

    if (!query || query.length < 2 || /\s/.test(query) || query.length > 80) return;

    const maxMarks = 400;
    for (let line = 0; line < doc.lineCount() && userScriptSelectionMarks.length < maxMarks; line += 1) {
        const text = doc.getLine(line) || '';
        let index = text.indexOf(query);
        while (index !== -1 && userScriptSelectionMarks.length < maxMarks) {
            userScriptSelectionMarks.push(inlineScriptEditor.markText(
                { line, ch: index },
                { line, ch: index + query.length },
                { className: 'cm-userscript-selection-match' }
            ));
            index = text.indexOf(query, index + query.length);
        }
    }
}

function updateUserScriptWhitespaceHighlights(settingsData = null) {
    if (!inlineScriptEditor || typeof inlineScriptEditor.markText !== 'function') return;
    const settings = normalizeSettings(settingsData || readSettingsFromUi());
    const doc = getInlineEditorDoc();
    clearUserScriptMarks(userScriptWhitespaceMarks);

    if (!doc || !settings.userScriptEditorHighlightWhitespace) return;

    const maxMarks = 600;
    for (let line = 0; line < doc.lineCount() && userScriptWhitespaceMarks.length < maxMarks; line += 1) {
        const text = doc.getLine(line) || '';
        const trailing = text.match(/[ \t]+$/);
        if (trailing && trailing[0].length) {
            userScriptWhitespaceMarks.push(inlineScriptEditor.markText(
                { line, ch: text.length - trailing[0].length },
                { line, ch: text.length },
                { className: 'cm-userscript-trailing-space' }
            ));
        }

        const tabRegex = /\t/g;
        let match;
        while ((match = tabRegex.exec(text)) && userScriptWhitespaceMarks.length < maxMarks) {
            userScriptWhitespaceMarks.push(inlineScriptEditor.markText(
                { line, ch: match.index },
                { line, ch: match.index + 1 },
                { className: 'cm-userscript-tab-space' }
            ));
        }
    }
}

function scheduleUserScriptEditorVisualRefresh(settingsData = null) {
    clearTimeout(userScriptVisualRefreshTimer);
    userScriptVisualRefreshTimer = setTimeout(() => {
        updateUserScriptSelectionHighlights(settingsData);
        updateUserScriptWhitespaceHighlights(settingsData);
    }, 80);
}

function clearUserScriptSyntaxState() {
    if (inlineScriptEditor && userScriptSyntaxErrorLine !== null) {
        inlineScriptEditor.removeLineClass(userScriptSyntaxErrorLine, 'background', 'userscript-syntax-error-line');
    }
    userScriptSyntaxErrorLine = null;
    if (scriptEditorContainer) {
        scriptEditorContainer.removeAttribute('data-syntax-state');
        scriptEditorContainer.removeAttribute('title');
    }
}

function markUserScriptSyntaxError(error) {
    if (!inlineScriptEditor || typeof inlineScriptEditor.addLineClass !== 'function') return;
    const stack = String((error && error.stack) || '');
    const message = String((error && error.message) || error || 'Syntax error');
    const match = stack.match(/<anonymous>:(\d+):(\d+)/) || stack.match(/anonymous:(\d+):(\d+)/);
    const line = match ? Math.max(0, Number(match[1]) - 3) : 0;

    clearUserScriptSyntaxState();
    userScriptSyntaxErrorLine = line;
    inlineScriptEditor.addLineClass(line, 'background', 'userscript-syntax-error-line');
    if (scriptEditorContainer) {
        scriptEditorContainer.dataset.syntaxState = 'error';
        scriptEditorContainer.title = `Erro de sintaxe: ${message}`;
    }
}

function runUserScriptSyntaxCheck(settingsData = null) {
    if (!inlineScriptEditor) return;
    const settings = normalizeSettings(settingsData || readSettingsFromUi());
    if (!settings.userScriptEditorAutoSyntaxCheck) {
        clearUserScriptSyntaxState();
        return;
    }

    const script = inlineScriptEditor.getValue ? inlineScriptEditor.getValue() : '';
    if (script.length > settings.userScriptEditorSyntaxCheckMaxSize) {
        clearUserScriptSyntaxState();
        if (scriptEditorContainer) {
            scriptEditorContainer.dataset.syntaxState = 'skipped';
            scriptEditorContainer.title = 'Verificação automática ignorada pelo limite de tamanho.';
        }
        return;
    }

    try {
        // Parses the script without executing it.
        new Function(script);
        clearUserScriptSyntaxState();
        if (scriptEditorContainer) {
            scriptEditorContainer.dataset.syntaxState = 'ok';
            scriptEditorContainer.title = 'Sintaxe verificada.';
        }
    } catch (error) {
        const message = String((error && error.message) || '');
        if (error && (error.name === 'EvalError' || /unsafe-eval|content security policy/i.test(message))) {
            clearUserScriptSyntaxState();
            if (scriptEditorContainer) {
                scriptEditorContainer.dataset.syntaxState = 'skipped';
                scriptEditorContainer.title = 'Verificação automática indisponível neste contexto.';
            }
            return;
        }
        markUserScriptSyntaxError(error);
    }
}

function scheduleUserScriptSyntaxCheck(settingsData = null) {
    clearTimeout(userScriptSyntaxTimer);
    userScriptSyntaxTimer = setTimeout(() => runUserScriptSyntaxCheck(settingsData), 350);
}

function trimUserScriptTrailingWhitespace(script) {
    return String(script || '').replace(/[ \t]+$/gm, '');
}

function getUserScriptEditorValueForPersistence() {
    if (!inlineScriptEditor || typeof inlineScriptEditor.getValue !== 'function') {
        return DEFAULT_INDEPENDENT_USERSCRIPT;
    }

    const settings = readSettingsFromUi();
    let nextValue = inlineScriptEditor.getValue();
    if (settings.userScriptEditorTrimTrailingWhitespace) {
        nextValue = trimUserScriptTrailingWhitespace(nextValue);
    }

    const fullScript = ensureIndependentUserScriptEnvelope(nextValue);
    if (inlineScriptEditor.getValue() !== fullScript && typeof inlineScriptEditor.setValue === 'function') {
        inlineScriptEditor.setValue(fullScript);
    }

    return fullScript;
}

function setInlineUserScriptValue(value) {
    if (!scriptEditorContainer) return;

    clearUserScriptEmptyState();

    if (!inlineScriptEditor) {
        scriptEditorContainer.innerHTML = '';
        const editorSettings = readSettingsFromUi();
        inlineScriptEditor = (typeof CodeMirror === 'function')
            ? CodeMirror(scriptEditorContainer, {
                value: value || '',
                mode: 'javascript',
                theme: getUserScriptCodeMirrorTheme(editorSettings),
                keyMap: getUserScriptCodeMirrorKeyMap(editorSettings),
                extraKeys: buildUserScriptEditorExtraKeys(editorSettings),
                lineNumbers: true,
                gutters: ['CodeMirror-linenumbers', USERSCRIPT_FOLD_GUTTER],
                lineWrapping: editorSettings.userScriptEditorLineWrapping,
                indentUnit: Number(editorSettings.userScriptEditorIndentUnit),
                tabSize: Number(editorSettings.userScriptEditorTabSize),
                indentWithTabs: editorSettings.userScriptEditorIndentWith === 'tabs',
                matchBrackets: editorSettings.userScriptEditorMatchBrackets,
                smartIndent: editorSettings.userScriptEditorAutoIndent,
                electricChars: editorSettings.userScriptEditorAutoIndent,
                readOnly: editorSettings.userScriptEditorEnabled ? false : 'nocursor'
            })
            : createInlineFallbackEditor(scriptEditorContainer, value || '');

        setupUserScriptFoldGutter(inlineScriptEditor);

        const editorKeyTarget = typeof inlineScriptEditor.getWrapperElement === 'function'
            ? inlineScriptEditor.getWrapperElement()
            : scriptEditorContainer;

        editorKeyTarget.addEventListener('keydown', (event) => {
            if (inlineScriptEditor && typeof inlineScriptEditor.setOption === 'function') {
                return;
            }
            const key = event.key.toLowerCase();
            const ctrl = event.ctrlKey || event.metaKey;

            if (ctrl && key === 's') {
                event.preventDefault();
                executeUserScriptEditorCommand('saveScript');
            } else if (ctrl && key === 'n') {
                event.preventDefault();
                executeUserScriptEditorCommand('newScript');
            } else if (ctrl && key === 'f') {
                event.preventDefault();
                executeUserScriptEditorCommand('find');
            } else if (ctrl && key === 'r' && event.shiftKey) {
                event.preventDefault();
                executeUserScriptEditorCommand('replaceAll');
            } else if (ctrl && key === 'r') {
                event.preventDefault();
                executeUserScriptEditorCommand('replace');
            } else if (ctrl && key === 'g') {
                event.preventDefault();
                executeUserScriptEditorCommand('goLine');
            } else if (ctrl && key === '/') {
                event.preventDefault();
                executeUserScriptEditorCommand('toggleLineComment');
            } else if (ctrl && key === 'k' && event.shiftKey) {
                event.preventDefault();
                executeUserScriptEditorCommand('toggleBlockComment');
            } else if (ctrl && key === 'k') {
                event.preventDefault();
                executeUserScriptEditorCommand('toggleIndentedComment');
            } else if (event.key === 'F3' && event.shiftKey) {
                event.preventDefault();
                executeUserScriptEditorCommand('findPrev');
            } else if (event.key === 'F3') {
                event.preventDefault();
                executeUserScriptEditorCommand('findNext');
            } else if (event.altKey && key === 'f') {
                event.preventDefault();
                executeUserScriptEditorCommand('findIncremental');
            }
        });
        editorKeyTarget.addEventListener('focusout', () => {
            const settings = readSettingsFromUi();
            if (settings.userScriptEditorSaveOnBlur && activeOptionsSession === ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
                saveInlineUserScript(false);
            }
        });

        if (typeof inlineScriptEditor.on === 'function') {
            inlineScriptEditor.on('change', () => {
                refreshUserScriptMeta(inlineScriptEditor.getValue());
                scheduleUserScriptEditorVisualRefresh();
                scheduleUserScriptSyntaxCheck();
            });
            inlineScriptEditor.on('cursorActivity', () => {
                scheduleUserScriptEditorVisualRefresh();
            });
        } else if (editorKeyTarget && editorKeyTarget.addEventListener) {
            editorKeyTarget.addEventListener('input', () => {
                refreshUserScriptMeta(inlineScriptEditor.getValue());
                scheduleUserScriptSyntaxCheck();
            });
        }
    } else {
        clearUserScriptFoldMarks();
        inlineScriptEditor.setValue(value || '');
    }

    inlineScriptEditor.setSize('100%', '100%');
    applyUserScriptEditorSettings();
    scheduleUserScriptFoldGutterRefresh();
    setTimeout(() => inlineScriptEditor.refresh(), 0);
}

function parseIndependentUserScriptMeta(scriptContent) {
    const script = typeof scriptContent === 'string' ? scriptContent : '';
    const readSingle = (name) => {
        const match = script.match(new RegExp(`^\\s*//\\s*@${name}\\s+(.+)$`, 'mi'));
        return match ? match[1].trim() : '';
    };
    const matches = Array.from(script.matchAll(/^\s*\/\/\s*@(match|include)\s+(.+)$/gmi))
        .map(match => match[2].trim())
        .filter(Boolean);
    const excludes = Array.from(script.matchAll(/^\s*\/\/\s*@(exclude|exclude-match)\s+(.+)$/gmi))
        .map(match => match[2].trim())
        .filter(Boolean);

    return {
        name: readSingle('name') || 'Independent UserScript',
        namespace: readSingle('namespace') || 'Auto Clicker - Form Helper',
        matches,
        excludes,
        runAt: readSingle('run-at') || 'document-idle'
    };
}

function refreshUserScriptMeta(scriptContent) {
    const currentScript = typeof scriptContent === 'string'
        ? scriptContent
        : (inlineScriptEditor ? inlineScriptEditor.getValue() : DEFAULT_INDEPENDENT_USERSCRIPT);
    const meta = parseIndependentUserScriptMeta(currentScript);

    if (scriptNamespaceLabel) {
        scriptNamespaceLabel.textContent = meta.name || '-';
    }

    if (scriptUrlMatchLabel) {
        scriptUrlMatchLabel.textContent = meta.matches.length ? meta.matches.join(', ') : 'No @match/@include';
    }
}

function ensureIndependentUserScriptEnvelope(scriptContent) {
    const script = (scriptContent || '').trim();
    if (/\/\/\s*==UserScript==/.test(script) && /\/\/\s*==\/UserScript==/.test(script)) {
        return script;
    }

    const header = `// ==UserScript==
// @name         Auto Clicker UserScript
// @namespace    Auto Clicker - Form Helper
// @version      1.0.0
// @description  Independent browser automation script
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==`;

    return `${header}\n\n${script || "(function() {\n    'use strict';\n\n})();"}\n`;
}

function createDefaultUserScriptTemplate(name = 'Auto Clicker UserScript') {
    return DEFAULT_INDEPENDENT_USERSCRIPT.replace(
        '// @name         Auto Clicker UserScript',
        `// @name         ${name}`
    );
}

function normalizeUserScriptForTemplateCompare(scriptContent) {
    return ensureIndependentUserScriptEnvelope(scriptContent || '')
        .replace(/\r\n/g, '\n')
        .trim();
}

function isDefaultUserScriptTemplate(scriptContent, recordName = '') {
    const normalized = normalizeUserScriptForTemplateCompare(scriptContent);
    const templateNames = new Set(['Auto Clicker UserScript', 'UserScript 01']);
    if (recordName) {
        templateNames.add(recordName);
    }

    return Array.from(templateNames).some((name) => {
        return normalized === normalizeUserScriptForTemplateCompare(createDefaultUserScriptTemplate(name));
    });
}

function getExecutableUserScriptForRecord(record) {
    if (!record || !record.scriptContent) return '';
    return isDefaultUserScriptTemplate(record.scriptContent, record.name) ? '' : record.scriptContent;
}

function getActiveUserScriptRecord() {
    return userScripts.find(script => script && script.id === activeUserScriptId) || null;
}

function notifyActiveUserScriptRuntime(record = getActiveUserScriptRecord()) {
    const executableScript = getExecutableUserScriptForRecord(record);
    if (!record || !executableScript || activeOptionsSession !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
        chrome.runtime.sendMessage({ action: 'independentUserScriptDeleted' }, () => {});
        return;
    }

    chrome.runtime.sendMessage({
        action: 'independentUserScriptUpdated',
        scriptId: record.id,
        scriptContent: executableScript
    }, () => {
        if (chrome.runtime.lastError) {
            console.warn('Active UserScript update not delivered:', chrome.runtime.lastError.message);
        }
    });
}

function getNextNamedNumber(items, prefix) {
    const numbers = (items || [])
        .map(item => {
            const match = (item.name || '').match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(\\d+)$`, 'i'));
            return match ? parseInt(match[1], 10) : null;
        })
        .filter(number => Number.isFinite(number))
        .sort((a, b) => a - b);

    let next = 1;
    numbers.forEach(number => {
        if (number === next) next += 1;
    });
    return next;
}

function normalizeUserScriptRecord(record, fallbackIndex = 1) {
    const scriptContent = ensureIndependentUserScriptEnvelope(record && record.scriptContent
        ? record.scriptContent
        : createDefaultUserScriptTemplate(`UserScript ${String(fallbackIndex).padStart(2, '0')}`));
    const meta = parseIndependentUserScriptMeta(scriptContent);
    return {
        id: record && record.id ? String(record.id) : `userscript-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: (record && record.name) || meta.name || `UserScript ${String(fallbackIndex).padStart(2, '0')}`,
        scriptContent,
        createdAt: (record && record.createdAt) || new Date().toISOString(),
        updatedAt: (record && record.updatedAt) || new Date().toISOString()
    };
}

function persistUserScripts(callback, options = {}) {
    const activeRecord = getActiveUserScriptRecord();
    const payload = {
        [USER_SCRIPTS_KEY]: userScripts,
        [ACTIVE_USER_SCRIPT_ID_KEY]: activeUserScriptId
    };

    if (options.activateSession === true) {
        payload.activeAutomationMode = ACTIVE_AUTOMATION_MODE_USERSCRIPT;
    }

    if (activeRecord) {
        const executableScript = getExecutableUserScriptForRecord(activeRecord);
        payload[INDEPENDENT_USERSCRIPT_KEY] = executableScript;
        payload[INDEPENDENT_USERSCRIPT_LAST_EDITED_KEY] = executableScript
            ? (activeRecord.updatedAt || new Date().toISOString())
            : '';
    }

    acfhStorage.set(payload, () => {
        renderSessionConfigLists();
        if (typeof callback === 'function') callback();
    });
}

function loadUserScriptsFromStorage(callback) {
    acfhStorage.get([USER_SCRIPTS_KEY, ACTIVE_USER_SCRIPT_ID_KEY, INDEPENDENT_USERSCRIPT_KEY], (data) => {
        const storedList = Array.isArray(data[USER_SCRIPTS_KEY]) ? data[USER_SCRIPTS_KEY] : [];
        userScripts = storedList.map((record, index) => normalizeUserScriptRecord(record, index + 1));

        if (!userScripts.length && data[INDEPENDENT_USERSCRIPT_KEY]) {
            userScripts = [normalizeUserScriptRecord({
                id: 'userscript-default',
                scriptContent: data[INDEPENDENT_USERSCRIPT_KEY]
            }, 1)];
        }

        activeUserScriptId = userScripts.some(script => script.id === data[ACTIVE_USER_SCRIPT_ID_KEY])
            ? data[ACTIVE_USER_SCRIPT_ID_KEY]
            : (userScripts[0] ? userScripts[0].id : null);

        if (userScripts.length) {
            persistUserScripts(() => {
                if (activeOptionsSession === 'userscript') {
                    loadInlineUserScriptEditor();
                }
                if (typeof callback === 'function') callback();
            });
            return;
        }

        renderSessionConfigLists();
        if (typeof callback === 'function') callback();
    });
}

function createUserScriptRecord() {
    syncInlineEditorToActiveUserScriptRecord();

    const nextNumber = getNextNamedNumber(userScripts, 'UserScript');
    const scriptName = `UserScript ${String(nextNumber).padStart(2, '0')}`;
    const now = new Date().toISOString();
    const newRecord = normalizeUserScriptRecord({
        id: `userscript-${Date.now()}`,
        name: scriptName,
        scriptContent: createDefaultUserScriptTemplate(scriptName),
        createdAt: now,
        updatedAt: now
    }, nextNumber);

    userScripts.unshift(newRecord);
    activeUserScriptId = newRecord.id;
    persistUserScripts(() => {
        setInlineUserScriptValue(newRecord.scriptContent);
        refreshUserScriptMeta(newRecord.scriptContent);
        setScriptSavedIndicator(true);
        showTemporaryMessage('UserScript created.', 'success');
        notifyActiveUserScriptRuntime(newRecord);
    }, { activateSession: activeOptionsSession === ACTIVE_AUTOMATION_MODE_USERSCRIPT });
}

function selectUserScriptRecord(scriptId) {
    const nextRecord = userScripts.find(script => script.id === scriptId);
    if (!nextRecord) return;

    if (activeUserScriptId !== scriptId) {
        syncInlineEditorToActiveUserScriptRecord();
    }

    activeUserScriptId = scriptId;
    persistUserScripts(() => {
        loadInlineUserScriptEditor();
        notifyActiveUserScriptRuntime(nextRecord);
    }, { activateSession: activeOptionsSession === ACTIVE_AUTOMATION_MODE_USERSCRIPT });
}

function loadInlineUserScriptEditor(options = {}) {
    const forceGenerated = options.forceGenerated === true;
    if (!scriptEditorContainer) return;

    const loadToken = ++inlineScriptLoadToken;
    acfhStorage.get([INDEPENDENT_USERSCRIPT_KEY, USER_SCRIPTS_KEY, ACTIVE_USER_SCRIPT_ID_KEY], (data) => {
        if (loadToken !== inlineScriptLoadToken) return;

        if (!userScripts.length && Array.isArray(data[USER_SCRIPTS_KEY])) {
            userScripts = data[USER_SCRIPTS_KEY].map((record, index) => normalizeUserScriptRecord(record, index + 1));
        }

        if (!activeUserScriptId && data[ACTIVE_USER_SCRIPT_ID_KEY]) {
            activeUserScriptId = data[ACTIVE_USER_SCRIPT_ID_KEY];
        }

        const activeRecord = getActiveUserScriptRecord();
        const storedScript = activeRecord
            ? activeRecord.scriptContent
            : (typeof data[INDEPENDENT_USERSCRIPT_KEY] === 'string' ? data[INDEPENDENT_USERSCRIPT_KEY] : '');
        const scriptContent = forceGenerated || !storedScript
            ? (activeRecord ? createDefaultUserScriptTemplate(activeRecord.name) : DEFAULT_INDEPENDENT_USERSCRIPT)
            : storedScript;

        inlineScriptConfigId = activeRecord ? activeRecord.id : null;
        setInlineUserScriptValue(scriptContent);
        refreshUserScriptMeta(scriptContent);
        setScriptSavedIndicator(Array.isArray(userScripts) && userScripts.length > 0);
    });
}

function syncInlineEditorToActiveUserScriptRecord() {
    if (!inlineScriptEditor || !activeUserScriptId) return null;
    const activeRecord = getActiveUserScriptRecord();
    if (!activeRecord) return null;

    const fullScript = getUserScriptEditorValueForPersistence();
    const meta = parseIndependentUserScriptMeta(fullScript);
    activeRecord.name = meta.name || activeRecord.name || 'UserScript';
    activeRecord.scriptContent = fullScript;
    activeRecord.updatedAt = new Date().toISOString();
    return activeRecord;
}

function saveInlineUserScript(showMessage = true) {
    if (!inlineScriptEditor) {
        loadInlineUserScriptEditor();
        return;
    }

    const settings = readSettingsFromUi();
    const fullScript = getUserScriptEditorValueForPersistence();
    refreshUserScriptMeta(fullScript);
    const meta = parseIndependentUserScriptMeta(fullScript);
    let activeRecord = getActiveUserScriptRecord();
    const now = new Date().toISOString();

    if (isDefaultUserScriptTemplate(fullScript, activeRecord ? activeRecord.name : meta.name)) {
        setScriptSavedIndicator(Array.isArray(userScripts) && userScripts.length > 0);
        chrome.runtime.sendMessage({ action: 'independentUserScriptDeleted' }, () => {});
        if (showMessage) {
            showTemporaryMessage('Edite o script padrão antes de salvar ou injetar.', 'warning', 2200);
        }
        return;
    }

    if (!activeRecord) {
        activeRecord = normalizeUserScriptRecord({
            id: `userscript-${Date.now()}`,
            name: meta.name || 'UserScript 01',
            scriptContent: fullScript,
            createdAt: now,
            updatedAt: now
        }, 1);
        userScripts.unshift(activeRecord);
        activeUserScriptId = activeRecord.id;
    } else {
        activeRecord.name = meta.name || activeRecord.name || 'UserScript';
        activeRecord.scriptContent = fullScript;
        activeRecord.updatedAt = now;
    }

    acfhStorage.set({
        [USER_SCRIPTS_KEY]: userScripts,
        [ACTIVE_USER_SCRIPT_ID_KEY]: activeUserScriptId,
        [INDEPENDENT_USERSCRIPT_KEY]: fullScript,
        [INDEPENDENT_USERSCRIPT_LAST_EDITED_KEY]: now,
        activeAutomationMode: ACTIVE_AUTOMATION_MODE_USERSCRIPT
    }, () => {
        renderSessionConfigLists();
        setScriptSavedIndicator(true);
        if (showMessage && !settings.userScriptEditorSuppressSaveDialog) {
            showTemporaryMessage('UserScript saved.', 'success', 2000);
        }
        chrome.runtime.sendMessage({
            action: 'independentUserScriptUpdated',
            scriptId: activeRecord.id,
            scriptContent: fullScript
        }, () => {
            if (chrome.runtime.lastError) {
                console.warn('Independent UserScript update not delivered:', chrome.runtime.lastError.message);
            }
        });
    });
}

async function exportIndependentUserScript() {
    const scriptContent = ensureIndependentUserScriptEnvelope(
        inlineScriptEditor ? inlineScriptEditor.getValue() : DEFAULT_INDEPENDENT_USERSCRIPT
    );
    const meta = parseIndependentUserScriptMeta(scriptContent);
    const safeName = (meta.name || 'auto-clicker-userscript')
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase() || 'auto-clicker-userscript';
    const blob = new Blob([scriptContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.user.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showTemporaryMessage('UserScript exported.', 'success');
}

async function importIndependentUserScript() {
    const readFile = async (file) => {
        const content = await file.text();
        const scriptContent = ensureIndependentUserScriptEnvelope(content);
        setInlineUserScriptValue(scriptContent);
        refreshUserScriptMeta(scriptContent);
        saveInlineUserScript();
    };

    if ('showOpenFilePicker' in window) {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'UserScript files',
                accept: {
                    'text/javascript': ['.user.js', '.js'],
                    'text/plain': ['.txt']
                }
            }],
            multiple: false
        });
        await readFile(await fileHandle.getFile());
        return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.user.js,.js,.txt,text/javascript,text/plain';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async (event) => {
        const file = event.target.files && event.target.files[0];
        if (file) {
            await readFile(file);
        }
        document.body.removeChild(input);
    }, { once: true });
    input.click();
}

function deleteIndependentUserScript() {
    if (activeUserScriptId) {
        userScripts = userScripts.filter(script => script.id !== activeUserScriptId);
        activeUserScriptId = userScripts[0] ? userScripts[0].id : null;
    }

    const nextRecord = getActiveUserScriptRecord();
    const payload = {
        [USER_SCRIPTS_KEY]: userScripts,
        [ACTIVE_USER_SCRIPT_ID_KEY]: activeUserScriptId
    };
    const afterPersist = () => {
        renderSessionConfigLists();
        setInlineUserScriptValue(nextRecord ? nextRecord.scriptContent : DEFAULT_INDEPENDENT_USERSCRIPT);
        refreshUserScriptMeta(nextRecord ? nextRecord.scriptContent : DEFAULT_INDEPENDENT_USERSCRIPT);
        setScriptSavedIndicator(Boolean(nextRecord));
        notifyActiveUserScriptRuntime(nextRecord);
        showTemporaryMessage('UserScript deleted.', 'success');
    };

    if (nextRecord) {
        const executableScript = getExecutableUserScriptForRecord(nextRecord);
        payload[INDEPENDENT_USERSCRIPT_KEY] = executableScript;
        payload[INDEPENDENT_USERSCRIPT_LAST_EDITED_KEY] = executableScript
            ? (nextRecord.updatedAt || new Date().toISOString())
            : '';
        acfhStorage.set(payload, afterPersist);
        return;
    }

    acfhStorage.remove([INDEPENDENT_USERSCRIPT_KEY, INDEPENDENT_USERSCRIPT_LAST_EDITED_KEY], () => {
        acfhStorage.set(payload, afterPersist);
    });
}

function deleteUserScriptRecord(scriptId) {
    if (!scriptId) return;

    const deletedRecord = userScripts.find(script => script && script.id === scriptId);
    userScripts = userScripts.filter(script => script && script.id !== scriptId);

    if (activeUserScriptId === scriptId) {
        activeUserScriptId = userScripts[0] ? userScripts[0].id : null;
    }

    const nextRecord = getActiveUserScriptRecord();
    const payload = {
        [USER_SCRIPTS_KEY]: userScripts,
        [ACTIVE_USER_SCRIPT_ID_KEY]: activeUserScriptId
    };

    if (nextRecord) {
        const executableScript = getExecutableUserScriptForRecord(nextRecord);
        payload[INDEPENDENT_USERSCRIPT_KEY] = executableScript;
        payload[INDEPENDENT_USERSCRIPT_LAST_EDITED_KEY] = executableScript
            ? (nextRecord.updatedAt || new Date().toISOString())
            : '';
    }

    const afterPersist = () => {
        renderSessionConfigLists();
        setInlineUserScriptValue(nextRecord ? nextRecord.scriptContent : DEFAULT_INDEPENDENT_USERSCRIPT);
        refreshUserScriptMeta(nextRecord ? nextRecord.scriptContent : DEFAULT_INDEPENDENT_USERSCRIPT);
        setScriptSavedIndicator(Boolean(nextRecord));
        notifyActiveUserScriptRuntime(nextRecord);
        showTemporaryMessage(`UserScript "${deletedRecord?.name || 'Script'}" deleted.`, 'success');
    };

    if (nextRecord) {
        acfhStorage.set(payload, afterPersist);
        return;
    }

    acfhStorage.remove([INDEPENDENT_USERSCRIPT_KEY, INDEPENDENT_USERSCRIPT_LAST_EDITED_KEY], () => {
        acfhStorage.set(payload, afterPersist);
    });
}

function getInlineEditorWrapper() {
    return inlineScriptEditor && typeof inlineScriptEditor.getWrapperElement === 'function'
        ? inlineScriptEditor.getWrapperElement()
        : scriptEditorContainer;
}

function focusInlineScriptEditor() {
    if (!inlineScriptEditor) {
        loadInlineUserScriptEditor();
        return;
    }

    if (typeof inlineScriptEditor.focus === 'function') {
        inlineScriptEditor.focus();
        return;
    }

    const wrapper = getInlineEditorWrapper();
    if (wrapper && typeof wrapper.focus === 'function') {
        wrapper.focus();
    }
}

function refreshInlineScriptEditorLayout() {
    if (!inlineScriptEditor || typeof inlineScriptEditor.refresh !== 'function') return;
    requestAnimationFrame(() => {
        inlineScriptEditor.refresh();
        setTimeout(() => inlineScriptEditor && inlineScriptEditor.refresh && inlineScriptEditor.refresh(), 180);
    });
}

function applyUserScriptEditorSettings(settingsData = null) {
    const settings = normalizeSettings(settingsData || readSettingsFromUi());
    const wrapper = getInlineEditorWrapper();

    if (inlineScriptEditor && typeof inlineScriptEditor.setOption === 'function') {
        inlineScriptEditor.setOption('theme', getUserScriptCodeMirrorTheme(settings));
        inlineScriptEditor.setOption('keyMap', getUserScriptCodeMirrorKeyMap(settings));
        inlineScriptEditor.setOption('extraKeys', buildUserScriptEditorExtraKeys(settings));
        inlineScriptEditor.setOption('gutters', ['CodeMirror-linenumbers', USERSCRIPT_FOLD_GUTTER]);
        inlineScriptEditor.setOption('lineWrapping', settings.userScriptEditorLineWrapping);
        inlineScriptEditor.setOption('indentUnit', Number(settings.userScriptEditorIndentUnit));
        inlineScriptEditor.setOption('tabSize', Number(settings.userScriptEditorTabSize));
        inlineScriptEditor.setOption('indentWithTabs', settings.userScriptEditorIndentWith === 'tabs');
        inlineScriptEditor.setOption('matchBrackets', settings.userScriptEditorMatchBrackets);
        inlineScriptEditor.setOption('smartIndent', settings.userScriptEditorAutoIndent);
        inlineScriptEditor.setOption('electricChars', settings.userScriptEditorAutoIndent);
        inlineScriptEditor.setOption('readOnly', settings.userScriptEditorEnabled ? false : 'nocursor');
    } else if (wrapper && 'readOnly' in wrapper) {
        wrapper.readOnly = !settings.userScriptEditorEnabled;
    }

    if (wrapper && wrapper.style) {
        wrapper.style.fontSize = `${settings.userScriptEditorFontSize}%`;
    }
    if (scriptEditorContainer) {
        scriptEditorContainer.classList.toggle('editor-disabled', !settings.userScriptEditorEnabled);
    }

    scheduleUserScriptEditorVisualRefresh(settings);
    scheduleUserScriptSyntaxCheck(settings);
    refreshInlineScriptEditorLayout();
}

function setUserScriptEditorExpanded(expanded, options = {}) {
    isUserScriptEditorExpanded = Boolean(expanded);
    document.documentElement.classList.toggle('userscript-editor-expanded', isUserScriptEditorExpanded);

    if (userscriptExpandToggle) {
        userscriptExpandToggle.setAttribute('aria-pressed', isUserScriptEditorExpanded ? 'true' : 'false');
        userscriptExpandToggle.title = isUserScriptEditorExpanded ? 'Reduce editor' : 'Expand editor';
    }

    if (options.persist !== false) {
        try {
            localStorage.setItem('acfhUserscriptEditorExpanded', isUserScriptEditorExpanded ? '1' : '0');
        } catch (e) {
            // ignore
        }
    }

    refreshInlineScriptEditorLayout();
}

function initUserScriptEditorExpansion() {
    if (!userscriptExpandToggle) return;

    let storedExpanded = false;
    try {
        storedExpanded = localStorage.getItem('acfhUserscriptEditorExpanded') === '1';
    } catch (e) {
        // ignore
    }

    setUserScriptEditorExpanded(storedExpanded, { persist: false });

    userscriptExpandToggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setUserScriptEditorExpanded(!isUserScriptEditorExpanded);
    });
}

function getInlineEditorDoc() {
    if (!inlineScriptEditor) return null;
    return typeof inlineScriptEditor.getDoc === 'function'
        ? inlineScriptEditor.getDoc()
        : inlineScriptEditor;
}

function runInlineEditorOperation(callback) {
    if (!inlineScriptEditor || typeof callback !== 'function') return;
    if (typeof inlineScriptEditor.operation === 'function') {
        inlineScriptEditor.operation(callback);
    } else {
        callback();
    }
    setTimeout(() => inlineScriptEditor && inlineScriptEditor.refresh && inlineScriptEditor.refresh(), 0);
}

function selectInlineEditorRange(from, to) {
    const doc = getInlineEditorDoc();
    if (!doc) return;
    if (typeof doc.setSelection === 'function') {
        doc.setSelection(from, to);
    }
    focusInlineScriptEditor();
}

function inlineEditorIndexFromPos(pos) {
    if (inlineScriptEditor && typeof inlineScriptEditor.indexFromPos === 'function') {
        return inlineScriptEditor.indexFromPos(pos);
    }
    return 0;
}

function inlineEditorPosFromIndex(index) {
    if (inlineScriptEditor && typeof inlineScriptEditor.posFromIndex === 'function') {
        return inlineScriptEditor.posFromIndex(index);
    }
    return { line: 0, ch: index };
}

function getSelectedEditorText() {
    const doc = getInlineEditorDoc();
    if (!doc) return '';
    return typeof doc.getSelection === 'function' ? doc.getSelection() : '';
}

let lastEditorSearchQuery = '';

function findTextInInlineEditor(query, options = {}) {
    if (!query || !inlineScriptEditor) return false;
    const reverse = options.reverse === true;
    const text = inlineScriptEditor.getValue();
    const doc = getInlineEditorDoc();
    const cursor = doc && typeof doc.getCursor === 'function'
        ? doc.getCursor(reverse ? 'from' : 'to')
        : { line: 0, ch: 0 };
    const cursorIndex = inlineEditorIndexFromPos(cursor);
    const index = reverse
        ? (() => {
            const previous = text.lastIndexOf(query, Math.max(0, cursorIndex - 1));
            return previous !== -1 ? previous : text.lastIndexOf(query);
        })()
        : (() => {
            const next = text.indexOf(query, cursorIndex);
            return next !== -1 ? next : text.indexOf(query);
        })();

    if (index < 0) {
        showTemporaryMessage('Text not found.', 'error');
        return false;
    }

    selectInlineEditorRange(inlineEditorPosFromIndex(index), inlineEditorPosFromIndex(index + query.length));
    lastEditorSearchQuery = query;
    return true;
}

function promptEditorSearch(defaultValue = '') {
    const query = window.prompt('Localizar:', defaultValue || lastEditorSearchQuery || getSelectedEditorText());
    return query === null ? '' : query;
}

function toggleInlineLineComment() {
    const doc = getInlineEditorDoc();
    if (!doc || typeof doc.getCursor !== 'function' || typeof doc.getLine !== 'function') return;
    let from = doc.getCursor('from');
    let to = doc.getCursor('to');
    let endLine = to.line;
    if (to.ch === 0 && endLine > from.line) {
        endLine -= 1;
    }

    runInlineEditorOperation(() => {
        const lines = [];
        for (let line = from.line; line <= endLine; line += 1) {
            lines.push(doc.getLine(line) || '');
        }
        const shouldUncomment = lines.length > 0 && lines.every(line => /^\s*\/\//.test(line) || line.trim() === '');
        for (let line = from.line; line <= endLine; line += 1) {
            const current = doc.getLine(line) || '';
            if (shouldUncomment) {
                const next = current.replace(/^(\s*)\/\/\s?/, '$1');
                doc.replaceRange(next, { line, ch: 0 }, { line, ch: current.length });
            } else if (current.trim() !== '') {
                const indent = current.match(/^\s*/)[0].length;
                doc.replaceRange('// ', { line, ch: indent });
            }
        }
    });
}

function toggleInlineBlockComment() {
    const doc = getInlineEditorDoc();
    if (!doc || typeof doc.getSelection !== 'function') return;
    const selection = doc.getSelection();
    if (!selection) {
        const cursor = doc.getCursor();
        doc.replaceRange('/**  */', cursor);
        doc.setCursor({ line: cursor.line, ch: cursor.ch + 4 });
        return;
    }

    const trimmed = selection.trim();
    if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) {
        doc.replaceSelection(selection.replace(/^\s*\/\*\s?/, '').replace(/\s?\*\/\s*$/, ''));
    } else {
        doc.replaceSelection(`/* ${selection} */`);
    }
}

function duplicateInlineLine() {
    const doc = getInlineEditorDoc();
    if (!doc || typeof doc.getCursor !== 'function' || typeof doc.getLine !== 'function') return;
    const from = doc.getCursor('from');
    const to = doc.getCursor('to');
    const endLine = to.ch === 0 && to.line > from.line ? to.line - 1 : to.line;
    const lines = [];
    for (let line = from.line; line <= endLine; line += 1) {
        lines.push(doc.getLine(line) || '');
    }
    doc.replaceRange(`\n${lines.join('\n')}`, { line: endLine, ch: (doc.getLine(endLine) || '').length });
}

function selectInlineCurrentLine() {
    const doc = getInlineEditorDoc();
    if (!doc || typeof doc.getCursor !== 'function' || typeof doc.getLine !== 'function') return;
    const cursor = doc.getCursor();
    doc.setSelection({ line: cursor.line, ch: 0 }, { line: cursor.line, ch: (doc.getLine(cursor.line) || '').length });
    focusInlineScriptEditor();
}

function sortInlineSelectedLines() {
    const doc = getInlineEditorDoc();
    if (!doc || typeof doc.getCursor !== 'function' || typeof doc.getLine !== 'function') return;
    const from = doc.getCursor('from');
    const to = doc.getCursor('to');
    let endLine = to.ch === 0 && to.line > from.line ? to.line - 1 : to.line;
    const lines = [];
    for (let line = from.line; line <= endLine; line += 1) {
        lines.push(doc.getLine(line) || '');
    }
    lines.sort((a, b) => a.localeCompare(b));
    doc.replaceRange(lines.join('\n'), { line: from.line, ch: 0 }, { line: endLine, ch: (doc.getLine(endLine) || '').length });
}

function replaceInlineEditorText(replaceAll = false) {
    const query = promptEditorSearch();
    if (!query) return;
    const replacement = window.prompt('Substituir por:', '');
    if (replacement === null) return;

    if (replaceAll) {
        const nextValue = inlineScriptEditor.getValue().split(query).join(replacement);
        inlineScriptEditor.setValue(nextValue);
        showTemporaryMessage('All matches replaced.', 'success');
        return;
    }

    const selected = getSelectedEditorText();
    if (selected === query) {
        const doc = getInlineEditorDoc();
        if (doc && typeof doc.replaceSelection === 'function') {
            doc.replaceSelection(replacement);
        }
    } else if (findTextInInlineEditor(query)) {
        const doc = getInlineEditorDoc();
        if (doc && typeof doc.replaceSelection === 'function') {
            doc.replaceSelection(replacement);
        }
    }
}

function selectAllInlineMatches() {
    const query = promptEditorSearch();
    if (!query || !inlineScriptEditor || typeof inlineScriptEditor.setSelections !== 'function') {
        findTextInInlineEditor(query);
        return;
    }

    const text = inlineScriptEditor.getValue();
    const ranges = [];
    let index = text.indexOf(query);
    while (index !== -1) {
        ranges.push({
            anchor: inlineEditorPosFromIndex(index),
            head: inlineEditorPosFromIndex(index + query.length)
        });
        index = text.indexOf(query, index + query.length);
    }

    if (!ranges.length) {
        showTemporaryMessage('Text not found.', 'error');
        return;
    }

    inlineScriptEditor.setSelections(ranges);
    lastEditorSearchQuery = query;
    focusInlineScriptEditor();
}

function goToInlineEditorLine() {
    const doc = getInlineEditorDoc();
    if (!doc || typeof doc.lineCount !== 'function') return;
    const lineText = window.prompt('Ir para linha:', '1');
    if (lineText === null) return;
    const lineNumber = Math.max(1, Math.min(doc.lineCount(), parseInt(lineText, 10) || 1));
    doc.setCursor({ line: lineNumber - 1, ch: 0 });
    focusInlineScriptEditor();
}

function validateIndependentUserScriptHeader() {
    const script = ensureIndependentUserScriptEnvelope(inlineScriptEditor ? inlineScriptEditor.getValue() : DEFAULT_INDEPENDENT_USERSCRIPT);
    const meta = parseIndependentUserScriptMeta(script);
    if (!/\/\/\s*==UserScript==/.test(script) || !/\/\/\s*==\/UserScript==/.test(script)) {
        showTemporaryMessage('Invalid UserScript header.', 'error');
        return;
    }
    if (!meta.matches.length) {
        showTemporaryMessage('Add at least one @match or @include.', 'error');
        return;
    }
    showTemporaryMessage(`Header OK: ${meta.matches.join(', ')}`, 'success', 2400);
}

function runIndependentUserScriptNow() {
    if (!inlineScriptEditor) return;
    const scriptContent = ensureIndependentUserScriptEnvelope(inlineScriptEditor.getValue());
    const activeRecord = getActiveUserScriptRecord();
    const meta = parseIndependentUserScriptMeta(scriptContent);
    if (isDefaultUserScriptTemplate(scriptContent, activeRecord ? activeRecord.name : meta.name)) {
        chrome.runtime.sendMessage({ action: 'independentUserScriptDeleted' }, () => {});
        showTemporaryMessage('Edite o script padrão antes de executar.', 'warning', 2200);
        return;
    }
    acfhStorage.set({
        [INDEPENDENT_USERSCRIPT_KEY]: scriptContent,
        [INDEPENDENT_USERSCRIPT_LAST_EDITED_KEY]: new Date().toISOString(),
        activeAutomationMode: ACTIVE_AUTOMATION_MODE_USERSCRIPT
    }, () => {
        chrome.runtime.sendMessage({
            action: 'executeIndependentUserScriptNow',
            scriptContent
        }, (response) => {
            if (chrome.runtime.lastError) {
                showTemporaryMessage(chrome.runtime.lastError.message, 'error', 2400);
                return;
            }
            if (response && response.success) {
                showTemporaryMessage('Script executed in the active tab.', 'success', 2200);
            } else {
                showTemporaryMessage((response && response.error) || 'Script was not executed.', 'error', 2400);
            }
        });
    });
}

function executeUserScriptEditorCommand(command) {
    if (!inlineScriptEditor && command !== 'importScript') {
        loadInlineUserScriptEditor();
    }

    const doc = getInlineEditorDoc();
    const commands = {
        newScript: () => setInlineUserScriptValue(DEFAULT_INDEPENDENT_USERSCRIPT),
        saveScript: () => saveInlineUserScript(),
        importScript: () => importIndependentUserScript(),
        exportScript: () => exportIndependentUserScript(),
        deleteScript: () => deleteIndependentUserScript(),
        undo: () => inlineScriptEditor && (inlineScriptEditor.undo ? inlineScriptEditor.undo() : doc && doc.undo && doc.undo()),
        redo: () => inlineScriptEditor && (inlineScriptEditor.redo ? inlineScriptEditor.redo() : doc && doc.redo && doc.redo()),
        selectAll: () => inlineScriptEditor && inlineScriptEditor.execCommand ? inlineScriptEditor.execCommand('selectAll') : null,
        toggleLineComment: toggleInlineLineComment,
        toggleIndentedComment: toggleInlineLineComment,
        toggleBlockComment: toggleInlineBlockComment,
        duplicateLine: duplicateInlineLine,
        selectLine: selectInlineCurrentLine,
        sortSelection: sortInlineSelectedLines,
        find: () => findTextInInlineEditor(promptEditorSearch()),
        replace: () => replaceInlineEditorText(false),
        replaceAll: () => replaceInlineEditorText(true),
        findNext: () => findTextInInlineEditor(lastEditorSearchQuery || promptEditorSearch()),
        findPrev: () => findTextInInlineEditor(lastEditorSearchQuery || promptEditorSearch(), { reverse: true }),
        findSelection: () => findTextInInlineEditor(getSelectedEditorText() || promptEditorSearch()),
        findSelectionPrev: () => findTextInInlineEditor(getSelectedEditorText() || promptEditorSearch(), { reverse: true }),
        selectAllMatches: selectAllInlineMatches,
        findIncremental: () => findTextInInlineEditor(promptEditorSearch()),
        goLine: goToInlineEditorLine,
        goStart: () => doc && doc.setCursor && (doc.setCursor({ line: 0, ch: 0 }), focusInlineScriptEditor()),
        goEnd: () => {
            if (!doc || typeof doc.lineCount !== 'function' || typeof doc.getLine !== 'function') return;
            const line = doc.lineCount() - 1;
            doc.setCursor({ line, ch: (doc.getLine(line) || '').length });
            focusInlineScriptEditor();
        },
        runNow: runIndependentUserScriptNow,
        validateHeader: validateIndependentUserScriptHeader,
        reloadTemplate: () => setInlineUserScriptValue(DEFAULT_INDEPENDENT_USERSCRIPT)
    };

    if (commands[command]) {
        commands[command]();
        if (!['find', 'replace', 'replaceAll', 'goLine', 'runNow', 'validateHeader', 'importScript', 'exportScript'].includes(command)) {
            focusInlineScriptEditor();
        }
    }
}

function initUserScriptEditorMenu() {
    const menuBar = document.querySelector('.tm-editor-menubar');
    if (!menuBar) return;
    initUserScriptEditorExpansion();

    const closeMenus = () => {
        menuBar.querySelectorAll('.tm-menu.open').forEach(menu => menu.classList.remove('open'));
    };

    menuBar.querySelectorAll('.tm-menu-trigger').forEach((trigger) => {
        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const menu = trigger.closest('.tm-menu');
            const wasOpen = menu.classList.contains('open');
            closeMenus();
            menu.classList.toggle('open', !wasOpen);
        });
    });

    menuBar.querySelectorAll('[data-editor-command]').forEach((item) => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const command = item.getAttribute('data-editor-command');
            closeMenus();
            executeUserScriptEditorCommand(command);
        });
    });

    document.addEventListener('click', (event) => {
        if (!menuBar.contains(event.target)) {
            closeMenus();
        }
    });
}

function updateSettingsPanelForSession() {
    const isUserScriptSession = activeOptionsSession === ACTIVE_AUTOMATION_MODE_USERSCRIPT;
    const isOcrSession = activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR;
    document.querySelectorAll('#settingsPopup [data-settings-panel]').forEach((panel) => {
        const panelName = panel.getAttribute('data-settings-panel');
        panel.hidden = isUserScriptSession ? panelName !== 'userscript' : panelName !== 'click-fill';
    });

    const settingsPill = document.querySelector('#settingsPopup .settings-title-group .modal-pill');
    if (settingsPill) {
        settingsPill.textContent = isUserScriptSession ? 'USERSCRIPT' : (isOcrSession ? 'OCR' : 'SETTINGS');
    }

    const settingsTitle = document.querySelector('#settingsPopup .settings-title-group h3');
    if (settingsTitle) {
        settingsTitle.textContent = isUserScriptSession ? 'UserScript settings' : (isOcrSession ? 'OCR settings' : 'Config settings');
    }
}

function showImportantProcessing(minDuration = 450, maxDuration = 900) {
    if (window.settingsProcessingSimple && typeof window.settingsProcessingSimple.showSpinner === 'function') {
        window.settingsProcessingSimple.showSpinner(null, minDuration, maxDuration);
        return;
    }
    const overlay = document.querySelector('.settings-processing-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.add('quick');
    setTimeout(() => {
        overlay.style.display = 'none';
        overlay.classList.remove('quick');
    }, maxDuration);
}

function setOptionsSession(nextSession, options = {}) {
    const session = ['userscript', 'ocr'].includes(nextSession) ? nextSession : 'click-fill';
    const previousSession = activeOptionsSession;
    if (previousSession === ACTIVE_AUTOMATION_MODE_OCR && session !== ACTIVE_AUTOMATION_MODE_OCR) {
        persistOcrSettings(null, { setActiveMode: false });
    }
    activeOptionsSession = session;
    document.documentElement.dataset.optionsSession = session;
    const mode = session === 'userscript'
        ? ACTIVE_AUTOMATION_MODE_USERSCRIPT
        : session === 'ocr'
            ? ACTIVE_AUTOMATION_MODE_OCR
        : ACTIVE_AUTOMATION_MODE_CLICK_FILL;

    if (previousSession !== session && options.showProcessing !== false) {
        showImportantProcessing();
    }

    document.querySelectorAll('button[data-options-session]').forEach((button) => {
        const isActive = button.getAttribute('data-options-session') === session;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('[data-options-panel]').forEach((panel) => {
        const isActive = panel.getAttribute('data-options-panel') === session;
        panel.hidden = !isActive;
        panel.classList.toggle('active', isActive);
        panel.style.display = isActive ? 'flex' : 'none';
    });
    updateSessionListPanels();

    const titleEl = document.querySelector('.config-title-bold');
    if (titleEl) {
        titleEl.textContent = session === 'userscript' ? 'UserScript Editor' : (session === 'ocr' ? 'OCR' : 'Click and fill');
    }

    const nameLabel = document.querySelector('label[for="configName"]');
    const urlLabel = document.querySelector('label[for="configUrl"]');
    const initLabel = document.querySelector('label[for="initWait"]');
    if (nameLabel) {
        nameLabel.textContent = session === 'ocr' ? 'Configuration name' : 'Name';
    }
    if (urlLabel) {
        urlLabel.innerHTML = session === 'ocr'
            ? 'Target URL <span class="required">*</span>'
            : 'URL <span class="required">*</span>';
    }
    if (initLabel) {
        initLabel.textContent = session === 'ocr' ? 'Initial delay (s)' : 'Initial delay (s)';
    }

    if (importConfigIconBtn) {
        importConfigIconBtn.title = session === 'userscript' ? 'Import UserScript' : (session === 'ocr' ? 'Import OCR captures' : 'Import configuration');
    }
    if (exportConfigIconBtn) {
        exportConfigIconBtn.title = session === 'userscript' ? 'Export UserScript' : (session === 'ocr' ? 'Export OCR captures' : 'Export configuration');
    }
    if (configColorIconBtn) {
        configColorIconBtn.title = session === 'ocr'
            ? 'OCR configuration color'
            : (session === 'click-fill' ? 'Configuration color' : 'Color is available for Click and Fill and OCR configurations');
    }
    closeConfigColorPalette();
    applyClickFillSessionAccent();
    refreshUserScriptSavedIndicatorFromState();
    updateSettingsPanelForSession();

    if (previousSession === ACTIVE_AUTOMATION_MODE_CLICK_FILL && session !== ACTIVE_AUTOMATION_MODE_CLICK_FILL && hasUnsavedChanges && activeConfigId) {
        saveCurrentConfiguration(false);
    }

    if (options.persist !== false) {
        try {
            localStorage.setItem('acfhOptionsSession', session);
        } catch (e) {
            // ignore
        }
    }

    const shouldSyncRuntime = options.syncRuntime !== false;
    if (shouldSyncRuntime) {
        const persistModeChange = (afterPersist) => {
            acfhStorage.set({ activeAutomationMode: mode }, () => {
                chrome.runtime.sendMessage({
                    action: 'activeAutomationModeChanged',
                    mode
                }, () => {});
                if (typeof afterPersist === 'function') {
                    afterPersist();
                }
            });
        };

        if (previousSession === ACTIVE_AUTOMATION_MODE_USERSCRIPT && session !== ACTIVE_AUTOMATION_MODE_USERSCRIPT) {
            syncInlineEditorToActiveUserScriptRecord();
            persistModeChange(() => {
                persistUserScripts(null, { activateSession: false });
            });
        } else {
            persistModeChange();
        }
    }

    if (session === 'userscript') {
        loadInlineUserScriptEditor();
        refreshInlineScriptEditorLayout();
    } else if (session === 'ocr') {
        applyOcrSettingsToUi();
        updateOcrDefaultFieldVisibility();
        renderOcrRules();
    } else {
        const activeConfig = configurations.find(cfg => cfg && cfg.id == activeConfigId);
        if (activeConfig) {
            aplicarDadosConfiguracao(activeConfig);
        } else {
            configNameInput.value = '';
            configUrlInput.value = '';
            initWaitInput.value = '0';
        }
        if (hasUnsavedChanges && activeConfigId) {
            saveCurrentConfiguration(false);
        }
    }
}

function initOptionsSessions() {
    document.querySelectorAll('button[data-options-session]').forEach((button) => {
        button.addEventListener('click', () => {
            setOptionsSession(button.getAttribute('data-options-session'));
        });
    });

    sessionExpandButtons.forEach((button) => {
        const toggle = () => {
            const session = button.getAttribute('data-session-expand');
            if (!session) return;
            if (session !== activeOptionsSession) {
                setOptionsSession(session);
            }
            expandedSessionLists[session] = !expandedSessionLists[session];
            Object.keys(expandedSessionLists).forEach((key) => {
                if (key !== session) expandedSessionLists[key] = false;
            });
            renderSessionConfigLists();
        };

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggle();
        });

        button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                toggle();
            }
        });
    });

    sessionAddButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const session = button.getAttribute('data-session-add');
            if (session === 'click-fill') {
                setOptionsSession('click-fill');
                createClickFillConfigurationFromSidebar();
            } else if (session === 'ocr') {
                setOptionsSession('ocr');
                createOcrRuleFromSidebar();
            } else if (session === 'userscript') {
                setOptionsSession('userscript');
                createUserScriptRecord();
            }
            expandedSessionLists[session] = true;
            renderSessionConfigLists();
        });
    });

    if (saveUserscriptBtn) {
        saveUserscriptBtn.addEventListener('click', saveInlineUserScript);
    }

    if (discardUserscriptBtn) {
        discardUserscriptBtn.addEventListener('click', () => loadInlineUserScriptEditor({ forceGenerated: true }));
    }

    let storedSession = ['userscript', 'ocr'].includes(document.documentElement.dataset.optionsSession)
        ? document.documentElement.dataset.optionsSession
        : 'click-fill';
    try {
        storedSession = localStorage.getItem('acfhOptionsSession') || storedSession;
    } catch (e) {
        // ignore
    }

    setOptionsSession(storedSession, { persist: false, syncRuntime: false, showProcessing: false });

    acfhStorage.get(['activeAutomationMode', INDEPENDENT_USERSCRIPT_KEY], (data) => {
        const storageSession = data.activeAutomationMode === ACTIVE_AUTOMATION_MODE_USERSCRIPT
            ? 'userscript'
            : data.activeAutomationMode === ACTIVE_AUTOMATION_MODE_OCR
                ? 'ocr'
                : (data.activeAutomationMode === ACTIVE_AUTOMATION_MODE_CLICK_FILL ? 'click-fill' : null);
        if (storageSession && storageSession !== activeOptionsSession) {
            setOptionsSession(storageSession, { persist: false, syncRuntime: false, showProcessing: false });
        }
        setScriptSavedIndicator(Boolean(data[INDEPENDENT_USERSCRIPT_KEY]));
    });
}

function generateDynamicUserScript(config, useCachedScript = false) {
    return new Promise((resolve) => {
        generateScriptContent(config, resolve);
    });
}

    function showScriptEditorModal(config, initialScriptContent = null) {
    const existingModal = document.querySelector('.script-editor-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const UserScriptKey = `UserScript_${config.id}`;
    acfhStorage.get([UserScriptKey], (data) => {
        let scriptContentPromise;

        const hasActions = Array.isArray(config.actions) && config.actions.length > 0;

        // Regra: se houver ações configuradas, o editor sempre parte
        // do script gerado pelas ações. O script personalizado salvo
        // (UserScriptKey) só é carregado quando NÃO há nenhuma ação.
        if (data[UserScriptKey] && !hasActions) {
            scriptContentPromise = Promise.resolve(data[UserScriptKey].scriptContent);
            showTemporaryMessage(`Loaded invalid script: ${UserScriptKey}`, 'warning');
        } else {
            scriptContentPromise = initialScriptContent
                ? Promise.resolve(initialScriptContent)
                : generateDynamicUserScript(config, false);
        }

        scriptContentPromise.then(scriptContent => {
            // Remover o cabeçalho do UserScript antes de exibir no editor
            const cleanScriptContent = removeUserScriptHeader(scriptContent);
            
            const modal = document.createElement('div');
            modal.className = 'modal script-editor-modal';
            modal.innerHTML = `
                <div class="modal-content script-editor-content">
                    <div class="modal-header">
                        <h3>UserScript Editor</h3>
                        <div class="modal-actions">
                            <span class="close-btn">&times;</span>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="script-info">
                            <p><strong>Namespace:</strong> ${config.name}</p>
                            <p><strong>URL Match:</strong> ${validateAndFormatUrl(config.url)}</p>
                        </div>
                        <div id="scriptEditor" class="script-editor"></div>
                    </div>
                    <div class="modal-footer">
                        <div class="script-editor-footer-hint">Ctrl+S para salvar</div>
                        <div class="script-editor-footer-actions">
                            <button class="btn btn-primary btn-save-script">Save</button>
                            <button class="btn btn-danger btn-cancel-script">Cancel</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const editorElement = modal.querySelector('#scriptEditor');
            const createFallbackEditor = (container, value) => {
                const textarea = document.createElement('textarea');
                textarea.className = 'script-editor-fallback';
                textarea.value = value || '';
                textarea.spellcheck = false;
                textarea.style.width = '100%';
                textarea.style.minHeight = '240px';
                container.appendChild(textarea);

                return {
                    getValue: () => textarea.value,
                    setValue: (nextValue) => {
                        textarea.value = nextValue;
                    },
                    refresh: () => {},
                    setSize: (width, height) => {
                        if (width) {
                            textarea.style.width = typeof width === 'number' ? `${width}px` : width;
                        }
                        if (height) {
                            textarea.style.height = typeof height === 'number' ? `${height}px` : height;
                        }
                    },
                    getWrapperElement: () => textarea
                };
            };

            const editor = (typeof CodeMirror === 'function')
                ? CodeMirror(editorElement, {
                    value: cleanScriptContent, // Usar o script sem cabeçalho
                    mode: 'javascript',
                    theme: 'monokai',
                    lineNumbers: true,
                    lineWrapping: true,
                    indentUnit: 4,
                    matchBrackets: true,
                    autoCloseBrackets: true
                })
                : createFallbackEditor(editorElement, cleanScriptContent);

            // **SALVAR COM CTRL+S**
            const editorKeyTarget = typeof editor.getWrapperElement === 'function'
                ? editor.getWrapperElement()
                : editorElement;

            editorKeyTarget.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    saveBtn.click();
                }
            });

            const resizeEditor = () => {
                const body = modal.querySelector('.modal-body');
                const header = modal.querySelector('.modal-header');
                const footer = modal.querySelector('.modal-footer');
                const scriptInfo = modal.querySelector('.script-info');
                
                const availableHeight = body.clientHeight - 
                                  header.offsetHeight - 
                                  footer.offsetHeight - 
                                  scriptInfo.offsetHeight - 28; // margens
                
                editor.setSize("100%", `${Math.max(availableHeight, 200)}px`);
                editor.refresh();
            };

            // Chame o resize quando o modal abrir e na mudança de tamanho da janela
            setTimeout(() => {
                resizeEditor();
                editor.refresh();
            }, 100);

            window.addEventListener("resize", resizeEditor);

            // Botões
            const closeBtn = modal.querySelector('.close-btn');
            const saveBtn = modal.querySelector('.btn-save-script');
            const cancelBtn = modal.querySelector('.btn-cancel-script');

            closeBtn.addEventListener('click', () => modal.remove());
            cancelBtn.addEventListener('click', () => modal.remove());

            saveBtn.addEventListener('click', () => {
                // Ao salvar, adicionar o cabeçalho de volta ao script
                const editorContent = editor.getValue();
                const fullScript = addUserScriptHeader(editorContent, config);
                
                const validUrl = validateAndFormatUrl(config.url);

                if (!fullScript.includes('==UserScript==') ||
                    !fullScript.includes(config.name) ||
                    !fullScript.includes(validUrl)) {
                    showTemporaryMessage('Script must include UserScript header with correct name and URL match.', 'error');
                    saveUserScript(fullScript, config.id);
                    return;
                }

                const extractedConfig = extractConfigFromScript(fullScript);
                if (extractedConfig) {
                    if (!extractedConfig.name || !extractedConfig.url) {
                        showTemporaryMessage('Invalid configuration: name and URL are required.', 'error');
                        saveUserScript(fullScript, config.id);
                        return;
                    }

                    const configIndex = configurations.findIndex(cfg => cfg.id === config.id);
                    if (configIndex !== -1) {
                        configurations[configIndex] = {
                            id: config.id,
                            name: extractedConfig.name,
                            url: extractedConfig.url,
                            initWait: extractedConfig.initWait,
                            actions: extractedConfig.actions.map(action => ({
                                name: action.name,
                                elementFinder: action.elementFinder,
                                mode: action.mode,
                                intervalMs: action.intervalMs,
                                repeat: action.repeat,
                                fillValue: action.fillValue,
                                fillMethod: action.fillMethod,
                                actionInitWait: action.actionInitWait,
                                disabled: action.disabled,
                                isCSSSelector: action.isCSSSelector,
                                actionMode: action.actionMode
                            }))
                        };

                        acfhStorage.remove([`UserScript_${config.id}`], () => {
                            console.log(`Invalid script for config ${config.id} removed due to valid script save.`);
                        });

                        acfhStorage.set({
                            configurations,
                            [`customScript_${config.id}`]: fullScript,
                            [`scriptLastEdited_${config.id}`]: new Date().toISOString()
                        }, () => {
                            if (activeConfigId === config.id) {
                                aplicarDadosConfiguracao(configurations[configIndex]);
                                updateActionNumbers();
                                configNameInput.value = configurations[configIndex].name;
                                configUrlInput.value = configurations[configIndex].url;
                                initWaitInput.value = configurations[configIndex].initWait;
                                setScriptSavedIndicator(true);
                            }

                            const hasActions = Array.isArray(extractedConfig.actions) && extractedConfig.actions.length > 0;

                            // Mensagens curtas e localizadas para a toast
                            const msgLinkedToActions = currentUiLanguage === 'en'
                                ? 'Script saved for this config.'
                                : 'Script salvo para esta configuração.';
                            const msgRegistered = currentUiLanguage === 'en'
                                ? 'Script saved for auto-injection.'
                                : 'Script salvo para auto-injeção.';
                            const msgRegisterError = currentUiLanguage === 'en'
                                ? 'Error registering script.'
                                : 'Erro ao registrar o script.';

                            // Se houver ações, desregistrar qualquer UserScript automático
                            // para esta configuração. O comportamento passa a ser guiado
                            // apenas pelas ações de clique/preenchimento.
                            if (hasActions) {
                                chrome.runtime.sendMessage({
                                    action: "unregisterUserScript",
                                    configId: config.id
                                });
                                showTemporaryMessage(msgLinkedToActions, 'success', 2000);
                            } else {
                                chrome.runtime.sendMessage({
                                    action: "registerUserScript",
                                    configId: config.id,
                                    configName: config.name,
                                    url: validUrl,
                                    scriptContent: fullScript
                                }, (response) => {
                                    if (response && response.success) {
                                        showTemporaryMessage(msgRegistered, 'success', 2000);
                                    } else {
                                        showTemporaryMessage(msgRegisterError, 'error', 2500);
                                    }
                                });
                            }
                            modal.remove();
                        });
                    } else {
                        showTemporaryMessage('Configuration not found.', 'error');
                        modal.remove();
                    }
                } else {
                    saveUserScript(fullScript, config.id);
                    modal.remove();
                }
            });

            modal.style.display = 'block';
            editor.refresh();
        });
    });
}

// Função para remover o cabeçalho do UserScript
function removeUserScriptHeader(scriptContent) {
    // Encontrar onde começa a IIFE (Immediately Invoked Function Expression)
    const iifeStart = scriptContent.indexOf('(function() {');
    
    if (iifeStart !== -1) {
        // Retornar apenas a parte a partir da IIFE
        return scriptContent.substring(iifeStart).trim();
    }
    
    // Se não encontrar a IIFE, retornar o conteúdo original
    return scriptContent;
}

// Detecta se o script é apenas o template básico gerado para uma
// configuração sem ações (somente IIFE com console.log e comentários
// padrão, sem código extra do usuário).
function isBaseTemplateScript(scriptContent) {
    if (!scriptContent || typeof scriptContent !== 'string') return false;

    const body = removeUserScriptHeader(scriptContent).trim();
    if (!body.startsWith('(function()')) return false;

    let normalized = body;

    // Remove abertura da IIFE
    normalized = normalized.replace(/^\(function\(\)\s*\{\s*/, '');

    // Remove 'use strict';
    normalized = normalized.replace(/'use strict';\s*/, '');

    // Remove linha de log, independente do nome da configuração
    normalized = normalized.replace(/console\.log\('Auto Clicker script loaded for:[^']*'\);\s*/, '');

    // Remove comentários padrão de template
    normalized = normalized.replace(/\/\/ No actions defined - add your custom automation code below[\s\S]*?\/\/ Example: document\.querySelector\('button'\)\.click\(\);\s*/, '');

    // Remove fechamento da IIFE
    normalized = normalized.replace(/\}\)\(\);?\s*$/, '');

    return normalized.trim().length === 0;
}

// Função para adicionar o cabeçalho do UserScript ao salvar
function addUserScriptHeader(scriptContent, config) {
    const validUrl = validateAndFormatUrl(config.url || '*://*/*');
    
    return `// ==UserScript==
// @name         Auto Clicker - Form Helper
// @namespace    ${config.name || 'Independent Script'}
// @version      1.0.5
// @description  ${config.actions && config.actions.length > 0 ? `Automated actions for ${config.url || '*://*/*'}` : 'Modelo vazio pronto para editar'}
// @author       Auto Clicker Extension
// @match        ${validUrl}
// @grant        none
// @run-at       document-idle
// ==/UserScript==

${scriptContent}`;
}

// As funções generateScriptContent e coletarDadosConfiguracao permanecem como estão
// Mas vamos ajustar generateScriptContent para não duplicar o cabeçalho

function generateDynamicUserScript(config, useCachedScript = false) {
    return new Promise((resolve) => {
        generateScriptContent(config, resolve);
    });
}

function generateScriptContent(config, resolve) {
    const validUrl = validateAndFormatUrl(config.url || '*://*/*');
    const scriptActions = (config.actions || []).filter(action => action && action.elementFinder);
    
    // Gerar apenas o código da IIFE, sem o cabeçalho
    let scriptContent = `(function() {
    'use strict';
    
    console.log('Auto Clicker script loaded for: ${config.name || 'Independent Script'}');
    
`;

    if (scriptActions.length > 0) {
        scriptContent += `    // Configuration from Auto Clicker
    const config = ${JSON.stringify({
        name: config.name || 'Unnamed Configuration',
        url: config.url || '*://*/*',
        initWait: parseFloat(config.initWait || 0) * 1000,
        actions: scriptActions.map((action, index) => ({
            name: action.name || `Action ${index + 1}`,
            selector: action.elementFinder || '',
            isCSS: action.isCSSSelector || false,
            mode: action.mode || 'click',
            value: action.fillValue || '',
            fillMethod: action.fillMethod || 'paste',
            interval: action.actionMode === 'mutationObserve' ? null : (action.intervalMs || 1000),
            repeat: action.actionMode === 'mutationObserve' ? null : (action.repeat === -2 ? null : action.repeat || 1),
            waitBefore: parseFloat(action.actionInitWait || 0) * 1000,
            disabled: action.disabled || false,
            actionMode: action.actionMode || 'default'
        }))
    }, null, 4)};
    
    // Wait for initial delay
    setTimeout(executeActions, config.initWait);
    
    function executeActions() {
        config.actions.forEach((action, index) => {
            if (!action.disabled) {
                setTimeout(() => performAction(action), index * 100);
            }
        });
    }
    
    function performAction(action) {
        if (action.actionMode === 'mutationObserve') {
            const observer = new MutationObserver((mutations, obs) => {
                const element = action.isCSS ? 
                    document.querySelector(action.selector) :
                    document.evaluate(action.selector, document, null, 
                        XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) {
                    executeAction(element, action);
                    console.log('Mutation observed, action executed:', action.selector);
                }
            });
            observer.observe(document, { childList: true, subtree: true });
        } else {
            setTimeout(() => {
                const element = action.isCSS ? 
                    document.querySelector(action.selector) :
                    document.evaluate(action.selector, document, null, 
                        XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                if (element) {
                    executeAction(element, action);
                } else {
                    console.warn('Element not found:', action.selector);
                }
            }, action.waitBefore);
        }
    }
    
    function executeAction(element, action) {
        if (action.mode === 'click') {
            element.click();
            console.log('Clicked:', action.selector);
        } else if (action.mode === 'fill') {
            if (action.fillMethod === 'type') {
                element.value = '';
                const chars = action.value.split('');
                let i = 0;
                const typeChar = () => {
                    if (i < chars.length) {
                        element.value += chars[i];
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        i++;
                        setTimeout(typeChar, 50);
                    } else {
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log('Filled (type):', action.selector, 'with:', action.value);
                    }
                };
                typeChar();
            } else {
                element.value = action.value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Filled (paste):', action.selector, 'with:', action.value);
            }
        }
    }
`;
    } else {
        scriptContent += `    // No actions defined - add your custom automation code below
    // Example: document.querySelector('button').click();
`;
    }

    scriptContent += `})();`;
    resolve(scriptContent);
}

function coletarDadosConfiguracao() {
    if (!activeConfigId) return null;
    const configToSave = configurations.find(cfg => cfg.id == activeConfigId);
    if (!configToSave) return null;

    const actionType = document.querySelector('input[name="fillMethod"]:checked')?.value || 'paste';
    return {
        iframe: configUrlInput.value,
        waitInit: initWaitInput.value,
        actionType: actionType === 'paste' ? 'copyOption' : 'typeOption',
        xpaths: Array.from(xpathActionsContainer.querySelectorAll('.xpath-action-row:not(.disabled)')).filter(row => {
            return row.querySelector('.col-element-finder input').value.trim();
        }).map(row => {
            let reps = parseInt(row.querySelector('.col-repeat input').value);
            if (reps !== -2 && (isNaN(reps) || reps < 1 || reps > 9999999)) reps = 1;
            return {
                value: row.querySelector('.col-element-finder input').value,
                checked: true,
                interval: row.getAttribute('data-action-mode') === 'mutationObserve' ? null : row.querySelector('.col-interval-ms input').value,
                repetitions: row.getAttribute('data-action-mode') === 'mutationObserve' ? null : reps,
                fillValue: row.getAttribute('data-fill-value') || '',
                waitInitModal: row.getAttribute('data-action-init-wait') || '0',
                isCSSSelector: row.getAttribute('data-is-css-selector') === 'true',
                actionMode: row.getAttribute('data-action-mode') || 'default'
            };
        })
    };
}
    const searchConfigInput = document.getElementById('searchConfig');
    const configSuggestions = document.getElementById('configSuggestions');

    function updateConfigSuggestions() {
        if (!configSuggestions) return;
        configSuggestions.innerHTML = '';
        configurations.forEach(config => {
            const option = document.createElement('option');
            option.value = config.name || 'No Name';
            option.dataset.configId = config.id;
            configSuggestions.appendChild(option);
        });
    }

    function handleSearchSelection() {
        if (!searchConfigInput) return;
        searchConfigInput.addEventListener('input', () => {
            const selectedName = searchConfigInput.value;
            const matchingConfig = configurations.find(cfg => cfg.name === selectedName);
            if (matchingConfig) {
                const configItem = configList.querySelector(`.config-list-item[data-config-id="${matchingConfig.id}"]`);
                if (configItem) {
                    setActiveConfig(configItem);
                    searchConfigInput.value = '';
                }
            }
        });

        // Permite buscar por parte do nome ou URL e confirmar com Enter
        searchConfigInput.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();

            const term = searchConfigInput.value.trim().toLowerCase();
            if (!term) return;

            let matchingConfig = configurations.find(cfg =>
                (cfg.name || '').toLowerCase() === term ||
                (cfg.url || '').toLowerCase() === term
            );

            if (!matchingConfig) {
                matchingConfig = configurations.find(cfg =>
                    (cfg.name || '').toLowerCase().includes(term) ||
                    (cfg.url || '').toLowerCase().includes(term)
                );
            }

            if (matchingConfig) {
                const configItem = configList.querySelector(`.config-list-item[data-config-id="${matchingConfig.id}"]`);
                if (configItem) {
                    setActiveConfig(configItem);
                    searchConfigInput.value = '';
                }
            }
        });
    }

function aplicarDadosConfiguracao(config) {
    if (!config || !activeConfigId) return;

    configNameInput.value = config.name || "";
    configUrlInput.value = config.url || "";
    initWaitInput.value = config.initWait || "0";
    applyClickFillSessionAccent();

    isRenderingClickFillConfig = true;
    try {
        xpathActionsContainer.innerHTML = "";
        (config.actions || []).forEach(action => {
            adicionarXPathInput(
                action.elementFinder || "",
                true,
                parseFloat(action.intervalMs) || 1000,
                action.repeat ?? 1,
                action.fillValue || "",
                action.actionInitWait || 0,
                action.mode || "click",
                action.fillMethod || "paste",
                action.isCSSSelector || false,
                action.actionMode || "default",
                action.name || "", // PASSAR O NOME ESPECÍFICO
                {
                    persist: false,
                    disabled: !!action.disabled,
                    loadStoredName: true,
                    actionId: action.actionId || action.id
                }
            );
        });
    } finally {
        isRenderingClickFillConfig = false;
        hasUnsavedChanges = false;
    }
}

    function saveCurrentConfiguration(showMessage = true) {
        if (!activeConfigId) return;

        const configData = coletarDadosConfiguracao();
        if (!configData) return;

        const configIndex = configurations.findIndex(cfg => cfg.id == activeConfigId);
        if (configIndex !== -1) {
            configurations[configIndex] = configData;
        } else {
            configurations.push(configData);
        }

        acfhStorage.set({ configurations, activeConfigId }, () => {
            console.log(`Configuration saved: ${JSON.stringify(configData)}`);
            if (showMessage) {
                showTemporaryMessage(translations.configSaved);
            }
            hasUnsavedChanges = false;

            updateConfigListAndDropdown();
        });
    }

    function getClickFillConfigLabel(config) {
        return (config && (config.name || config.url)) || 'No Name';
    }

    function normalizeConfigColor(color) {
        if (typeof color !== 'string') return DEFAULT_CONFIG_COLOR;
        const trimmed = color.trim();
        return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : DEFAULT_CONFIG_COLOR;
    }

    function hexToRgba(hex, alpha) {
        const normalized = normalizeConfigColor(hex).replace('#', '');
        const value = parseInt(normalized, 16);
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function hexToRgbValues(hex) {
        const normalized = normalizeConfigColor(hex).replace('#', '');
        const value = parseInt(normalized, 16);
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        return `${r}, ${g}, ${b}`;
    }

    function getReadableTextColor(hex) {
        const normalized = normalizeConfigColor(hex).replace('#', '');
        const value = parseInt(normalized, 16);
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return luminance > 0.62 ? '#0f172a' : '#ffffff';
    }

    function applyConfigColorStyle(element, color) {
        if (!element) return;
        const normalized = normalizeConfigColor(color);
        element.style.setProperty('--session-config-color', normalized);
        element.style.setProperty('--session-config-color-soft', hexToRgba(normalized, 0.22));
        element.style.setProperty('--session-config-color-border', hexToRgba(normalized, 0.76));
        element.style.setProperty('--session-config-color-shadow', hexToRgba(normalized, 0.26));
    }

    function getActiveClickFillConfig() {
        return configurations.find(cfg => cfg && cfg.id == activeConfigId) || null;
    }

    function getActiveColorConfiguration() {
        return getActiveClickFillConfig();
    }

    function applyClickFillSessionAccent() {
        const activeConfig = getActiveColorConfiguration();
        const shouldApplyToSession = Boolean(activeConfig && activeConfig.applyColorToSession);
        const accent = normalizeConfigColor(shouldApplyToSession ? activeConfig.color : DEFAULT_CONFIG_COLOR);
        const root = document.documentElement;

        root.style.setProperty('--click-fill-accent', accent);
        root.style.setProperty('--click-fill-accent-rgb', hexToRgbValues(accent));
        root.style.setProperty('--click-fill-accent-soft', hexToRgba(accent, 0.18));
        root.style.setProperty('--click-fill-accent-border', hexToRgba(accent, 0.72));
        root.style.setProperty('--click-fill-accent-shadow', hexToRgba(accent, 0.26));
        root.style.setProperty('--click-fill-accent-contrast', getReadableTextColor(accent));
        root.dataset.clickFillAccentApplied = shouldApplyToSession ? 'true' : 'false';
    }

    function createSessionListItem({ name, meta, active, onClick, onDelete, color }) {
        const item = document.createElement('div');
        item.setAttribute('role', 'button');
        item.tabIndex = 0;
        item.className = 'session-config-list-item';
        item.classList.toggle('active', Boolean(active));
        applyConfigColorStyle(item, color);
        item.innerHTML = `
            <span class="session-config-info">
                <span class="session-config-name"></span>
                <span class="session-config-meta"></span>
            </span>
            <button class="session-config-delete" type="button" title="Delete">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"></path>
                </svg>
            </button>
        `;
        item.querySelector('.session-config-name').textContent = name || 'No Name';
        item.querySelector('.session-config-meta').textContent = meta || '';
        item.addEventListener('click', (event) => {
            if (event.target.closest('.session-config-delete')) return;
            onClick();
        });
        item.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            if (event.target.closest('.session-config-delete')) return;
            event.preventDefault();
            onClick();
        });
        const deleteBtn = item.querySelector('.session-config-delete');
        if (typeof onDelete === 'function') {
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                onDelete();
            });
        } else {
            deleteBtn.remove();
        }
        return item;
    }

    function renderConfigColorPalette() {
        if (!configColorPalette) return;
        configColorPalette.innerHTML = '';
        CONFIG_COLOR_PALETTE.forEach((color) => {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = 'config-color-swatch';
            swatch.dataset.configColor = color;
            swatch.title = color;
            swatch.style.setProperty('--swatch-color', color);
            swatch.addEventListener('click', (event) => {
                event.stopPropagation();
                applyColorToActiveConfiguration(color);
            });
            configColorPalette.appendChild(swatch);
        });

        const applyToSessionLabel = document.createElement('label');
        applyToSessionLabel.className = 'config-color-session-option';
        applyToSessionLabel.innerHTML = `
            <input type="checkbox" class="config-color-session-checkbox">
            <span>Apply to session</span>
        `;
        applyToSessionLabel.addEventListener('click', (event) => {
            event.stopPropagation();
        });
        const applyToSessionCheckbox = applyToSessionLabel.querySelector('.config-color-session-checkbox');
        applyToSessionCheckbox.addEventListener('change', (event) => {
            event.stopPropagation();
            setApplyColorToSession(event.target.checked);
        });
        configColorPalette.appendChild(applyToSessionLabel);
    }

    function updateConfigColorPaletteSelection() {
        if (!configColorPalette) return;
        const activeConfig = getActiveColorConfiguration();
        const activeColor = normalizeConfigColor(activeConfig && activeConfig.color);
        configColorPalette.querySelectorAll('.config-color-swatch').forEach((swatch) => {
            swatch.classList.toggle('active', swatch.dataset.configColor === activeColor);
        });
        const applyToSessionCheckbox = configColorPalette.querySelector('.config-color-session-checkbox');
        if (applyToSessionCheckbox) {
            applyToSessionCheckbox.checked = Boolean(activeConfig && activeConfig.applyColorToSession);
        }
        applyClickFillSessionAccent();
    }

    function closeConfigColorPalette() {
        if (!configColorPalette) return;
        configColorPalette.hidden = true;
        if (configColorIconBtn) {
            configColorIconBtn.setAttribute('aria-expanded', 'false');
        }
    }

    function toggleConfigColorPalette() {
        if (!configColorPalette || !configColorIconBtn) return;
        if (![ACTIVE_AUTOMATION_MODE_CLICK_FILL, ACTIVE_AUTOMATION_MODE_OCR].includes(activeOptionsSession)) {
            return;
        }
        const shouldOpen = configColorPalette.hidden;
        if (shouldOpen) {
            updateConfigColorPaletteSelection();
        }
        configColorPalette.hidden = !shouldOpen;
        configColorIconBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    }

    function applyColorToActiveConfiguration(color) {
        if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
            ocrSettings = getOcrSettingsFromUi();
            ocrSettings.color = normalizeConfigColor(color);
            applyClickFillSessionAccent();
            renderSessionConfigLists();
            persistOcrSettings(null, { showMessage: true });
            updateConfigColorPaletteSelection();
            closeConfigColorPalette();
            return;
        }

        const activeConfig = configurations.find(cfg => cfg && cfg.id == activeConfigId);
        if (!activeConfig) {
            showTemporaryMessage('No Click and Fill configuration selected.', 'error');
            closeConfigColorPalette();
            return;
        }

        activeConfig.color = normalizeConfigColor(color);
        hasUnsavedChanges = true;
        applyClickFillSessionAccent();
        renderSessionConfigLists();
        saveCurrentConfiguration(true);
        updateConfigColorPaletteSelection();
        closeConfigColorPalette();
    }

    function setApplyColorToSession(shouldApply) {
        if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
            ocrSettings = getOcrSettingsFromUi();
            ocrSettings.applyColorToSession = Boolean(shouldApply);
            applyClickFillSessionAccent();
            renderSessionConfigLists();
            persistOcrSettings(null, { showMessage: true });
            updateConfigColorPaletteSelection();
            return;
        }

        const activeConfig = getActiveClickFillConfig();
        if (!activeConfig) {
            showTemporaryMessage('No Click and Fill configuration selected.', 'error');
            return;
        }

        activeConfig.applyColorToSession = Boolean(shouldApply);
        hasUnsavedChanges = true;
        applyClickFillSessionAccent();
        renderSessionConfigLists();
        saveCurrentConfiguration(true);
        updateConfigColorPaletteSelection();
    }

    function normalizeOcrSettings(settings = {}) {
        const hasName = Object.prototype.hasOwnProperty.call(settings, 'name');
        return {
            name: hasName ? (settings.name || '') : 'OCR configuration',
            url: settings.url || '',
            initWait: Number.isFinite(Number(settings.initWait)) ? String(Math.max(0, Number(settings.initWait))) : (settings.initWait || '0'),
            color: normalizeConfigColor(settings.color),
            applyColorToSession: settings.applyColorToSession === true
        };
    }

    function getOcrSettingsFromUi() {
        const previousSettings = normalizeOcrSettings(ocrSettings || {});
        return normalizeOcrSettings({
            ...previousSettings,
            name: configNameInput ? configNameInput.value.trim() : '',
            url: configUrlInput ? configUrlInput.value.trim() : '',
            initWait: initWaitInput ? initWaitInput.value : '0'
        });
    }

    function getOcrTargetUrl() {
        const current = activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR
            ? getOcrSettingsFromUi()
            : normalizeOcrSettings(ocrSettings || {});
        return (current.url || '').trim();
    }

    function applyOcrSettingsToUi(options = {}) {
        const settings = normalizeOcrSettings(ocrSettings || {});
        const activeElement = document.activeElement;
        const preserveActiveInput = options.preserveActiveInput === true;
        if (configNameInput && (!preserveActiveInput || activeElement !== configNameInput)) {
            configNameInput.value = settings.name;
        }
        if (configUrlInput && (!preserveActiveInput || activeElement !== configUrlInput)) {
            configUrlInput.value = settings.url;
        }
        if (initWaitInput && (!preserveActiveInput || activeElement !== initWaitInput)) {
            initWaitInput.value = settings.initWait || '0';
        }
        applyClickFillSessionAccent();
    }

    function persistOcrSettings(callback, options = {}) {
        if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
            ocrSettings = getOcrSettingsFromUi();
        } else {
            ocrSettings = normalizeOcrSettings(ocrSettings || {});
        }

        const payload = { [OCR_SETTINGS_KEY]: ocrSettings };
        if (options.setActiveMode !== false) {
            payload.activeAutomationMode = ACTIVE_AUTOMATION_MODE_OCR;
        }

        acfhStorage.set(payload, () => {
            renderSessionConfigLists();
            if (options.showMessage) {
                showTemporaryMessage('OCR configuration saved.', 'success');
            }
            if (typeof callback === 'function') callback();
        });
    }

    function scheduleOcrSettingsSave() {
        if (activeOptionsSession !== ACTIVE_AUTOMATION_MODE_OCR) return;
        clearTimeout(ocrSettingsSaveTimer);
        ocrSettingsSaveTimer = setTimeout(() => {
            persistOcrSettings(null, { showMessage: true });
        }, 350);
    }

    function updateOcrDefaultFieldVisibility() {
        const action = ocrActionSelect ? ocrActionSelect.value : 'click';
        document.querySelectorAll('.ocr-fill-field').forEach((field) => {
            field.hidden = action !== 'fill';
        });
        document.querySelectorAll('.ocr-scroll-field').forEach((field) => {
            field.hidden = action !== 'scroll';
        });
        document.querySelectorAll('.ocr-check-field').forEach((field) => {
            field.hidden = action !== 'check';
        });
    }

    function normalizeOcrRule(rule = {}, index = 1) {
        const action = ['click', 'doubleClick', 'scroll', 'fill', 'check'].includes(rule.action) ? rule.action : 'click';
        return {
            id: rule.id ? String(rule.id) : `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: rule.name || `OCR action ${String(index).padStart(2, '0')}`,
            url: rule.url || getOcrTargetUrl(),
            matchText: rule.matchText || '',
            selectorHint: rule.selectorHint || '',
            role: rule.role || '',
            tagName: rule.tagName || '',
            action,
            actionMode: rule.actionMode === 'watcher' || rule.actionMode === 'mutationObserve' ? 'watcher' : 'default',
            scrollDirection: ['down', 'up', 'left', 'right'].includes(rule.scrollDirection) ? rule.scrollDirection : 'down',
            scrollAmount: Number.isFinite(Number(rule.scrollAmount)) ? Math.max(40, Number(rule.scrollAmount)) : 520,
            checkKind: rule.checkKind === 'switch' ? 'switch' : 'checkbox',
            fillValue: rule.fillValue || '',
            intervalMs: Number.isFinite(Number(rule.intervalMs)) ? Math.max(10, Number(rule.intervalMs)) : 1000,
            repeat: Number.isFinite(Number(rule.repeat)) ? Number(rule.repeat) : 1,
            disabled: rule.disabled === true,
            rect: rule.rect || null,
            createdAt: rule.createdAt || new Date().toISOString()
        };
    }

    function getOcrDefaultsFromUi() {
        return {
            action: ocrActionSelect ? ocrActionSelect.value : 'click',
            actionMode: ocrActionModeSelect ? ocrActionModeSelect.value : 'default',
            scrollDirection: ocrScrollDirectionSelect ? ocrScrollDirectionSelect.value : 'down',
            scrollAmount: ocrScrollAmountInput ? Number(ocrScrollAmountInput.value) || 520 : 520,
            checkKind: ocrCheckKindSelect ? ocrCheckKindSelect.value : 'checkbox',
            fillValue: ocrFillValueInput ? ocrFillValueInput.value : '',
            intervalMs: ocrIntervalMsInput ? Number(ocrIntervalMsInput.value) || 1000 : 1000,
            repeat: ocrRepeatInput ? Number(ocrRepeatInput.value) || 1 : 1,
            targetUrl: getOcrTargetUrl(),
            initWait: initWaitInput ? initWaitInput.value || '0' : '0'
        };
    }

    function persistOcrRules(callback, options = {}) {
        if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
            ocrSettings = getOcrSettingsFromUi();
        }
        acfhStorage.set({
            [OCR_RULES_KEY]: ocrRules,
            [OCR_SETTINGS_KEY]: normalizeOcrSettings(ocrSettings || {}),
            activeAutomationMode: ACTIVE_AUTOMATION_MODE_OCR
        }, () => {
            if (options.render !== false) {
                renderOcrRules();
            }
            renderSessionConfigLists();
            if (options.showMessage) {
                showTemporaryMessage(options.message || 'OCR action saved.', 'success');
            }
            if (typeof callback === 'function') callback();
        });
    }

    function createOcrRuleFromSidebar() {
        if (configNameInput && !configNameInput.value.trim()) {
            configNameInput.value = 'OCR configuration';
        }
        persistOcrSettings(() => showTemporaryMessage('OCR configuration saved.', 'success'), { showMessage: false });
    }

    function updateOcrRule(ruleId, patch) {
        ocrRules = ocrRules.map((rule) => rule.id === ruleId ? normalizeOcrRule({ ...rule, ...patch }) : rule);
        persistOcrRules(null, { showMessage: true, render: false });
    }

    function deleteOcrRule(ruleId) {
        ocrRules = ocrRules.filter((rule) => rule.id !== ruleId);
        persistOcrRules(null, { showMessage: true, message: 'OCR action deleted.' });
    }

    function clearOcrConfiguration(callback) {
        ocrSettings = normalizeOcrSettings({ name: '', url: '', initWait: '0' });
        ocrRules = [];
        if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
            applyOcrSettingsToUi();
        }
        acfhStorage.set({
            [OCR_SETTINGS_KEY]: ocrSettings,
            [OCR_RULES_KEY]: [],
            activeAutomationMode: ACTIVE_AUTOMATION_MODE_OCR
        }, () => {
            renderOcrRules();
            renderSessionConfigLists();
            if (typeof callback === 'function') callback();
        });
    }

    function duplicateOcrRule(ruleId) {
        const source = ocrRules.find((rule) => rule.id === ruleId);
        if (!source) return;
        const clone = normalizeOcrRule({
            ...source,
            id: `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: `${source.name || 'OCR action'} copy`,
            createdAt: new Date().toISOString()
        }, ocrRules.length + 1);
        const sourceIndex = ocrRules.findIndex((rule) => rule.id === ruleId);
        ocrRules.splice(sourceIndex + 1, 0, clone);
        persistOcrRules(() => showTemporaryMessage('OCR action duplicated.', 'success'));
    }

    function renderOcrRules() {
        if (!ocrRulesList) return;
        ocrRulesList.innerHTML = '';

        const listHeader = document.createElement('div');
        listHeader.className = 'ocr-rule-list-header';
        ['Action', 'Vigilante', 'Interval (ms)', 'Repeat'].forEach((label) => {
            const cell = document.createElement('div');
            cell.textContent = label;
            listHeader.appendChild(cell);
        });
        ocrRulesList.appendChild(listHeader);

        if (!ocrRules.length) {
            const empty = document.createElement('div');
            empty.className = 'ocr-empty-state';
            empty.textContent = 'No OCR captures yet.';
            ocrRulesList.appendChild(empty);
            return;
        }

        const createSelect = (options, value) => {
            const select = document.createElement('select');
            select.className = 'form-select';
            options.forEach(([optionValue, label]) => {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = label;
                option.selected = optionValue === value;
                select.appendChild(option);
            });
            return select;
        };

        const createField = (labelText, control, className = '') => {
            const label = document.createElement('label');
            label.className = `ocr-rule-field ${className}`.trim();
            const span = document.createElement('span');
            span.textContent = labelText;
            label.append(span, control);
            return label;
        };

        ocrRules.forEach((rawRule, index) => {
            const rule = normalizeOcrRule(rawRule, index + 1);
            const card = document.createElement('div');
            card.className = 'ocr-rule-card';
            if (rule.disabled) card.classList.add('disabled');
            card.dataset.ruleId = rule.id;
            card.addEventListener('pointerdown', (event) => {
                lastOcrRuleInteractionAt = Date.now();
                event.stopPropagation();
            });
            card.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.className = 'ocr-rule-title-input';
            titleInput.value = rule.name;
            titleInput.addEventListener('change', () => updateOcrRule(rule.id, { name: titleInput.value }));

            const meta = document.createElement('div');
            meta.className = 'ocr-rule-meta';
            meta.textContent = [rule.matchText || rule.selectorHint || 'Visual target', rule.url || getOcrTargetUrl()]
                .filter(Boolean)
                .join(' - ');

            const actionSelect = createSelect([
                ['click', 'Click'],
                ['doubleClick', 'Double click'],
                ['scroll', 'Scroll'],
                ['fill', 'Fill'],
                ['check', 'Check / switch']
            ], rule.action);

            const actionModeSelect = createSelect([
                ['default', 'Default'],
                ['watcher', 'Vigilante']
            ], rule.actionMode);

            const scrollDirectionSelect = createSelect([
                ['down', 'Down'],
                ['up', 'Up'],
                ['right', 'Right'],
                ['left', 'Left']
            ], rule.scrollDirection);

            const scrollAmountInput = document.createElement('input');
            scrollAmountInput.type = 'number';
            scrollAmountInput.min = '40';
            scrollAmountInput.step = '40';
            scrollAmountInput.className = 'form-control';
            scrollAmountInput.value = rule.scrollAmount;

            const checkKindSelect = createSelect([
                ['checkbox', 'Checkbox'],
                ['switch', 'Switch']
            ], rule.checkKind);

            const intervalInput = document.createElement('input');
            intervalInput.type = 'number';
            intervalInput.min = '10';
            intervalInput.step = '10';
            intervalInput.className = 'form-control';
            intervalInput.value = rule.intervalMs;

            const repeatInput = document.createElement('input');
            repeatInput.type = 'number';
            repeatInput.min = '-2';
            repeatInput.step = '1';
            repeatInput.className = 'form-control';
            repeatInput.value = rule.repeat;

            const fillInput = document.createElement('input');
            fillInput.type = 'text';
            fillInput.className = 'form-control';
            fillInput.placeholder = 'Fill value';
            fillInput.value = rule.fillValue || '';

            const fields = {
                action: createField('Action', actionSelect),
                mode: createField('Vigilante', actionModeSelect),
                interval: createField('Interval (ms)', intervalInput),
                repeat: createField('Repeat', repeatInput),
                scrollDirection: createField('Scroll', scrollDirectionSelect, 'ocr-rule-scroll-field'),
                scrollAmount: createField('Amount', scrollAmountInput, 'ocr-rule-scroll-field'),
                checkKind: createField('Target', checkKindSelect, 'ocr-rule-check-field'),
                fill: createField('Fill value', fillInput, 'ocr-rule-fill-field')
            };

            function refreshRuleFields() {
                const action = actionSelect.value;
                [fields.scrollDirection, fields.scrollAmount].forEach((field) => {
                    field.hidden = action !== 'scroll';
                });
                fields.checkKind.hidden = action !== 'check';
                fields.fill.hidden = action !== 'fill';
            }

            actionSelect.addEventListener('change', () => {
                refreshRuleFields();
                updateOcrRule(rule.id, { action: actionSelect.value });
            });
            actionModeSelect.addEventListener('change', () => updateOcrRule(rule.id, { actionMode: actionModeSelect.value }));
            scrollDirectionSelect.addEventListener('change', () => updateOcrRule(rule.id, { scrollDirection: scrollDirectionSelect.value }));
            scrollAmountInput.addEventListener('change', () => updateOcrRule(rule.id, { scrollAmount: Number(scrollAmountInput.value) || 520 }));
            checkKindSelect.addEventListener('change', () => updateOcrRule(rule.id, { checkKind: checkKindSelect.value }));
            intervalInput.addEventListener('change', () => updateOcrRule(rule.id, { intervalMs: Number(intervalInput.value) || 1000 }));
            repeatInput.addEventListener('change', () => updateOcrRule(rule.id, { repeat: Number(repeatInput.value) || 1 }));
            fillInput.addEventListener('change', () => updateOcrRule(rule.id, { fillValue: fillInput.value }));

            const controls = document.createElement('div');
            controls.className = 'ocr-rule-controls';
            controls.append(fields.action, fields.mode, fields.interval, fields.repeat, fields.scrollDirection, fields.scrollAmount, fields.checkKind, fields.fill);

            const header = document.createElement('div');
            header.className = 'ocr-rule-header';
            const textWrap = document.createElement('div');
            textWrap.className = 'ocr-rule-heading';
            textWrap.append(titleInput, meta);
            const actions = document.createElement('div');
            actions.className = 'ocr-rule-actions';
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'ocr-rule-btn danger';
            deleteButton.title = 'Delete action';
            deleteButton.setAttribute('aria-label', 'Delete action');
            deleteButton.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 6h18"></path>
                    <path d="M8 6V4h8v2"></path>
                    <path d="M19 6l-1 14H6L5 6"></path>
                    <path d="M10 11v5"></path>
                    <path d="M14 11v5"></path>
                </svg>
            `;
            deleteButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                deleteOcrRule(rule.id);
            });
            actions.appendChild(deleteButton);
            header.append(textWrap, actions);

            refreshRuleFields();
            card.append(header, controls);
            ocrRulesList.appendChild(card);
        });
    }

    function loadOcrRulesFromStorage() {
        acfhStorage.get([OCR_RULES_KEY, OCR_SETTINGS_KEY], (data) => {
            ocrSettings = normalizeOcrSettings(data[OCR_SETTINGS_KEY] || {});
            if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
                applyOcrSettingsToUi();
            }
            ocrRules = Array.isArray(data[OCR_RULES_KEY])
                ? data[OCR_RULES_KEY].map((rule, index) => normalizeOcrRule(rule, index + 1))
                : [];
            renderOcrRules();
            renderSessionConfigLists();
        });
    }

    function loadOcrSettingsFromStorage() {
        acfhStorage.get([OCR_SETTINGS_KEY], (data) => {
            ocrSettings = normalizeOcrSettings(data[OCR_SETTINGS_KEY] || {});
            if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
                applyOcrSettingsToUi();
            }
            renderSessionConfigLists();
        });
    }

    function sendRuntimeCommandToExtension(command) {
        return new Promise((resolve) => {
            if (!acfhExtensionConnected) {
                resolve({ success: false, error: 'Extension is not connected.' });
                return;
            }

            if (isChromeExtensionEnv && chrome && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(command, (response) => {
                    resolve(response || { success: !chrome.runtime.lastError, error: chrome.runtime.lastError?.message });
                });
                return;
            }

            const requestId = `runtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const timer = setTimeout(() => {
                window.removeEventListener('message', handleResponse);
                resolve({ success: false, error: 'Extension response timed out.' });
            }, 6000);

            function handleResponse(event) {
                if (event.source !== window) return;
                const data = event.data || {};
                if (data.source !== 'acfh-extension' || data.type !== 'acfh-runtime-response' || data.requestId !== requestId) {
                    return;
                }
                clearTimeout(timer);
                window.removeEventListener('message', handleResponse);
                resolve(data.response || { success: true });
            }

            window.addEventListener('message', handleResponse);
            window.postMessage({
                source: 'acfh-options-page',
                type: 'acfh-runtime-command',
                requestId,
                command
            }, '*');
        });
    }

    async function requestOcrCapture() {
        const targetUrl = getOcrTargetUrl();
        if (!targetUrl) {
            showTemporaryMessage('Set the OCR URL before capturing.', 'error');
            return;
        }
        persistOcrSettings();
        showImportantProcessing(500, 1000);
        const response = await sendRuntimeCommandToExtension({
            action: 'startOcrCapture',
            targetUrl,
            defaults: getOcrDefaultsFromUi()
        });

        if (response && response.success) {
            showTemporaryMessage('OCR capture armed on the target tab.', 'success');
        } else {
            showTemporaryMessage(response?.error || 'Open a target page and try OCR capture again.', 'error');
        }
    }

    async function runOcrNow() {
        const targetUrl = getOcrTargetUrl();
        if (!targetUrl) {
            showTemporaryMessage('Set the OCR URL before running.', 'error');
            return;
        }
        persistOcrSettings();
        showImportantProcessing(450, 900);
        const response = await sendRuntimeCommandToExtension({ action: 'runOcrNow', targetUrl });
        showTemporaryMessage(response?.success ? 'OCR automation triggered.' : (response?.error || 'Could not run OCR automation.'), response?.success ? 'success' : 'error');
    }

    async function runOcrNext() {
        const response = await sendRuntimeCommandToExtension({ action: 'runOcrNext', targetUrl: getOcrTargetUrl() });
        showTemporaryMessage(response?.success ? 'Next OCR action triggered.' : (response?.error || 'Could not run next OCR action.'), response?.success ? 'success' : 'error');
    }

    async function previewOcrTarget() {
        const response = await sendRuntimeCommandToExtension({ action: 'previewOcrTarget', targetUrl: getOcrTargetUrl() });
        showTemporaryMessage(response?.success ? 'OCR preview sent to the target tab.' : (response?.error || 'Could not preview OCR target.'), response?.success ? 'success' : 'error');
    }

    async function stopOcrNow() {
        const response = await sendRuntimeCommandToExtension({ action: 'stopOcrNow', targetUrl: getOcrTargetUrl() });
        showTemporaryMessage(response?.success ? 'OCR automation stopped.' : (response?.error || 'Could not stop OCR automation.'), response?.success ? 'success' : 'error');
    }

    async function runOcrRule(ruleId) {
        const response = await sendRuntimeCommandToExtension({ action: 'runOcrRuleNow', ruleId, targetUrl: getOcrTargetUrl() });
        showTemporaryMessage(response?.success ? 'OCR action triggered.' : (response?.error || 'Could not run OCR action.'), response?.success ? 'success' : 'error');
    }

    async function previewOcrRule(ruleId) {
        const response = await sendRuntimeCommandToExtension({ action: 'previewOcrTarget', ruleId, targetUrl: getOcrTargetUrl() });
        showTemporaryMessage(response?.success ? 'OCR action previewed.' : (response?.error || 'Could not preview OCR action.'), response?.success ? 'success' : 'error');
    }

    function initOcrControls() {
        if (ocrCaptureBtn) {
            ocrCaptureBtn.addEventListener('click', requestOcrCapture);
        }
        if (ocrRunNowBtn) {
            ocrRunNowBtn.addEventListener('click', runOcrNow);
        }
        if (ocrNextBtn) {
            ocrNextBtn.addEventListener('click', runOcrNext);
        }
        if (ocrPreviewBtn) {
            ocrPreviewBtn.addEventListener('click', previewOcrTarget);
        }
        if (ocrStopBtn) {
            ocrStopBtn.addEventListener('click', stopOcrNow);
        }
        if (ocrClearBtn) {
            ocrClearBtn.addEventListener('click', () => {
                ocrRules = [];
                persistOcrRules(() => showTemporaryMessage('OCR captures cleared.', 'success'));
            });
        }
        [ocrActionSelect, ocrActionModeSelect, ocrScrollDirectionSelect, ocrScrollAmountInput, ocrCheckKindSelect, ocrFillValueInput, ocrIntervalMsInput, ocrRepeatInput]
            .filter(Boolean)
            .forEach((control) => {
                control.addEventListener('change', updateOcrDefaultFieldVisibility);
                control.addEventListener('input', updateOcrDefaultFieldVisibility);
            });
        updateOcrDefaultFieldVisibility();
    }

    function renderSessionConfigLists() {
        const clickFillContainer = document.querySelector('[data-session-config-items="click-fill"]');
        const userScriptContainer = document.querySelector('[data-session-config-items="userscript"]');
        const ocrContainer = document.querySelector('[data-session-config-items="ocr"]');

        if (clickFillContainer) {
            clickFillContainer.innerHTML = '';
            const orderedConfigs = [
                ...configurations.filter(config => config && config.id === activeConfigId),
                ...configurations.filter(config => config && config.id !== activeConfigId)
            ];

            if (!orderedConfigs.length) {
                const empty = document.createElement('div');
                empty.className = 'session-config-empty';
                empty.textContent = 'No configurations yet.';
                clickFillContainer.appendChild(empty);
            } else {
                orderedConfigs.forEach((config) => {
                    clickFillContainer.appendChild(createSessionListItem({
                        name: getClickFillConfigLabel(config),
                        meta: config.url || `${(config.actions || []).length} actions`,
                        active: config.id === activeConfigId,
                        color: config.color,
                        onClick: () => selectClickFillConfiguration(config.id),
                        onDelete: () => deleteConfiguration(config.id, { skipConfirm: true })
                    }));
                });
            }
        }

        if (userScriptContainer) {
            userScriptContainer.innerHTML = '';
            const orderedScripts = [
                ...userScripts.filter(script => script && script.id === activeUserScriptId),
                ...userScripts.filter(script => script && script.id !== activeUserScriptId)
            ];

            if (!orderedScripts.length) {
                const empty = document.createElement('div');
                empty.className = 'session-config-empty';
                empty.textContent = 'No scripts yet.';
                userScriptContainer.appendChild(empty);
            } else {
                orderedScripts.forEach((script) => {
                    const meta = parseIndependentUserScriptMeta(script.scriptContent || '');
                    userScriptContainer.appendChild(createSessionListItem({
                        name: script.name || meta.name || 'UserScript',
                        meta: meta.matches.length ? meta.matches[0] : 'No @match/@include',
                        active: script.id === activeUserScriptId,
                        onClick: () => selectUserScriptRecord(script.id),
                        onDelete: () => deleteUserScriptRecord(script.id)
                    }));
                });
            }
        }

        if (ocrContainer) {
            ocrContainer.innerHTML = '';
            const settings = normalizeOcrSettings(ocrSettings || {});
            const hasOcrConfig = Boolean(settings.name || settings.url || ocrRules.length);
            if (!hasOcrConfig) {
                const empty = document.createElement('div');
                empty.className = 'session-config-empty';
                empty.textContent = 'No OCR configuration yet.';
                ocrContainer.appendChild(empty);
            } else {
                ocrContainer.appendChild(createSessionListItem({
                    name: settings.name || 'OCR configuration',
                    meta: settings.url || `${ocrRules.length} captured actions`,
                    active: activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR,
                    color: settings.color,
                    onClick: () => {
                        setOptionsSession('ocr');
                        applyOcrSettingsToUi();
                        renderOcrRules();
                    },
                    onDelete: () => {
                        clearOcrConfiguration(() => showTemporaryMessage('OCR configuration cleared.', 'success'));
                    }
                }));
            }
        }

        updateSessionListPanels();
        updateConfigColorPaletteSelection();
    }

    function updateSessionListPanels() {
        document.querySelectorAll('[data-session-entry]').forEach((entry) => {
            const session = entry.getAttribute('data-session-entry');
            const isActive = session === activeOptionsSession;
            const isExpanded = Boolean(expandedSessionLists[session]) && isActive;
            entry.classList.toggle('active', isActive);
            entry.classList.toggle('expanded', isExpanded);
        });

        document.querySelectorAll('[data-session-config-list]').forEach((panel) => {
            const session = panel.getAttribute('data-session-config-list');
            panel.hidden = !(session === activeOptionsSession && expandedSessionLists[session]);
        });
    }

    function selectClickFillConfiguration(configId) {
        if (!configId) return;
        const hiddenItem = configList.querySelector(`.config-list-item[data-config-id="${configId}"]`);
        if (hiddenItem) {
            setActiveConfig(hiddenItem);
            renderSessionConfigLists();
            return;
        }

        const config = configurations.find(cfg => cfg && cfg.id === configId);
        if (!config) return;
        activeConfigId = config.id;
        aplicarDadosConfiguracao(config);
        acfhStorage.set({ activeConfigId }, () => {
            updateConfigListAndDropdown();
        });
    }

    function createClickFillConfigurationFromSidebar() {
        if (activeConfigId && hasUnsavedChanges) {
            saveCurrentConfiguration(false);
        }

        const nextNumber = getNextNamedNumber(configurations, 'Click and fill');
        const configName = `Click and fill ${String(nextNumber).padStart(2, '0')}`;
        const now = new Date().toISOString();
        const newConfig = {
            id: Date.now().toString(),
            name: configName,
            url: '',
            initWait: '0',
            actions: [],
            color: DEFAULT_CONFIG_COLOR,
            applyColorToSession: false,
            createdAt: now
        };

        configurations.unshift(newConfig);
        activeConfigId = newConfig.id;
        configNameInput.value = newConfig.name;
        configUrlInput.value = '';
        initWaitInput.value = '0';
        xpathActionsContainer.innerHTML = '';
        hasUnsavedChanges = false;

        acfhStorage.set({
            configurations,
            activeConfigId,
            activeAutomationMode: ACTIVE_AUTOMATION_MODE_CLICK_FILL
        }, () => {
            updateConfigListAndDropdown();
            showTemporaryMessage('Click and Fill configuration created.', 'success');
        });
    }

    function updateConfigListAndDropdown() {
        configList.innerHTML = '';
        configSelect.innerHTML = '<option value="" disabled selected>Select a Configuration</option>';

        configurations.forEach(config => {
            const newConfigItem = configListItemTemplate.content.cloneNode(true);
            const configItemDiv = newConfigItem.querySelector('.config-list-item');
            configItemDiv.querySelector('.item-name').textContent = config.name || 'No Name';
            configItemDiv.querySelector('.item-url').textContent = config.url || 'No URL';
            configItemDiv.dataset.configId = config.id;
            configItemDiv.dataset.initWait = config.initWait;
            applyConfigColorStyle(configItemDiv, config.color);
            if (config.id === activeConfigId) {
                configItemDiv.classList.add('active');
            }
            configList.appendChild(configItemDiv);
            addEventListenersToConfigItem(configItemDiv);

            const option = document.createElement('option');
            option.value = config.id;
            option.textContent = `(${config.name || 'No Name'}) ${config.url || 'No URL'}`;
            if (config.id === activeConfigId) {
                option.selected = true;
            }
            configSelect.appendChild(option);
        });

        updateConfigSuggestions();
        renderSessionConfigLists();
        applyClickFillSessionAccent();
    }

function loadConfigurationsFromStorage() {
    console.log("Iniciando carregamento de configurações do acfhStorage...");
    
    // Primeiro, limpar localStorage de dados órfãos
    cleanupOrphanedLocalStorageData();
    
    acfhStorage.get(['configurations', 'activeConfigId', 'autoClickerEnabled', 'xpathLoaded'], (data) => {
        if (!data.configurations || !Array.isArray(data.configurations)) {
            configurations = [];
            console.log("Nenhuma configuração válida encontrada. Inicializando com array vazio.");
        } else {
            configurations = data.configurations;
            console.log("Configurações carregadas:", configurations);
        }

        // Verificar e remover dados inconsistentes
        const validConfigurations = configurations.filter(config => {
            const hasActions = Array.isArray(config && config.actions) && config.actions.length > 0;
            return config && config.id && (config.name || config.url || hasActions);
        });
        
        if (validConfigurations.length !== configurations.length) {
            console.log(`Removendo ${configurations.length - validConfigurations.length} configurações inválidas`);
            configurations = validConfigurations;
            
            // Atualizar storage com apenas configurações válidas
            acfhStorage.set({ configurations }, () => {
                console.log("Storage atualizado com configurações válidas");
            });
        }

        activeConfigId = data.activeConfigId || null;
        updateConfigListAndDropdown();

        if (activeOptionsSession !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
            renderSessionConfigLists();
            return;
        }

        try {
            if (data.activeConfigId) {
                console.log(`Tentando ativar configuração com ID: ${data.activeConfigId}`);
                const config = configurations.find(cfg => cfg.id == data.activeConfigId);
                if (config) {
                    const configItem = configList.querySelector(`.config-list-item[data-config-id="${data.activeConfigId}"]`);
                    if (configItem) {
                        setActiveConfig(configItem, true);
                    } else {
                        console.log("Item de configuração não encontrado no DOM, criando novo elemento DOM.");
                        const newConfigItem = configListItemTemplate.content.cloneNode(true);
                        const configItemDiv = newConfigItem.querySelector('.config-list-item');
                        configItemDiv.querySelector('.item-name').textContent = config.name || 'Sem Nome';
                        configItemDiv.querySelector('.item-url').textContent = config.url || 'Sem URL';
                        configItemDiv.dataset.configId = config.id;
                        configItemDiv.dataset.initWait = config.initWait || '0';
                        configList.appendChild(configItemDiv);
                        addEventListenersToConfigItem(configItemDiv);
                        setActiveConfig(configItemDiv, true);
                    }

                    if (data.xpathLoaded) {
                        console.log(`XPath carregado do storage: ${data.xpathLoaded}`);
                        acfhStorage.remove(['xpathLoaded'], () => {
                            console.log("xpathLoaded removido do storage após uso.");
                        });
                    }

                    if (data.autoClickerEnabled) {
                        const activeActions = config.actions.filter(action => !action.disabled && action.elementFinder);
                        const configToPropagate = {
                            iframe: config.url,
                            waitInit: config.initWait,
                            actionType: activeActions.some(action => action.fillMethod === 'type') ? 'typeOption' : 'copyOption',
                            xpaths: activeActions.map(action => ({
                                value: action.elementFinder,
                                checked: true,
                                interval: action.intervalMs,
                                repetitions: action.repeat,
                                fillValue: action.fillValue,
                                waitInitModal: action.actionInitWait,
                                isCSSSelector: action.isCSSSelector || false,
                                actionMode: action.actionMode || 'default'
                            }))
                        };
                        chrome.runtime.sendMessage({
                            action: "configUpdated",
                            activeConfigId: data.activeConfigId,
                            config: configToPropagate
                        }, () => {
                            console.log("Configuração ativa propagada ao carregar options.js.");
                        });
                    }
                } else {
                    console.warn(`Configuração com ID ${data.activeConfigId} não encontrada. Ativando primeira configuração.`);
                    
                    // Remover activeConfigId inválido
                    acfhStorage.set({ activeConfigId: null }, () => {
                        if (configurations.length > 0) {
                            setActiveConfig(configList.firstElementChild, true);
                        } else {
                            setActiveConfig(null);
                        }
                    });
                }
            } else if (configurations.length > 0) {
                console.log("Nenhum activeConfigId definido. Ativando primeira configuração.");
                setActiveConfig(configList.firstElementChild, true);
            } else {
                console.log("Nenhuma configuração encontrada. Definindo estado inicial vazio.");
                setActiveConfig(null);
                configNameInput.value = '';
                configUrlInput.value = '';
                initWaitInput.value = '0';
                xpathActionsContainer.innerHTML = '';
            }
        } catch (error) {
            console.error("Erro ao carregar configurações:", error);
            setActiveConfig(null);
            configNameInput.value = '';
            configUrlInput.value = '';
            initWaitInput.value = '0';
            xpathActionsContainer.innerHTML = '';
        }
    });
}

    function updateExtensionStatus() {
        const statusElement = document.getElementById('extensionStatus');
        if (!statusElement) {
            console.error("extensionStatus element not found.");
            return;
        }

        acfhStorage.get(['autoClickerEnabled'], (data) => {
            const isEnabled = !!data.autoClickerEnabled;
            const enabledText = translations.statusEnabledLabel || (currentUiLanguage === 'en' ? 'Enabled' : 'Ativada');
            const disabledText = translations.statusDisabledLabel || (currentUiLanguage === 'en' ? 'Disabled' : 'Desativada');

            statusElement.textContent = isEnabled ? enabledText : disabledText;
            statusElement.classList.toggle('status-enabled', isEnabled);
            statusElement.classList.toggle('status-disabled', !isEnabled);
        });
    }

        updateExtensionStatus();

        // Em ambiente web (options hospedada em 127.0.0.1 / Vercel), o evento
        // chrome.storage.onChanged não dispara diretamente aqui. Fazemos um
        // pequeno polling para manter o badge de status sempre alinhado com
        // o estado real do toggle da extensão (popup).
        try {
                setInterval(updateExtensionStatus, 3000);
        } catch (e) {
                console.warn('Falha ao iniciar polling de status da extensão:', e);
        }

    // Listener global para mudanças nas configs (adicione após as definições de funções)
function toggleMutationObserveOptionStorageListener(settingsOverride = null) {
    const settings = settingsOverride ? normalizeSettings(settingsOverride) : readSettingsFromUi();
    const mutationObserveRadio = document.getElementById('mutationObserveMode');
    if (!mutationObserveRadio) return;

    const isEnabled = settings.configMode === 'advanced' && settings.sandboxMode === 'forceDOM';
    mutationObserveRadio.disabled = !isEnabled;
    if (!isEnabled && mutationObserveRadio.checked) {
        const defaultMode = document.getElementById('defaultMode');
        if (defaultMode) defaultMode.checked = true;
        if (currentEditingActionRow) {
            currentEditingActionRow.setAttribute('data-action-mode', 'default');
            const intervalCol = currentEditingActionRow.querySelector('.col-interval-ms');
            const repeatCol = currentEditingActionRow.querySelector('.col-repeat');
            if (intervalCol) intervalCol.style.display = '';
            if (repeatCol) repeatCol.style.display = '';
            hasUnsavedChanges = true;
            saveCurrentConfiguration(false);
        }
    }
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if ('configMode' in changes || 'contentScriptApi' in changes || 'sandboxMode' in changes) {
            updateScriptEditorButtonVisibility();
        }
        if ('autoClickerEnabled' in changes) {
            updateExtensionStatus();
        }
    }
});

    document.getElementById('actionConfigModal').classList.add('active');

    function resolveCurrentEditingActionRow() {
        if (currentEditingActionRow && currentEditingActionRow.isConnected) {
            return currentEditingActionRow;
        }

        const editingActionId = actionConfigModal ? actionConfigModal.dataset.editingActionId : '';
        if (editingActionId && xpathActionsContainer) {
            const liveMatch = Array.from(xpathActionsContainer.querySelectorAll('.xpath-action-row'))
                .find((row) => row.dataset.actionId === editingActionId);
            if (liveMatch) {
                currentEditingActionRow = liveMatch;
                return liveMatch;
            }
        }

        return currentEditingActionRow;
    }

    function openActionConfigModal(actionRowElement) {
        currentEditingActionRow = actionRowElement;
        if (actionConfigModal) {
            actionConfigModal.dataset.editingActionId = actionRowElement.dataset.actionId || '';
            const modeSelect = actionRowElement.querySelector('.action-mode-select');
            const valueInput = document.getElementById('modalValueInput');
            const fillMethodRadios = document.querySelectorAll('input[name="fillMethod"]');
            const modalActionInitialWaitInput = document.getElementById('modalActionInitialWait');
            const defaultModeRadio = document.getElementById('defaultMode');
            const mutationObserveModeRadio = document.getElementById('mutationObserveMode');
            const intervalCol = actionRowElement.querySelector('.col-interval-ms');
            const repeatCol = actionRowElement.querySelector('.col-repeat');

            valueInput.value = actionRowElement.getAttribute('data-fill-value') || '';

            if (modeSelect.value === 'fill') {
                valueInput.closest('.input-group-modal').style.display = 'block';
                valueInput.closest('.input-group-modal').querySelector('label').textContent = translations.fillInputPlaceholder;
                fillMethodRadios.forEach(radio => radio.closest('.radio-group').style.display = 'flex');
            } else {
                valueInput.closest('.input-group-modal').style.display = 'none';
                valueInput.value = '';
                fillMethodRadios.forEach(radio => radio.closest('.radio-group').style.display = 'none');
            }

            const actionInitWait = actionRowElement.getAttribute('data-action-init-wait') || '0';
            modalActionInitialWaitInput.value = actionInitWait;

            const fillMethod = actionRowElement.getAttribute('data-fill-method') || 'paste';
            document.getElementById(fillMethod + 'Option').checked = true;

            const actionMode = actionRowElement.getAttribute('data-action-mode') || 'default';
            actionConfigModal.dataset.selectedActionMode = actionMode;
            defaultModeRadio.checked = actionMode === 'default';
            mutationObserveModeRadio.checked = actionMode === 'mutationObserve';

            toggleMutationObserveOption();

            const updateInputsState = () => {
                const isMutationObserve = mutationObserveModeRadio.checked && !mutationObserveModeRadio.disabled;
                if (intervalCol) intervalCol.style.display = isMutationObserve ? 'none' : '';
                if (repeatCol) repeatCol.style.display = isMutationObserve ? 'none' : '';
                updateIntervalRepeatHeadersVisibility();
            };
            updateInputsState();

            defaultModeRadio.addEventListener('change', updateInputsState);
            mutationObserveModeRadio.addEventListener('change', updateInputsState);

            actionConfigModal.style.display = 'block';
            console.log("Configuration modal opened for editing.");
        }
    }

    function closeActionConfigModal() {
        if (actionConfigModal) {
            actionConfigModal.style.display = 'none';
            delete actionConfigModal.dataset.editingActionId;
            delete actionConfigModal.dataset.selectedActionMode;
            currentEditingActionRow = null;
            console.log("Configuration modal closed.");
        }
    }

   function addNewActionRow() {
    if (activeOptionsSession !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
        setOptionsSession(ACTIVE_AUTOMATION_MODE_CLICK_FILL, {
            persist: false,
            syncRuntime: false,
            showProcessing: false
        });
    }
    const hasConfigName = configNameInput && configNameInput.value.trim();
    const hasConfigUrl = configUrlInput && configUrlInput.value.trim();
    if (!hasConfigName || !hasConfigUrl) {
        showTemporaryMessage('Preencha o nome da configuração e a URL antes de adicionar uma ação.', 'error');
        return;
    }
    const ensuredConfig = ensureActiveClickFillConfig({ force: true });
    if (!ensuredConfig) {
        showTemporaryMessage('Create a Click and Fill configuration first.', 'error');
        return;
    }
    const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
    adicionarXPathInput(
        "", // valor vazio
        true, // isChecked
        1000, // intervalo
        1, // repeticoes
        "", // fillValue
        0, // waitInitModal
        "click", // mode
        "paste", // fillMethod
        false, // isCSSSelector
        "default", // actionMode
        `Action ${actionRows.length + 1}`, // NOME PADRÃO SEMPRE
        { persistDraft: true }
    );
    hasUnsavedChanges = true;
}
    function updateActionNumbers() {
        const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
        actionRows.forEach((row, index) => {
            row.querySelector('.col-num').textContent = index + 1;
        });
    }

    // Atualiza a visibilidade dos cabeçalhos "Intervalo (ms)" e "Repet." de acordo
    // com as colunas realmente visíveis nas linhas de ação. Se todas as ações
    // estiverem em modo MutationObserve (ou seja, sem coluna de intervalo
    // visível), escondemos também os cabeçalhos para evitar informação confusa.
    function updateIntervalRepeatHeadersVisibility() {
        const headerInterval = document.querySelector('.header-item.header-interval-ms');
        const headerRepeat = document.querySelector('.header-item.header-repeat');

        if (!headerInterval || !headerRepeat || !xpathActionsContainer) {
            return;
        }

        const headersContainer = headerInterval.closest('.action-list-headers');
        const actionsTable = xpathActionsContainer;
        const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');

        // Se não houver ações, mantemos os cabeçalhos visíveis por padrão
        // e removemos qualquer classe especial de layout.
        if (actionRows.length === 0) {
            headerInterval.style.display = '';
            headerRepeat.style.display = '';
            if (headersContainer) headersContainer.classList.remove('no-interval');
            if (actionsTable) actionsTable.classList.remove('no-interval');
            return;
        }

        let hasVisibleInterval = false;

        actionRows.forEach(row => {
            const intervalCol = row.querySelector('.col-interval-ms');
            if (intervalCol && intervalCol.style.display !== 'none') {
                hasVisibleInterval = true;
            }
        });

        if (hasVisibleInterval) {
            headerInterval.style.display = '';
            headerRepeat.style.display = '';
            if (headersContainer) headersContainer.classList.remove('no-interval');
            if (actionsTable) actionsTable.classList.remove('no-interval');
        } else {
            headerInterval.style.display = 'none';
            headerRepeat.style.display = 'none';
            if (headersContainer) headersContainer.classList.add('no-interval');
            if (actionsTable) actionsTable.classList.add('no-interval');
        }
    }

    function addEventListenersToActionRow(actionRow) {
        const editButton = actionRow.querySelector('.edit-btn');
        const deleteButton = actionRow.querySelector('.delete-btn');
        const modeSelect = actionRow.querySelector('.action-mode-select');
        const modeDisplay = actionRow.querySelector('.mode-display');
        const inputs = actionRow.querySelectorAll('.input-inline');

        actionRow.addEventListener('pointerdown', (event) => {
            lastClickFillActionPointerAt = Date.now();
            event.stopPropagation();
        });

        actionRow.addEventListener('click', (event) => {
            event.stopPropagation();
        });



         const nameInput = actionRow.querySelector('.col-name input');
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            hasUnsavedChanges = true;
            saveActionNameToLocalStorage(actionRow);
        });
        nameInput.addEventListener('blur', () => {
            saveActionNameToLocalStorage(actionRow);
        });
    }


        if (editButton) {
            editButton.addEventListener('click', function(event) {
                event.stopPropagation();
                const existingMenu = document.querySelector('.edit-action-menu');
                if (existingMenu) {
                    existingMenu.remove();
                }

                const menuTemplate = document.getElementById('edit-action-menu-template');
                if (!menuTemplate) {
                    console.error('edit-action-menu-template template not found');
                    return;
                }

                const menu = menuTemplate.content.cloneNode(true).querySelector('.edit-action-menu');
                actionRow.appendChild(menu);
                const menuElement = actionRow.querySelector('.edit-action-menu');

                const disableOption = menuElement.querySelector('.disable-action-option');
                if (disableOption) {
                    disableOption.querySelector('.action-text').textContent = actionRow.classList.contains('disabled')
                        ? translations.enableAction
                        : translations.disableAction;
                    disableOption.classList.toggle('enable', actionRow.classList.contains('disabled'));
                }

                menuElement.classList.add('active');
                actionRow.classList.add('menu-open');
                const closeEditMenu = () => {
                    actionRow.classList.remove('menu-open');
                    menuElement.remove();
                };

                const editOption = menuElement.querySelector('.edit-action-option');
                const duplicateOption = menuElement.querySelector('.duplicate-action-option');
                if (editOption) {
                    editOption.addEventListener('click', () => {
                        openActionConfigModal(actionRow);
                        closeEditMenu();
                    });
                }

                if (duplicateOption) {
                    duplicateOption.addEventListener('click', () => {
                        const name = actionRow.querySelector('.col-name input').value;
                        const elementFinder = actionRow.querySelector('.col-element-finder input').value;
                        const mode = actionRow.querySelector('.action-mode-select').value;
                        const intervalMs = actionRow.querySelector('.col-interval-ms input').value;
                        const repeat = actionRow.querySelector('.col-repeat input').value;
                        const fillValue = actionRow.getAttribute('data-fill-value') || '';
                        const fillMethod = actionRow.getAttribute('data-fill-method') || 'paste';
                        const actionInitWait = actionRow.getAttribute('data-action-init-wait') || '0';
                        const isDisabled = actionRow.classList.contains('disabled');
                        const isCSSSelector = actionRow.getAttribute('data-is-css-selector') === 'true';
                        const actionMode = actionRow.getAttribute('data-action-mode') || 'default';

                        adicionarXPathInput(
                            elementFinder,
                            true,
                            parseFloat(intervalMs) || 1000,
                            parseInt(repeat) || 1,
                            fillValue,
                            parseFloat(actionInitWait) || 0,
                            mode,
                            fillMethod,
                            isCSSSelector,
                            actionMode,
                            name,
                            { disabled: isDisabled }
                        );

                        updateActionNumbers();
                        closeEditMenu();
                    });
                }

                if (disableOption) {
                    disableOption.addEventListener('click', () => {
                        actionRow.classList.toggle('disabled');
                        const inputsToDisable = actionRow.querySelectorAll('.input-inline, .action-mode-select');
                        inputsToDisable.forEach(input => {
                            input.disabled = actionRow.classList.contains('disabled');
                        });
                        hasUnsavedChanges = true;
                        saveCurrentConfiguration(false);
                        closeEditMenu();
                    });
                }

                document.addEventListener('click', function closeMenu(ev) {
                    if (menuElement && !editButton.contains(ev.target) && !menuElement.contains(ev.target)) {
                        closeEditMenu();
                    }
                }, { once: true });
            });
        }

        if (deleteButton) {
            deleteButton.addEventListener('click', function() {
                actionRow.remove();
                updateActionNumbers();
                updateIntervalRepeatHeadersVisibility();
                hasUnsavedChanges = true;
                saveCurrentConfiguration(false);
                console.log("Action removed.");
            });
        }

        if (modeSelect) {
            modeSelect.addEventListener('change', function() {
                const colNameInput = actionRow.querySelector('.col-name input');
                if (this.value === 'fill') {
                    colNameInput.placeholder = translations.fillModeTitle || translations.modeFillLabel;
                    if (modeDisplay) {
                        modeDisplay.classList.remove('click-mode');
                        modeDisplay.classList.add('fill-mode');
                        modeDisplay.innerHTML = '';
                    }
                } else {
                    colNameInput.placeholder = translations.clickModeTitle || translations.modeClickLabel;
                    if (modeDisplay) {
                        modeDisplay.classList.remove('fill-mode');
                        modeDisplay.classList.add('click-mode');
                        modeDisplay.innerHTML = svgs.mouseClick;
                    }
                }
                hasUnsavedChanges = true;
                saveCurrentConfiguration(false);
                console.log(`Action mode changed to: ${this.value}`);
            });
        }

        if (modeDisplay) {
            modeDisplay.addEventListener('click', function() {
                const currentMode = modeSelect.value;
                const newMode = currentMode === 'click' ? 'fill' : 'click';
                modeSelect.value = newMode;
                modeSelect.dispatchEvent(new Event('change'));
            });
        }

        inputs.forEach(input => {
            input.addEventListener('input', () => hasUnsavedChanges = true);
            input.addEventListener('change', () => {
                const intervalInput = actionRow.querySelector('.col-interval-ms input');
                if (intervalInput) {
                    let intervalValue = intervalInput.value.trim();
                    console.log(`Input change detected. Raw interval value: ${intervalValue}`);
                    if (intervalValue === '' || isNaN(parseFloat(intervalValue))) {
                        intervalInput.value = '1000';
                    }
                    hasUnsavedChanges = true;
                }
                saveCurrentConfiguration(false);
            });
        });
    }

function setActiveConfig(clickedItem, forceReload = false) {
    const previousActiveId = activeConfigId;
    if (activeConfigId && hasUnsavedChanges && !forceReload) {
        saveCurrentConfiguration(false);
    }

    const allConfigItems = configList.querySelectorAll('.config-list-item');
    allConfigItems.forEach(item => item.classList.remove('active'));

    if (configSelect) {
        configSelect.value = clickedItem && clickedItem.dataset && clickedItem.dataset.configId ? clickedItem.dataset.configId : '';
    }

    if (clickedItem && clickedItem.dataset && clickedItem.dataset.configId) {
        const newActiveConfigId = clickedItem.dataset.configId;

        if (activeConfigId === newActiveConfigId && !forceReload) {
            console.log(`Configuração ${newActiveConfigId} já está ativa.`);
            return;
        }

        clickedItem.classList.add('active');
        activeConfigId = newActiveConfigId;

        const configData = configurations.find(cfg => cfg.id == activeConfigId);
        if (configData) {
            aplicarDadosConfiguracao(configData);
            console.log(`Configuração "${configData.name}" carregada.`);
            
            acfhStorage.get([INDEPENDENT_USERSCRIPT_KEY], (data) => {
                setScriptSavedIndicator(Boolean(data[INDEPENDENT_USERSCRIPT_KEY]));
            });
        } else {
            configNameInput.value = '';
            configUrlInput.value = '';
            initWaitInput.value = '0';
            xpathActionsContainer.innerHTML = '';
            acfhStorage.get([INDEPENDENT_USERSCRIPT_KEY], (data) => {
                setScriptSavedIndicator(Boolean(data[INDEPENDENT_USERSCRIPT_KEY]));
            });
            console.log(`Configuração com ID ${activeConfigId} não encontrada. Inputs limpos.`);
        }
    } else {
        activeConfigId = null;
        configNameInput.value = '';
        configUrlInput.value = '';
        initWaitInput.value = '0';
        xpathActionsContainer.innerHTML = '';
        acfhStorage.get([INDEPENDENT_USERSCRIPT_KEY], (data) => {
            setScriptSavedIndicator(Boolean(data[INDEPENDENT_USERSCRIPT_KEY]));
        });
        console.log("Nenhuma configuração ativa. Inputs principais limpos.");
        
        // Limpar completamente quando não há configurações
        if (configurations.length === 0) {
            acfhStorage.set({ autoClickConfig: null }, () => {
                console.log('autoClickConfig limpo do storage.');
            });
        }
    }

    updateActionNumbers();

    acfhStorage.set({ activeConfigId }, () => {
        console.log(`Configuração ativa definida: ${activeConfigId}`);

        // Quando a configuração ativa muda, removemos o user script da configuração anterior,
        // para que apenas a configuração atual permaneça com script associado.
        if (previousActiveId && previousActiveId !== activeConfigId) {
            chrome.userScripts.unregister({ ids: [previousActiveId, `UserScript_${previousActiveId}`] }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('Erro ao remover userScript da configuração anterior:', chrome.runtime.lastError.message);
                } else {
                    console.log('UserScript removido para configuração anterior:', previousActiveId);
                }
            });
        }
    });

    hasUnsavedChanges = false;
    renderSessionConfigLists();
}



    function addEventListenersToConfigItem(configItem) {
        const deleteButton = configItem.querySelector('.item-delete');
        
        configItem.addEventListener('click', function(event) {
            if (!event.target.closest('.item-delete') && !configItem.classList.contains('active')) {
                setActiveConfig(this);
            }
        });

        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                const configId = configItem.dataset.configId;
                // Exclusão direta a partir do item: sem confirmação
                deleteConfiguration(configId, { skipConfirm: true });
            });
        }
    }

    function validateElementFinder(value) {
        if (!value) return false;
        if (isXPath(value)) {
            try {
                document.createExpression(value);
                return true;
            } catch (e) {
                return false;
            }
        } else {
            try {
                document.createDocumentFragment().querySelector(value);
                return true;
            } catch (e) {
                return false;
            }
        }
    }

function saveCurrentConfiguration(showMessage = true) {
    if (!activeConfigId) {
        const ensuredConfig = ensureActiveClickFillConfig();
        if (!ensuredConfig) {
            console.log("No active configuration to save.");
            return;
        }
    }
    
    // CORREÇÃO AQUI: Usar o parâmetro showMessage em vez de showNotification
    if (!hasUnsavedChanges && showMessage) {
        console.log("No changes to save in the active configuration.");
        return;
    }

    clearTimeout(saveTimeout);

    const configToSave = configurations.find(cfg => cfg.id == activeConfigId);

    if (configToSave) {
        configToSave.name = configNameInput.value;
        configToSave.url = configUrlInput.value;
        configToSave.initWait = initWaitInput.value;

        configToSave.actions = [];
        const actionRows = xpathActionsContainer.querySelectorAll('.xpath-action-row');
        let isValid = true;

        actionRows.forEach(row => {
            const elementFinder = row.querySelector('.col-element-finder input').value.trim();
            const isDraftAction = elementFinder === '';
            if (!isDraftAction && !validateElementFinder(elementFinder)) {
                isValid = false;
                const isXPathSelector = isXPath(elementFinder);
                const baseMessage = isXPathSelector
                    ? translations.invalidXPathInAction
                    : translations.invalidCSSSelectorInAction;
                showTemporaryMessage(`${baseMessage} ${elementFinder}`, 'error');
                return;
            }

            let reps = parseInt(row.querySelector('.col-repeat input').value);
            if (reps !== -2 && (isNaN(reps) || reps <= 0 || reps > 9999999)) reps = 1;

            const intervalMsInput = row.querySelector('.col-interval-ms input');
            let intervalMs = intervalMsInput.value.trim();
            if (intervalMs === '' || isNaN(parseFloat(intervalMs))) {
                intervalMs = '1000';
            }

            const actionName = row.querySelector('.col-name input').value;
            
            configToSave.actions.push({
                actionId: row.dataset.actionId || `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                name: actionName,
                elementFinder: elementFinder,
                mode: row.querySelector('.action-mode-select').value,
                intervalMs: row.getAttribute('data-action-mode') === 'mutationObserve' ? null : intervalMs,
                repeat: row.getAttribute('data-action-mode') === 'mutationObserve' ? null : reps,
                fillValue: row.getAttribute('data-fill-value') || '',
                fillMethod: row.getAttribute('data-fill-method') || 'paste',
                actionInitWait: row.getAttribute('data-action-init-wait') || '0',
                disabled: row.classList.contains('disabled'),
                isCSSSelector: row.getAttribute('data-is-css-selector') === 'true',
                actionMode: row.getAttribute('data-action-mode') || 'default'
            });
        });

        if (!isValid) return;

        // Salvar os action names no localStorage
        actionRows.forEach((row, index) => {
            saveActionNameToLocalStorage(row);
        });

        const sidebarItem = configList.querySelector(`.config-list-item[data-config-id="${activeConfigId}"]`);
        if (sidebarItem) {
            sidebarItem.querySelector('.item-name').textContent = configToSave.name;
            sidebarItem.querySelector('.item-url').textContent = configToSave.url;
        }

        const storageConfig = coletarDadosConfiguracao();
        const activeActions = configToSave.actions.filter(action => !action.disabled && action.elementFinder);

        // Se a configuração passar a ter ações, garantir que qualquer
        // UserScript automático desta configuração seja desregistrado,
        // para que apenas as ações de clique/preenchimento controlem
        // a automação. Se não houver ações, mantemos (ou permitimos)
        // o uso de scripts personalizados.
        if (activeActions.length > 0) {
            chrome.runtime.sendMessage({
                action: "unregisterUserScript",
                configId: activeConfigId
            });
        }

        acfhStorage.get(["autoClickerEnabled"], (data) => {
            const isEnabled = data.autoClickerEnabled || false;
            // Mantemos chrome.storage.local (via acfhStorage) como fonte de verdade
            // apenas para configurations/activeConfigId. O background recalcula
            // autoClickConfig sempre que essas chaves mudam e o toggle geral
            // estiver habilitado, evitando inconsistências entre UI e injeção.
            acfhStorage.set({
                configurations: configurations,
                activeConfigId: activeConfigId
            }, () => {
                hasUnsavedChanges = false;
                if (showMessage) {  // CORREÇÃO AQUI: Usar showMessage em vez de showNotification
                    showTemporaryMessage(translations.configSaved, 'success');
                }
                console.log(`Configuration "${configToSave.name}" (ID: ${activeConfigId}) saved to storage. Data:`, configurations);

                if (isEnabled && activeOptionsSession === 'click-fill' && activeActions.length > 0) {
                    chrome.runtime.sendMessage({
                        action: "configUpdated",
                        activeConfigId: activeConfigId,
                        config: {
                            ...storageConfig,
                            xpaths: activeActions.map(action => ({
                                value: action.elementFinder,
                                checked: true,
                                interval: action.intervalMs,
                                repetitions: action.repeat,
                                fillValue: action.fillValue,
                                waitInitModal: action.actionInitWait,
                                isCSSSelector: action.isCSSSelector,
                                actionMode: action.actionMode
                            }))
                        }
                    }, () => {
                        console.log("Updated configuration message sent to background.js.");
                    });
                } else {
                    console.log("Configuration saved without click/fill propagation.");
                }
            });
        });
    } else {
        console.warn(`Attempt to save a configuration with ID ${activeConfigId}, but not found in the array.`);
        if (showMessage) {  // CORREÇÃO AQUI TAMBÉM
            showTemporaryMessage("Error saving: Configuration not found!", 'error');
        }
    }
}
function deleteConfiguration(idToDelete, options = {}) {
    const skipConfirm = options.skipConfirm === true;

    const performDelete = (configId) => {
        const configIndex = configurations.findIndex(cfg => cfg.id == configId);
        if (configIndex > -1) {
            const removedConfigName = configurations[configIndex].name || 'No Name';
            configurations.splice(configIndex, 1);

            // Remover da lista da UI
            const configItemDiv = configList.querySelector(`.config-list-item[data-config-id="${configId}"]`);
            if (configItemDiv) {
                configItemDiv.remove();
            }

            // Limpar localStorage
            clearActionNamesFromLocalStorage(configId);

            // Limpar todos os scripts do storage
            acfhStorage.remove([
                `customScript_${configId}`, 
                `UserScript_${configId}`,
                `scriptLastEdited_${configId}`
            ], () => {
                console.log(`Scripts removidos do storage para config ${configId}`);
            });

            // Unregister user script
            chrome.userScripts.unregister({ ids: [`script-${configId}`] }, () => {
                if (chrome.runtime.lastError) {
                    // Ignora se o script não existir
                } else {
                    console.log(`User script com ID script-${configId} desregistrado.`);
                }
            });

            // Atualizar estado global
            const wasActive = activeConfigId == configId;
            
            if (wasActive) {
                activeConfigId = configurations.length > 0 ? configurations[0].id : null;
                
                if (activeConfigId) {
                    const nextActiveConfig = configurations.find(cfg => cfg.id == activeConfigId);
                    if (nextActiveConfig) {
                        aplicarDadosConfiguracao(nextActiveConfig);
                    }
                } else {
                    configNameInput.value = '';
                    configUrlInput.value = '';
                    initWaitInput.value = '0';
                    xpathActionsContainer.innerHTML = '';
                    setScriptSavedIndicator(false);
                }
            }

            // Atualizar storage
            acfhStorage.set({
                configurations: configurations,
                activeConfigId: activeConfigId,
                autoClickConfig: wasActive ? null : undefined // Remover se era a ativa
            }, () => {
                showTemporaryMessage(`Configuração "${removedConfigName}" removida!`, 'success');
                console.log(`Configuração "${removedConfigName}" (ID: ${configId}) removida.`);

                // Atualizar dropdown e lista
                updateConfigListAndDropdown();
                
                // Notificar content script para parar execução
                if (wasActive) {
                    chrome.runtime.sendMessage({
                        action: "stopAutomation"
                    }, () => {
                        console.log("Mensagem stopAutomation enviada para background.js");
                    });
                }
            });
        } else {
            console.warn(`Tentativa de remover configuração com ID ${configId}, mas não encontrada.`);
            showTemporaryMessage("Erro: Configuração não encontrada para remoção!", 'error');
        }
    };

    if (skipConfirm) {
        performDelete(idToDelete);
    } else {
        showModal(translations.modalDeleteConfirm, true).then(confirmacao => {
            if (!confirmacao) return;
            performDelete(idToDelete);
        });
    }
}


    function getNextConfigNumber() {
        const existingNumbers = configurations
            .map(cfg => {
                const match = cfg.name.match(/Default Configuration (\d+)/);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter(num => num !== null)
            .sort((a, b) => a - b);

        let nextNum = 1;
        for (let i = 0; i < existingNumbers.length; i++) {
            if (existingNumbers[i] === nextNum) {
                nextNum++;
            } else if (existingNumbers[i] > nextNum) {
                return nextNum;
            }
        }
        return nextNum;
    }

    async function exportAllConfigurations() {
        if (configurations.length === 0) {
            showTemporaryMessage(translations.emptyConfigExport, 'error');
            return;
        }

        if (activeConfigId && hasUnsavedChanges) {
            saveCurrentConfiguration(false);
        }

        try {
            const jsonData = JSON.stringify(configurations, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });

            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'auto_clicker_configs.json',
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                showTemporaryMessage(translations.exportSettingsTitle + " - " + translations.configSaved, 'success');
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'auto_clicker_configs.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showTemporaryMessage(translations.exportSettingsTitle + " - " + translations.configSaved, 'success');
            }
            console.log("All configurations exported.");
        } catch (error) {
            console.error("Export error:", error);
        } finally {
            bulkActionsMenu.classList.remove('show');
        }
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        sendResponse({ received: true });
        if (msg.action === "actionAdded" && msg.activeConfigId === activeConfigId) {
            console.log("actionAdded message received, updating UI with new action.");
            const config = configurations.find(cfg => cfg.id === activeConfigId);
            if (config) {
                const isCSSSelector = !isXPath(msg.newAction.elementFinder);
                adicionarXPathInput(
                    msg.newAction.elementFinder,
                    true,
                    parseFloat(msg.newAction.intervalMs) || 1000,
                    msg.newAction.repeat || 1,
                    msg.newAction.fillValue || "",
                    parseFloat(msg.newAction.actionInitWait) || 0,
                    msg.newAction.mode || "click",
                    msg.newAction.fillMethod || "paste",
                    isCSSSelector
                );
                updateActionNumbers();
                hasUnsavedChanges = false;
                showTemporaryMessage("New action added!", "success");
            } else {
                console.warn("Active configuration not found when processing actionAdded.");
            }
        }
    });

    document.querySelectorAll('input[name="feedbackMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const feedbackMode = radio.value === 'none' ? 'none' : 'floatbox';
            updateFeedbackLabels(feedbackMode);
        });
    });

    function toggleFeedback(selected) {
        const checkboxes = document.querySelectorAll('input[name="feedback"]');
        
        checkboxes.forEach(checkbox => {
            const label = checkbox.closest('.feedback-option').querySelector('label');
            if (checkbox === selected) {
                if (checkbox.checked) {
                    label.classList.add('checked');
                } else {
                    label.classList.remove('checked');
                }
            } else {
                checkbox.checked = false;
                label.classList.remove('checked');
            }
        });

        const feedbackValue = selected.checked ? selected.id : null;
        acfhStorage.set({ feedbackMode: feedbackValue }, () => {
            console.log(`Feedback mode set to: ${feedbackValue || 'none'}`);
        });
    }

    function toggleMutationObserveOptionLegacy() {
        acfhStorage.get(['configMode', 'sandboxMode'], (data) => {
            const configMode = data.configMode || 'beginner';
            const sandboxMode = data.sandboxMode || 'default';
            const mutationObserveRadio = document.getElementById('mutationObserveMode');
            
            if (mutationObserveRadio) {
                const isEnabled = configMode === 'advanced' && sandboxMode === 'forceDOM';
                mutationObserveRadio.disabled = !isEnabled;
                if (!isEnabled && mutationObserveRadio.checked) {
                    document.getElementById('defaultMode').checked = true;
                    if (currentEditingActionRow) {
                        currentEditingActionRow.setAttribute('data-action-mode', 'default');
                        const intervalCol = currentEditingActionRow.querySelector('.col-interval-ms');
                        const repeatCol = currentEditingActionRow.querySelector('.col-repeat');
                        if (intervalCol) intervalCol.style.display = '';
                        if (repeatCol) repeatCol.style.display = '';
                        hasUnsavedChanges = true;
                        saveCurrentConfiguration(false);
                    }
                }
            }
        });
    }   


// Função para alternar a visibilidade do botão do editor de scripts
function toggleScriptEditorButton() {
    acfhStorage.get(['configMode', 'contentScriptApi', 'sandboxMode'], (data) => {
        const configMode = data.configMode || 'beginner';
        const contentScriptApi = data.contentScriptApi || 'dynamicUserScriptApi';
        const sandboxMode = data.sandboxMode || 'default';
        const scriptEditorIconBtn = document.getElementById('scriptEditorIconBtn');

        if (!scriptEditorIconBtn) {
            return;
        }

        if (scriptEditorIconBtn) {
            const isVisible = configMode === 'advanced' &&
                              contentScriptApi === 'userScriptApi' &&
                              sandboxMode === 'forceDOM';
            scriptEditorIconBtn.classList.toggle('visible', isVisible);
        }
    });
}

// Adiciona listener para mudanças nas configurações relevantes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && ('configMode' in changes || 'contentScriptApi' in changes || 'sandboxMode' in changes)) {
        toggleScriptEditorButton();
    }
});

    function exportActiveConfiguration() {
        if (!activeConfigId) {
            showTemporaryMessage(translations.incompleteConfigExport, 'error');
            return;
        }

        if (hasUnsavedChanges) {
            saveCurrentConfiguration(false);
        }

        const configToExport = configurations.find(cfg => cfg.id == activeConfigId);

        if (!configToExport) {
            showTemporaryMessage("Active configuration not found to export.", 'error');
            return;
        }

        try {
            const dataToExport = [configToExport];
            const jsonData = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileBase = configToExport.name || configToExport.url || 'click_fill_configuration';
            const fileName = `${fileBase.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showTemporaryMessage(`${translations.exportSettingsTitle}: "${configToExport.name || 'No Name'}"`, 'success');
            console.log(`Configuration "${configToExport.name || 'No Name'}" exported for direct download.`);
        } catch (error) {
            console.error("Error exporting active configuration:", error);
            showTemporaryMessage(translations.exportSettingsTitle + " - Error", 'error');
        }
    }
    

    async function importConfigurations() {
        try {
            if ('showOpenFilePicker' in window) {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false
                });
                const file = await fileHandle.getFile();
                const content = await file.text();
                const importedConfigs = JSON.parse(content);

                if (!Array.isArray(importedConfigs)) {
                    throw new Error(translations.importError);
                }

                if (activeConfigId && hasUnsavedChanges) {
                    saveCurrentConfiguration(false);
                }

                const convertedConfigs = importedConfigs.map(config => {
                    return {
                        id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
                        name: config.name || `Imported Config ${configurations.length + 1}`,
                        url: config.url || '',
                        initWait: config.initWait || '0',
                        actions: (config.actions || []).map((action, index) => ({
                            name: action.name || `Action ${index + 1}`,
                            elementFinder: action.elementFinder || '',
                            mode: action.mode || 'click',
                            intervalMs: action.intervalMs || '1000',
                            repeat: action.repeat ?? 1,
                            fillValue: action.fillValue || '',
                            fillMethod: action.fillMethod || 'paste',
                            actionInitWait: action.actionInitWait || '0',
                            disabled: Boolean(action.disabled),
                            isCSSSelector: Boolean(action.isCSSSelector),
                            actionMode: action.actionMode || 'default'
                        }))
                    };
                });

                configurations.push(...convertedConfigs);

                convertedConfigs.forEach(config => {
                    const newConfigItem = configListItemTemplate.content.cloneNode(true);
                    const configItemDiv = newConfigItem.querySelector('.config-list-item');
                    configItemDiv.querySelector('.item-name').textContent = config.name;
                    configItemDiv.querySelector('.item-url').textContent = config.url;
                    configItemDiv.dataset.configId = config.id;
                    configItemDiv.dataset.initWait = config.initWait;
                    configList.appendChild(configItemDiv);
                    addEventListenersToConfigItem(configItemDiv);
                });

                acfhStorage.set({
                    configurations: configurations,
                    activeConfigId: activeConfigId
                }, () => {
                    if (configurations.length > 0 && !activeConfigId) {
                        setActiveConfig(configList.firstElementChild, true);
                    }
                    showTemporaryMessage(translations.configImported, 'success');
                    console.log("Configurations imported and added:", convertedConfigs);
                });
            } else {
                // Fallback para navegadores sem showOpenFilePicker
                return new Promise((resolve, reject) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json,application/json';
                    input.style.display = 'none';
                    document.body.appendChild(input);

                    input.addEventListener('change', (event) => {
                        const file = event.target.files && event.target.files[0];
                        if (!file) {
                            document.body.removeChild(input);
                            resolve();
                            return;
                        }

                        const reader = new FileReader();
                        reader.onload = (e) => {
                            try {
                                const content = e.target.result;
                                const importedConfigs = JSON.parse(content);

                                if (!Array.isArray(importedConfigs)) {
                                    throw new Error(translations.importError);
                                }

                                if (activeConfigId && hasUnsavedChanges) {
                                    saveCurrentConfiguration(false);
                                }

                                const convertedConfigs = importedConfigs.map(config => {
                                    return {
                                        id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
                                        name: config.name || `Imported Config ${configurations.length + 1}`,
                                        url: config.url || '',
                                        initWait: config.initWait || '0',
                                        actions: (config.actions || []).map((action, index) => ({
                                            name: action.name || `Action ${index + 1}`,
                                            elementFinder: action.elementFinder || '',
                                            mode: action.mode || 'click',
                                            intervalMs: action.intervalMs || '1000',
                                            repeat: action.repeat ?? 1,
                                            fillValue: action.fillValue || '',
                                            fillMethod: action.fillMethod || 'paste',
                                            actionInitWait: action.actionInitWait || '0',
                                            disabled: Boolean(action.disabled),
                                            isCSSSelector: Boolean(action.isCSSSelector),
                                            actionMode: action.actionMode || 'default'
                                        }))
                                    };
                                });

                                configurations.push(...convertedConfigs);

                                convertedConfigs.forEach(config => {
                                    const newConfigItem = configListItemTemplate.content.cloneNode(true);
                                    const configItemDiv = newConfigItem.querySelector('.config-list-item');
                                    configItemDiv.querySelector('.item-name').textContent = config.name;
                                    configItemDiv.querySelector('.item-url').textContent = config.url;
                                    configItemDiv.dataset.configId = config.id;
                                    configItemDiv.dataset.initWait = config.initWait;
                                    configList.appendChild(configItemDiv);
                                    addEventListenersToConfigItem(configItemDiv);
                                });

                                acfhStorage.set({
                                    configurations: configurations,
                                    activeConfigId: activeConfigId
                                }, () => {
                                    if (configurations.length > 0 && !activeConfigId) {
                                        setActiveConfig(configList.firstElementChild, true);
                                    }
                                    showTemporaryMessage(translations.configImported, 'success');
                                    console.log("Configurations imported and added (fallback):", convertedConfigs);
                                    resolve();
                                });
                            } catch (parseError) {
                                console.error("Error reading or parsing JSON file:", parseError);
                                showTemporaryMessage(`${translations.importError}: ${parseError.message}`, 'error');
                                reject(parseError);
                            } finally {
                                document.body.removeChild(input);
                            }
                        };

                        reader.onerror = (err) => {
                            console.error("Error reading file:", err);
                            showTemporaryMessage(`${translations.importError}: ${err.message}`, 'error');
                            document.body.removeChild(input);
                            reject(err);
                        };

                        reader.readAsText(file);
                    });

                    input.click();
                });
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log("File import canceled by user.");
            } else {
                console.error("Error importing configurations:", error);
                showTemporaryMessage(`${translations.importError}: ${error.message}`, 'error');
            }
        } finally {
            bulkActionsMenu.classList.remove('show');
        }
    }

    // Event Listeners
    if (cancelModalButton) {
        cancelModalButton.addEventListener('click', closeActionConfigModal);
    }

    const handleActionModeToggle = (event) => {
        const label = event.target.closest('.mode-toggle-group label[for]');
        if (!label) return;
        const radio = document.getElementById(label.getAttribute('for'));
        if (!radio || radio.disabled) return;
        event.preventDefault();
        radio.checked = true;
        if (actionConfigModal) {
            actionConfigModal.dataset.selectedActionMode = radio.value;
        }
        radio.dispatchEvent(new Event('change', { bubbles: true }));
    };

    document.addEventListener('pointerdown', handleActionModeToggle, true);
    document.addEventListener('click', handleActionModeToggle, true);

    if (saveModalButton) {
        saveModalButton.addEventListener('click', function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            console.log('[ACFH] Botão Salvar do modal de ação clicado');
            const targetEditingActionRow = resolveCurrentEditingActionRow();
            if (targetEditingActionRow) {
                const modalValue = document.getElementById('modalValueInput').value;
                const modalActionInitialWait = document.getElementById('modalActionInitialWait').value;
                const actionModeRadio = document.querySelector('input[name="actionMode"]:checked');
                const selectedActionMode = actionConfigModal ? actionConfigModal.dataset.selectedActionMode : '';
                const actionMode = selectedActionMode || (actionModeRadio ? actionModeRadio.value : 'default');
                
                let fillMethod = 'paste';
                const modeSelectEl = targetEditingActionRow.querySelector('.action-mode-select');
                const currentMode = modeSelectEl ? modeSelectEl.value : 'fill';
                if (currentMode === 'fill') {
                    const checkedRadio = document.querySelector('input[name="fillMethod"]:checked');
                    if (checkedRadio) {
                        fillMethod = checkedRadio.value;
                    }
                }

                targetEditingActionRow.setAttribute('data-fill-value', modalValue);
                targetEditingActionRow.setAttribute('data-fill-method', fillMethod);
                targetEditingActionRow.setAttribute('data-action-init-wait', modalActionInitialWait);
                targetEditingActionRow.setAttribute('data-action-mode', actionMode);

                const intervalCol = targetEditingActionRow.querySelector('.col-interval-ms');
                const repeatCol = targetEditingActionRow.querySelector('.col-repeat');
                const isMutationObserve = actionMode === 'mutationObserve';
                if (intervalCol) intervalCol.style.display = isMutationObserve ? 'none' : '';
                if (repeatCol) repeatCol.style.display = isMutationObserve ? 'none' : '';
                updateIntervalRepeatHeadersVisibility();
            }
            closeActionConfigModal();
            hasUnsavedChanges = true;
            saveCurrentConfiguration(false);
        });
    }

    if (actionConfigModal) {
        window.addEventListener('click', function(event) {
            if (event.target === actionConfigModal) {
                closeActionConfigModal();
                hasUnsavedChanges = true;
                saveCurrentConfiguration(false);
            }
        });
    }

    if (btnAddAction) {
        btnAddAction.addEventListener('click', addNewActionRow);
    }

    // Sistema de criação de configuração por Name + URL
    let tempConfigName = '';

    if (configNameInput) {
        configNameInput.addEventListener('blur', function() {
            const nameValue = configNameInput.value.trim();
            if (activeOptionsSession !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
                return;
            }
            if (nameValue || activeConfigId) {
                const ensuredConfig = ensureActiveClickFillConfig();
                if (ensuredConfig) {
                    hasUnsavedChanges = true;
                    saveCurrentConfiguration(true);
                    tempConfigName = '';
                    return;
                }
                tempConfigName = nameValue;
            }
        });
    }

    if (configUrlInput) {
        configUrlInput.addEventListener('blur', function() {
            const urlValue = configUrlInput.value.trim();
            const nameValue = configNameInput.value.trim();

            if (activeOptionsSession !== ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
                return;
            }
            
            if (urlValue || nameValue || activeConfigId) {
                const ensuredConfig = ensureActiveClickFillConfig();
                if (ensuredConfig) {
                    hasUnsavedChanges = true;
                    saveCurrentConfiguration(true);
                    tempConfigName = '';
                    return;
                }
                // Criar configuração permanente
                if (activeConfigId && hasUnsavedChanges) {
                    saveCurrentConfiguration(true);
                }

                const newConfigId = Date.now().toString();
                
                const newConfigData = {
                    id: newConfigId,
                    name: nameValue,
                    url: urlValue,
                    initWait: initWaitInput.value || '0',
                    actions: [],
                    color: DEFAULT_CONFIG_COLOR,
                    applyColorToSession: false
                };
                configurations.push(newConfigData);

                const newConfigItem = configListItemTemplate.content.cloneNode(true);
                const configItemDiv = newConfigItem.querySelector('.config-list-item');
                
                configItemDiv.querySelector('.item-name').textContent = nameValue;
                configItemDiv.querySelector('.item-url').textContent = urlValue;
                configItemDiv.dataset.configId = newConfigId;
                configItemDiv.dataset.initWait = newConfigData.initWait;
                applyConfigColorStyle(configItemDiv, newConfigData.color);

                configList.appendChild(configItemDiv);
                addEventListenersToConfigItem(configItemDiv);

                setActiveConfig(configItemDiv);
                
                // Limpar estado temporário
                tempConfigName = '';
                
                console.log(`Configuração "${nameValue}" criada com URL: ${urlValue}`);
            }
        });
    }

    if (moreOptionsBtn) {
        moreOptionsBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            bulkActionsMenu.classList.toggle('show');
        });
    }

    document.addEventListener('click', function(event) {
        if (bulkActionsMenu && !bulkActionsMenu.contains(event.target) && bulkActionsMenu.classList.contains('show')) {
            bulkActionsMenu.classList.remove('show');
        }
    });

    if (bulkExportBtn) {
        bulkExportBtn.addEventListener('click', exportAllConfigurations);
    }

    if (bulkImportBtn) {
        bulkImportBtn.addEventListener('click', importConfigurations);
    }

if (bulkRemoveActiveBtn) {
    let isProcessing = false;
    bulkRemoveActiveBtn.addEventListener('click', function() {
        if (isProcessing) return;
        isProcessing = true;

        if (!Array.isArray(configurations) || configurations.length === 0) {
            const msg = currentUiLanguage === 'en'
                ? 'No configurations to remove.'
                : 'Nenhuma configuração para remover.';
            showTemporaryMessage(msg, 'error');
            bulkActionsMenu.classList.remove('show');
            isProcessing = false;
            return;
        }

        // Remove ALL configurations (with confirmation).
        deleteAllConfigurations();

        bulkActionsMenu.classList.remove('show');
        setTimeout(() => { isProcessing = false; }, 1000);
    });
}

    function exportOcrRules() {
        if (!ocrRules.length) {
            showTemporaryMessage('No OCR captures to export.', 'error');
            return;
        }
        const blob = new Blob([JSON.stringify(ocrRules, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ocr_captures.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showTemporaryMessage('OCR captures exported.', 'success');
    }

    async function importOcrRules() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.addEventListener('change', async () => {
                try {
                    const file = input.files && input.files[0];
                    if (!file) return;
                    const imported = JSON.parse(await file.text());
                    if (!Array.isArray(imported)) {
                        throw new Error('Invalid OCR capture file.');
                    }
                    ocrRules = imported.map((rule, index) => normalizeOcrRule(rule, index + 1));
                    persistOcrRules(() => showTemporaryMessage('OCR captures imported.', 'success'));
                } catch (error) {
                    console.error('Error importing OCR captures:', error);
                    showTemporaryMessage('Error importing OCR captures.', 'error');
                }
            }, { once: true });
            input.click();
        } catch (error) {
            console.error('Error importing OCR captures:', error);
            showTemporaryMessage('Error importing OCR captures.', 'error');
        }
    }

    if (importConfigIconBtn) {
        importConfigIconBtn.addEventListener('click', () => {
            if (activeOptionsSession === 'userscript') {
                importIndependentUserScript().catch((error) => {
                    if (error && error.name !== 'AbortError') {
                        console.error('Error importing UserScript:', error);
                        showTemporaryMessage('Error importing UserScript.', 'error');
                    }
                });
                return;
            }
            if (activeOptionsSession === 'ocr') {
                importOcrRules();
                return;
            }
            importConfigurations();
        });
    }

    if (exportConfigIconBtn) {
        exportConfigIconBtn.addEventListener('click', () => {
            if (activeOptionsSession === 'userscript') {
                exportIndependentUserScript();
                return;
            }
            if (activeOptionsSession === 'ocr') {
                exportOcrRules();
                return;
            }
            exportActiveConfiguration();
        });
    }

    renderConfigColorPalette();

    if (configColorIconBtn) {
        configColorIconBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleConfigColorPalette();
        });
    }

    document.addEventListener('click', (event) => {
        if (!configColorPalette || configColorPalette.hidden) return;
        if (event.target.closest('.config-color-picker')) return;
        closeConfigColorPalette();
    });

    [configNameInput, configUrlInput, initWaitInput].forEach(input => {
        input.addEventListener('input', () => {
            if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
                scheduleOcrSettingsSave();
                return;
            }
            if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
                hasUnsavedChanges = true;
            }
        });
        input.addEventListener('change', () => {
            if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
                persistOcrSettings(null, { showMessage: true });
                return;
            }
            if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_CLICK_FILL) {
                hasUnsavedChanges = true;
            }
        });
    });

    document.addEventListener('pointerdown', (event) => {
        if (event.target.closest('#xpath-actions-container, .btn-add-action, #actionConfigModal')) {
            lastClickFillActionPointerAt = Date.now();
        }
        if (event.target.closest('#ocrRulesList')) {
            lastOcrRuleInteractionAt = Date.now();
        }
        if (event.target.closest('#userscript-tab')) {
            lastUserScriptInteractionAt = Date.now();
        }
    }, true);

    document.addEventListener('click', function(event) {
        const isClickInsideModal = actionConfigModal && actionConfigModal.contains(event.target) && actionConfigModal.style.display === 'block';
        const interactiveSelector = [
            'input',
            'textarea',
            'select',
            'button',
            'label',
            '.icon-btn',
            'a',
            '[contenteditable="true"]',
            '.edit-action-menu',
            '.mode-toggle-group',
            '.radio-pill-group',
            '.feedback-option',
            '.blacklist-chip-layout',
            '.config-color-picker',
            '.session-config-list-item'
        ].join(',');
        const isInteractiveElement = Boolean(event.target.closest(interactiveSelector));
        const isClickInsideConfigArea = event.target.closest('.config-details') || event.target.closest('.config-sidebar');
        
        if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_CLICK_FILL && hasUnsavedChanges && !isClickInsideModal && !isInteractiveElement && isClickInsideConfigArea) {
            console.log("Click outside interactive elements in configuration area, triggering auto-save.");
            saveCurrentConfiguration(true);
        }
    }, true);

    window.addEventListener('beforeunload', () => {
        if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_OCR) {
            persistOcrSettings(null, { setActiveMode: false });
            return;
        }
        if (activeOptionsSession === ACTIVE_AUTOMATION_MODE_CLICK_FILL && hasUnsavedChanges && activeConfigId) {
            saveCurrentConfiguration(false);
        }
    });

    const settingsBtn = document.getElementById('settingsGearBtn');
    const settingsPopup = document.getElementById('settingsPopup');
    const closeBtn = document.getElementById('closeSettingsPopup');
    const isDesktopSettingsDock = () => window.matchMedia('(min-width: 1024px)').matches;

    settingsBtn.addEventListener('click', () => {
        if (isDesktopSettingsDock()) {
            settingsPopup.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            return;
        }
        settingsPopup.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        if (isDesktopSettingsDock()) return;
        settingsPopup.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (isDesktopSettingsDock()) return;
        if (e.target === settingsPopup) {
            settingsPopup.style.display = 'none';
        }
    });

    const configModeSelect = document.getElementById('configMode');
    const securitySection = document.getElementById('securitySection');

    function toggleSecuritySection(modeValue) {
        const mode = modeValue || (configModeSelect ? configModeSelect.value : 'beginner');
        if (securitySection) {
            securitySection.style.display = mode === 'advanced' ? 'block' : 'none';
        }
    }

    configModeSelect.addEventListener('change', toggleSecuritySection);
    toggleSecuritySection();

initBlacklistChipEditors();

acfhStorage.get(SETTINGS_STORAGE_KEYS, (data) => {
    const settings = normalizeSettings(data);
    mirrorSettingsToLocalStorage(settings);
    applySettingsToUi(settings);
    toggleScriptEditorButton();
});


function updateScriptEditorButtonVisibilityLegacy() {
    acfhStorage.get(['configMode', 'contentScriptApi', 'sandboxMode'], (data) => {
        const configMode = data.configMode || 'beginner';
        const contentScriptApi = data.contentScriptApi || 'dynamicUserScriptApi';
        const sandboxMode = data.sandboxMode || 'default';
        const scriptEditorIconBtn = document.getElementById('scriptEditorIconBtn');
        
        // Condições exatas da primeira imagem (valores salvos no storage)
        const isVisible = configMode === 'advanced' &&  // Valor interno para 'Avançado'
                          contentScriptApi === 'userScriptApi' &&  // Valor interno para 'APIs dos UserScripts'
                          sandboxMode === 'forceDOM';  // Valor interno para 'Forçar o DOM'

        console.log('Debug visibilidade:', { configMode, contentScriptApi, sandboxMode, isVisible });

        if (scriptEditorIconBtn) {
            // Salva o estado no storage para persistir após reload
            acfhStorage.set({ scriptEditorVisibility: isVisible });
            
            // Aplica visibilidade
            if (isVisible) {
                scriptEditorIconBtn.style.display = 'flex';
                scriptEditorIconBtn.classList.add('visible');
            } else {
                scriptEditorIconBtn.style.display = 'none';
                scriptEditorIconBtn.classList.remove('visible');
            }
        }
    });
}

function updateScriptEditorButtonVisibility(settingsOverride = null) {
    const applyVisibility = (settingsData) => {
        const settings = normalizeSettings(settingsData || {});
        const isVisible = settings.configMode === 'advanced' &&
            settings.contentScriptApi === 'userScriptApi' &&
            settings.sandboxMode === 'forceDOM';
        const scriptEditorIconBtn = document.getElementById('scriptEditorIconBtn');

        if (scriptEditorIconBtn) {
            scriptEditorIconBtn.style.display = isVisible ? 'flex' : 'none';
            scriptEditorIconBtn.classList.toggle('visible', isVisible);
        }

        acfhStorage.set({ scriptEditorVisibility: isVisible });
    };

    if (settingsOverride) {
        applyVisibility(settingsOverride);
        return;
    }

    acfhStorage.get(['configMode', 'contentScriptApi', 'sandboxMode'], applyVisibility);
}

function persistSettingsLegacy() {
    const uiLanguage = currentUiLanguage || (document.documentElement && document.documentElement.lang) || 'en';
    const configMode = document.getElementById('configMode').value;
    const contentScriptApi = document.getElementById('contentScriptApi').value;
    const sandboxMode = document.getElementById('sandboxMode').value;
    const blacklistText = document.getElementById('blacklistSites').value;
    const blacklist = blacklistText.split('\n').map(s => s.trim()).filter(s => s);
    const feedbackMode = document.querySelector('input[name="feedbackMode"]:checked')?.value || 'none';
    const settingsPayload = {
        configMode,
        contentScriptApi,
        sandboxMode,
        blacklist,
        uiLanguage,
        acfhPreferredLanguage: uiLanguage,
        feedbackMode
    };

    try {
        Object.entries(settingsPayload).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
        });
    } catch (e) {
        console.warn('Failed to mirror settings to localStorage:', e);
    }

    acfhStorage.set(settingsPayload, () => {
        console.log('Configurações salvas. Valores:', { uiLanguage, configMode, contentScriptApi, sandboxMode });
        showTemporaryMessage(translations.configSaved);
        if (!isDesktopSettingsDock()) {
            document.getElementById('settingsPopup').style.display = 'none';
        }
        
        toggleMutationObserveOption();
        updateScriptEditorButtonVisibility();  // Atualiza visibilidade após salvar

        if (configMode !== 'advanced' || sandboxMode !== 'forceDOM') {
            const actionRows = document.querySelectorAll('.xpath-action-row');
            let changesMade = false;
            actionRows.forEach(row => {
                if (row.getAttribute('data-action-mode') === 'mutationObserve') {
                    row.setAttribute('data-action-mode', 'default');
                    const intervalCol = row.querySelector('.col-interval-ms');
                    const repeatCol = row.querySelector('.col-repeat');
                    if (intervalCol) intervalCol.style.display = '';
                    if (repeatCol) repeatCol.style.display = '';
                    changesMade = true;
                }
            });
            if (changesMade) {
                hasUnsavedChanges = true;
                saveCurrentConfiguration(false);
                const msg = currentUiLanguage === 'en'
                    ? 'Mutation Observe disabled. Affected actions reverted to Default mode.'
                    : 'Mutation Observe desabilitado. Ações afetadas voltaram para o modo Padrão.';
                showTemporaryMessage(msg, 'warning');
            }
        }

        chrome.runtime.sendMessage({
            action: "feedbackModeChanged",
            feedbackMode: feedbackMode
        }, () => {
            console.log("Feedback mode change propagated to content scripts after saving settings.");
        });

        applyInterfaceLanguage(uiLanguage);
    });
}

function toggleMutationObserveOption(settingsOverride = null) {
    const settings = settingsOverride ? normalizeSettings(settingsOverride) : readSettingsFromUi();
    const mutationObserveRadio = document.getElementById('mutationObserveMode');
    if (!mutationObserveRadio) return;

    const isEnabled = settings.configMode === 'advanced' && settings.sandboxMode === 'forceDOM';
    mutationObserveRadio.disabled = !isEnabled;
    if (!isEnabled && mutationObserveRadio.checked) {
        const defaultMode = document.getElementById('defaultMode');
        if (defaultMode) defaultMode.checked = true;
        if (currentEditingActionRow) {
            currentEditingActionRow.setAttribute('data-action-mode', 'default');
            const intervalCol = currentEditingActionRow.querySelector('.col-interval-ms');
            const repeatCol = currentEditingActionRow.querySelector('.col-repeat');
            if (intervalCol) intervalCol.style.display = '';
            if (repeatCol) repeatCol.style.display = '';
            hasUnsavedChanges = true;
            saveCurrentConfiguration(false);
        }
    }
}

function persistSettings(options = {}) {
    saveSettingsRealtime({
        showMessage: options.showMessage !== false,
        showMutationWarning: options.showMutationWarning !== false
    });
}

const settingsAutosaveSelectors = [
    document.getElementById('configMode'),
    document.getElementById('contentScriptApi'),
    document.getElementById('sandboxMode'),
    document.getElementById('userScriptSandboxMode'),
    document.getElementById('userScriptEditorEnabled'),
    document.getElementById('userScriptEditorTheme'),
    document.getElementById('userScriptEditorFontSize'),
    document.getElementById('userScriptEditorKeyMap'),
    document.getElementById('userScriptEditorIndentUnit'),
    document.getElementById('userScriptEditorTabSize'),
    document.getElementById('userScriptEditorIndentWith'),
    document.getElementById('userScriptEditorTabMode'),
    document.getElementById('userScriptEditorLineWrapping'),
    document.getElementById('userScriptEditorMatchBrackets'),
    document.getElementById('userScriptEditorAutoIndent'),
    document.getElementById('userScriptEditorSelectionMatch'),
    document.getElementById('userScriptEditorSaveOnBlur'),
    document.getElementById('userScriptEditorSuppressSaveDialog'),
    document.getElementById('userScriptEditorHighlightWhitespace'),
    document.getElementById('userScriptEditorTrimTrailingWhitespace'),
    document.getElementById('userScriptEditorAutoSyntaxCheck'),
    document.getElementById('userScriptEditorSyntaxCheckMaxSize'),
    document.getElementById('userScriptInjectionTiming'),
    document.getElementById('ocrInjectionTiming'),
    document.getElementById('feedbackNone'),
    document.getElementById('feedbackFloatbox')
].filter(Boolean);

settingsAutosaveSelectors.forEach((element) => {
    element.addEventListener('change', persistSettings);
});

let blacklistAutosaveTimer = null;
const blacklistSitesInput = document.getElementById('blacklistSites');
const userScriptBlacklistSitesInput = document.getElementById('userScriptBlacklistSites');
[blacklistSitesInput, userScriptBlacklistSitesInput].filter(Boolean).forEach((input) => {
    input.addEventListener('input', () => {
        clearTimeout(blacklistAutosaveTimer);
        blacklistAutosaveTimer = setTimeout(() => {
            persistSettings();
        }, 350);
    });
});

window.addEventListener('acfh-language-change', (event) => {
    const nextLang = event && event.detail ? event.detail.lang : null;
    if (nextLang) {
        applyInterfaceLanguage(nextLang);
    }
});

    function startOptionsApp() {
        if (acfhOptionsInitialized) {
            return;
        }
        acfhOptionsInitialized = true;
        hideProcessingOverlay();
        actionConfigModal.style.display = 'none';
        initOptionsSessions();
        initUserScriptEditorMenu();
        initOcrControls();
        loadUserScriptsFromStorage();
        loadOcrSettingsFromStorage();
        loadOcrRulesFromStorage();
        loadConfigurationsFromStorage();
        hasUnsavedChanges = false;
        saveNotification.classList.remove('show');
        handleSearchSelection();
        maybeShowReviewReminder();
        updateScriptEditorButtonVisibility();  // Inicializa visibilidade na carga da página
    }

    if (isChromeExtensionEnv) {
        startOptionsApp();
    }
});
