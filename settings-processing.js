// settings-processing.js - Versão expandida
// MOSTRA SPINNER PARA TODAS AS OPÇÕES, mas NOTIFICAÇÃO APENAS para Config Mode
// ADICIONADO: Spinner para ações dentro dos modais também

class SettingsProcessingSimple {
    constructor() {
        this.overlay = null;
        this.timeoutId = null;
        this.init();
    }

    init() {
        this.createOverlay();
        this.setupEventListeners();
        this.setupModalListeners();
    }

    createOverlay() {
        // Remove overlay existente
        const existingOverlay = document.querySelector('.settings-processing-overlay');
        if (existingOverlay) existingOverlay.remove();

        // Cria overlay simples
        this.overlay = document.createElement('div');
        this.overlay.className = 'settings-processing-overlay';
        this.overlay.innerHTML = `
            <div class="settings-processing-spinner"></div>
        `;

        document.body.appendChild(this.overlay);

        if (window.acfhHoldProcessing) {
            this.overlay.style.display = 'flex';
            this.overlay.classList.remove('quick');
        }
    }

    setupEventListeners() {
        // Usa event delegation para capturar mudanças na popup
        document.addEventListener('change', (event) => {
            const target = event.target;
            const settingsPopup = document.getElementById('settingsPopup');
            
            const settingsVisible = settingsPopup && window.getComputedStyle(settingsPopup).display !== 'none';

            // Só processa se o painel de configurações estiver visível
            if (!settingsVisible) {
                return;
            }

            // Verifica se é uma das opções que queremos monitorar
            if (target.id === 'configMode' || 
                target.id === 'contentScriptApi' || 
                target.id === 'sandboxMode' ||
                (target.name === 'feedbackMode' && target.checked)) {
                
                // MOSTRA SPINNER para TODAS as opções
                if (this.shouldSkipSpinner(target)) {
                    return;
                }
                this.showSpinner(target);
                
                // MAS SÓ MOSTRA NOTIFICAÇÃO para Config Mode
                if (target.id === 'configMode') {
                    // Espera o spinner terminar para mostrar notificação
                    setTimeout(() => {
                        this.showNotification(target);
                    }, Math.random() * 500 + 300); // Mesmo tempo do spinner
                }
            }
        });
    }

    setupModalListeners() {
        // Configura listeners para elementos dentro dos modais
        setTimeout(() => {
            this.attachModalActionListeners();
        }, 1000); // Aguarda um pouco para os modais carregarem

        // Observa quando modais abrem/fecham
        this.observeModalChanges();
    }

    observeModalChanges() {
        // Observa mudanças no DOM para detectar quando modais abrem
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (node.classList && 
                                (node.classList.contains('modal') || 
                                 node.classList.contains('script-editor-modal') ||
                                 node.id === 'actionConfigModal')) {
                                // Modal foi aberto, anexa listeners
                                setTimeout(() => {
                                    this.attachModalActionListeners();
                                }, 100);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    shouldSkipSpinner(element) {
        if (!element || !element.closest) {
            return false;
        }

        return Boolean(element.closest([
            '#xpath-actions-container',
            '#ocrRulesList',
            '#actionConfigModal',
            '.btn-add-action',
            '.ocr-rule-card',
            '.ocr-rules-list'
        ].join(',')));
    }

    attachModalActionListeners() {
        // 1. Radio buttons de actionMode (Default/Mutation Observe)
        const actionModeRadios = document.querySelectorAll('input[name="actionMode"]');
        actionModeRadios.forEach(radio => {
            if (!radio.hasAttribute('data-spinner-listener')) {
                radio.addEventListener('change', (e) => {
                    if (this.shouldSkipSpinner(e.target)) return;
                    this.showSpinner(e.target);
                });
                radio.setAttribute('data-spinner-listener', 'true');
            }
        });

        // 2. Radio buttons de fillMethod (Paste/Type) - dentro do modal de ação
        const fillMethodRadios = document.querySelectorAll('input[name="fillMethod"]');
        fillMethodRadios.forEach(radio => {
            if (!radio.hasAttribute('data-spinner-listener')) {
                radio.addEventListener('change', (e) => {
                    if (this.shouldSkipSpinner(e.target)) return;
                    this.showSpinner(e.target);
                });
                radio.setAttribute('data-spinner-listener', 'true');
            }
        });

        // 3. Selects de action-mode (Fill/Click) - nas linhas de ação
        const actionModeSelects = document.querySelectorAll('.action-mode-select');
        actionModeSelects.forEach(select => {
            if (!select.hasAttribute('data-spinner-listener')) {
                select.addEventListener('change', (e) => {
                    if (this.shouldSkipSpinner(e.target)) return;
                    this.showSpinner(e.target);
                });
                select.setAttribute('data-spinner-listener', 'true');
            }
        });

        // 4. Botão Enable/Disable no menu de contexto
        const disableActionOptions = document.querySelectorAll('.disable-action-option');
        disableActionOptions.forEach(option => {
            if (!option.hasAttribute('data-spinner-listener')) {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.shouldSkipSpinner(option)) return;
                    this.showSpinner(option);
                });
                option.setAttribute('data-spinner-listener', 'true');
            }
        });

        // 5. Botão Save no modal
        const saveModalButtons = document.querySelectorAll('.btn-save-modal');
        saveModalButtons.forEach(button => {
            if (!button.hasAttribute('data-spinner-listener')) {
                button.addEventListener('click', (e) => {
                    // Mostra spinner por um pouco mais de tempo para salvar
                    if (this.shouldSkipSpinner(button)) return;
                    this.showSpinner(button, 800, 1500);
                });
                button.setAttribute('data-spinner-listener', 'true');
            }
        });

        // 6. Botões Save na popup principal (Settings)
        const savePopupButtons = document.querySelectorAll('.btn-save-popup');
        savePopupButtons.forEach(button => {
            if (!button.hasAttribute('data-spinner-listener')) {
                button.addEventListener('click', (e) => {
                    // Mostra spinner por um pouco mais de tempo
                    this.showSpinner(button, 800, 1500);
                });
                button.setAttribute('data-spinner-listener', 'true');
            }
        });
    }

    showSpinner(element, minDuration = 300, maxDuration = 800) {
        if (this.shouldSkipSpinner(element)) {
            return;
        }

        // Limpa timeout anterior
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        // Mostra o overlay
        this.overlay.style.display = 'flex';
        this.overlay.classList.add('quick');

        // Tempo aleatório entre minDuration e maxDuration
        const randomDuration = Math.random() * (maxDuration - minDuration) + minDuration;

        // Esconde após o tempo aleatório
        this.timeoutId = setTimeout(() => {
            this.overlay.style.display = 'none';
            this.overlay.classList.remove('quick');
        }, randomDuration);
    }

    showNotification(element) {
        // Remove notificação existente
        const existingNotification = document.querySelector('.settings-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Só mostra notificação para Config Mode
        if (element.id !== 'configMode') {
            return;
        }

        // Obtém informações da opção Config Mode
        let optionName = document.documentElement.lang === 'en' ? 'Config Mode' : 'Modo de configuração';
        let optionValue = '';
        
        if (element.tagName === 'SELECT') {
            optionValue = element.options[element.selectedIndex].text;
        }

        // Cria notificação
        const notification = document.createElement('div');
        notification.className = 'settings-notification';
        notification.innerHTML = `
            <svg class="settings-notification-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="settings-notification-text">
                <strong>${optionName}</strong>
                <span class="settings-notification-value">${optionValue}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Remove após 2 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    // Função para mostrar notificação manualmente se necessário
    showManualNotification(optionName, optionValue) {
        const notification = document.createElement('div');
        notification.className = 'settings-notification';
        notification.innerHTML = `
            <svg class="settings-notification-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="settings-notification-text">
                <strong>${optionName}</strong>
                <span class="settings-notification-value">${optionValue}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }
}

// Inicializa quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    const hasSettingsUi = !!(document.getElementById('settingsPopup') || document.querySelector('.config-content'));
    if (!hasSettingsUi) {
        return;
    }

    window.settingsProcessingSimple = new SettingsProcessingSimple();

    // Ao carregar/atualizar a página, mostra o mesmo "processing"
    // usado nas trocas de modo (iniciante/avançado, default/Mutation Observe)
    if (window.settingsProcessingSimple &&
        typeof window.settingsProcessingSimple.showSpinner === 'function') {
        window.settingsProcessingSimple.showSpinner(null, 400, 900);
    }
});

// Para uso manual
window.showConfigNotification = function(value) {
    const processing = window.settingsProcessingSimple;
    if (processing) {
        processing.showManualNotification('Config Mode', value);
    }
};
