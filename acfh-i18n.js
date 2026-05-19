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
        'On this page': { pt: 'Nesta pagina', es: 'En esta pagina', fr: 'Sur cette page', de: 'Auf dieser Seite', it: 'In questa pagina', nl: 'Op deze pagina', pl: 'Na tej stronie', ru: 'Na etoy stranitse', zh: 'Ben ye', ja: 'Kono peiji', ko: 'I peiji', ar: 'Fi hadhihi alsafha', hi: 'Is page par' },
        'Quick start': { pt: 'Inicio rapido', es: 'Inicio rapido', fr: 'Demarrage rapide', de: 'Schnellstart', it: 'Avvio rapido', nl: 'Snel starten', pl: 'Szybki start', ru: 'Bystryy start', zh: 'Kuaisu kaishi', ja: 'Kaisoku kaishi', ko: 'Ppareun sijak', ar: 'Bidaya sariha', hi: 'Quick start' },
        'Workflow guide': { pt: 'Guia de fluxo', es: 'Guia de flujo', fr: 'Guide de flux' },
        'Auto Clicker - Form Helper keeps three independent automation surfaces in one workspace: Click and Fill for table-driven actions, UserScript for custom JavaScript, and OCR for visual targets that are easier to recognize on screen.': {
            pt: 'O Auto Clicker - Form Helper mantem tres superficies independentes de automacao no mesmo espaco: Clique e preencha para acoes em tabela, UserScript para JavaScript personalizado e OCR para alvos visuais mais faceis de reconhecer na tela.',
            es: 'Auto Clicker - Form Helper mantiene tres superficies independientes de automatizacion en un mismo espacio: Click and Fill para acciones en tabla, UserScript para JavaScript personalizado y OCR para objetivos visuales faciles de reconocer en pantalla.',
            fr: 'Auto Clicker - Form Helper garde trois zones d automatisation independantes dans un meme espace : Click and Fill pour les actions en tableau, UserScript pour le JavaScript personnalise et OCR pour les cibles visuelles.'
        },
        'Options workspace with sessions, actions, and site settings.': { pt: 'Area de opcoes com sessoes, acoes e configuracoes do site.', es: 'Area de opciones con sesiones, acciones y ajustes del sitio.', fr: 'Espace Options avec sessions, actions et reglages du site.' },
        '1. Choose a session': { pt: '1. Escolha uma sessao', es: '1. Elige una sesion', fr: '1. Choisissez une session' },
        'Pick the automation surface that fits the job.': { pt: 'Escolha a superficie de automacao que combina com a tarefa.', es: 'Elige la superficie de automatizacion adecuada.', fr: 'Choisissez la zone d automatisation adaptee.' },
        '2. Save the target': { pt: '2. Salve o alvo', es: '2. Guarda el objetivo', fr: '2. Enregistrez la cible' },
        'Set a URL, script metadata, or OCR capture.': { pt: 'Defina uma URL, metadados do script ou uma captura OCR.', es: 'Define una URL, metadatos del script o una captura OCR.', fr: 'Definissez une URL, des metadonnees de script ou une capture OCR.' },
        '3. Enable execution': { pt: '3. Ative a execucao', es: '3. Activa la ejecucion', fr: '3. Activez l execution' },
        'Run only after the rule is tested on the target page.': { pt: 'Execute apenas depois de testar a regra na pagina alvo.', es: 'Ejecuta solo despues de probar la regla en la pagina objetivo.', fr: 'Executez seulement apres avoir teste la regle sur la page cible.' },
        'Auto Clicker - Form Helper automates clicks and form filling on websites and iframes. Create one configuration per site, define actions, and let the extension run the flow automatically.': {
            pt: 'O Auto Clicker - Form Helper automatiza cliques e preenchimento de formularios em sites e iframes. Crie uma configuracao por site, defina as acoes e deixe a extensao executar o fluxo automaticamente.',
            es: 'Auto Clicker - Form Helper automatiza clics y formularios en sitios e iframes. Crea una configuracion por sitio, define acciones y deja que la extension ejecute el flujo.',
            fr: 'Auto Clicker - Form Helper automatise les clics et les formulaires sur sites et iframes. Creez une configuration par site, definissez les actions et laissez l extension executer le flux.'
        },
        'Create a configuration for the target URL.': { pt: 'Crie uma configuracao para a URL alvo.', es: 'Crea una configuracion para la URL objetivo.', fr: 'Creez une configuration pour l URL cible.' },
        'Add actions (click or fill) with interval and repeat.': { pt: 'Adicione acoes (clique ou preencher) com intervalo e repeticao.', es: 'Anade acciones (clic o rellenar) con intervalo y repeticion.', fr: 'Ajoutez des actions (clic ou remplissage) avec intervalle et repetition.' },
        'Enable the configuration and follow along with FloatBox.': { pt: 'Ative a configuracao e acompanhe pela FloatBox.', es: 'Activa la configuracion y acompanala con FloatBox.', fr: 'Activez la configuration et suivez avec FloatBox.' },
        'Install from the Chrome Web Store:': { pt: 'Instale pela Chrome Web Store:', es: 'Instala desde Chrome Web Store:', fr: 'Installez depuis le Chrome Web Store :' },
        'Then pin the extension icon for quick access.': { pt: 'Depois fixe o icone da extensao para acesso rapido.', es: 'Despues fija el icono de la extension para acceso rapido.', fr: 'Epinglez ensuite l icone de l extension pour un acces rapide.' },
        'Each configuration represents a site or flow. Set a name, the URL, and an initial delay if the page needs time to load. The manual Add action button requires the configuration name and URL first, while right-click capture can still create rows from the target page.': {
            pt: 'Cada configuracao representa um site ou fluxo. Defina um nome, a URL e um atraso inicial se a pagina precisar de tempo para carregar. O botao manual de adicionar acao exige primeiro nome e URL, enquanto a captura com clique direito ainda pode criar linhas a partir da pagina alvo.',
            es: 'Cada configuracion representa un sitio o flujo. Define nombre, URL y retraso inicial si la pagina necesita tiempo para cargar.',
            fr: 'Chaque configuration represente un site ou un flux. Definissez le nom, l URL et le delai initial si la page doit charger.'
        },
        'Use one configuration per page flow so timing, selectors, and repeats stay predictable.': { pt: 'Use uma configuracao por fluxo para manter tempo, seletores e repeticoes previsiveis.', es: 'Usa una configuracion por flujo para mantener tiempos y selectores previsibles.', fr: 'Utilisez une configuration par flux pour garder les delais et selecteurs previsibles.' },
        'Use the most stable target available. Prefer IDs, data attributes, labels, and compact CSS selectors when the site provides them; use OCR when the visual target is stable but the DOM selector changes.': {
            pt: 'Use o alvo mais estavel disponivel. Prefira IDs, atributos data, rotulos e seletores CSS curtos quando o site fornecer; use OCR quando o alvo visual e estavel, mas o seletor do DOM muda.',
            es: 'Usa el objetivo mas estable disponible. Prefiere IDs, atributos data, etiquetas y selectores CSS compactos.',
            fr: 'Utilisez la cible la plus stable disponible. Preferez les IDs, attributs data, libelles et selecteurs CSS compacts.'
        },
        'The extension supports click and fill actions in Click and Fill, plus visual actions in OCR. Each action owns its own configuration so changing one row does not change the others.': {
            pt: 'A extensao suporta acoes de clique e preenchimento em Clique e preencha, alem de acoes visuais no OCR. Cada acao tem sua propria configuracao, entao alterar uma linha nao altera as outras.',
            es: 'La extension admite clic y rellenar en Click and Fill, ademas de acciones visuales en OCR.',
            fr: 'L extension prend en charge clic et remplissage dans Click and Fill, ainsi que les actions visuelles en OCR.'
        },
        'Control how many times each action runs and the time between runs.': { pt: 'Controle quantas vezes cada acao roda e o tempo entre execucoes.', es: 'Controla cuantas veces se ejecuta cada accion y el tiempo entre ejecuciones.', fr: 'Controlez le nombre d executions et le delai entre elles.' },
        "The extension works on dynamic pages and iframes. When the element isn't in the DOM immediately, use:": {
            pt: 'A extensao funciona em paginas dinamicas e iframes. Quando o elemento nao aparece imediatamente no DOM, use:',
            es: 'La extension funciona en paginas dinamicas e iframes. Cuando el elemento no aparece de inmediato, usa:',
            fr: 'L extension fonctionne sur pages dynamiques et iframes. Si l element n est pas immediatement dans le DOM, utilisez :'
        },
        'Enable advanced mode to unlock extra options, including Mutation Observe and sandbox controls. These controls apply to Click and Fill and to the UserScript editor settings panel, while OCR keeps its capture settings inside the OCR section.': {
            pt: 'Ative o modo avancado para liberar opcoes extras, incluindo Mutation Observe e controles de sandbox. Esses controles se aplicam ao Clique e preencha e ao painel do editor UserScript, enquanto o OCR mantem suas configuracoes dentro da propria secao OCR.',
            es: 'Activa el modo avanzado para liberar opciones extra, como Mutation Observe y controles sandbox.',
            fr: 'Activez le mode avance pour debloquer des options comme Mutation Observe et les controles sandbox.'
        },
        'Use the UserScript editor for advanced automations and routines that are easier to express in JavaScript. UserScript is independent from Click and Fill and OCR: when this session is active, the active script can run; when another session is active, script registration is turned off.': {
            pt: 'Use o editor UserScript para automacoes avancadas e rotinas que sao mais faceis de escrever em JavaScript. O UserScript e independente de Clique e preencha e OCR: quando essa sessao esta ativa, o script ativo pode rodar; quando outra sessao esta ativa, o registro do script e desligado.',
            es: 'Usa el editor UserScript para automatizaciones avanzadas escritas en JavaScript.',
            fr: 'Utilisez l editeur UserScript pour les automatisations avancees en JavaScript.'
        },
        'OCR mode is independent from Click and Fill and UserScript. It is designed for visual targets: buttons, labels, checkboxes, switches, scroll areas, and text that can be identified from a small capture area.': {
            pt: 'O modo OCR e independente de Clique e preencha e UserScript. Ele foi feito para alvos visuais: botoes, rotulos, checkboxes, switches, areas de rolagem e textos identificaveis em uma pequena area capturada.',
            es: 'El modo OCR es independiente de Click and Fill y UserScript. Sirve para objetivos visuales.',
            fr: 'Le mode OCR est independant de Click and Fill et UserScript. Il sert aux cibles visuelles.'
        },
        'Define blocked sites to prevent accidental automation. Each blocked domain disables execution.': { pt: 'Defina sites bloqueados para evitar automacoes acidentais. Cada dominio bloqueado desativa a execucao.', es: 'Define sitios bloqueados para evitar automatizaciones accidentales.', fr: 'Definissez des sites bloques pour eviter les automatisations accidentelles.' },
        'FloatBox shows the action status in the corner of the page, including counters, element waiting, and completion.': { pt: 'A FloatBox mostra o estado das acoes no canto da pagina, incluindo contadores, espera por elementos e conclusao.', es: 'FloatBox muestra el estado de las acciones en la esquina de la pagina.', fr: 'FloatBox affiche l etat des actions dans un coin de la page.' },
        'Save your configurations as JSON for backup or migration.': { pt: 'Salve suas configuracoes em JSON para backup ou migracao.', es: 'Guarda tus configuraciones como JSON para respaldo o migracion.', fr: 'Enregistrez vos configurations en JSON pour sauvegarde ou migration.' },
        'Use this quick checklist:': { pt: 'Use esta lista rapida:', es: 'Usa esta lista rapida:', fr: 'Utilisez cette liste rapide :' },
        'Validation page': { pt: 'Pagina de validacao', es: 'Pagina de validacion', fr: 'Page de validation' },
        'Local-first policy': { pt: 'Politica local primeiro', es: 'Politica local primero', fr: 'Politique locale d abord' },
        'Privacy and permissions': { pt: 'Privacidade e permissoes', es: 'Privacidad y permisos', fr: 'Confidentialite et permissions' },
        'The extension stores configurations locally in the browser and uses permissions only to run the automation features selected by the user.': {
            pt: 'A extensao guarda as configuracoes localmente no navegador e usa permissoes apenas para executar as funcoes de automacao escolhidas pelo usuario.',
            es: 'La extension guarda las configuraciones localmente en el navegador y usa permisos solo para ejecutar las funciones elegidas por el usuario.',
            fr: 'L extension stocke les configurations localement dans le navigateur et utilise les permissions uniquement pour les fonctions choisies.'
        },
        'Privacy policy': { pt: 'Politica de privacidade', es: 'Politica de privacidad', fr: 'Politique de confidentialite' },
        'Policy': { pt: 'Politica', es: 'Politica', fr: 'Politique' },
        'Data collection and use:': { pt: 'Coleta e uso de dados:', es: 'Recopilacion y uso de datos:', fr: 'Collecte et utilisation des donnees:' },
        "This extension is designed with your privacy in mind. It does not collect, store, monitor, transmit, or share any personally identifiable data or browsing information with the developer or third parties. All user-provided settings (such as XPaths, fill values, intervals, and repeat options) are stored exclusively in your browser's local storage (via chrome.storage.local). This information is never sent to external servers or accessed by any other entity.": {
            pt: 'Esta extensao foi pensada com foco na sua privacidade. Ela nao coleta, armazena, monitora, transmite nem compartilha dados pessoais ou informacoes de navegacao com o desenvolvedor ou terceiros. Todas as configuracoes fornecidas pelo usuario, como XPaths, valores de preenchimento, intervalos e repeticoes, ficam somente no armazenamento local do navegador via chrome.storage.local. Essas informacoes nunca sao enviadas para servidores externos nem acessadas por outra entidade.',
            es: 'Esta extension fue disenada pensando en tu privacidad. No recopila, almacena, monitorea, transmite ni comparte datos personales o informacion de navegacion con el desarrollador o terceros. Todas las configuraciones del usuario se guardan solo en el almacenamiento local del navegador mediante chrome.storage.local.',
            fr: 'Cette extension est concue pour respecter votre vie privee. Elle ne collecte, stocke, surveille, transmet ni partage aucune donnee personnelle ou information de navigation avec le developpeur ou des tiers. Tous les reglages utilisateur restent uniquement dans le stockage local du navigateur via chrome.storage.local.'
        },
        'Extension permissions:': { pt: 'Permissoes da extensao:', es: 'Permisos de la extension:', fr: 'Permissions de l extension:' },
        "The permissions requested by the extension (storage, scripting, activeTab, tabs, webNavigation, contextMenus) are strictly necessary for its core purpose: automating clicks and form filling on web pages. None of these permissions are used to collect data unrelated to the extension's functionality.": {
            pt: 'As permissoes solicitadas pela extensao (storage, scripting, activeTab, tabs, webNavigation e contextMenus) sao estritamente necessarias para sua finalidade principal: automatizar cliques e preenchimento de formularios em paginas web. Nenhuma dessas permissoes e usada para coletar dados fora da funcionalidade da extensao.',
            es: 'Los permisos solicitados por la extension son necesarios para automatizar clics y formularios en paginas web. No se usan para recopilar datos ajenos a la funcionalidad.',
            fr: 'Les permissions demandees par l extension sont necessaires pour automatiser les clics et les formulaires. Elles ne servent pas a collecter des donnees sans lien avec la fonctionnalite.'
        },
        'Data security:': { pt: 'Seguranca dos dados:', es: 'Seguridad de datos:', fr: 'Securite des donnees:' },
        'Since all user data is stored locally on your device, security depends on the protections of your browser and operating system. The extension does not implement network security mechanisms because no data is transmitted.': {
            pt: 'Como todos os dados do usuario ficam guardados localmente no dispositivo, a seguranca depende das protecoes do navegador e do sistema operacional. A extensao nao implementa mecanismos de seguranca de rede porque nenhum dado e transmitido.',
            es: 'Como todos los datos se guardan localmente, la seguridad depende del navegador y del sistema operativo. No se transmiten datos.',
            fr: 'Comme toutes les donnees restent localement sur votre appareil, la securite depend du navigateur et du systeme. Aucune donnee n est transmise.'
        },
        'Changes to this privacy policy:': { pt: 'Alteracoes nesta politica:', es: 'Cambios en esta politica:', fr: 'Modifications de cette politique:' },
        'We may update this privacy policy periodically. Any changes will be reflected on this page.': { pt: 'Podemos atualizar esta politica periodicamente. Qualquer alteracao sera refletida nesta pagina.', es: 'Podemos actualizar esta politica periodicamente. Los cambios apareceran en esta pagina.', fr: 'Nous pouvons mettre a jour cette politique periodiquement. Les changements apparaitront sur cette page.' },
        'Workflow guide': { pt: 'Guia de fluxo', es: 'Guia de flujo', fr: 'Guide de flux' },
        'Click and Fill': { pt: 'Clique e preencha', es: 'Clic y rellenar', fr: 'Cliquer et remplir' },
        'Click and fill': { pt: 'Clique e preencha', es: 'Clic y rellenar', fr: 'Cliquer et remplir' },
        'Actions, intervals, and repeats': { pt: 'Acoes, intervalos e repeticoes', es: 'Acciones, intervalos y repeticiones', fr: 'Actions, intervalles et repetitions' },
        'Visual capture actions': { pt: 'Acoes de captura visual', es: 'Acciones de captura visual', fr: 'Actions de capture visuelle' },
        'Script Editor': { pt: 'Editor de script', es: 'Editor de script', fr: 'Editeur de script' },
        'Search configuration': { pt: 'Buscar configuracao', es: 'Buscar configuracion', fr: 'Rechercher une configuration' },
        'No suggestions available': { pt: 'Sem sugestoes', es: 'Sin sugerencias', fr: 'Aucune suggestion' },
        'Export all configurations': { pt: 'Exportar todas as configuracoes', es: 'Exportar todas las configuraciones', fr: 'Exporter toutes les configurations', de: 'Alle Konfigurationen exportieren', it: 'Esporta tutte le configurazioni', nl: 'Alle configuraties exporteren', pl: 'Eksportuj wszystkie konfiguracje', ru: 'Eksportirovat vse konfiguratsii', zh: 'Daochu quanbu peizhi', ja: 'Subete no settei wo ekusupooto', ko: 'Modeun seoljeong naebonaegi', ar: 'Tasd ir kull aliidadat', hi: 'Sabhi configurations export karein' },
        'Import configurations': { pt: 'Importar configuracoes', es: 'Importar configuraciones', fr: 'Importer des configurations', de: 'Konfigurationen importieren', it: 'Importa configurazioni', nl: 'Configuraties importeren', pl: 'Importuj konfiguracje', ru: 'Importirovat konfiguratsii', zh: 'Daoru peizhi', ja: 'Settei wo inpooto', ko: 'Seoljeong gajyeoogi', ar: 'Istirad aliidadat', hi: 'Configurations import karein' },
        'Import configuration': { pt: 'Importar configuracao', es: 'Importar configuracion', fr: 'Importer une configuration', de: 'Konfiguration importieren', it: 'Importa configurazione', nl: 'Configuratie importeren', pl: 'Importuj konfiguracje', ru: 'Importirovat konfiguratsiyu', zh: 'Daoru peizhi', ja: 'Settei wo inpooto', ko: 'Seoljeong gajyeoogi', ar: 'Istirad iadad', hi: 'Import configuration' },
        'Export configuration': { pt: 'Exportar configuracao', es: 'Exportar configuracion', fr: 'Exporter une configuration', de: 'Konfiguration exportieren', it: 'Esporta configurazione', nl: 'Configuratie exporteren', pl: 'Eksportuj konfiguracje', ru: 'Eksportirovat konfiguratsiyu', zh: 'Daochu peizhi', ja: 'Settei wo ekusupooto', ko: 'Seoljeong naebonaegi', ar: 'Tasd ir iadad', hi: 'Export configuration' },
        'Import UserScript': { pt: 'Importar UserScript', es: 'Importar UserScript', fr: 'Importer UserScript', de: 'UserScript importieren', it: 'Importa UserScript', nl: 'UserScript importeren', pl: 'Importuj UserScript', ru: 'Importirovat UserScript', zh: 'Daoru UserScript', ja: 'UserScript wo inpooto', ko: 'UserScript gajyeoogi', ar: 'Istirad UserScript', hi: 'Import UserScript' },
        'Export UserScript': { pt: 'Exportar UserScript', es: 'Exportar UserScript', fr: 'Exporter UserScript', de: 'UserScript exportieren', it: 'Esporta UserScript', nl: 'UserScript exporteren', pl: 'Eksportuj UserScript', ru: 'Eksportirovat UserScript', zh: 'Daochu UserScript', ja: 'UserScript wo ekusupooto', ko: 'UserScript naebonaegi', ar: 'Tasd ir UserScript', hi: 'Export UserScript' },
        'Import OCR captures': { pt: 'Importar capturas OCR', es: 'Importar capturas OCR', fr: 'Importer captures OCR', de: 'OCR-Erfassungen importieren', it: 'Importa catture OCR', nl: 'OCR-opnames importeren', pl: 'Importuj przechwycenia OCR', ru: 'Importirovat zahvaty OCR', zh: 'Daoru OCR buzhuo', ja: 'OCR kyapucha wo inpooto', ko: 'OCR kaepcheo gajyeoogi', ar: 'Istirad iltiqat OCR', hi: 'Import OCR captures' },
        'Export OCR captures': { pt: 'Exportar capturas OCR', es: 'Exportar capturas OCR', fr: 'Exporter captures OCR', de: 'OCR-Erfassungen exportieren', it: 'Esporta catture OCR', nl: 'OCR-opnames exporteren', pl: 'Eksportuj przechwycenia OCR', ru: 'Eksportirovat zahvaty OCR', zh: 'Daochu OCR buzhuo', ja: 'OCR kyapucha wo ekusupooto', ko: 'OCR kaepcheo naebonaegi', ar: 'Tasd ir iltiqat OCR', hi: 'Export OCR captures' },
        'Delete': { pt: 'Apagar', es: 'Eliminar', fr: 'Supprimer', de: 'Loeschen', it: 'Elimina', nl: 'Verwijderen', pl: 'Usun', ru: 'Udalit', zh: 'Shanchu', ja: 'Sakujo', ko: 'Sakje', ar: 'Hadhf', hi: 'Delete' },
        'Delete action': { pt: 'Apagar acao', es: 'Eliminar accion', fr: 'Supprimer action', de: 'Aktion loeschen', it: 'Elimina azione', nl: 'Actie verwijderen', pl: 'Usun akcje', ru: 'Udalit deystvie', zh: 'Shanchu dongzuo', ja: 'Akushon wo sakujo', ko: 'Aeksyeon sakje', ar: 'Hadhf alijra', hi: 'Action delete karein' },
        'Show configurations': { pt: 'Mostrar configuracoes', es: 'Mostrar configuraciones', fr: 'Afficher configurations', de: 'Konfigurationen anzeigen', it: 'Mostra configurazioni', nl: 'Configuraties tonen', pl: 'Pokaz konfiguracje', ru: 'Pokazat konfiguratsii', zh: 'Xianshi peizhi', ja: 'Settei wo hyoji', ko: 'Seoljeong bogi', ar: 'Izhhar al-iadadat', hi: 'Show configurations' },
        'Show OCR captures': { pt: 'Mostrar capturas OCR', es: 'Mostrar capturas OCR', fr: 'Afficher captures OCR', de: 'OCR-Erfassungen anzeigen', it: 'Mostra catture OCR', nl: 'OCR-opnames tonen', pl: 'Pokaz przechwycenia OCR', ru: 'Pokazat zahvaty OCR', zh: 'Xianshi OCR buzhuo', ja: 'OCR kyapucha wo hyoji', ko: 'OCR kaepcheo bogi', ar: 'Izhhar OCR', hi: 'Show OCR captures' },
        'Show scripts': { pt: 'Mostrar scripts', es: 'Mostrar scripts', fr: 'Afficher scripts', de: 'Skripte anzeigen', it: 'Mostra script', nl: 'Scripts tonen', pl: 'Pokaz skrypty', ru: 'Pokazat skripty', zh: 'Xianshi jiaoben', ja: 'Sukuriputo wo hyoji', ko: 'Seukeulibteu bogi', ar: 'Izhhar scripts', hi: 'Show scripts' },
        'Remove all configurations': { pt: 'Remover todas as configuracoes', es: 'Eliminar todas las configuraciones', fr: 'Supprimer toutes les configurations', de: 'Alle Konfigurationen entfernen', it: 'Rimuovi tutte le configurazioni', nl: 'Alle configuraties verwijderen', pl: 'Usun wszystkie konfiguracje', ru: 'Udalit vse konfiguratsii', zh: 'Shanchu quanbu peizhi', ja: 'Subete no settei wo sakujo', ko: 'Modeun seoljeong sakje', ar: 'Hadhf kull aliidadat', hi: 'Sabhi configurations hataen' },
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
        'Run only the active script': { pt: 'Executar somente o script ativo', es: 'Ejecutar solo el script activo', fr: 'Executer uniquement le script actif', de: 'Nur aktives Skript ausfuehren', it: 'Esegui solo lo script attivo', nl: 'Alleen het actieve script uitvoeren', pl: 'Uruchamiaj tylko aktywny skrypt', ru: 'Zapuskat tolko aktivnyy skript', zh: 'Jin yunxing dangqian jiaoben', ja: 'Akutibu na sukuriputo nomi jikko', ko: 'Hyeonjae seukeulibteu-man silhaeng', ar: 'Shaghel alnass alnashit faqat', hi: 'Run only the active script' },
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

    Object.assign(TEXT, {
        'Theme:': { pt: 'Tema:', es: 'Tema:', fr: 'Theme:', de: 'Theme:', it: 'Tema:', nl: 'Thema:', pl: 'Motyw:', ru: 'Tema:', zh: 'Zhuti:', ja: 'Teema:', ko: 'Tema:', ar: 'Almawdu:', hi: 'Theme:' },
        'Font size:': { pt: 'Tamanho da fonte:', es: 'Tamano de fuente:', fr: 'Taille de police:', de: 'Schriftgroesse:', it: 'Dimensione fonte:', nl: 'Lettergrootte:', pl: 'Rozmiar czcionki:', ru: 'Razmer shrifta:', zh: 'Ziti daxiao:', ja: 'Fonto saizu:', ko: 'Geulkkol keugi:', ar: 'Hajm alkhat:', hi: 'Font size:' },
        'Keymap:': { pt: 'Mapeamento de Chaves:', es: 'Mapa de teclas:', fr: 'Raccourcis clavier:', de: 'Tastenbelegung:', it: 'Mappa tasti:', nl: 'Toetsmap:', pl: 'Mapa klawiszy:', ru: 'Raskladka klavish:', zh: 'Anjian yingse:', ja: 'Kiimappu:', ko: 'Kimab:', ar: 'Khareetat almafatih:', hi: 'Keymap:' },
        'Enable editor': { pt: 'Habilitar editor', es: 'Activar editor', fr: 'Activer l editeur', de: 'Editor aktivieren', it: 'Abilita editor', nl: 'Editor inschakelen', pl: 'Wlacz edytor', ru: 'Vklyuchit redaktor', zh: 'Qiyong bianjiqi', ja: 'Editor wo yuko ni suru', ko: 'Editor kyeogi', ar: 'Tafaeel almuharrir', hi: 'Enable editor' },
        'Enable the editor first.': { pt: 'Habilite o editor primeiro.', es: 'Activa primero el editor.', fr: 'Activez d abord l editeur.', de: 'Aktivieren Sie zuerst den Editor.', it: 'Abilita prima l editor.', nl: 'Schakel eerst de editor in.', pl: 'Najpierw wlacz edytor.', ru: 'Snachala vklyuchite redaktor.', zh: 'Qing xian qiyong bianjiqi.', ja: 'Mazu editor wo yuko ni shite kudasai.', ko: 'Meonjeo editor reul kyeoseyo.', ar: 'Fael almuharrir awalan.', hi: 'Enable the editor first.' },
        'Extension disabled. Activate it to run automations.': { pt: 'A extensao esta desativada. Ative para executar automacoes.', es: 'La extension esta desactivada. Activala para ejecutar automatizaciones.', fr: 'L extension est desactivee. Activez-la pour executer les automatisations.', de: 'Die Erweiterung ist deaktiviert. Aktivieren Sie sie zum Ausfuehren.', it: 'L estensione e disattivata. Attivala per eseguire automazioni.', nl: 'De extensie is uitgeschakeld. Zet haar aan om automatiseringen uit te voeren.', pl: 'Rozszerzenie jest wylaczone. Wlacz je, aby uruchamiac automatyzacje.', ru: 'Rasshirenie otklyucheno. Vklyuchite ego dlya avtomatizatsii.', zh: 'Kuozhan yi guanbi. Qing qiyong hou yunxing.', ja: 'Kakucho wa mukou desu. Yuko ni shite jikko.', ko: 'Hwakjang peurogeuraem-i kkeojyeo isseumnida.', ar: 'Alidafa muattala. Faelha littanfidh.', hi: 'Extension disabled. Activate it to run automations.' },
        'Classic': { pt: 'Classico', es: 'Clasico', fr: 'Classique', de: 'Klassisch', it: 'Classico', nl: 'Klassiek', pl: 'Klasyczny', ru: 'Klassicheskiy', zh: 'Jingdian', ja: 'Kurasikku', ko: 'Keullaesik', ar: 'Klasiki', hi: 'Classic' },
        'Smart': { pt: 'Inteligente', es: 'Inteligente', fr: 'Intelligent', de: 'Smart', it: 'Intelligente', nl: 'Slim', pl: 'Inteligentny', ru: 'Umnyy', zh: 'Zhineng', ja: 'Sumato', ko: 'Seumateu', ar: 'Dhaki', hi: 'Smart' },
        'Spaces': { pt: 'Espacos', es: 'Espacios', fr: 'Espaces', de: 'Leerzeichen', it: 'Spazi', nl: 'Spaties', pl: 'Spacje', ru: 'Probely', zh: 'Kongge', ja: 'Supeesu', ko: 'Gongbaek', ar: 'Faraghat', hi: 'Spaces' },
        'Tabs': { pt: 'Guias', es: 'Tabuladores', fr: 'Tabulations', de: 'Tabs', it: 'Tab', nl: 'Tabs', pl: 'Tabulatory', ru: 'Taby', zh: 'Tab', ja: 'Tabu', ko: 'Taeb', ar: 'Tabs', hi: 'Tabs' },
        'Off': { pt: 'Desativado', es: 'Desactivado', fr: 'Desactive', de: 'Aus', it: 'Disattivo', nl: 'Uit', pl: 'Wyl.', ru: 'Vykl', zh: 'Guan', ja: 'Off', ko: 'Off', ar: 'Off', hi: 'Off' },
        'Selection': { pt: 'Selecao', es: 'Seleccion', fr: 'Selection', de: 'Auswahl', it: 'Selezione', nl: 'Selectie', pl: 'Zaznaczenie', ru: 'Vybor', zh: 'Xuanze', ja: 'Sentaku', ko: 'Seontaek', ar: 'Tahdid', hi: 'Selection' },
        'Main DOM': { pt: 'DOM principal', es: 'DOM principal', fr: 'DOM principal', de: 'Haupt-DOM', it: 'DOM principale', nl: 'Hoofd-DOM', pl: 'Glowny DOM', ru: 'Glavnyy DOM', zh: 'Zhu DOM', ja: 'Mein DOM', ko: 'Mein DOM', ar: 'DOM alraeesi', hi: 'Main DOM' }
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
            el.innerHTML = '<svg class="topbar-lang-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a14 14 0 0 1 0 18"></path><path d="M12 3a14 14 0 0 0 0 18"></path></svg>';
            el.setAttribute('title', LANGUAGES[normalized].label);
            el.setAttribute('aria-label', LANGUAGES[normalized].label);
        });
        document.querySelectorAll('[data-acfh-lang-option]').forEach((el) => {
            const active = normalizeLang(el.getAttribute('data-acfh-lang-option')) === normalized;
            el.setAttribute('aria-pressed', active ? 'true' : 'false');
            el.classList.toggle('active', active);
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
