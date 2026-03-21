"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";
import { CATEGORIES } from "@/lib/categories";
import { useState } from "react";

export default function CategoriesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const t = useTranslations();

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">{t("categoriesPage.title")}</h1>
          <p className="text-gray-400">
            {CATEGORIES.length} {t("hero.statsCategories").toLowerCase()} &middot;{" "}
            {CATEGORIES.reduce((a, c) => a + c.subcategories.length, 0)}{" "}
            {t("categoriesPage.subcategories")}
          </p>
        </div>

        <div className="grid gap-4">
          {CATEGORIES.map((cat) => {
            const isExpanded = expandedId === cat.id;
            return (
              <div
                key={cat.id}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-800/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{cat.icon}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {t(`categories.${cat.slug}`)}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {t(`categories.${cat.slug}Desc`)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {cat.subcategories.length} {t("categoriesPage.subcategories")}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-800/50">
                    <div className="flex flex-wrap gap-3 mt-4">
                      {cat.subcategories.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/lobby?category=${cat.slug}`}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-xl text-sm transition-all"
                        >
                          {sub.icon && <span>{sub.icon}</span>}
                          <span className="text-gray-300">
                            {t(`subcategories.${sub.slug}`)}
                          </span>
                        </Link>
                      ))}
                    </div>
                    <Link
                      href={`/lobby?category=${cat.slug}`}
                      className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {t("categoriesPage.findIn")} «{t(`categories.${cat.slug}`)}»
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
