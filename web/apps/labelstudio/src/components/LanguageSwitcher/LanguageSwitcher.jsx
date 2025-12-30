import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const changeToEn = () => i18n.changeLanguage('en');
    const changeToZh = () => i18n.changeLanguage('zh-CN');

    return (
        <div className="language-switcher" style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
            <button onClick={changeToEn} aria-label="Switch to English" style={{ marginRight: 8 }}>
                EN
            </button>
            <button onClick={changeToZh} aria-label="切换到中文">
                中文
            </button>
        </div>
    );
};

export default LanguageSwitcher;
