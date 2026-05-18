(function () {
    'use strict';

    if (window.__autoClickerSelectorCaptureLoaded) {
        return;
    }
    window.__autoClickerSelectorCaptureLoaded = true;

    let lastRightClickElement = null;

    function normalizeElement(target) {
        if (!target) {
            return null;
        }
        if (target.nodeType === Node.ELEMENT_NODE) {
            return target;
        }
        return target.parentElement || null;
    }

    function generateXPath(element) {
        element = normalizeElement(element);
        if (!element) {
            return '';
        }
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
            const part = index > 1 ? `${tagName}[${index}]` : tagName;
            parts.unshift(part);
            element = element.parentNode;
        }
        return `/${parts.join("/")}`;
    }

    function getCSSSelector(element) {
        element = normalizeElement(element);
        if (!element) {
            return '';
        }
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let selector = element.nodeName.toLowerCase();
            if (element.id) {
                selector = `#${element.id}`;
                path.unshift(selector);
                break;
            }
            let sibling = element;
            let nth = 1;
            while (sibling.previousElementSibling) {
                sibling = sibling.previousElementSibling;
                if (sibling.nodeName.toLowerCase() === selector) {
                    nth++;
                }
            }
            if (nth > 1) {
                selector += `:nth-child(${nth})`;
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    document.addEventListener('contextmenu', (event) => {
        const composedTarget = event.composedPath && event.composedPath()[0];
        lastRightClickElement = normalizeElement(composedTarget || event.target);
    }, true);

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || (message.action !== 'getXPathAtClick' && message.action !== 'getCSSAtClick')) {
            return false;
        }

        const target = normalizeElement(lastRightClickElement);
        if (!target) {
            sendResponse({ xpath: null, cssSelector: null });
            return true;
        }

        const xpath = generateXPath(target);
        const cssSelector = getCSSSelector(target);
        sendResponse({
            xpath: message.action === 'getXPathAtClick' ? xpath : null,
            cssSelector: message.action === 'getCSSAtClick' ? cssSelector : null
        });
        lastRightClickElement = null;
        return true;
    });
})();
