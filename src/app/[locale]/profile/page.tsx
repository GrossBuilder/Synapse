"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";
import TrustBadge from "@/components/TrustBadge";
import SubscriptionBadge from "@/components/SubscriptionBadge";
import { Button } from "@/components/ui";
import type { SubscriptionPlan, TrustBadge as TrustBadgeType } from "@/types";

type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERT";

const THEMES = [
  { id: "default",   name: "Midnight",    bg: "#030712", accent: "#6366f1", preview: "linear-gradient(135deg, #030712, #1e1b4b)" },
  { id: "aurora",    name: "Aurora",      bg: "#0a1628", accent: "#22d3ee", preview: "linear-gradient(135deg, #0a1628, #164e63)" },
  { id: "ember",     name: "Ember",       bg: "#1a0a0a", accent: "#f97316", preview: "linear-gradient(135deg, #1a0a0a, #7c2d12)" },
  { id: "forest",    name: "Forest",      bg: "#071209", accent: "#22c55e", preview: "linear-gradient(135deg, #071209, #14532d)" },
  { id: "sakura",    name: "Sakura",      bg: "#1a0a1a", accent: "#e879f9", preview: "linear-gradient(135deg, #1a0a1a, #701a75)" },
  { id: "ocean",     name: "Ocean",       bg: "#020c1b", accent: "#3b82f6", preview: "linear-gradient(135deg, #020c1b, #1e3a5f)" },
  { id: "sandstorm", name: "Sandstorm",   bg: "#1a1408", accent: "#eab308", preview: "linear-gradient(135deg, #1a1408, #713f12)" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bio, setBio] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("BEGINNER");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("default");
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [badge, setBadge] = useState<TrustBadgeType>("regular");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Load saved theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("synapse-theme");
    if (saved && THEMES.some((t) => t.id === saved)) {
      setSelectedTheme(saved as ThemeId);
    }
  }, []);

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
        if (profileData.image) setAvatarUrl(profileData.image);
        if (subData.plan) setPlan(subData.plan);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const applyTheme = (themeId: ThemeId) => {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    document.documentElement.style.setProperty("--background", theme.bg);
    document.documentElement.style.setProperty("--accent", theme.accent);
    document.body.style.background = theme.bg;
  };

  const handleThemeSelect = (themeId: ThemeId) => {
    setSelectedTheme(themeId);
    localStorage.setItem("synapse-theme", themeId);
    applyTheme(themeId);
  };

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.image) {
        setAvatarUrl(`${data.image}?t=${Date.now()}`);
      }
    } catch { /* silent */ } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (res.ok) setAvatarUrl(null);
    } catch { /* silent */ } finally {
      setUploadingAvatar(false);
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
        {/* Back button */}
        <button
          onClick={() => router.push("/lobby")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("common.back")}
        </button>

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
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-700"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                  {session?.user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploadingAvatar ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
                aria-label="Upload avatar"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{session?.user?.name}</h2>
              <p className="text-sm text-gray-400 mb-1">{session?.user?.email}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {t("profile.changeAvatar")}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleAvatarRemove}
                    disabled={uploadingAvatar}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    {t("profile.removeAvatar")}
                  </button>
                )}
              </div>
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
          <div>
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
        </div>

        {/* Theme Selection */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {t("profile.theme")}
          </label>
          <p className="text-xs text-gray-500 mb-4">{t("profile.themeHint")}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  className={`
                    relative group rounded-xl overflow-hidden border-2 transition-all duration-200
                    ${isSelected
                      ? "border-indigo-500 shadow-lg shadow-indigo-500/20 scale-[1.02]"
                      : "border-gray-700 hover:border-gray-500"
                    }
                  `}
                >
                  <div
                    className="h-20 w-full"
                    style={{ background: theme.preview }}
                  />
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/80">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className="text-xs font-medium text-gray-300 truncate">
                      {t(`profile.themes.${theme.id}`)}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
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
