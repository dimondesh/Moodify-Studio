import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ruTranslations from "./locales/ru/translation.json";
import ukTranslations from "./locales/uk/translation.json";
import enTranslations from "./locales/en/translation.json";

// Ресурсы переводов
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

i18n
  .use(LanguageDetector) // Используем детектор языка браузера
  .use(initReactI18next) // Передаем i18n в react-i18next
  .init({
    resources,
    fallbackLng: "en", // Язык, который будет использоваться, если перевод отсутствует
    debug: process.env.NODE_ENV === "development", // Включаем логи в режиме разработки
    interpolation: {
      escapeValue: false, // React уже защищает от XSS
    },
    detection: {
      order: ["localStorage", "navigator"], // Порядок определения языка
      caches: ["localStorage"],
    },
  });

export default i18n;
