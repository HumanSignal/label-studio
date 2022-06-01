import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
 
import { TRANSLATIONS_PT } from "./pt/translations";
import { TRANSLATIONS_EN } from "./en/translations";
import { TRANSLATIONS_ZH } from "./zh/translations";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: TRANSLATIONS_EN,
      },
      pt: {
        translation: TRANSLATIONS_PT,
      },
      zh: {
        translation: TRANSLATIONS_ZH,
      },
    },
    fallbackLng: "en",
    react: {
      // ...
      hashTransKey(defaultValue) {
        // // return a key based on defaultValue or if you prefer to just remind you should set a key return false and throw an error
        // console.log(defaultValue);
        return defaultValue;
      },
      defaultTransParent: 'div', // a valid react element - required before react 16
      transEmptyNodeValue: '', // what to return for empty Trans
      transSupportBasicHtmlNodes: true, // allow <br/> and simple html elements in translations
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i'], // don't convert to <1></1> if simple react elements
      transWrapTextNodes: '', // Wrap text nodes in a user-specified element.
      // i.e. set it to 'span'. By default, text nodes are not wrapped.
      // Can be used to work around a well-known Google Translate issue with React apps. See: https://github.com/facebook/react/issues/11538
      // (v11.10.0)
    },
  });
