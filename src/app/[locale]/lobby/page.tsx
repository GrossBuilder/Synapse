"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";
import CategoryGrid from "@/components/CategoryGrid";
import MatchingScreen from "@/components/MatchingScreen";
import PushPrompt from "@/components/PushPrompt";
import { CATEGORIES } from "@/lib/categories";
import { REGIONS } from "@/lib/regions";
import { Category, Subcategory } from "@/types";
import { Button } from "@/components/ui";

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const t = useTranslations();

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedSubsMap, setSelectedSubsMap] = useState<Record<string, string[]>>({});
  const [selectedRegion, setSelectedRegion] = useState("global");
  const [isSearching, setIsSearching] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved subcategories from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("synapse-subcategories");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setSelectedSubsMap(parsed);
        }
      } catch {}
    }
    setMounted(true);
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("synapse-subcategories", JSON.stringify(selectedSubsMap));
    }
  }, [selectedSubsMap, mounted]);

  // Profile & region
  useEffect(() => {
    if (session?.user) {
      const userRegion = (session.user as { region?: string }).region;
      if (userRegion) setSelectedRegion(userRegion);

      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.preferredRegion) setSelectedRegion(data.preferredRegion);
          if (data.tags?.length) setProfileTags(data.tags);
        })
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    const catSlug = searchParams.get("category");
    if (catSlug) {
      setExpandedCategory(catSlug);
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handleCategoryClick = (category: Category) => {
    setExpandedCategory((prev) => (prev === category.slug ? null : category.slug));
  };

  const toggleSubcategory = (categorySlug: string, subSlug: string) => {
    setSelectedSubsMap((prev) => {
      const current = prev[categorySlug] || [];
      const updated = current.includes(subSlug)
        ? current.filter((s) => s !== subSlug)
        : [...current, subSlug];

      const newMap = { ...prev };
      if (updated.length === 0) {
        delete newMap[categorySlug];
      } else {
        newMap[categorySlug] = updated;
      }
      return newMap;
    });
  };

  // Flatten all selected subcategories for display
  const allSelectedSubs = Object.entries(selectedSubsMap).flatMap(
    ([catSlug, subs]) => {
      const cat = CATEGORIES.find((c) => c.slug === catSlug);
      if (!cat) return [];
      return subs
        .map((subSlug) => {
          const sub = cat.subcategories.find((s) => s.slug === subSlug);
          return sub ? { categorySlug: catSlug, sub, cat } : null;
        })
        .filter(Boolean) as { categorySlug: string; sub: Subcategory; cat: Category }[];
    }
  );

  const hasSelection = allSelectedSubs.length > 0;
  const primaryCategory = CATEGORIES.find(
    (c) => selectedSubsMap[c.slug]?.length > 0
  );

  const handleStartSearch = () => {
    if (!hasSelection || !primaryCategory) return;
    setIsSearching(true);

    const allSubs = Object.values(selectedSubsMap).flat().join(",");

    searchTimerRef.current = setTimeout(() => {
      router.push(
        `/chat?category=${primaryCategory.slug}&region=${selectedRegion}${
          allSubs ? `&subs=${allSubs}` : ""
        }${
          profileTags.length
            ? `&tags=${encodeURIComponent(profileTags.join(","))}`
            : ""
        }`
      );
    }, 3000);
  };

  const handleCancelSearch = () => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    setIsSearching(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isSearching && primaryCategory) {
    return (
      <MatchingScreen
        categoryName={t(`categories.${primaryCategory.slug}`)}
        categoryIcon={primaryCategory.icon}
        queuePosition={queuePosition}
        onCancel={handleCancelSearch}
      />
    );
  }

  const expandedCategoryData = expandedCategory
    ? CATEGORIES.find((c) => c.slug === expandedCategory)
    : null;

  return (
    <>
      <Navbar
        action={
          hasSelection ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartSearch}
            >
              {t("lobby.findPartner")}
            </Button>
          ) : undefined
        }
      />
      <main className="pt-24 pb-32 px-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">{t("lobby.title")}</h1>
          <p className="text-gray-400">{t("lobby.subtitle")}</p>
        </div>

        {/* Step 1: Category Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
              1
            </span>
            {t("lobby.step1")}
          </h2>
          <CategoryGrid
            onSelect={handleCategoryClick}
            expandedSlug={expandedCategory || undefined}
            selectedSubsMap={selectedSubsMap}
          />
        </div>

        {/* Expanded category — subcategory picker */}
        {expandedCategoryData && (
          <div className="mb-10 p-6 rounded-2xl bg-gray-900/50 border border-gray-800 animate-in slide-in-from-top-2 duration-300">
            <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">{expandedCategoryData.icon}</span>
              {t(`categories.${expandedCategoryData.slug}`)}
              <span className="text-sm font-normal text-gray-500">
                — {t("lobby.selectSubcategories")}
              </span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {expandedCategoryData.subcategories.map((sub) => {
                const isSelected = (
                  selectedSubsMap[expandedCategoryData.slug] || []
                ).includes(sub.slug);
                return (
                  <button
                    key={sub.id}
                    onClick={() =>
                      toggleSubcategory(expandedCategoryData.slug, sub.slug)
                    }
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                      ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "bg-gray-800/50 text-gray-300 border border-gray-700 hover:border-gray-600"
                      }
                    `}
                  >
                    {sub.icon && <span>{sub.icon}</span>}
                    {t(`subcategories.${sub.slug}`)}
                    {isSelected && (
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Selected subcategories summary */}
        {hasSelection && (
          <div className="mb-10 animate-in fade-in duration-300">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span>
              {t("lobby.step2")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {allSelectedSubs.map(({ categorySlug, sub, cat }) => (
                <span
                  key={`${categorySlug}-${sub.slug}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 text-sm border border-indigo-500/30"
                >
                  {cat.icon && (
                    <span className="text-xs opacity-60">{cat.icon}</span>
                  )}
                  {sub.icon && <span>{sub.icon}</span>}
                  {t(`subcategories.${sub.slug}`)}
                  <button
                    onClick={() => toggleSubcategory(categorySlug, sub.slug)}
                    className="ml-1 hover:text-white transition-colors"
                    aria-label={t("common.close")}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Region Filter */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
              {hasSelection ? "3" : "2"}
            </span>
            {t("lobby.step3")}
            <span className="text-sm font-normal text-gray-500">
              {t("lobby.step3Optional")}
            </span>
          </h2>

          <div className="flex flex-wrap gap-3">
            {REGIONS.map((r) => {
              const isSelected = selectedRegion === r.slug;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRegion(r.slug)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "bg-gray-800/50 text-gray-300 border border-gray-700 hover:border-gray-600"
                    }
                  `}
                >
                  <span>{r.icon}</span>
                  {t(`regions.${r.slug}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom bar removed — button is in Navbar */}
      </main>

      {/* Push notification prompt */}
      <PushPrompt />
    </>
  );
}

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      }
    >
      <LobbyContent />
    </Suspense>
  );
}
