(function () {
  'use strict';

  // During local development the extension options must use the same localhost
  // page as the bridge/content-script permissions, otherwise fresh changes and
  // local storage mirroring are split across different origins.
  const LOCAL_OPTIONS_URL = 'https://uiautotool.vercel.app/options.html?src=extension';
  const OPTIONS_URL_PATTERNS = [
    'http://127.0.0.1:5500/web/options.html*',
    'http://localhost:5500/web/options.html*',
    'http://127.0.0.1:5500/options.html*',
    'http://localhost:5500/options.html*',
    'https://uiautotool.vercel.app/options.html*',
    'https://uiautotool.vercel.app/*/options.html*',
    'https://bfjhgisfzdsefjjojbov.supabase.co/storage/v1/object/public/web/options.html*'
  ];

  function openOrFocus() {
    try {
      chrome.tabs.query({ url: OPTIONS_URL_PATTERNS }, (tabs) => {
        const existing = (tabs && tabs.length) ? tabs[0] : null;
        if (existing && existing.id != null) {
          chrome.tabs.update(existing.id, { active: true }, () => {
            chrome.windows.update(existing.windowId, { focused: true });
          });
          return;
        }

        // Open in a normal tab so the site can run and the content script bridge can attach.
        chrome.tabs.create({ url: LOCAL_OPTIONS_URL });
      });
    } catch (e) {
      // Ignore; user can click the link.
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const link = document.getElementById('openOptionsLink');
    if (link) link.href = LOCAL_OPTIONS_URL;
    openOrFocus();
  });
})();
