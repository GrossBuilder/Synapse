"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";

export default function GuidePage() {
  const t = useTranslations("guide");
  const router = useRouter();

  const sections = [
    {
      icon: "🚀",
      title: t("gettingStartedTitle"),
      steps: [t("step1"), t("step2"), t("step3"), t("step4")],
    },
    {
      icon: "🎯",
      title: t("categoriesTitle"),
      steps: [t("cat1"), t("cat2"), t("cat3")],
    },
    {
      icon: "📹",
      title: t("chatTitle"),
      steps: [t("chat1"), t("chat2"), t("chat3"), t("chat4")],
    },
    {
      icon: "🛡️",
      title: t("safetyTitle"),
      steps: [t("safety1"), t("safety2"), t("safety3"), t("safety4")],
    },
    {
      icon: "⭐",
      title: t("subscriptionsTitle"),
      steps: [t("sub1"), t("sub2"), t("sub3")],
    },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-950 pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push("/lobby")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("back")}
          </button>

          <h1 className="text-3xl font-bold text-white mb-2">{t("title")}</h1>
          <p className="text-gray-400 mb-10">{t("subtitle")}</p>

          <div className="space-y-8">
            {sections.map((section, i) => (
              <div
                key={i}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6"
              >
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="text-xl">{section.icon}</span>
                  {section.title}
                </h2>
                <ol className="space-y-3">
                  {section.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span className="shrink-0 w-6 h-6 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        {j + 1}
                      </span>
                      <span className="text-sm text-gray-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
