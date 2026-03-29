"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminI18n, AdminLocale } from "@/lib/admin-i18n";
import { SynapseLogo } from "@/components/SynapseLogo";

export default function AdminLoginPage() {
  const { t, locale, setLocale } = useAdminI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("login.loginFailed"));
        return;
      }

      router.push("/admin");
    } catch {
      setError(t("login.connectionError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Language Switcher */}
      <div className="fixed top-4 right-4 flex bg-gray-800 rounded-lg p-0.5">
        {(["en", "ru"] as AdminLocale[]).map(l => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              locale === l
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {l === "en" ? "EN" : "RU"}
          </button>
        ))}
      </div>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14">
            <SynapseLogo size={56} />
          </div>
          <h1 className="text-2xl font-bold text-white">{t("login.title")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("login.subtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-2.5 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">{t("login.email")}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">{t("login.password")}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          {t("login.protectedArea")}
        </p>
      </div>
    </div>
  );
}
