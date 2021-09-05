import React, { useState } from 'react';
import { Block } from '../../utils/bem';
import { Button } from '../../components';
import './LanguagePicker.styl';
import i18n from "i18next";

export const LanguagePicker = () => {
  const [, setLanguage] = useState('en');

  const changeLanguage = (e) => {
    e.preventDefault();
    setLanguage(e.target.value);
    i18n.changeLanguage(e.target.value);
  };

  return (
    <Block tag="li" name="language-picker">
      <Button size="small" value='en' onClick={changeLanguage}>
        English
      </Button>
      <Button size="small" type="text" value='pt' onClick={changeLanguage}>
        Português
      </Button>
    </Block>);
};
