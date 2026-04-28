import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";
import ta from "./locales/ta.json";
import te from "./locales/te.json";
import gu from "./locales/gu.json";
import pa from "./locales/pa.json";
import bn from "./locales/bn.json";
import kn from "./locales/kn.json";
import ml from "./locales/ml.json";
import ur from "./locales/ur.json";
import ne from "./locales/ne.json";

const languageStorageKey = "smartaid-language";
const supportedLanguages = ["en", "hi", "mr", "ta", "te", "gu", "pa", "bn", "kn", "ml", "ur", "ne"] as const;
const savedLanguage = localStorage.getItem(languageStorageKey);
type SupportedLanguage = (typeof supportedLanguages)[number];

const toSupportedLanguage = (value: string | null | undefined): SupportedLanguage | null => {
  if (!value) return null;
  const normalized = value.toLowerCase().split("-")[0] as SupportedLanguage;
  return supportedLanguages.includes(normalized) ? normalized : null;
};

const detectBrowserLanguage = (): SupportedLanguage => {
  const languageFromList = navigator.languages
    ?.map((lang) => toSupportedLanguage(lang))
    .find((lang): lang is SupportedLanguage => Boolean(lang));

  return languageFromList || toSupportedLanguage(navigator.language) || "en";
};

const initialLanguage = toSupportedLanguage(savedLanguage) || detectBrowserLanguage();

if (!i18next.isInitialized) {
  i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      ta: { translation: ta },
      te: { translation: te },
      gu: { translation: gu },
      pa: { translation: pa },
      bn: { translation: bn },
      kn: { translation: kn },
      ml: { translation: ml },
      ur: { translation: ur },
      ne: { translation: ne },
    },
    lng: initialLanguage,
    fallbackLng: "en",
    supportedLngs: ["en", "hi", "mr", "ta", "te", "gu", "pa", "bn", "kn", "ml", "ur", "ne"],
    interpolation: {
      escapeValue: false,
    },
  });

  i18next.on("languageChanged", (language) => {
    localStorage.setItem(languageStorageKey, language);
  });
}

export default i18next;