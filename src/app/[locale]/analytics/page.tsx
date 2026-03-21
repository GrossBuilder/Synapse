"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui";

interface Analytics {
  totalSessions: number;
  totalDuration: number;
  avgSessionDuration: number;
  totalMessages: number;
  ratingsGiven: number;
  ratingsReceived: number;
  avgRating: number;
  topCategories: Array<{ slug: string; count: number }>;
  weeklyActivity: Array<{ day: string; sessions: number; duration: number }>;
  trustScoreHistory: Array<{ date: string; score: number }>;
  streaks: { current: number; best: number };
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function BarChart({ data, maxValue }: { data: Array<{ label: string; value: number }>; maxValue: number }) {
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((item) => (
        <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-indigo-500/70 rounded-t-lg transition-all min-h-[4px]"
            style={{ height: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
          />
          <span className="text-[10px] text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function TrustChart({ history }: { history: Array<{ date: string; score: number }> }) {
  const max = 100;
  const points = history.map((h, i) => {
    const x = (i / (history.length - 1)) * 100;
    const y = 100 - (h.score / max) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="relative h-32">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <polyline
          points={points}
          fill="none"
          stroke="rgb(99, 102, 241)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={`0,100 ${points} 100,100`}
          fill="rgba(99, 102, 241, 0.1)"
          stroke="none"
        />
      </svg>
      <div className="absolute top-0 left-0 text-[10px] text-gray-500">{history[0]?.date.slice(5)}</div>
      <div className="absolute top-0 right-0 text-[10px] text-gray-500">{history[history.length - 1]?.date.slice(5)}</div>
    </div>
  );
}

function AnalyticsContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const t = useTranslations("analytics");

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/analytics")
      .then((r) => {
        if (r.status === 403) {
          setAccessDenied(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setAnalytics(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-12 px-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        </main>
      </>
    );
  }

  if (accessDenied) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-12 px-6 max-w-lg mx-auto text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold mb-2">{t("proRequired")}</h2>
          <p className="text-gray-400 mb-6">{t("proRequiredDesc")}</p>
          <Button variant="primary" onClick={() => router.push("/lobby")}>
            {t("backToLobby")}
          </Button>
        </main>
      </>
    );
  }

  if (!analytics) return null;

  const weeklyMax = Math.max(...analytics.weeklyActivity.map((w) => w.sessions), 1);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="text-gray-400 mt-1">{t("subtitle")}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon="💬" label={t("totalSessions")} value={analytics.totalSessions} />
          <StatCard icon="⏱️" label={t("totalTime")} value={formatDuration(analytics.totalDuration)} />
          <StatCard icon="📝" label={t("messagesSent")} value={analytics.totalMessages} />
          <StatCard icon="⭐" label={t("avgRating")} value={analytics.avgRating} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Weekly activity */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{t("weeklyActivity")}</h3>
            <BarChart
              data={analytics.weeklyActivity.map((w) => ({ label: w.day, value: w.sessions }))}
              maxValue={weeklyMax}
            />
          </div>

          {/* Trust Score history */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{t("trustHistory")}</h3>
            <TrustChart history={analytics.trustScoreHistory} />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-500">{t("last14Days")}</span>
              <span className="text-xs text-indigo-400 font-medium">
                {analytics.trustScoreHistory[analytics.trustScoreHistory.length - 1]?.score}/100
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top categories */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{t("topCategories")}</h3>
            <div className="space-y-3">
              {analytics.topCategories.map((cat) => {
                const maxCat = analytics.topCategories[0]?.count || 1;
                return (
                  <div key={cat.slug}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 capitalize">{cat.slug}</span>
                      <span className="text-gray-500">{cat.count}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                        style={{ width: `${(cat.count / maxCat) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streaks & stats */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{t("streaks")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-indigo-400">🔥 {analytics.streaks.current}</p>
                <p className="text-xs text-gray-400 mt-1">{t("currentStreak")}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-purple-400">🏆 {analytics.streaks.best}</p>
                <p className="text-xs text-gray-400 mt-1">{t("bestStreak")}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-400">{analytics.ratingsReceived}</p>
                <p className="text-xs text-gray-400 mt-1">{t("ratingsReceived")}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-amber-400">{formatDuration(analytics.avgSessionDuration)}</p>
                <p className="text-xs text-gray-400 mt-1">{t("avgDuration")}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
