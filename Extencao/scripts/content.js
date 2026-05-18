(function () {
    'use strict';


    // Traduções fornecidas
    const translationsEn = {
        initialWaitLabel: "Initial Wait:",
        floatingBoxWaiting: "%time%",
        floatingBoxWaitingElements: "Waiting for elements...",
        floatingBoxXpathClick: "Actions: %count%",
        floatingBoxXpathFinished: "Completed",
        floatingBoxAllFinished: "All tasks completed!",
        reloadPageMessage: "Page will be reloaded for reinjection.",
        configSaved: "Configuration saved!",
        addXpathAlert: "Add at least one XPath.",
        xpathLabel: "XP",
        clickLabel: "Actions",
        intervalLabel: "Interval:",
        elementsLabel: "Elements",
        xpathWaitLabel: "XP Wait:",
        floatingBoxXPathInvalid: "Invalid XPath or CSS selector",
        floatingBoxAllXpathsInvalid: "All selectors are invalid",
    };

    const translationsByLang = {
        en: translationsEn,
        pt: {
            initialWaitLabel: "Atraso inicial:",
            floatingBoxWaiting: "%time%",
            floatingBoxWaitingElements: "Aguardando elementos...",
            floatingBoxXpathClick: "Acoes: %count%",
            floatingBoxXpathFinished: "Concluido",
            floatingBoxAllFinished: "Todas as tarefas foram concluidas!",
            reloadPageMessage: "A pagina sera recarregada para reinjecao.",
            configSaved: "Configuracao salva!",
            addXpathAlert: "Adicione pelo menos um XPath.",
            xpathLabel: "XP",
            clickLabel: "Acoes",
            intervalLabel: "Intervalo:",
            elementsLabel: "Elementos",
            xpathWaitLabel: "Espera XP:",
            floatingBoxXPathInvalid: "XPath ou seletor CSS invalido",
            floatingBoxAllXpathsInvalid: "Todos os seletores sao invalidos",
        },
        es: {
            initialWaitLabel: "Retraso inicial:",
            floatingBoxWaiting: "%time%",
            floatingBoxWaitingElements: "Esperando elementos...",
            floatingBoxXpathClick: "Acciones: %count%",
            floatingBoxXpathFinished: "Completado",
            floatingBoxAllFinished: "Todas las tareas se completaron!",
            reloadPageMessage: "La pagina se recargara para reinyectar.",
            configSaved: "Configuracion guardada!",
            addXpathAlert: "Anade al menos un XPath.",
            xpathLabel: "XP",
            clickLabel: "Acciones",
            intervalLabel: "Intervalo:",
            elementsLabel: "Elementos",
            xpathWaitLabel: "Espera XP:",
            floatingBoxXPathInvalid: "XPath o selector CSS invalido",
            floatingBoxAllXpathsInvalid: "Todos los selectores son invalidos",
        },
        fr: {
            initialWaitLabel: "Delai initial :",
            floatingBoxWaiting: "%time%",
            floatingBoxWaitingElements: "En attente des elements...",
            floatingBoxXpathClick: "Actions : %count%",
            floatingBoxXpathFinished: "Termine",
            floatingBoxAllFinished: "Toutes les taches sont terminees !",
            reloadPageMessage: "La page sera rechargee pour reinjection.",
            configSaved: "Configuration enregistree !",
            addXpathAlert: "Ajoutez au moins un XPath.",
            xpathLabel: "XP",
            clickLabel: "Actions",
            intervalLabel: "Intervalle :",
            elementsLabel: "Elements",
            xpathWaitLabel: "Attente XP :",
            floatingBoxXPathInvalid: "XPath ou selecteur CSS invalide",
            floatingBoxAllXpathsInvalid: "Tous les selecteurs sont invalides",
        }
    };
    let uiLanguage = 'en';
    let translations = translationsEn;

    function setContentLanguage(lang) {
        const short = String(lang || '').toLowerCase().split('-')[0];
        uiLanguage = translationsByLang[short] ? short : 'en';
        translations = translationsByLang[uiLanguage] || translationsEn;
    }

    // SVGs fornecidos
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
    };

    let autoClickerIntervalId = null;
    let automationStartTimeoutId = null;
    let automationRunToken = 0;
    let globalActionType = "copyOption";
    let floatBox = null;
    let segmentsContainer;
    let xpathSegment;
    let clickSegment;
    let mainMessageSegment;
    let statusIconSegment;
    let countdownTimeSegment;
    let currentFloatBoxStatus = "initial";
    let lastFloatBoxMessageKey = "";
    let countdownIntervalId;
    let feedbackMode = 'none';

    chrome.storage.local.get(['uiLanguage', 'acfhPreferredLanguage'], (data) => {
        setContentLanguage(data.uiLanguage || data.acfhPreferredLanguage || 'en');
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.uiLanguage || changes.acfhPreferredLanguage)) {
            const next = (changes.uiLanguage && changes.uiLanguage.newValue) ||
                (changes.acfhPreferredLanguage && changes.acfhPreferredLanguage.newValue) ||
                'en';
            setContentLanguage(next);
        }
    });

    // Função para preencher elementos
    async function fillElementIfNeeded(element, fillValue, fillOption) {
        if (!element || !fillValue) {
            console.warn("[fillElementIfNeeded] Element or fill value missing.");
            return false;
        }

        const tagName = element.tagName.toLowerCase();
        const isInputOrTextArea = (tagName === 'input' || tagName === 'textarea');
        const isContentEditable = element.isContentEditable;

        if (!isInputOrTextArea && !isContentEditable) {
            console.warn(`[fillElementIfNeeded] Element is not input, textarea or editable. Tag: ${tagName}`);
            return false;
        }

        if (fillOption === 'typeOption') {
            if (isInputOrTextArea) {
                element.value = '';
            } else if (isContentEditable) {
                element.textContent = '';
            }

            for (let i = 0; i < fillValue.length; i++) {
                const char = fillValue[i];
                if (isInputOrTextArea) {
                    element.value += char;
                } else if (isContentEditable) {
                    element.textContent += char;
                }

                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new KeyboardEvent('keydown', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, composed: true }));
                element.dispatchEvent(new KeyboardEvent('keypress', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, composed: true }));
                element.dispatchEvent(new KeyboardEvent('keyup', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true, composed: true }));

                await new Promise(resolve => setTimeout(resolve, 80));
            }
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        } else if (fillOption === 'copyOption') {
            if (isInputOrTextArea) {
                element.value = fillValue;
            } else if (isContentEditable) {
                element.textContent = fillValue;
            }
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        } else {
            console.warn(`[fillElementIfNeeded] Unknown fill option: "${fillOption}".`);
            return false;
        }
    }

    // Função para formatar tempo
    function formatTime(ms) {
        if (ms === 0) return "0s";
        if (ms < 1000) return `${ms} ms`;
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours} h ${(minutes % 60)} min`;
        if (minutes > 0) return `${minutes} min ${(seconds % 60)} s`;
        return `${seconds} s`;
    }

    // Função para gerar XPath
    function generateXPath(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        const parts = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 1;
            let sibling = element.previousSibling;
            while (sibling) {
                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            const tagName = element.nodeName.toLowerCase();
            const part = (index > 1) ? `${tagName}[${index}]` : tagName;
            parts.unshift(part);
            element = element.parentNode;
        }
        return `/${parts.join("/")}`;
    }

    // Função para gerar seletor CSS
    function getCSSSelector(element) {
        if (!(element instanceof Element)) return '';
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let selector = element.nodeName.toLowerCase();
            if (element.id) {
                selector = `#${element.id}`;
                path.unshift(selector);
                break;
            } else {
                let sibling = element;
                let nth = 1;
                while (sibling.previousElementSibling) {
                    sibling = sibling.previousElementSibling;
                    if (sibling.nodeName.toLowerCase() === selector) nth++;
                }
                if (nth > 1) {
                    selector += `:nth-child(${nth})`;
                }
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    // Função para criar o floatBox
    function createFloatBox() {
        if (floatBox || feedbackMode !== 'floatbox') return;

        floatBox = document.createElement("div");
        floatBox.style.position = "fixed";
        floatBox.style.bottom = "0";
        floatBox.style.right = "0";
        floatBox.style.background = "#2a2a2a";
        floatBox.style.color = "#fff";
        floatBox.style.padding = "4px";
        floatBox.style.zIndex = "999999";
        floatBox.style.borderRadius = "8px";
        floatBox.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.4)";
        floatBox.style.fontFamily = "'Segoe UI', sans-serif";
        floatBox.style.display = "flex";
        floatBox.style.alignItems = "stretch";
        floatBox.style.animation = "floatFadeIn 0.4s ease-out";
        floatBox.style.fontSize = "13px";

        const styleSheet = document.createElement('style');
        styleSheet.innerHTML = `
            @keyframes floatFadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes floatFadeOut {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(20px); }
            }
        `;
        document.head.appendChild(styleSheet);

        segmentsContainer = document.createElement("div");
        segmentsContainer.style.display = "flex";
        segmentsContainer.style.gap = "2px";
        floatBox.appendChild(segmentsContainer);

        document.body.appendChild(floatBox);

        function createSegment(bgColor, textColor = '#fff', borderRadius = '6px') {
            const segment = document.createElement("div");
            segment.style.background = bgColor;
            segment.style.color = textColor;
            segment.style.padding = "6px 10px";
            segment.style.borderRadius = borderRadius;
            segment.style.display = "flex";
            segment.style.alignItems = "center";
            segment.style.justifyContent = "center";
            segment.style.gap = "4px";
            segment.style.whiteSpace = "nowrap";
            return segment;
        }

        xpathSegment = createSegment("#444");
        clickSegment = createSegment("#444");
        mainMessageSegment = createSegment("#555");
        statusIconSegment = createSegment("#555");
        countdownTimeSegment = createSegment("#444");

        segmentsContainer.appendChild(xpathSegment);
        segmentsContainer.appendChild(clickSegment);
        segmentsContainer.appendChild(mainMessageSegment);
        segmentsContainer.appendChild(statusIconSegment);
        segmentsContainer.appendChild(countdownTimeSegment);
    }

    // Função para remover o floatBox
    function removeFloatBox() {
        if (floatBox) {
            floatBox.style.animation = "floatFadeOut 0.4s ease-out";
            setTimeout(() => {
                floatBox.remove();
                floatBox = null;
                segmentsContainer = null;
                xpathSegment = null;
                clickSegment = null;
                mainMessageSegment = null;
                statusIconSegment = null;
                countdownTimeSegment = null;
            }, 400);
        }
    }

    // Função para atualizar o floatBox
    function updateFloatBox(messageKey, ...args) {
        if (feedbackMode !== 'floatbox') {
            return;
        }

        createFloatBox();

        lastFloatBoxMessageKey = messageKey;

        let currentMessage = translations[messageKey];
        let iconHtml = '';
        let xpathIndex = '';
        let clickCount = '';
        let intervalValue = '';

        if (messageKey !== "floatingBoxWaiting" && countdownIntervalId) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
        }

        xpathSegment.style.background = "#444";
        clickSegment.style.background = "#444";
        mainMessageSegment.style.background = "#555";
        statusIconSegment.style.background = "#555";
        countdownTimeSegment.style.background = "#444";

        xpathSegment.innerHTML = '';
        clickSegment.innerHTML = '';
        mainMessageSegment.innerHTML = '';
        statusIconSegment.innerHTML = '';
        countdownTimeSegment.innerHTML = `<span style="color:#fff;">0s</span>`;

        if (args.length > 0) {
            currentMessage = currentMessage.replace(/%(\w+)%/g, (match, key) => {
                if (key === 'time') return formatTime(args[0]);
                if (key === 'count') return args[0];
                return match;
            });
        }

        if (messageKey === "floatingBoxWaiting") {
            const initialWaitMs = args[0];
            mainMessageSegment.innerHTML = `<span style="color:#fff;">${translations.initialWaitLabel}</span>`;
            iconHtml = svgs.waitingTime;
            statusIconSegment.style.background = "#2a2a2a";
            countdownTimeSegment.style.background = "#555";

            let remainingTime = initialWaitMs;
            countdownTimeSegment.innerHTML = `<span style="color:#fff;">${formatTime(remainingTime)}</span>`;

            if (remainingTime > 0) {
                countdownIntervalId = setInterval(() => {
                    remainingTime -= 1000;
                    if (remainingTime <= 0) {
                        clearInterval(countdownIntervalId);
                        countdownIntervalId = null;
                        countdownTimeSegment.innerHTML = `<span style="color:#fff;">0s</span>`;
                    } else {
                        countdownTimeSegment.innerHTML = `<span style="color:#fff;">${formatTime(remainingTime)}</span>`;
                    }
                }, 1000);
            } else {
                countdownTimeSegment.innerHTML = `<span style="color:#fff;">0s</span>`;
            }
        } else if (messageKey === "floatingBoxWaitingElements") {
            mainMessageSegment.innerHTML = `<span style="color:#fff;">${currentMessage}</span>`;
            iconHtml = svgs.waitingElements;
            statusIconSegment.style.background = "#2a2a2a";
            mainMessageSegment.style.background = "#555";
        } else if (messageKey === "floatingBoxXpathClick") {
            xpathIndex = `${args[0] + 1}`;
            clickCount = `${args[1]}`;
            intervalValue = args[3] ? formatTime(args[2]) : '';

            mainMessageSegment.innerHTML = args[3] ? `<span style="color:#fff;">${translations.intervalLabel}</span><span style="color:#fff; font-weight: bold;">${intervalValue}</span>` : `<span style="color:#fff;">Observing DOM</span>`;
            iconHtml = svgs.xpathClick;
            statusIconSegment.style.background = "#2a2a2a";
            xpathSegment.style.background = "#B30000";
            clickSegment.style.background = "#B30000";
        } else if (messageKey === "floatingBoxAllFinished") {
            mainMessageSegment.innerHTML = `<span style="color:#fff;">${currentMessage}</span>`;
            iconHtml = svgs.allFinished;
            statusIconSegment.style.background = "#2a2a2a";
            mainMessageSegment.style.background = "#4CAF50";
            if (autoClickerIntervalId) {
                clearInterval(autoClickerIntervalId);
                autoClickerIntervalId = null;
            }
        } else if (messageKey === "floatingBoxXPathInvalid" || messageKey === "floatingBoxAllXpathsInvalid") {
            mainMessageSegment.innerHTML = `<span style="color:#fff;">${currentMessage}</span>`;
            iconHtml = svgs.invalidXpath;
            statusIconSegment.style.background = "#FF5722";
            mainMessageSegment.style.background = "#FF5722";
            if (autoClickerIntervalId) {
                clearInterval(autoClickerIntervalId);
                autoClickerIntervalId = null;
            }
        }

        if (xpathIndex) {
            xpathSegment.innerHTML = `<span style="color:#FFF;">${translations.xpathLabel}</span><span style="color:#FFF; font-weight: bold;">${xpathIndex}</span>`;
        }

        if (clickCount) {
            clickSegment.innerHTML = `<span style="color:#FFF;">${translations.clickLabel}</span><span style="color:#FFF; font-weight: bold;">${clickCount}</span>`;
        }

        statusIconSegment.innerHTML = iconHtml;
    }

    let ativos = [];
    let cliquesPorXPath = [];

    function scheduleAutomationStart(delayMs) {
        if (automationStartTimeoutId) {
            clearTimeout(automationStartTimeoutId);
            automationStartTimeoutId = null;
        }

        const runToken = automationRunToken;
        automationStartTimeoutId = setTimeout(() => {
            automationStartTimeoutId = null;
            if (runToken !== automationRunToken) {
                return;
            }
            iniciarAutoClickersIndividuais();
        }, Math.max(0, delayMs || 0));
    }

    // Função para inicializar o auto-clicker da ABA ATUAL.
    // Busca um snapshot de configuração específico desta aba no
    // background, sem depender de qualquer estado global.
    function initializeAutoClicker() {
        chrome.runtime.sendMessage({ action: "getTabConfigSnapshot" }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn("[initializeAutoClicker] Runtime message failed:", chrome.runtime.lastError.message);
                removeFloatBox();
                return;
            }
            if (!response) {
                console.log("[initializeAutoClicker] No response for tab config snapshot.");
                removeFloatBox();
                return;
            }

            feedbackMode = response.feedbackMode || 'none';
            const isEnabled = response.autoClickerEnabled || false;
            const config = response.config;

            if (!config || !isEnabled) {
                console.log("[initializeAutoClicker] Auto-clicker disabled or no config snapshot found for this tab.");
                removeFloatBox();
                return;
            }

            const {
                xpaths,
                waitInit = 0,
                actionType
            } = config;

            globalActionType = actionType || "copyOption";
            ativos = xpaths?.filter(entry => entry.checked && entry.value) || [];

            if (ativos.length === 0) {
                if (feedbackMode === 'floatbox') {
                    updateFloatBox("floatingBoxAllFinished");
                }
                return;
            }

            const initialWaitMs = (parseInt(waitInit, 10) || 0) * 1000;

            if (feedbackMode === 'floatbox') {
                updateFloatBox("floatingBoxWaiting", initialWaitMs);
            }
            scheduleAutomationStart(initialWaitMs);
        });
    }

    // Função para iniciar auto-clickers individuais
    function iniciarAutoClickersIndividuais() {
        cliquesPorXPath = ativos.map((entry, index) => {
            const repetitions = entry.actionMode === 'mutationObserve' ? null : parseInt(entry.repetitions);
            const waitInitXPathMs = parseInt(entry.waitInitModal) * 1000 || 0;
            return {
                entry,
                index,
                count: 0,
                repetitions,
                interval: entry.actionMode === 'mutationObserve' ? null : parseFloat(entry.interval) || 1000,
                isInfinite: entry.actionMode === 'mutationObserve' ? true : repetitions === -2,
                finished: false,
                lastExecutionTime: Date.now(),
                waitInitXPath: waitInitXPathMs,
                readyToExecute: waitInitXPathMs === 0,
                observer: null,
                elementFound: false,
                isTyping: false,
                isCSSSelector: entry.isCSSSelector || false,
                actionMode: entry.actionMode || 'default'
            };
        });

        cliquesPorXPath.forEach(xpathConfig => {
            if (xpathConfig.waitInitXPath > 0) {
                setTimeout(() => {
                    xpathConfig.readyToExecute = true;
                    xpathConfig.lastExecutionTime = Date.now();
                    if (xpathConfig.elementFound && xpathConfig.actionMode === 'mutationObserve') {
                        const callback = window.requestIdleCallback || setTimeout;
                        callback(() => {
                            const doc = document;
                            let elementos;
                            if (xpathConfig.isCSSSelector) {
                                elementos = Array.from(doc.querySelectorAll(xpathConfig.entry.value))
                                    .filter(el => el.offsetParent !== null && !el.dataset.clicado);
                            } else {
                                const result = doc.evaluate(
                                    xpathConfig.entry.value,
                                    doc,
                                    null,
                                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                                    null
                                );
                                elementos = [];
                                for (let i = 0; i < result.snapshotLength; i++) {
                                    const el = result.snapshotItem(i);
                                    if (el.offsetParent !== null && !el.dataset.clicado) {
                                        elementos.push(el);
                                    }
                                }
                            }
                            if (elementos.length > 0) {
                                processarAcoes(elementos, xpathConfig);
                            }
                        });
                    }
                }, xpathConfig.waitInitXPath);
            }
        });

        startMutationObserverForEachXPath();

        if (autoClickerIntervalId) {
            clearInterval(autoClickerIntervalId);
        }
        const hasDefaultMode = cliquesPorXPath.some(c => c.actionMode === 'default');
        if (hasDefaultMode) {
            autoClickerIntervalId = setInterval(executarProximoClique, 100);
        } else {
            autoClickerIntervalId = null;
        }
    }

    // Função para observar mudanças no DOM
    function startMutationObserverForEachXPath() {
        const iframesObservados = new Set();
        let isProcessing = false;

        function dispararClique(el) {
            const rect = el.getBoundingClientRect();
            const eventoClick = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: rect.left + 10,
                clientY: rect.top + 10,
            });
            el.dispatchEvent(eventoClick);
            el.dataset.clicado = 'true';
        }

        async function processarAcoes(elementos, xpathConfig) {
            if (isProcessing) return;
            isProcessing = true;

            for (const el of elementos) {
                if (!xpathConfig.readyToExecute || xpathConfig.isTyping) continue;

                try {
                    let actionTaken = false;
                    if (xpathConfig.entry.fillValue && xpathConfig.entry.fillValue.trim() !== '') {
                        xpathConfig.isTyping = true;
                        const filled = await fillElementIfNeeded(el, xpathConfig.entry.fillValue, globalActionType);
                        xpathConfig.isTyping = false;
                        if (filled) {
                            actionTaken = true;
                            el.dataset.clicado = 'true';
                        }
                    } else if (xpathConfig.entry.checked) {
                        dispararClique(el);
                        actionTaken = true;
                    }

                    if (actionTaken) {
                        xpathConfig.count++;
                        xpathConfig.lastExecutionTime = Date.now();
                        if (feedbackMode === 'floatbox') {
                            updateFloatBox('floatingBoxXpathClick', xpathConfig.index, xpathConfig.count, null, false);
                        }
                    }
                } catch (e) {
                    console.warn(`[processarAcoes] Error processing element #${xpathConfig.index + 1} (${xpathConfig.entry.value}):`, e);
                }
                await new Promise(r => setTimeout(r, 10));
            }

            isProcessing = false;
        }

        function localizarElementos(xpathConfig, doc = document) {
            try {
                let elementos;
                if (xpathConfig.isCSSSelector) {
                    elementos = Array.from(doc.querySelectorAll(xpathConfig.entry.value))
                        .filter(el => el.offsetParent !== null && !el.dataset.clicado);
                } else {
                    const result = doc.evaluate(
                        xpathConfig.entry.value,
                        doc,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    );
                    elementos = [];
                    for (let i = 0; i < result.snapshotLength; i++) {
                        const el = result.snapshotItem(i);
                        if (el.offsetParent !== null && !el.dataset.clicado) {
                            elementos.push(el);
                        }
                    }
                }
                if (elementos.length > 0 && xpathConfig.readyToExecute) {
                    const callback = window.requestIdleCallback || setTimeout;
                    callback(() => processarAcoes(elementos, xpathConfig));
                }
                xpathConfig.elementFound = elementos.length > 0;
            } catch (e) {
                console.error(`[localizarElementos] Error evaluating ${xpathConfig.isCSSSelector ? 'CSS Selector' : 'XPath'} #${xpathConfig.index + 1} (${xpathConfig.entry.value}):`, e);
                xpathConfig.finished = true;
                xpathConfig.elementFound = false;
                if (feedbackMode === 'floatbox') {
                    updateFloatBox('floatingBoxXPathInvalid');
                }
            }
        }

        function observarDOM(doc, xpathConfig, origem = '🟢 Main DOM') {
            if (xpathConfig.finished && xpathConfig.actionMode === 'default' && !xpathConfig.isInfinite) {
                return;
            }

            if (xpathConfig.observer) {
                xpathConfig.observer.disconnect();
            }

            localizarElementos(xpathConfig, doc);

            xpathConfig.observer = new MutationObserver(() => {
                if (xpathConfig.isTyping) return;
                localizarElementos(xpathConfig, doc);
            });

            xpathConfig.observer.observe(doc.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class', 'hidden', 'disabled']
            });

            console.log(`👁️ Observer activated in: ${origem} for ${xpathConfig.isCSSSelector ? 'CSS Selector' : 'XPath'} #${xpathConfig.index + 1}`);
        }

        function tentarObservarIframe() {
            const iframeSelector = ativos.find(entry => entry.iframe)?.iframe || 'iframe';
            const iframe = document.querySelector(iframeSelector);
            if (!iframe) {
                return;
            }
            console.log(`[tentarObservarIframe] Iframe found with src: ${iframe.src}`);
            if (iframe && !iframesObservados.has(iframe)) {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    console.log(`[tentarObservarIframe] Iframe readyState: ${doc?.readyState}`);
                    if (doc && doc.readyState === 'complete') {
                        iframesObservados.add(iframe);
                        cliquesPorXPath.forEach(xpathConfig => {
                            if (xpathConfig.actionMode === 'mutationObserve') {
                                observarDOM(doc, xpathConfig, `🟡 Iframe #${xpathConfig.index + 1}`);
                            }
                        });
                    }
                } catch (e) {
                    console.warn(`[tentarObservarIframe] Could not access iframe:`, e);
                }
            }
        }

        cliquesPorXPath.forEach(xpathConfig => {
            if (xpathConfig.actionMode === 'mutationObserve') {
                observarDOM(document, xpathConfig);
            } else {
                const tryLocateElement = () => {
                    try {
                        let el;
                        if (xpathConfig.isCSSSelector) {
                            el = document.querySelector(xpathConfig.entry.value);
                        } else {
                            el = document.evaluate(
                                xpathConfig.entry.value,
                                document,
                                null,
                                XPathResult.FIRST_ORDERED_NODE_TYPE,
                                null
                            ).singleNodeValue;
                        }
                        if (el && !xpathConfig.elementFound) {
                            xpathConfig.elementFound = true;
                            if (xpathConfig.readyToExecute && !xpathConfig.isTyping) {
                                if (Date.now() - xpathConfig.lastExecutionTime >= xpathConfig.interval) {
                                    executarAcaoImediata(xpathConfig);
                                }
                            }
                        } else if (!el) {
                            xpathConfig.elementFound = false;
                        }
                    } catch (e) {
                        console.error(`[MutationObserver] Error evaluating ${xpathConfig.isCSSSelector ? 'CSS Selector' : 'XPath'} #${xpathConfig.index + 1} (${xpathConfig.entry.value}):`, e);
                        xpathConfig.finished = true;
                        xpathConfig.elementFound = false;
                        if (xpathConfig.observer) {
                            xpathConfig.observer.disconnect();
                            xpathConfig.observer = null;
                        }
                        if (feedbackMode === 'floatbox') {
                            updateFloatBox("floatingBoxXPathInvalid");
                        }
                        console.warn(`[MutationObserver] Invalid ${xpathConfig.isCSSSelector ? 'CSS Selector' : 'XPath'} #${xpathConfig.index + 1}. Observation stopped.`);
                    }
                };

                tryLocateElement();

                xpathConfig.observer = new MutationObserver((mutations, obs) => {
                    if (xpathConfig.isTyping) return;
                    tryLocateElement();
                });

                let observeTarget = document.body;
                if (!xpathConfig.isCSSSelector) {
                    try {
                        const parentXPath = xpathConfig.entry.value.substring(0, xpathConfig.entry.value.lastIndexOf('/'));
                        if (parentXPath) {
                            const parentElement = document.evaluate(
                                parentXPath,
                                document,
                                null,
                                XPathResult.FIRST_ORDERED_NODE_TYPE,
                                null
                            ).singleNodeValue;
                            if (parentElement) {
                                observeTarget = parentElement;
                            }
                        }
                    } catch (e) {
                        console.warn(`[MutationObserver] Could not determine ancestor for XPath #${xpathConfig.index + 1}. Using document.body.`);
                    }
                } else {
                    try {
                        const parentSelector = xpathConfig.entry.value.substring(0, xpathConfig.entry.value.lastIndexOf(' > '));
                        if (parentSelector) {
                            const parentElement = document.querySelector(parentSelector);
                            if (parentElement) {
                                observeTarget = parentElement;
                            }
                        }
                    } catch (e) {
                        console.warn(`[MutationObserver] Could not determine ancestor for CSS selector #${xpathConfig.index + 1}. Using document.body.`);
                    }
                }

                xpathConfig.observer.observe(observeTarget, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['style', 'class', 'hidden', 'disabled']
                });
            }
        });

        if (cliquesPorXPath.some(c => c.actionMode === 'mutationObserve')) {
            const loopIframe = setInterval(() => {
                tentarObservarIframe();
                if (iframesObservados.size > 0 || !document.querySelector('iframe')) {
                    clearInterval(loopIframe);
                }
            }, 250);
        }

        const anyActiveValid = cliquesPorXPath.some(c => !c.finished || c.isInfinite || c.actionMode === 'mutationObserve');
        if (!anyActiveValid) {
            if (feedbackMode === 'floatbox') {
                updateFloatBox("floatingBoxAllXpathsInvalid");
            }
        } else {
            if (feedbackMode === 'floatbox') {
                updateFloatBox("floatingBoxWaitingElements");
            }
        }
    }

    // Função para executar ações imediatas
    async function executarAcaoImediata(xpathConfig) {
        const now = Date.now();
        if (!xpathConfig.readyToExecute || !xpathConfig.elementFound || xpathConfig.isTyping) {
            return false;
        }

        if (xpathConfig.actionMode === 'default' && (now - xpathConfig.lastExecutionTime < xpathConfig.interval)) {
            return false;
        }

        try {
            let el;
            if (xpathConfig.isCSSSelector) {
                el = document.querySelector(xpathConfig.entry.value);
            } else {
                el = document.evaluate(
                    xpathConfig.entry.value,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                ).singleNodeValue;
            }

            if (el) {
                let actionTaken = false;
                if (xpathConfig.entry.fillValue && xpathConfig.entry.fillValue.trim() !== '') {
                    xpathConfig.isTyping = true;
                    const filled = await fillElementIfNeeded(el, xpathConfig.entry.fillValue, globalActionType);
                    xpathConfig.isTyping = false;
                    if (filled) {
                        actionTaken = true;
                        if (xpathConfig.actionMode === 'mutationObserve') {
                            el.dataset.clicado = 'true';
                        }
                    }
                } else if (xpathConfig.entry.checked) {
                    if (xpathConfig.actionMode === 'mutationObserve') {
                        const rect = el.getBoundingClientRect();
                        const eventoClick = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            clientX: rect.left + 10,
                            clientY: rect.top + 10,
                        });
                        el.dispatchEvent(eventoClick);
                        el.dataset.clicado = 'true';
                    } else {
                        el.click();
                    }
                    actionTaken = true;
                }

                if (actionTaken) {
                    xpathConfig.count++;
                    xpathConfig.lastExecutionTime = now;
                    if (feedbackMode === 'floatbox') {
                        updateFloatBox("floatingBoxXpathClick", xpathConfig.index, xpathConfig.count, xpathConfig.interval, xpathConfig.actionMode === 'default');
                    }
                    if (xpathConfig.actionMode === 'default' && !xpathConfig.isInfinite && xpathConfig.count >= xpathConfig.repetitions) {
                        xpathConfig.finished = true;
                        if (xpathConfig.observer) {
                            xpathConfig.observer.disconnect();
                            xpathConfig.observer = null;
                        }
                    }
                    return true;
                }
            } else {
                console.warn(`[executarAcaoImediata] ${xpathConfig.isCSSSelector ? 'CSS Selector' : 'XPath'} #${xpathConfig.index + 1} (${xpathConfig.entry.value}) not found.`);
                xpathConfig.elementFound = false;
                return false;
            }
        } catch (e) {
            console.error(`[executarAcaoImediata] Error processing ${xpathConfig.isCSSSelector ? 'CSS Selector' : 'XPath'} #${xpathConfig.index + 1} (${xpathConfig.entry.value}):`, e);
            xpathConfig.finished = true;
            xpathConfig.elementFound = false;
            if (feedbackMode === 'floatbox') {
                updateFloatBox("floatingBoxXPathInvalid");
            }
            return false;
        }
    }

    // Função para executar o próximo clique
    async function executarProximoClique() {
        const now = Date.now();
        let actionPerformedInThisCycle = false;
        let anyXPathPending = false;

        const xpathsToProcess = cliquesPorXPath.filter(c => c.actionMode === 'default' && (!c.finished || c.isInfinite));

        if (xpathsToProcess.length === 0 && !cliquesPorXPath.some(c => c.actionMode === 'mutationObserve' && !c.finished)) {
            if (feedbackMode === 'floatbox') {
                updateFloatBox("floatingBoxAllFinished");
            }
            if (autoClickerIntervalId) {
                clearInterval(autoClickerIntervalId);
                autoClickerIntervalId = null;
            }
            return;
        }

        for (let i = 0; i < xpathsToProcess.length; i++) {
            const currentXPath = xpathsToProcess[i];

            if (currentXPath.finished && !currentXPath.isInfinite) {
                continue;
            }

            if (currentXPath.isTyping) {
                anyXPathPending = true;
                continue;
            }

            if (currentXPath.readyToExecute && currentXPath.elementFound && (now - currentXPath.lastExecutionTime >= currentXPath.interval)) {
                anyXPathPending = true;
                if (await executarAcaoImediata(currentXPath)) {
                    actionPerformedInThisCycle = true;
                }
            } else {
                anyXPathPending = true;
            }
        }

        const allFinitesDone = cliquesPorXPath.filter(c => c.actionMode === 'default' && !c.isInfinite).every(c => c.finished);
        const anyInfiniteOrMutationRemain = cliquesPorXPath.some(c => (c.isInfinite || c.actionMode === 'mutationObserve') && !c.finished);

        if (allFinitesDone && !anyInfiniteOrMutationRemain) {
            if (feedbackMode === 'floatbox') {
                updateFloatBox("floatingBoxAllFinished");
            }
            if (autoClickerIntervalId) {
                clearInterval(autoClickerIntervalId);
                autoClickerIntervalId = null;
            }
        } else if (!actionPerformedInThisCycle && anyXPathPending) {
            const allElementsFound = xpathsToProcess.every(c => c.elementFound || c.finished || c.isTyping);
            if (!allElementsFound && feedbackMode === 'floatbox') {
                updateFloatBox("floatingBoxWaitingElements");
            }
        }
    }

    // Manipulação de cliques para captura de seletores
    let lastRightClickElement = null;

    document.addEventListener("contextmenu", (event) => {
        const composedTarget = event.composedPath && event.composedPath()[0];
        const target = composedTarget || event.target;
        lastRightClickElement = target && target.nodeType === Node.ELEMENT_NODE
            ? target
            : target?.parentElement || null;
    }, true);

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if ((message.action === "getXPathAtClick" || message.action === "getCSSAtClick") && lastRightClickElement) {
            const xpath = generateXPath(lastRightClickElement);
            const cssSelector = getCSSSelector(lastRightClickElement);
            sendResponse({
                xpath: message.action === "getXPathAtClick" ? xpath : null,
                cssSelector: message.action === "getCSSAtClick" ? cssSelector : null
            });
            lastRightClickElement = null;
            return;
        }

        if (message.action === "reloadConfig") {
            // Para automação atual e recarrega snapshot desta aba
            stopAutomationInternal();
            initializeAutoClicker();
            if (sendResponse) {
                sendResponse({ reloaded: true });
            }
        }
    });

    // Função auxiliar para parar toda a automação atual
    function stopAutomationInternal() {
        automationRunToken++;
        removeFloatBox();
        if (automationStartTimeoutId) {
            clearTimeout(automationStartTimeoutId);
            automationStartTimeoutId = null;
        }
        if (countdownIntervalId) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
        }
        if (autoClickerIntervalId) {
            clearInterval(autoClickerIntervalId);
            autoClickerIntervalId = null;
        }
        cliquesPorXPath.forEach(xpathConfig => {
            if (xpathConfig.observer) {
                xpathConfig.observer.disconnect();
                xpathConfig.observer = null;
            }
        });
        cliquesPorXPath = [];
        ativos = [];
    }

    // Manipulação de mudanças no armazenamento
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;

        // Quando o toggle geral é desligado, para toda automação e remove FloatBox
        if ('autoClickerEnabled' in changes && !changes.autoClickerEnabled.newValue) {
            stopAutomationInternal();
        }

        if ('activeAutomationMode' in changes && changes.activeAutomationMode.newValue !== 'click-fill') {
            stopAutomationInternal();
        }

        // Mudanças em autoClickConfig (por exemplo, editar URL ou ações na página
        // de opções) **não** interrompem a automação atual nesta aba. A nova
        // configuração só será considerada na próxima injeção do script, quando
        // a página for recarregada ou houver nova navegação que case a URL.

        // Quando o modo de feedback muda para "none", atualiza variável local
        // e remove imediatamente qualquer FloatBox visível
        if ('feedbackMode' in changes) {
            feedbackMode = changes.feedbackMode.newValue || 'none';
            if (feedbackMode !== 'floatbox') {
                removeFloatBox();
            }
        }

        if ('blacklist' in changes) {
            const blacklist = Array.isArray(changes.blacklist.newValue) ? changes.blacklist.newValue : [];
            const host = window.location.hostname;
            const blocked = blacklist.some(domain => host === domain || host.endsWith('.' + domain));
            if (blocked) {
                stopAutomationInternal();
            }
        }
    });

    // Inicialização
    initializeAutoClicker();
})();
