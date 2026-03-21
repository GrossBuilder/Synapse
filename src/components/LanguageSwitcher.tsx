"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useState, useRef, useEffect } from "react";

const LOCALE_INFO: Record<string, { flag: string; label: string }> = {
  en: { flag: "🇬🇧", label: "English" },
  ru: { flag: "🇷🇺", label: "Русский" },
  es: { flag: "🇪🇸", label: "Español" },
  zh: { flag: "🇨🇳", label: "中文" },
  ar: { flag: "🇸🇦", label: "العربية" },
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  const current = LOCALE_INFO[locale] || LOCALE_INFO.en;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg text-sm transition-colors"
      >
        <span>{current.flag}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[140px] z-50">
          {routing.locales.map((loc) => {
            const info = LOCALE_INFO[loc];
            const isActive = loc === locale;
            return (
              <button
                key={loc}
                onClick={() => handleChange(loc)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <span>{info.flag}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
