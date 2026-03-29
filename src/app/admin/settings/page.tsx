"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";

interface Settings {
  autoModeration: boolean;
  autoBanThreshold: number;
  autoWarnThreshold: number;
  maxReportsPerDay: number;
  autoResolveAfterDays: number;
  repeatOffenderMultiplier: boolean;
  chatTimeoutMinutes: number;
  requireEmailVerification: boolean;
  maintenanceMode: boolean;
  maxConcurrentUsers: number;
  minAccountAgeMinutes: number;
  allowedRegions: string[];
  textModerationEnabled: boolean;
  featureFlags: {
    videoChat: boolean;
    textChat: boolean;
    fileSharing: boolean;
    screenShare: boolean;
  };
}

const REGION_IDS = [
  "global", "europe", "north-america", "south-america",
  "asia", "middle-east", "africa", "oceania", "cis",
];

export default function SettingsPage() {
  const { t } = useAdminI18n();
  const ALL_REGIONS = REGION_IDS.map(id => ({ id, label: t(`region.${id}`) }));
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) setSettings(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveRef = useRef<AbortController | null>(null);

  async function saveSettings(data?: Partial<Settings>) {
    const payload = data || settings;
    if (!payload) return;
    // Cancel previous in-flight save
    saveRef.current?.abort();
    const controller = new AbortController();
    saveRef.current = controller;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* ignore aborted */ }
    if (!controller.signal.aborted) setSaving(false);
  }

  function updateLocal<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  function updateAndSave<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  }

  function toggleRegion(regionId: string) {
    if (!settings) return;
    const regions = settings.allowedRegions.includes(regionId)
      ? settings.allowedRegions.filter(r => r !== regionId)
      : [...settings.allowedRegions, regionId];
    const updated = { ...settings, allowedRegions: regions };
    setSettings(updated);
    saveSettings(updated);
  }

  function toggleFeature(key: keyof Settings["featureFlags"]) {
    if (!settings) return;
    const updated = {
      ...settings,
      featureFlags: { ...settings.featureFlags, [key]: !settings.featureFlags[key] },
    };
    setSettings(updated);
    saveSettings(updated);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) return <div className="text-red-400">{t("settings.failedLoad")}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("settings.title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("settings.subtitle")}</p>
        </div>
        <button
          onClick={() => saveSettings()}
          disabled={saving}
          className={`px-5 py-2 text-sm font-medium rounded-xl transition-all ${
            saved
              ? "bg-emerald-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          } disabled:opacity-50`}
        >
          {saving ? t("settings.saving") : saved ? t("settings.saved") : t("settings.saveChanges")}
        </button>
      </div>

      {/* Maintenance Mode */}
      {settings.maintenanceMode && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🚧</span>
          <div>
            <p className="text-sm font-medium text-amber-400">{t("settings.maintenanceActive")}</p>
            <p className="text-xs text-amber-500/70">{t("settings.maintenanceDesc")}</p>
          </div>
        </div>
      )}

      {/* Auto-Moderation */}
      <Section title={t("settings.autoModeration")} description={t("settings.autoModerationDesc")}>
        <Toggle
          label={t("settings.enableAutoMod")}
          description={t("settings.enableAutoModDesc")}
          checked={settings.autoModeration}
          onChange={v => updateAndSave("autoModeration", v)}
        />
        <NumberInput
          label={t("settings.autoWarnThreshold")}
          description={t("settings.autoWarnDesc")}
          value={settings.autoWarnThreshold}
          onChange={v => updateLocal("autoWarnThreshold", v)}
          min={1}
          max={50}
        />
        <NumberInput
          label={t("settings.autoBanThreshold")}
          description={t("settings.autoBanDesc")}
          value={settings.autoBanThreshold}
          onChange={v => updateLocal("autoBanThreshold", v)}
          min={2}
          max={100}
        />
        <NumberInput
          label={t("settings.maxReportsPerDay")}
          description={t("settings.maxReportsDesc")}
          value={settings.maxReportsPerDay}
          onChange={v => updateLocal("maxReportsPerDay", v)}
          min={1}
          max={50}
        />
        <NumberInput
          label={t("settings.autoResolveAfterDays")}
          description={t("settings.autoResolveDesc")}
          value={settings.autoResolveAfterDays}
          onChange={v => updateLocal("autoResolveAfterDays", v)}
          min={0}
          max={90}
        />
        <Toggle
          label={t("settings.repeatOffender")}
          description={t("settings.repeatOffenderDesc")}
          checked={settings.repeatOffenderMultiplier}
          onChange={v => updateAndSave("repeatOffenderMultiplier", v)}
        />
        <Toggle
          label={t("settings.textModeration")}
          description={t("settings.textModerationDesc")}
          checked={settings.textModerationEnabled}
          onChange={v => updateAndSave("textModerationEnabled", v)}
        />
      </Section>

      {/* Chat Settings */}
      <Section title={t("settings.chatSettings")} description={t("settings.chatSettingsDesc")}>
        <NumberInput
          label={t("settings.chatTimeout")}
          description={t("settings.chatTimeoutDesc")}
          value={settings.chatTimeoutMinutes}
          onChange={v => updateLocal("chatTimeoutMinutes", v)}
          min={1}
          max={120}
        />
        <NumberInput
          label={t("settings.maxConcurrent")}
          description={t("settings.maxConcurrentDesc")}
          value={settings.maxConcurrentUsers}
          onChange={v => updateLocal("maxConcurrentUsers", v)}
          min={10}
          max={100000}
        />
        <NumberInput
          label={t("settings.minAccountAge")}
          description={t("settings.minAccountAgeDesc")}
          value={settings.minAccountAgeMinutes}
          onChange={v => updateLocal("minAccountAgeMinutes", v)}
          min={0}
          max={1440}
        />
      </Section>

      {/* Security */}
      <Section title={t("settings.security")} description={t("settings.securityDesc")}>
        <Toggle
          label={t("settings.emailVerification")}
          description={t("settings.emailVerificationDesc")}
          checked={settings.requireEmailVerification}
          onChange={v => updateAndSave("requireEmailVerification", v)}
        />
        <Toggle
          label={t("settings.maintenanceMode")}
          description={t("settings.maintenanceModeDesc")}
          checked={settings.maintenanceMode}
          onChange={v => updateAndSave("maintenanceMode", v)}
          danger
        />
      </Section>

      {/* Feature Flags */}
      <Section title={t("settings.featureFlags")} description={t("settings.featureFlagsDesc")}>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(settings.featureFlags).map(([key, enabled]) => {
            const labels: Record<string, string> = {
              videoChat: t("settings.videoChat"),
              textChat: t("settings.textChat"),
              fileSharing: t("settings.fileSharing"),
              screenShare: t("settings.screenShare"),
            };
            return (
              <button
                key={key}
                onClick={() => toggleFeature(key as keyof Settings["featureFlags"])}
                className={`p-3 rounded-xl text-sm text-left border transition-all ${
                  enabled
                    ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-400"
                    : "bg-gray-900/50 border-gray-800 text-gray-500"
                }`}
              >
                <span className="text-lg mr-2">{enabled ? "✅" : "❌"}</span>
                {labels[key] || key}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Allowed Regions */}
      <Section title={t("settings.allowedRegions")} description={t("settings.allowedRegionsDesc")}>
        <div className="grid grid-cols-3 gap-2">
          {ALL_REGIONS.map(region => (
            <button
              key={region.id}
              onClick={() => toggleRegion(region.id)}
              className={`p-2.5 rounded-xl text-xs text-left border transition-all ${
                settings.allowedRegions.includes(region.id)
                  ? "bg-indigo-600/10 border-indigo-500/20 text-indigo-400"
                  : "bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700"
              }`}
            >
              {region.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ==================== HELPER COMPONENTS ====================

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-white mb-0.5">{title}</h2>
      <p className="text-xs text-gray-500 mb-5">{description}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange, danger }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm ${danger && checked ? "text-amber-400" : "text-gray-200"}`}>{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked
            ? danger ? "bg-amber-600" : "bg-indigo-600"
            : "bg-gray-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function NumberInput({ label, description, value, onChange, min, max }: {
  label: string;
  description: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-200">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <input
        type="number"
        value={value}
        onChange={e => {
          const v = parseInt(e.target.value);
          if (!isNaN(v) && v >= min && v <= max) onChange(v);
        }}
        min={min}
        max={max}
        className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-indigo-500"
      />
    </div>
  );
}
