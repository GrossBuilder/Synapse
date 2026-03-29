"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";

export default function TermsPage() {
  const t = useTranslations("legal");

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-950 pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors mb-6 inline-flex items-center gap-1"
          >
            ← {t("backToHome")}
          </Link>

          <h1 className="text-3xl font-bold text-white mt-4 mb-2">{t("termsTitle")}</h1>
          <p className="text-sm text-gray-500 mb-8">{t("termsLastUpdated")}</p>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS1Title")}</h2>
              <p>{t("termsS1Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS2Title")}</h2>
              <p>{t("termsS2Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS3Title")}</h2>
              <p>{t("termsS3Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS4Title")}</h2>
              <p>{t("termsS4Text")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <li key={i}>{t(`termsS4Li${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS5Title")}</h2>
              <p>{t("termsS5Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS6Title")}</h2>
              <p>{t("termsS6Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS7Title")}</h2>
              <p>{t("termsS7Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS8Title")}</h2>
              <p>{t("termsS8Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS9Title")}</h2>
              <p>{t("termsS9Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS10Title")}</h2>
              <p>{t("termsS10Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("termsS11Title")}</h2>
              <p>{t("termsS11Text")}</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
