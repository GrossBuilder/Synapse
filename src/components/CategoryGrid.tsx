"use client";

import { Category } from "@/types";
import { CATEGORIES } from "@/lib/categories";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface CategoryGridProps {
  onSelect: (category: Category) => void;
  selectedSlug?: string;
}

export default function CategoryGrid({ onSelect, selectedSlug }: CategoryGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const t = useTranslations();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {CATEGORIES.map((category) => {
        const isSelected = selectedSlug === category.slug;
        const isHovered = hoveredId === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onSelect(category)}
            onMouseEnter={() => setHoveredId(category.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`
              relative group p-6 rounded-2xl border transition-all duration-300 text-left
              ${
                isSelected
                  ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20"
                  : "border-gray-800 bg-gray-900/50 hover:border-gray-600 hover:bg-gray-800/50"
              }
            `}
          >
            {(isSelected || isHovered) && (
              <div
                className="absolute inset-0 rounded-2xl opacity-20 blur-xl transition-opacity"
                style={{ backgroundColor: category.color }}
              />
            )}

            <div className="relative z-10">
              <span className="text-3xl mb-3 block">{category.icon}</span>
              <h3 className="text-lg font-semibold text-white mb-1">
                {t(`categories.${category.slug}`)}
              </h3>
              <p className="text-sm text-gray-400 line-clamp-2">
                {t(`categories.${category.slug}Desc`)}
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-xs text-gray-500">
                  {category.subcategories.length} {t("categoriesPage.subcategories")}
                </span>
              </div>
            </div>

            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
