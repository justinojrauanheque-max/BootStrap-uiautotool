// bootstrap.js
// Loads public assets from the Supabase `web` bucket and initializes the page.
(function () {
  'use strict';

  // Public URL for the `web` bucket (update if different)
  var SUPABASE_BASE = 'https://bfjhgisfzdsefjjojbov.supabase.co/storage/v1/object/public/web';
  window.ACFH_SUPABASE_BASE = SUPABASE_BASE;

  // Robust loader: inject resources directly and continue on load/error.
  function loadCssDirect(href, cb) {
    var l = document.createElement('link');
    var done = false;
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = function () { if (done) return; done = true; cb(true); };
    l.onerror = function () { if (done) return; done = true; cb(false); };
    // Fallback timeout (in case onload/onerror don't fire)
    setTimeout(function () { if (done) return; done = true; cb(false); }, 5000);
    document.head.appendChild(l);
  }

  function loadScriptDirect(url, cb) {
    var s = document.createElement('script');
    var done = false;
    s.src = url;
    s.defer = true;
    s.onload = function () { if (done) return; done = true; cb(true); };
    s.onerror = function () { if (done) return; done = true; cb(false); };
    // Fallback timeout
    setTimeout(function () { if (done) return; done = true; cb(false); }, 7000);
    document.head.appendChild(s);
  }

  function assetUrl(path) {
    return SUPABASE_BASE + '/' + String(path)
      .split('/')
      .map(encodeURIComponent)
      .join('/');
  }

  var cssCandidates = [
    'options.css',
    'lib/codemirror/codemirror.css',
    'lib/codemirror/monokai.css'
  ];

  var scriptCandidates = [
    'acfh-i18n.js',
    'lib/codemirror/codemirror.js',
    'lib/codemirror/mode/javascript/javascript.js',
    'lib/codemirror/addon/edit/matchbrackets.js',
    'navbar.js',
    'settings-processing.js',
    'index-processing.js',
    'options.js'
  ];
  // Load available CSS (attempt each, proceed regardless)
  cssCandidates.forEach(function (name) {
    var url = assetUrl(name);
    loadCssDirect(url, function () { /* ignore result */ });
  });

  // Load scripts sequentially (attempt each, continue on error)
  (function loadNext(i) {
    if (i >= scriptCandidates.length) {
      finish();
      return;
    }
    var name = scriptCandidates[i];
    var url = assetUrl(name);
    loadScriptDirect(url, function () { loadNext(i + 1); });
  })(0);

  function finish() {
    try {
      var overlay = document.querySelector('.acfh-skeleton-overlay');
      if (overlay) {
        overlay.classList.remove('acfh-loading-overlay');
        overlay.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new Event('acfh:bootstrap:loaded')); } catch (e) {}
  }

})();
