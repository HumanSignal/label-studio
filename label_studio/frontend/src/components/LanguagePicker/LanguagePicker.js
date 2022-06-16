import React, { useState } from 'react';
import { Block } from '../../utils/bem';
import { Button } from '../../components';
import './LanguagePicker.styl';
import i18n from "i18next";

export const LanguagePicker = () => {

  const [language, setLanguage] = useState(i18n.language);

  const changeLanguage = (e) => {
    e.preventDefault();
    setLanguage(e.target.value);
    i18n.changeLanguage(e.target.value);
  };

  return (
    <Block tag="li" name="language-picker">
      <Button size="small" type={language === 'en' ? "button" : "text"} value='en' onClick={changeLanguage}>
        English
      </Button>
      <Button size="small" type={language === 'pt' ? "button" : "text"} value='pt' onClick={changeLanguage}>
        Português
      </Button>
      <Button size="small" type={language === 'zh' ? "button" : "text"} value='zh' onClick={changeLanguage}>
        简体中文
      </Button>
    </Block>
  );
};
