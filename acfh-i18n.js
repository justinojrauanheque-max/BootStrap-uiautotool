(function () {
    'use strict';

    const STORAGE_KEY = 'uiLanguage';
    const DEFAULT_LANG = 'en';
    const LANGUAGES = {
        en: { label: 'English', short: 'EN' },
        pt: { label: 'Portugues', short: 'PT' },
        es: { label: 'Espanol', short: 'ES' },
        fr: { label: 'Francais', short: 'FR' }
    };

    const TEXT = {
        'Docs': { pt: 'Docs', es: 'Docs', fr: 'Docs' },
        'Test': { pt: 'Teste', es: 'Prueba', fr: 'Test' },
        'Privacy policy': { pt: 'Politica de privacidade', es: 'Politica de privacidad', fr: 'Politique de confidentialite' },
        'Extension': { pt: 'Extensao', es: 'Extension', fr: 'Extension' },
        'Download': { pt: 'Baixar', es: 'Descargar', fr: 'Telecharger' },
        'Documentation': { pt: 'Documentacao', es: 'Documentacion', fr: 'Documentation' },
        'Auto Clicker - Form Helper': { pt: 'Auto Clicker - Form Helper', es: 'Auto Clicker - Form Helper', fr: 'Auto Clicker - Form Helper' },
        'Automate clicks and form filling on websites and iframes with simple, fast controls.': {
            pt: 'Automatize cliques e preenchimento de formularios em sites e iframes com controles simples e rapidos.',
            es: 'Automatiza clics y formularios en sitios web e iframes con controles simples y rapidos.',
            fr: 'Automatisez les clics et les formulaires sur les sites et iframes avec des controles simples et rapides.'
        },
        'Fast automation': { pt: 'Automacao rapida', es: 'Automatizacion rapida', fr: 'Automatisation rapide' },
        'Create click actions with interval and repeat': {
            pt: 'Crie acoes de clique com intervalo e repeticao',
            es: 'Crea acciones de clic con intervalo y repeticion',
            fr: 'Creez des actions de clic avec intervalle et repetition'
        },
        'Enable or pause profiles with one click': {
            pt: 'Ative ou pause perfis com um clique',
            es: 'Activa o pausa perfiles con un clic',
            fr: 'Activez ou mettez en pause des profils en un clic'
        },
        'Smart forms': { pt: 'Formularios inteligentes', es: 'Formularios inteligentes', fr: 'Formulaires intelligents' },
        'Fill via XPath or CSS selector': {
            pt: 'Preencha via XPath ou seletor CSS',
            es: 'Rellena con XPath o selector CSS',
            fr: 'Remplissez avec XPath ou selecteur CSS'
        },
        'Works on dynamic pages and iframes': {
            pt: 'Funciona em paginas dinamicas e iframes',
            es: 'Funciona en paginas dinamicas e iframes',
            fr: 'Fonctionne sur pages dynamiques et iframes'
        },
        'Getting started': { pt: 'Primeiros passos', es: 'Primeros pasos', fr: 'Premiers pas' },
        'Installation': { pt: 'Instalacao', es: 'Instalacion', fr: 'Installation' },
        'Create a configuration': { pt: 'Criar configuracao', es: 'Crear una configuracion', fr: 'Creer une configuration' },
        'Capture elements': { pt: 'Capturar elementos', es: 'Capturar elementos', fr: 'Capturer les elements' },
        'Action types': { pt: 'Tipos de acao', es: 'Tipos de accion', fr: 'Types d action' },
        'Interval & repeat': { pt: 'Intervalo e repeticao', es: 'Intervalo y repeticion', fr: 'Intervalle et repetition' },
        'Iframes & dynamic pages': { pt: 'Iframes e paginas dinamicas', es: 'Iframes y paginas dinamicas', fr: 'Iframes et pages dynamiques' },
        'Advanced mode': { pt: 'Modo avancado', es: 'Modo avanzado', fr: 'Mode avance' },
        'UserScripts': { pt: 'UserScripts', es: 'UserScripts', fr: 'UserScripts' },
        'OCR automation': { pt: 'Automacao OCR', es: 'Automatizacion OCR', fr: 'Automatisation OCR' },
        'Blacklist': { pt: 'Lista de bloqueio', es: 'Lista de bloqueo', fr: 'Liste de blocage' },
        'FloatBox feedback': { pt: 'Feedback FloatBox', es: 'Feedback FloatBox', fr: 'Retour FloatBox' },
        'Export & import': { pt: 'Exportar e importar', es: 'Exportar e importar', fr: 'Exporter et importer' },
        'Troubleshooting': { pt: 'Solucao de problemas', es: 'Solucion de problemas', fr: 'Depannage' },
        'Workflow guide': { pt: 'Guia de fluxo', es: 'Guia de flujo', fr: 'Guide de flux' },
        'Click and Fill': { pt: 'Clique e preencha', es: 'Clic y rellenar', fr: 'Cliquer et remplir' },
        'Click and fill': { pt: 'Clique e preencha', es: 'Clic y rellenar', fr: 'Cliquer et remplir' },
        'Actions, intervals, and repeats': { pt: 'Acoes, intervalos e repeticoes', es: 'Acciones, intervalos y repeticiones', fr: 'Actions, intervalles et repetitions' },
        'Visual capture actions': { pt: 'Acoes de captura visual', es: 'Acciones de captura visual', fr: 'Actions de capture visuelle' },
        'Script Editor': { pt: 'Editor de script', es: 'Editor de script', fr: 'Editeur de script' },
        'Search configuration': { pt: 'Buscar configuracao', es: 'Buscar configuracion', fr: 'Rechercher une configuration' },
        'No suggestions available': { pt: 'Sem sugestoes', es: 'Sin sugerencias', fr: 'Aucune suggestion' },
        'Export all configurations': { pt: 'Exportar todas as configuracoes', es: 'Exportar todas las configuraciones', fr: 'Exporter toutes les configurations' },
        'Import configurations': { pt: 'Importar configuracoes', es: 'Importar configuraciones', fr: 'Importer des configurations' },
        'Remove all configurations': { pt: 'Remover todas as configuracoes', es: 'Eliminar todas las configuraciones', fr: 'Supprimer toutes les configurations' },
        'Settings': { pt: 'Configuracoes', es: 'Configuracion', fr: 'Parametres' },
        'Configuration': { pt: 'Configuracao', es: 'Configuracion', fr: 'Configuration' },
        'Name': { pt: 'Nome', es: 'Nombre', fr: 'Nom' },
        'URL': { pt: 'URL', es: 'URL', fr: 'URL' },
        'Initial delay (s)': { pt: 'Atraso inicial (s)', es: 'Retraso inicial (s)', fr: 'Delai initial (s)' },
        'Actions': { pt: 'Acoes', es: 'Acciones', fr: 'Actions' },
        'Action': { pt: 'Acao', es: 'Accion', fr: 'Action' },
        'Add action': { pt: 'Adicionar acao', es: 'Anadir accion', fr: 'Ajouter une action' },
        'Element selector': { pt: 'Seletor de elemento', es: 'Selector de elemento', fr: 'Selecteur d element' },
        'Element Finder': { pt: 'Localizador de elemento', es: 'Buscador de elemento', fr: 'Recherche d element' },
        'Mode': { pt: 'Modo', es: 'Modo', fr: 'Mode' },
        'Repeat': { pt: 'Repetir', es: 'Repetir', fr: 'Repeter' },
        'Fill': { pt: 'Preencher', es: 'Rellenar', fr: 'Remplir' },
        'Click': { pt: 'Clique', es: 'Clic', fr: 'Clic' },
        'Captured actions': { pt: 'Acoes capturadas', es: 'Acciones capturadas', fr: 'Actions capturees' },
        'Runtime activation': { pt: 'Ativacao em execucao', es: 'Activacion en ejecucion', fr: 'Activation en execution' },
        'On next page load': { pt: 'No proximo carregamento', es: 'En la proxima carga', fr: 'Au prochain chargement' },
        'Apply to current matching tabs': { pt: 'Aplicar as abas atuais compativeis', es: 'Aplicar a pestanas actuales compatibles', fr: 'Appliquer aux onglets compatibles actuels' },
        'Review': { pt: 'Avaliar', es: 'Valorar', fr: 'Evaluer' },
        'Later': { pt: 'Depois', es: 'Mas tarde', fr: 'Plus tard' },
        'Enjoying Auto Clicker?': { pt: 'Gostando do Auto Clicker?', es: 'Te gusta Auto Clicker?', fr: 'Vous aimez Auto Clicker ?' },
        'A quick Chrome Web Store review helps keep the extension improving.': {
            pt: 'Uma avaliacao rapida na Chrome Web Store ajuda a melhorar a extensao.',
            es: 'Una valoracion rapida en Chrome Web Store ayuda a mejorar la extension.',
            fr: 'Un avis rapide sur le Chrome Web Store aide a ameliorer l extension.'
        },
        'Creator': { pt: 'Criador', es: 'Creador', fr: 'Createur' },
        'Contact': { pt: 'Contato', es: 'Contacto', fr: 'Contact' },
        'Copyright': { pt: 'Direitos autorais', es: 'Copyright', fr: 'Copyright' },
        'All rights reserved.': { pt: 'Todos os direitos reservados.', es: 'Todos los derechos reservados.', fr: 'Tous droits reserves.' },
        'Language': { pt: 'Idioma', es: 'Idioma', fr: 'Langue' },
        'Install': { pt: 'Instalar', es: 'Instalar', fr: 'Installer' },
        'Extension not installed': { pt: 'Extensao nao instalada', es: 'Extension no instalada', fr: 'Extension non installee' },
        'The extension is not installed.': { pt: 'A extensao nao esta instalada.', es: 'La extension no esta instalada.', fr: 'L extension n est pas installee.' }
        ,
        'Enabled': { pt: 'Ativada', es: 'Activada', fr: 'Activee' },
        'Disabled': { pt: 'Desativada', es: 'Desactivada', fr: 'Desactivee' },
        'Beginner': { pt: 'Iniciante', es: 'Principiante', fr: 'Debutant' },
        'Advanced': { pt: 'Avancado', es: 'Avanzado', fr: 'Avance' },
        'None': { pt: 'Nenhum', es: 'Ninguno', fr: 'Aucun' },
        'Default': { pt: 'Padrao', es: 'Predeterminado', fr: 'Defaut' },
        'Force DOM': { pt: 'Forcar DOM', es: 'Forzar DOM', fr: 'Forcer DOM' },
        'SETTINGS': { pt: 'CONFIGURACOES', es: 'CONFIGURACION', fr: 'PARAMETRES' }
        ,
        'Clicked successfully': { pt: 'Clique realizado', es: 'Clic realizado', fr: 'Clic reussi' },
        'Show': { pt: 'Mostrar', es: 'Mostrar', fr: 'Afficher' },
        'Hide': { pt: 'Ocultar', es: 'Ocultar', fr: 'Masquer' },
        'Sending...': { pt: 'Enviando...', es: 'Enviando...', fr: 'Envoi...' },
        'Message sent': { pt: 'Mensagem enviada', es: 'Mensaje enviado', fr: 'Message envoye' }
    };

    function normalizeLang(lang) {
        const short = String(lang || '').toLowerCase().split('-')[0];
        return LANGUAGES[short] ? short : DEFAULT_LANG;
    }

    function getStoredLang() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                try {
                    return normalizeLang(JSON.parse(raw));
                } catch (e) {
                    return normalizeLang(raw);
                }
            }
        } catch (e) {
            // ignore
        }
        return DEFAULT_LANG;
    }

    function t(text, lang) {
        const normalized = normalizeLang(lang || getStoredLang());
        const source = String(text || '').trim();
        if (!source || normalized === DEFAULT_LANG) return source;
        const direct = TEXT[source];
        if (direct && direct[normalized]) return direct[normalized];

        for (const [english, translations] of Object.entries(TEXT)) {
            if (english === source) return translations[normalized] || english;
            if (Object.values(translations).includes(source)) {
                return translations[normalized] || english;
            }
        }
        return source;
    }

    function writeStorage(lang) {
        const normalized = normalizeLang(lang);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            localStorage.setItem('acfhPreferredLanguage', normalized);
        } catch (e) {
            // ignore
        }
        try {
            window.postMessage({
                source: 'acfh-options-page',
                type: 'acfh-storage-update',
                items: { [STORAGE_KEY]: normalized }
            }, '*');
        } catch (e) {
            // ignore
        }
        try {
            if (window.chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({
                    [STORAGE_KEY]: normalized,
                    acfhPreferredLanguage: normalized
                });
            }
        } catch (e) {
            // ignore
        }
    }

    function setText(el, value) {
        if (!el || !value) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = value;
            return;
        }
        if (el.tagName === 'OPTION') {
            el.textContent = value;
            return;
        }
        const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        if (textNodes.length) {
            textNodes[0].textContent = value;
            for (let i = 1; i < textNodes.length; i += 1) textNodes[i].textContent = '';
        } else {
            el.textContent = value;
        }
    }

    function translateKnownText(lang) {
        const normalized = normalizeLang(lang);
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
                return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => {
            const original = node.__acfhI18nSource || node.textContent.trim();
            const translated = t(original, normalized);
            if (translated !== node.textContent.trim()) {
                node.textContent = node.textContent.replace(node.textContent.trim(), translated);
            }
            node.__acfhI18nSource = original;
        });

        document.querySelectorAll('[placeholder], [title], [aria-label]').forEach((el) => {
            ['placeholder', 'title', 'aria-label'].forEach((attr) => {
                const value = el.getAttribute(attr);
                if (!value) return;
                const sourceAttr = `data-acfh-i18n-${attr}`;
                const source = el.getAttribute(sourceAttr) || value;
                el.setAttribute(sourceAttr, source);
                el.setAttribute(attr, t(source, normalized));
            });
        });
    }

    function updateLanguageControls(lang) {
        const normalized = normalizeLang(lang);
        document.querySelectorAll('[data-acfh-lang-current]').forEach((el) => {
            el.textContent = LANGUAGES[normalized].short;
        });
        document.querySelectorAll('[data-acfh-lang-option]').forEach((el) => {
            const active = normalizeLang(el.getAttribute('data-acfh-lang-option')) === normalized;
            el.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function applyLanguage(lang, options = {}) {
        const normalized = normalizeLang(lang);
        document.documentElement.lang = normalized === 'pt' ? 'pt-BR' : normalized;
        translateKnownText(normalized);
        updateLanguageControls(normalized);
        if (options.persist !== false) writeStorage(normalized);
        window.dispatchEvent(new CustomEvent('acfh-language-change', { detail: { lang: normalized } }));
    }

    function initLanguageMenus() {
        document.querySelectorAll('[data-acfh-lang-toggle]').forEach((button) => {
            if (button.__acfhLangBound) return;
            button.__acfhLangBound = true;
            const menu = button.closest('.topbar-lang')?.querySelector('[data-acfh-lang-menu]');
            button.addEventListener('click', () => {
                if (!menu) return;
                const nextHidden = !menu.hidden;
                document.querySelectorAll('[data-acfh-lang-menu]').forEach(item => item.hidden = true);
                menu.hidden = nextHidden;
                button.setAttribute('aria-expanded', nextHidden ? 'false' : 'true');
            });
        });

        document.querySelectorAll('[data-acfh-lang-option]').forEach((button) => {
            if (button.__acfhLangOptionBound) return;
            button.__acfhLangOptionBound = true;
            button.addEventListener('click', () => {
                const lang = normalizeLang(button.getAttribute('data-acfh-lang-option'));
                document.querySelectorAll('[data-acfh-lang-menu]').forEach(item => item.hidden = true);
                applyLanguage(lang);
            });
        });

        document.addEventListener('click', (event) => {
            if (event.target.closest('.topbar-lang')) return;
            document.querySelectorAll('[data-acfh-lang-menu]').forEach(item => item.hidden = true);
        });
    }

    window.ACFH_I18N = {
        languages: LANGUAGES,
        normalizeLang,
        getLanguage: getStoredLang,
        setLanguage: (lang) => applyLanguage(lang),
        applyLanguage,
        refresh: (lang) => {
            translateKnownText(normalizeLang(lang || getStoredLang()));
            updateLanguageControls(normalizeLang(lang || getStoredLang()));
        },
        t
    };

    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        const data = event.data || {};
        if (data.source !== 'acfh-extension' || data.type !== 'acfh-chrome-storage-changed') return;
        const change = data.changes && (data.changes[STORAGE_KEY] || data.changes.acfhPreferredLanguage);
        if (!change || typeof change.newValue === 'undefined') return;
        applyLanguage(change.newValue, { persist: false });
    });

    document.addEventListener('DOMContentLoaded', () => {
        initLanguageMenus();
        applyLanguage(getStoredLang(), { persist: false });
        try {
            if (window.chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get([STORAGE_KEY, 'acfhPreferredLanguage'], (data) => {
                    const stored = data && (data[STORAGE_KEY] || data.acfhPreferredLanguage);
                    if (stored) applyLanguage(stored, { persist: false });
                });
            }
        } catch (e) {
            // ignore
        }
    });
})();
