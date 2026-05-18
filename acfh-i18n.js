(function () {
    'use strict';

    const STORAGE_KEY = 'uiLanguage';
    const DEFAULT_LANG = 'en';
    const LANGUAGES = {
        en: { label: 'English', short: 'EN' },
        pt: { label: 'Portugues', short: 'PT' },
        es: { label: 'Espanol', short: 'ES' },
        fr: { label: 'Francais', short: 'FR' },
        de: { label: 'Deutsch', short: 'DE' },
        it: { label: 'Italiano', short: 'IT' },
        nl: { label: 'Nederlands', short: 'NL' },
        pl: { label: 'Polski', short: 'PL' },
        ru: { label: 'Russkiy', short: 'RU' },
        zh: { label: 'Zhongwen', short: 'ZH' },
        ja: { label: 'Nihongo', short: 'JA' },
        ko: { label: 'Hanguk-eo', short: 'KO' },
        ar: { label: 'Al-Arabiya', short: 'AR' },
        hi: { label: 'Hindi', short: 'HI' }
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

    Object.assign(TEXT, {
        'File': { pt: 'Arquivo', es: 'Archivo', fr: 'Fichier', de: 'Datei', it: 'File', nl: 'Bestand', pl: 'Plik', ru: 'Fayl', zh: 'Wenjian', ja: 'Fairu', ko: 'Pail', ar: 'Milaf', hi: 'File' },
        'Edit': { pt: 'Editar', es: 'Editar', fr: 'Modifier', de: 'Bearbeiten', it: 'Modifica', nl: 'Bewerken', pl: 'Edycja', ru: 'Pravka', zh: 'Bianji', ja: 'Henshu', ko: 'Pyeonjip', ar: 'Tahrir', hi: 'Edit' },
        'Selection': { pt: 'Selecao', es: 'Seleccion', fr: 'Selection', de: 'Auswahl', it: 'Selezione', nl: 'Selectie', pl: 'Zaznaczenie', ru: 'Vybor', zh: 'Xuanze', ja: 'Sentaku', ko: 'Seontaek', ar: 'Tahdid', hi: 'Selection' },
        'Find': { pt: 'Localizar', es: 'Buscar', fr: 'Rechercher', de: 'Suchen', it: 'Trova', nl: 'Zoeken', pl: 'Znajdz', ru: 'Nayti', zh: 'Chazhao', ja: 'Kensaku', ko: 'Chatgi', ar: 'Bahth', hi: 'Find' },
        'Go to': { pt: 'Ir para', es: 'Ir a', fr: 'Aller a', de: 'Gehe zu', it: 'Vai a', nl: 'Ga naar', pl: 'Idz do', ru: 'Pereyti', zh: 'Qianwang', ja: 'Ido', ko: 'Idong', ar: 'Intiqal', hi: 'Go to' },
        'Developer': { pt: 'Desenvolvedor', es: 'Desarrollador', fr: 'Developpeur', de: 'Entwickler', it: 'Sviluppatore', nl: 'Ontwikkelaar', pl: 'Deweloper', ru: 'Razrabotchik', zh: 'Kaifazhe', ja: 'Kaihatsusha', ko: 'Gaebalja', ar: 'Mutawwir', hi: 'Developer' },
        'Indent width:': { pt: 'Largura do recuo:', es: 'Ancho de sangria:', fr: 'Largeur du retrait:', de: 'Einzugsbreite:', it: 'Larghezza rientro:', nl: 'Inspringbreedte:', pl: 'Szerokosc wciecia:', ru: 'Shirina otstupa:', zh: 'Suojin kuandu:', ja: 'Indento haba:', ko: 'Deul-yeosseugi pok:', ar: 'Ard al-masafa:', hi: 'Indent width:' },
        'Tab size:': { pt: 'Tamanho da guia:', es: 'Tamano de tabulacion:', fr: 'Taille de tabulation:', de: 'Tab-Grosse:', it: 'Dimensione tab:', nl: 'Tabgrootte:', pl: 'Rozmiar tabulatora:', ru: 'Razmer tabulyatsii:', zh: 'Tab daxiao:', ja: 'Tabu saizu:', ko: 'Taeb keugi:', ar: 'Hajm altab:', hi: 'Tab size:' },
        'Indent with:': { pt: 'Recuar com:', es: 'Sangrar con:', fr: 'Retrait avec:', de: 'Einzug mit:', it: 'Rientra con:', nl: 'Inspringen met:', pl: 'Wciecie przez:', ru: 'Otstup s:', zh: 'Yong...suojin:', ja: 'Indento moji:', ko: 'Deul-yeosseugi:', ar: 'Masafa bi:', hi: 'Indent with:' },
        'Tabulation:': { pt: 'Tabulacao:', es: 'Tabulacion:', fr: 'Tabulation:', de: 'Tabulator:', it: 'Tabulazione:', nl: 'Tabulatie:', pl: 'Tabulacja:', ru: 'Tabulyatsiya:', zh: 'Tab:', ja: 'Tabu:', ko: 'Taeb:', ar: 'Tab:', hi: 'Tabulation:' },
        'Selection match highlight:': { pt: 'Destacar correspondencias da selecao:', es: 'Resaltar coincidencias de seleccion:', fr: 'Surligner les correspondances:', de: 'Auswahl-Treffer hervorheben:', it: 'Evidenzia corrispondenze:', nl: 'Selectie-overeenkomsten markeren:', pl: 'Podswietl dopasowania:', ru: 'Podsvetka sovpadeniy:', zh: 'Gaoliang pipei:', ja: 'Match wo hairaito:', ko: 'Maechi gangjo:', ar: 'Tamyiz almutabiqat:', hi: 'Selection match highlight:' },
        'Cursor': { pt: 'Cursor', es: 'Cursor', fr: 'Curseur', de: 'Cursor', it: 'Cursore', nl: 'Cursor', pl: 'Kursor', ru: 'Kursor', zh: 'Guangbiao', ja: 'Kaasoru', ko: 'Keoseo', ar: 'Muashir', hi: 'Cursor' },
        'Line wrapping': { pt: 'Quebra de linha', es: 'Ajuste de linea', fr: 'Retour a la ligne', de: 'Zeilenumbruch', it: 'A capo automatico', nl: 'Regelterugloop', pl: 'Zawijanie wierszy', ru: 'Perenos strok', zh: 'Zidong huanhang', ja: 'Orikaeshi', ko: 'Jul bakkum', ar: 'Laff al-satr', hi: 'Line wrapping' },
        'Auto indent on input': { pt: 'Auto-recuar ao digitar', es: 'Auto sangrar al escribir', fr: 'Retrait auto a la saisie', de: 'Automatisch einrucken', it: 'Rientro automatico', nl: 'Automatisch inspringen', pl: 'Auto wciecie', ru: 'Avto otstup', zh: 'Zidong suojin', ja: 'Jido indento', ko: 'Jadong deul-yeosseugi', ar: 'Masafa tilqaiya', hi: 'Auto indent on input' },
        'Save content when editor loses focus': { pt: 'Salvar conteudo quando o editor perder o foco', es: 'Guardar al perder foco', fr: 'Enregistrer a la perte du focus', de: 'Beim Fokusverlust speichern', it: 'Salva quando perde focus', nl: 'Opslaan bij focusverlies', pl: 'Zapisz po utracie fokusu', ru: 'Sohranyat pri potere fokusa', zh: 'Shiqu jiaodian shi baocun', ja: 'Fookasu soshitsu de hozon', ko: 'Pokeoseu ireul ttae jeojang', ar: 'Hifz inda faqdan altarkiz', hi: 'Save content when editor loses focus' },
        'Do not show save confirmation dialog': { pt: 'Nao mostrar dialogo de confirmacao para salvar', es: 'No mostrar confirmacion al guardar', fr: 'Ne pas afficher la confirmation', de: 'Speicherbestaetigung nicht anzeigen', it: 'Non mostrare conferma', nl: 'Geen bevestiging tonen', pl: 'Nie pokazuj potwierdzenia', ru: 'Ne pokazyvat podtverzhdenie', zh: 'Bu xianshi queren', ja: 'Kakunin wo hyoji shinai', ko: 'Hwagin chang sumgim', ar: 'La tuzhir taaked', hi: 'Do not show save confirmation dialog' },
        'Highlight whitespace': { pt: 'Destacar espacos em branco', es: 'Resaltar espacios', fr: 'Surligner les espaces', de: 'Leerzeichen hervorheben', it: 'Evidenzia spazi', nl: 'Witruimte markeren', pl: 'Podswietl biale znaki', ru: 'Podsvetit probely', zh: 'Gaoliang kongbai', ja: 'Kuhaku wo hairaito', ko: 'Gongbaek gangjo', ar: 'Tamyiz alfaraghat', hi: 'Highlight whitespace' },
        'Remove trailing whitespace from modified lines': { pt: 'Remover espaco em branco das linhas modificadas', es: 'Quitar espacios finales de lineas modificadas', fr: 'Supprimer les espaces finaux', de: 'Nachgestellte Leerzeichen entfernen', it: 'Rimuovi spazi finali', nl: 'Eindspaties verwijderen', pl: 'Usun koncowe spacje', ru: 'Udalit probely v kontse', zh: 'Shanchu xingwei kongbai', ja: 'Gyomatsu kuhaku sakujo', ko: 'Kkeut gongbaek jegeo', ar: 'Izalat faraghat nihayat', hi: 'Remove trailing whitespace from modified lines' },
        'Automatic syntax check while typing': { pt: 'Verificacao automatica de sintaxe ao digitar', es: 'Verificacion automatica de sintaxis', fr: 'Verification syntaxique automatique', de: 'Automatische Syntaxpruefung', it: 'Controllo sintassi automatico', nl: 'Automatische syntaxcontrole', pl: 'Automatyczne sprawdzanie skladni', ru: 'Avtoproverka sintaksisa', zh: 'Zidong yufa jiancha', ja: 'Jido kobun chekku', ko: 'Jadong gu mun geomsa', ar: 'Fahs nahw tilqai', hi: 'Automatic syntax check while typing' },
        'Maximum automatic check size:': { pt: 'Tamanho maximo da verificacao automatica:', es: 'Tamano maximo de verificacion:', fr: 'Taille max de verification:', de: 'Maximale Pruefgroesse:', it: 'Dimensione massima controllo:', nl: 'Maximale controlegrootte:', pl: 'Maksymalny rozmiar sprawdzania:', ru: 'Maksimalnyy razmer proverki:', zh: 'Zidong jiancha zuida daxiao:', ja: 'Saidai chekku saizu:', ko: 'Choe dae geomsa keugi:', ar: 'Alhajm alaqsa:', hi: 'Maximum automatic check size:' },
        'Execution': { pt: 'Execucao', es: 'Ejecucion', fr: 'Execution', de: 'Ausfuehrung', it: 'Esecuzione', nl: 'Uitvoering', pl: 'Wykonanie', ru: 'Vypolnenie', zh: 'Zhixing', ja: 'Jikko', ko: 'Silhaeng', ar: 'Tanfidh', hi: 'Execution' },
        'Run only the active script': { pt: 'Executar somente o script ativo', es: 'Ejecutar solo el script activo', fr: 'Executer seulement le script actif', de: 'Nur aktives Skript ausfuehren', it: 'Esegui solo lo script attivo', nl: 'Alleen actief script uitvoeren', pl: 'Uruchom tylko aktywny skrypt', ru: 'Zapuskat tolko aktivnyy skript', zh: 'Jin yunxing dangqian jiaoben', ja: 'Yuko script dake jikko', ko: 'Hwaldong scriptman silhaeng', ar: 'Shagghil alskript alnashit faqat', hi: 'Run only the active script' },
        'Execution world:': { pt: 'Mundo de execucao:', es: 'Mundo de ejecucion:', fr: 'Monde d execution:', de: 'Ausfuehrungswelt:', it: 'Ambiente di esecuzione:', nl: 'Uitvoeringswereld:', pl: 'Srodowisko wykonania:', ru: 'Sreda vypolneniya:', zh: 'Zhixing huanjing:', ja: 'Jikko sekai:', ko: 'Silhaeng hwangyeong:', ar: 'Alam altanfidh:', hi: 'Execution world:' },
        'Automatic': { pt: 'Automatico', es: 'Automatico', fr: 'Automatique', de: 'Automatisch', it: 'Automatico', nl: 'Automatisch', pl: 'Automatycznie', ru: 'Avtomaticheski', zh: 'Zidong', ja: 'Jido', ko: 'Jadong', ar: 'Tilqai', hi: 'Automatic' },
        'Activation policy:': { pt: 'Politica de ativacao:', es: 'Politica de activacion:', fr: 'Politique d activation:', de: 'Aktivierungsrichtlinie:', it: 'Politica di attivazione:', nl: 'Activatiebeleid:', pl: 'Zasada aktywacji:', ru: 'Politika aktivatsii:', zh: 'Qiyong celue:', ja: 'Yuko policy:', ko: 'Hwaldong jeongchaek:', ar: 'Siyasat altanshit:', hi: 'Activation policy:' },
        'Security': { pt: 'Seguranca', es: 'Seguridad', fr: 'Securite', de: 'Sicherheit', it: 'Sicurezza', nl: 'Beveiliging', pl: 'Bezpieczenstwo', ru: 'Bezopasnost', zh: 'Anquan', ja: 'Sekyuriti', ko: 'Boan', ar: 'Aman', hi: 'Security' },
        'Blocked sites:': { pt: 'Sites bloqueados:', es: 'Sitios bloqueados:', fr: 'Sites bloques:', de: 'Blockierte Sites:', it: 'Siti bloccati:', nl: 'Geblokkeerde sites:', pl: 'Zablokowane strony:', ru: 'Zablokirovannye sayt:', zh: 'Yizuzhi wangzhan:', ja: 'Burokku saito:', ko: 'Chadan site:', ar: 'Mawaqie mahjuba:', hi: 'Blocked sites:' },
        'No OCR captures yet.': { pt: 'Ainda nao ha capturas OCR.', es: 'Aun no hay capturas OCR.', fr: 'Aucune capture OCR pour le moment.', de: 'Noch keine OCR-Erfassungen.', it: 'Nessuna cattura OCR.', nl: 'Nog geen OCR-opnames.', pl: 'Brak przechwycen OCR.', ru: 'OCR zahvatov poka net.', zh: 'Shangwu OCR buhuo.', ja: 'OCR kyapucha wa mada arimasen.', ko: 'OCR kaepcheo eopseum.', ar: 'La tujad iltiqat OCR baad.', hi: 'No OCR captures yet.' },
        'Configuration name': { pt: 'Nome da configuracao', es: 'Nombre de configuracion', fr: 'Nom de configuration', de: 'Konfigurationsname', it: 'Nome configurazione', nl: 'Configuratienaam', pl: 'Nazwa konfiguracji', ru: 'Imya konfiguratsii', zh: 'Peizhi mingcheng', ja: 'Settei mei', ko: 'Seoljeong ireum', ar: 'Ism al-iidad', hi: 'Configuration name' },
        'Target URL': { pt: 'URL de destino', es: 'URL de destino', fr: 'URL cible', de: 'Ziel-URL', it: 'URL target', nl: 'Doel-URL', pl: 'Docelowy URL', ru: 'Tselevoy URL', zh: 'Mubiao URL', ja: 'Taisho URL', ko: 'Daesang URL', ar: 'URL alhadaf', hi: 'Target URL' },
        'Watch': { pt: 'Vigilante', es: 'Vigilar', fr: 'Surveiller', de: 'Ueberwachen', it: 'Controllo', nl: 'Bewaken', pl: 'Obserwuj', ru: 'Nablyudenie', zh: 'Jianshi', ja: 'Kanshi', ko: 'Gamshi', ar: 'Muraqaba', hi: 'Watch' },
        'Apply to session': { pt: 'Aplicar a sessao', es: 'Aplicar a la sesion', fr: 'Appliquer a la session', de: 'Auf Sitzung anwenden', it: 'Applica alla sessione', nl: 'Toepassen op sessie', pl: 'Zastosuj do sesji', ru: 'Primenyat k sessii', zh: 'Yingyong dao huihua', ja: 'Sesshon ni tekiyo', ko: 'Seseon-e jeokyong', ar: 'Tafbiq ala aljalsa', hi: 'Apply to session' },
        'No Click and Fill configuration selected.': { pt: 'Nenhuma configuracao Click and Fill selecionada.', es: 'Ninguna configuracion Click and Fill seleccionada.', fr: 'Aucune configuration Click and Fill selectionnee.', de: 'Keine Click and Fill-Konfiguration ausgewaehlt.', it: 'Nessuna configurazione Click and Fill selezionata.', nl: 'Geen Click and Fill-configuratie geselecteerd.', pl: 'Nie wybrano konfiguracji Click and Fill.', ru: 'Konfiguratsiya Click and Fill ne vybrana.', zh: 'Wei xuanze Click and Fill peizhi.', ja: 'Click and Fill settei ga sentaku sareteimasen.', ko: 'Click and Fill seoljeong-i seontaekdoeji anhasseumnida.', ar: 'Lam yatim tahdid iidad Click and Fill.', hi: 'No Click and Fill configuration selected.' }
    });

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
