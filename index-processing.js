(function () {
    'use strict';
    window.acfhIndexI18n = window.acfhIndexI18n || {
        getStrings() {
            const lang = window.ACFH_I18N && window.ACFH_I18N.getLanguage ? window.ACFH_I18N.getLanguage() : 'en';
            return {
                lang,
                test: {
                    clickFeedback: window.ACFH_I18N ? window.ACFH_I18N.t('Clicked successfully', lang) : 'Clicked successfully',
                    fill: {
                        passwordShow: window.ACFH_I18N ? window.ACFH_I18N.t('Show', lang) : 'Show',
                        passwordHide: window.ACFH_I18N ? window.ACFH_I18N.t('Hide', lang) : 'Hide'
                    },
                    message: {
                        sending: window.ACFH_I18N ? window.ACFH_I18N.t('Sending...', lang) : 'Sending...',
                        sent: window.ACFH_I18N ? window.ACFH_I18N.t('Message sent', lang) : 'Message sent'
                    }
                }
            };
        }
    };
})();
