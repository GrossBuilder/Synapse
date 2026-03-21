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
import { CATEGORIES, getCategoryBySlug } from "@/lib/categories";
import { REGIONS } from "@/lib/regions";
import { Category, Subcategory } from "@/types";
import { Button } from "@/components/ui";

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const t = useTranslations();

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("global");
  const [isSearching, setIsSearching] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Подхватываем регион из сессии и профиль
  useEffect(() => {
    if (session?.user) {
      const userRegion = (session.user as { region?: string }).region;
      if (userRegion) setSelectedRegion(userRegion);

      // Загрузить профиль для заполнения тегов и региона
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          if (data.preferredRegion) setSelectedRegion(data.preferredRegion);
          if (data.tags?.length) setProfileTags(data.tags);
          if (data.interests?.length) setSelectedSubs(data.interests);
        })
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    const catSlug = searchParams.get("category");
    if (catSlug) {
      const cat = getCategoryBySlug(catSlug);
      if (cat) setSelectedCategory(cat);
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedSubs([]);
  };

  const toggleSubcategory = (sub: Subcategory) => {
    setSelectedSubs((prev) =>
      prev.includes(sub.slug)
        ? prev.filter((s) => s !== sub.slug)
        : [...prev, sub.slug]
    );
  };

  const handleStartSearch = () => {
    if (!selectedCategory) return;
    setIsSearching(true);

    searchTimerRef.current = setTimeout(() => {
      router.push(
        `/chat?category=${selectedCategory.slug}&region=${selectedRegion}${
          selectedSubs.length ? `&subs=${selectedSubs.join(",")}` : ""
        }${profileTags.length ? `&tags=${encodeURIComponent(profileTags.join(","))}` : ""}`
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

  if (isSearching && selectedCategory) {
    return (
      <MatchingScreen
        categoryName={t(`categories.${selectedCategory.slug}`)}
        categoryIcon={selectedCategory.icon}
        queuePosition={queuePosition}
        onCancel={handleCancelSearch}
      />
    );
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">{t("lobby.title")}</h1>
          <p className="text-gray-400">{t("lobby.subtitle")}</p>
        </div>

        {/* Step 1: Category Selection */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
              1
            </span>
            {t("lobby.step1")}
          </h2>
          <CategoryGrid
            onSelect={handleCategorySelect}
            selectedSlug={selectedCategory?.slug}
          />
        </div>

        {/* Step 2: Subcategories */}
        {selectedCategory && (
          <div className="mb-10 animate-in fade-in duration-300">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span>
              {t("lobby.step2")}
              <span className="text-sm font-normal text-gray-500">
                {t("lobby.step2Optional")}
              </span>
            </h2>

            <div className="flex flex-wrap gap-3">
              {selectedCategory.subcategories.map((sub) => {
                const isSelected = selectedSubs.includes(sub.slug);
                return (
                  <button
                    key={sub.id}
                    onClick={() => toggleSubcategory(sub)}
                    className={`
                      px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                      ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "bg-gray-800/50 text-gray-300 border border-gray-700 hover:border-gray-600"
                      }
                    `}
                  >
                    {sub.icon && <span className="mr-1.5">{sub.icon}</span>}
                    {t(`subcategories.${sub.slug}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Region Filter */}
        {selectedCategory && (
          <div className="mb-10 animate-in fade-in duration-300">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                3
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
        )}

        {/* Start */}
        {selectedCategory && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 px-6 py-4 z-40">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  {t("lobby.category")}:{" "}
                  <span className="text-white font-medium">
                    {selectedCategory.icon} {t(`categories.${selectedCategory.slug}`)}
                  </span>
                  {selectedSubs.length > 0 && (
                    <span className="text-gray-500">
                      {" "}
                      &middot; {selectedSubs.length} {t("lobby.subcategories")}
                    </span>
                  )}
                  <span className="text-gray-500">
                    {" "}
                    &middot; {REGIONS.find((r) => r.slug === selectedRegion)?.icon}{" "}
                    {t(`regions.${selectedRegion}`)}
                  </span>
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartSearch}
              >
                {t("lobby.findPartner")}
              </Button>
            </div>
          </div>
        )}
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
