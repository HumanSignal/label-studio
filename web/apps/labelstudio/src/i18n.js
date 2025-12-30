import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../../locales/en/translation.json';
import zhCN from '../../../locales/zh-CN/translation.json';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            'zh-CN': { translation: zhCN },
        },
        // Default language for demo — set to 'en' to keep English by default
        lng: 'zh-CN',
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
    });

export default i18n;
