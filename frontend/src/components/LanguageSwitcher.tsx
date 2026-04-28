import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "bn", label: "Bengali" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "ur", label: "Urdu" },
  { code: "ne", label: "Nepali" },
] as const;

function LanguageDropdown() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleChange = (language: string) => {
    void i18n.changeLanguage(language);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-24">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[#eadfe3] bg-white px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition hover:border-[#d8c1c9]"
        aria-label={t("language")}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-[#4a4a4a]">
          <svg className="h-4 w-4 text-[#800020]" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M2.5 10H17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M10 2.5C12.2 4.8 13.4 7.2 13.4 10C13.4 12.8 12.2 15.2 10 17.5C7.8 15.2 6.6 12.8 6.6 10C6.6 7.2 7.8 4.8 10 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span>LN</span>
        </span>
        <svg className="h-4 w-4 text-[#800020]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.12l3.71-3.89a.75.75 0 111.08 1.04l-4.25 4.46a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-full rounded-xl border border-[#eadfe3] bg-white p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.14)]">
          {languages.map((language) => {
            const isActive = i18n.language.startsWith(language.code);
            return (
              <button
                key={language.code}
                type="button"
                onClick={() => handleChange(language.code)}
                className={[
                  "flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                  isActive
                    ? "bg-[#800020] text-white"
                    : "text-[#4a4a4a] hover:bg-[#fff0f3] hover:text-[#800020]",
                ].join(" ")}
                aria-current={isActive ? "true" : "false"}
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M2.5 10H17.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </span>
                {language.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageDropdown;