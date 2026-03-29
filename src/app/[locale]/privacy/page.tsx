"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";

export default function PrivacyPage() {
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

          <h1 className="text-3xl font-bold text-white mt-4 mb-2">{t("privacyTitle")}</h1>
          <p className="text-sm text-gray-500 mb-8">{t("privacyLastUpdated")}</p>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS1Title")}</h2>
              <p>{t("privacyS1Text")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i}>{t(`privacyS1Li${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS2Title")}</h2>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <li key={i}>{t(`privacyS2Li${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS3Title")}</h2>
              <p>{t("privacyS3Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS4Title")}</h2>
              <p>{t("privacyS4Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS5Title")}</h2>
              <p>{t("privacyS5Text")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {[1, 2, 3].map((i) => (
                  <li key={i}>{t(`privacyS5Li${i}`)}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS6Title")}</h2>
              <p>{t("privacyS6Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS7Title")}</h2>
              <p>{t("privacyS7Text")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i}>{t(`privacyS7Li${i}`)}</li>
                ))}
              </ul>
              <p>{t("privacyS7Outro")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS8Title")}</h2>
              <p>{t("privacyS8Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS9Title")}</h2>
              <p>{t("privacyS9Text")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">{t("privacyS10Title")}</h2>
              <p>{t("privacyS10Text")}</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
