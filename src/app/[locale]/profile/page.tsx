"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";
import TrustBadge from "@/components/TrustBadge";
import SubscriptionBadge from "@/components/SubscriptionBadge";
import { Button } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { REGIONS } from "@/lib/regions";
import type { SubscriptionPlan, TrustBadge as TrustBadgeType } from "@/types";

type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERT";

interface ProfileData {
  bio: string;
  experienceLevel: ExperienceLevel;
  interests: string[];
  tags: string[];
  preferredRegion: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bio, setBio] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("BEGINNER");
  const [interests, setInterests] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [preferredRegion, setPreferredRegion] = useState("global");
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [badge, setBadge] = useState<TrustBadgeType>("regular");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Загрузка профиля
  useEffect(() => {
    if (!session?.user) return;

    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/subscription").then((r) => r.json()),
    ])
      .then(([profileData, subData]) => {
        setBio(profileData.bio || "");
        setExperienceLevel(profileData.experienceLevel || "BEGINNER");
        setInterests(profileData.interests || []);
        setTags(profileData.tags || []);
        setPreferredRegion(profileData.preferredRegion || "global");
        if (subData.plan) setPlan(subData.plan);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          experienceLevel,
          interests,
          tags,
          preferredRegion,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (slug: string) => {
    setInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= 10) return;
    setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{t("profile.title")}</h1>
            <p className="text-sm text-gray-400 mt-1">{t("profile.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <TrustBadge badge={badge} size="md" label={t(`trust.${badge}`)} />
            <SubscriptionBadge plan={plan} />
          </div>
        </div>

        {/* User info card */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
              {session?.user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{session?.user?.name}</h2>
              <p className="text-sm text-gray-400">{session?.user?.email}</p>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t("profile.bio")}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("profile.bioPlaceholder")}
              maxLength={200}
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">{bio.length}/200</p>
          </div>

          {/* Experience Level */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t("profile.experience")}
            </label>
            <div className="flex gap-2">
              {(["BEGINNER", "INTERMEDIATE", "EXPERT"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setExperienceLevel(level)}
                  className={`
                    flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border
                    ${experienceLevel === level
                      ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                      : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800"
                    }
                  `}
                >
                  {t(`profile.levels.${level}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Region */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t("profile.preferredRegion")}
            </label>
            <select
              value={preferredRegion}
              onChange={(e) => setPreferredRegion(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              {REGIONS.map((region) => (
                <option key={region.id} value={region.slug}>
                  {region.icon} {t(`regions.${region.slug}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            {t("profile.tags")}
          </label>
          <p className="text-xs text-gray-500 mb-3">{t("profile.tagsHint")}</p>

          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-full text-sm ring-1 ring-indigo-500/30"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="hover:text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={t("profile.addTag")}
              maxLength={30}
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <Button onClick={addTag} variant="secondary" size="sm" disabled={!tagInput.trim() || tags.length >= 10}>
              +
            </Button>
          </div>
        </div>

        {/* Interests */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t("profile.interests")}
          </label>
          <p className="text-xs text-gray-500 mb-4">
            {t("profile.interestsHint")} ({interests.length}/20)
          </p>

          <div className="space-y-2">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/30 hover:bg-gray-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="text-sm font-medium text-white">{t(`categories.${cat.slug}`)}</span>
                    {cat.subcategories.some((s) => interests.includes(s.slug)) && (
                      <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                        {cat.subcategories.filter((s) => interests.includes(s.slug)).length}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedCategory === cat.id ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedCategory === cat.id && (
                  <div className="px-4 py-3 space-y-1 bg-gray-900/30">
                    {cat.subcategories.map((sub) => {
                      const isSelected = interests.includes(sub.slug);
                      return (
                        <button
                          key={sub.id}
                          onClick={() => toggleInterest(sub.slug)}
                          disabled={!isSelected && interests.length >= 20}
                          className={`
                            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left
                            ${isSelected
                              ? "bg-indigo-600/20 text-indigo-300"
                              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            }
                          `}
                        >
                          {sub.icon && <span>{sub.icon}</span>}
                          <span>{sub.name}</span>
                          {isSelected && (
                            <svg className="w-4 h-4 ml-auto text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between">
          <div>
            {saved && (
              <span className="text-sm text-emerald-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t("profile.saved")}
              </span>
            )}
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
