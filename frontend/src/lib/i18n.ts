import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ruTranslations from "./locales/ru/translation.json";
import ukTranslations from "./locales/uk/translation.json";
import enTranslations from "./locales/en/translation.json";

const resources = {
  en: {
    translation: enTranslations,
  },
  ru: {
    translation: ruTranslations,
  },
  uk: {
    translation: ukTranslations,
  },
};

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: "en", // Язык, который будет использоваться, если перевод отсутствует
  debug: process.env.NODE_ENV === "development", // Включаем логи в режиме разработки
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
