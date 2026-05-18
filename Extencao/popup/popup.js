document.addEventListener("DOMContentLoaded", () => {
    const toggleButton = document.getElementById("toggleButton");
    const toggleStatus = document.getElementById("toggleStatus");

    const popupTranslationsEn = {
        on: 'On',
        off: 'Off',
        documentation: 'Documentation',
        settingsTitle: 'Settings'
    };

    const popupTranslations = {
        en: popupTranslationsEn,
        pt: { on: 'Ligado', off: 'Desligado', documentation: 'Documentacao', settingsTitle: 'Configuracoes' },
        es: { on: 'Activado', off: 'Desactivado', documentation: 'Documentacion', settingsTitle: 'Configuracion' },
        fr: { on: 'Active', off: 'Desactive', documentation: 'Documentation', settingsTitle: 'Parametres' },
        de: { on: 'Ein', off: 'Aus', documentation: 'Dokumentation', settingsTitle: 'Einstellungen' },
        it: { on: 'Attivo', off: 'Disattivo', documentation: 'Documentazione', settingsTitle: 'Impostazioni' },
        nl: { on: 'Aan', off: 'Uit', documentation: 'Documentatie', settingsTitle: 'Instellingen' },
        pl: { on: 'Wl.', off: 'Wyl.', documentation: 'Dokumentacja', settingsTitle: 'Ustawienia' },
        ru: { on: 'Vkl', off: 'Vykl', documentation: 'Dokumentatsiya', settingsTitle: 'Nastroyki' },
        zh: { on: 'Kai', off: 'Guan', documentation: 'Wendang', settingsTitle: 'Shezhi' },
        ja: { on: 'On', off: 'Off', documentation: 'Dokyumento', settingsTitle: 'Settei' },
        ko: { on: 'On', off: 'Off', documentation: 'Munsu', settingsTitle: 'Seoljeong' },
        ar: { on: 'On', off: 'Off', documentation: 'Wathaiq', settingsTitle: 'Iidadat' },
        hi: { on: 'On', off: 'Off', documentation: 'Documentation', settingsTitle: 'Settings' }
    };
    let popupLang = 'en';

    function normalizePopupLang(lang) {
        const short = String(lang || '').toLowerCase().split('-')[0];
        return popupTranslations[short] ? short : 'en';
    }

    function getPopupStrings() {
        return popupTranslations[popupLang] || popupTranslationsEn;
    }

    function applyPopupLanguage() {
        document.documentElement.lang = popupLang;
        const strings = getPopupStrings();

        const docLink = document.querySelector('.documentation-link');
        if (docLink) {
            docLink.textContent = strings.documentation;
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.title = strings.settingsTitle;
        }

        document.querySelectorAll('[data-i18n="popupTitle"]').forEach((el) => {
            el.textContent = 'Auto Clicker - FH';
        });

        chrome.storage.local.get(['autoClickerEnabled'], (data) => {
            if (toggleStatus) {
                toggleStatus.textContent = data.autoClickerEnabled ? strings.on : strings.off;
            }
        });
    }

    function loadPopupLanguage(callback) {
        chrome.storage.local.get(['uiLanguage', 'acfhPreferredLanguage'], (data) => {
            popupLang = normalizePopupLang(data.uiLanguage || data.acfhPreferredLanguage || 'en');
            applyPopupLanguage();
            if (typeof callback === 'function') callback();
        });
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.uiLanguage || changes.acfhPreferredLanguage)) {
            const next = (changes.uiLanguage && changes.uiLanguage.newValue) ||
                (changes.acfhPreferredLanguage && changes.acfhPreferredLanguage.newValue) ||
                'en';
            popupLang = normalizePopupLang(next);
            applyPopupLanguage();
        }
    });

    loadPopupLanguage();

    const LOCAL_OPTIONS_URL = "http://127.0.0.1:5500/options.html?src=extension";
    const LOCAL_OPTIONS_URL_ALT = "http://localhost:5500/options.html?src=extension";
    const VERCEL_OPTIONS_URL = "https://uiautotool.vercel.app/options.html?src=extension";
    const LOCAL_OPTIONS_PROBE_URL = "http://127.0.0.1:5500/options.html";
    const LOCAL_OPTIONS_PROBE_URL_ALT = "http://localhost:5500/options.html";
    const PROBE_TIMEOUT_MS = 1200;
    const OPTIONS_URL_PATTERNS = [
        "http://127.0.0.1:5500/options.html*",
        "http://localhost:5500/options.html*",
        "https://uiautotool.vercel.app/options.html*",
        "https://uiautotool.vercel.app/*/options.html*"
    ];

    function probeUrl(url, timeoutMs) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        return fetch(url, {
            method: "GET",
            mode: "no-cors",
            cache: "no-store",
            signal: ctrl.signal
        })
            .then(() => {
                clearTimeout(timer);
                return true;
            })
            .catch(() => {
                clearTimeout(timer);
                return false;
            });
    }

    async function chooseLocalFirstOptionsUrl() {
        if (await probeUrl(LOCAL_OPTIONS_PROBE_URL, PROBE_TIMEOUT_MS)) return LOCAL_OPTIONS_URL;
        if (await probeUrl(LOCAL_OPTIONS_PROBE_URL_ALT, PROBE_TIMEOUT_MS)) return LOCAL_OPTIONS_URL_ALT;
        return VERCEL_OPTIONS_URL;
    }

    async function openOrFocusOptionsTab() {
        return new Promise((resolve) => {
            chrome.tabs.query({ url: OPTIONS_URL_PATTERNS }, async (tabs) => {
                const existing = (tabs && tabs.length) ? tabs[0] : null;
                if (existing && existing.id != null) {
                    chrome.tabs.update(existing.id, { active: true }, () => {
                        chrome.windows.update(existing.windowId, { focused: true });
                        resolve();
                    });
                    return;
                }
                let url = VERCEL_OPTIONS_URL;
                try {
                    url = await chooseLocalFirstOptionsUrl();
                } catch (e) {
                    url = VERCEL_OPTIONS_URL;
                }
                chrome.tabs.create({ url: url }, () => resolve());
            });
        });
    }

    if (toggleButton && toggleStatus) {
        chrome.storage.local.get(["autoClickerEnabled"], (data) => {
            const isEnabled = data.autoClickerEnabled || false;
            const strings = getPopupStrings();
            toggleStatus.textContent = isEnabled ? strings.on : strings.off;
            toggleButton.classList.toggle("on", isEnabled);
        });

        toggleButton.addEventListener("click", () => {
            chrome.storage.local.get(["autoClickerEnabled", "activeAutomationMode", "configurations", "activeConfigId", "independentUserScript"], (data) => {
                const isEnabled = !data.autoClickerEnabled;
                const activeAutomationMode = data.activeAutomationMode === "userscript"
                    ? "userscript"
                    : data.activeAutomationMode === "ocr"
                        ? "ocr"
                        : "click-fill";

                chrome.storage.local.set({ autoClickerEnabled: isEnabled }, () => {
                    const strings = getPopupStrings();
                    toggleStatus.textContent = isEnabled ? strings.on : strings.off;
                    toggleButton.classList.toggle("on", isEnabled);

                    const message = {
                        action: "toggleStateChanged",
                        isEnabled: isEnabled,
                        activeAutomationMode
                    };

                    if (isEnabled && activeAutomationMode === "click-fill" && data.configurations && data.activeConfigId) {
                        const activeConfig = data.configurations.find(cfg => cfg.id == data.activeConfigId);
                        if (activeConfig) {
                            const activeActions = activeConfig.actions.filter(action => !action.disabled);
                            message.config = {
                                iframe: activeConfig.url,
                                waitInit: activeConfig.initWait,
                                actionType: activeActions.some(action => action.fillMethod === 'type') ? 'typeOption' : 'copyOption',
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
                            };
                            message.activeConfigId = data.activeConfigId;
                        } else {
                            console.warn("Configuração ativa não encontrada. Limpando activeConfigId.");
                            chrome.storage.local.set({ activeConfigId: null, autoClickConfig: null });
                        }
                    }

                    chrome.runtime.sendMessage(message, () => {
                        console.log("Mensagem enviada para background.js:", message);
                    });

                    if (!isEnabled) {
                        chrome.runtime.sendMessage({ action: "stopAutomation" }, () => {
                            console.log("Automação parada devido à desativação da extensão.");
                        });
                    }
                });
            });
        });
    }

    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", async () => {
            try {
                await openOrFocusOptionsTab();
            } catch (e) {
                chrome.tabs.create({ url: VERCEL_OPTIONS_URL });
            }
        });
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        sendResponse({ received: true });
        if (msg.action === "configUpdated") {
            chrome.storage.local.get(["autoClickerEnabled", "activeAutomationMode", "configurations", "activeConfigId"], (data) => {
                if (data.activeAutomationMode === "userscript" || data.activeAutomationMode === "ocr") {
                    return;
                }
                if (data.autoClickerEnabled && data.configurations && data.activeConfigId) {
                    const activeConfig = data.configurations.find(cfg => cfg.id == msg.activeConfigId);
                    if (activeConfig) {
                        const activeActions = activeConfig.actions.filter(action => !action.disabled);
                        chrome.runtime.sendMessage({
                            action: "configUpdated",
                            config: {
                                iframe: activeConfig.url,
                                waitInit: activeConfig.initWait,
                                actionType: activeActions.some(action => action.fillMethod === 'type') ? 'typeOption' : 'copyOption',
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
                            },
                            activeConfigId: msg.activeConfigId
                        }, () => {
                            console.log("Configuração atualizada enviada para background.js.");
                        });
                    } else {
                        console.warn("Configuração ativa não encontrada para propagação.");
                        chrome.storage.local.set({ activeConfigId: null, autoClickConfig: null });
                    }
                }
            });
        }
    });
});
