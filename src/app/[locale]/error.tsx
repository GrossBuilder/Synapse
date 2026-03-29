"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-gray-950 text-white">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-3xl font-bold mb-3">{t("somethingWrong")}</h1>
        <p className="text-gray-400 mb-8">{t("errorDesc")}</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
          >
            {t("tryAgain")}
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors"
          >
            {t("goHome")}
          </Link>
        </div>
      </div>
    </main>
  );
}
