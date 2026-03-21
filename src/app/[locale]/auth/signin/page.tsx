"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { REGIONS } from "@/lib/regions";
import { SynapseLogo } from "@/components/SynapseLogo";

export default function SignInPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tRegions = useTranslations("regions");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [region, setRegion] = useState("global");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      setIsLoading(false);
      return;
    }

    if (mode === "register" && (!name || name.trim().length < 2)) {
      setError(t("nameTooShort"));
      setIsLoading(false);
      return;
    }

    if (mode === "register" && !ageConfirmed) {
      setError(t("ageRequired"));
      setIsLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      name: mode === "register" ? name : email,
      password,
      region,
      mode,
      redirect: false,
    });

    if (result?.error) {
      setError(mode === "register" ? t("registerError") : t("error"));
      setIsLoading(false);
    } else {
      router.push("/lobby");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gray-950">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14">
            <SynapseLogo size={56} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {mode === "login" ? t("signInTitle") : t("registerTitle")}
          </h1>
          <p className="text-gray-400 mt-2">
            {mode === "login" ? t("signInSubtitle") : t("registerSubtitle")}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex mb-6 bg-gray-900/50 border border-gray-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t("signInButton")}
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "register"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t("registerButton")}
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  {t("name")}
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  required
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                required
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {t("password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                required
                minLength={8}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              {mode === "register" && (
                <p className="text-xs text-gray-600 mt-1">{t("passwordHint")}</p>
              )}
            </div>

            {/* Region selector — only for registration */}
            {mode === "register" && (
              <div>
                <label htmlFor="region" className="block text-sm font-medium text-gray-300 mb-2">
                  {t("region")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {REGIONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegion(r.slug)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        region === r.slug
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span className="truncate">{tRegions(r.slug)}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">{t("regionHint")}</p>
              </div>
            )}

            {/* Age confirmation — only for registration */}
            {mode === "register" && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                />
                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                  {t("ageConfirm")}
                </span>
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t("signingIn")}
              </span>
            ) : (
              mode === "login" ? t("signInButton") : t("registerButton")
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-4">
          {t("terms")}{" "}
          <Link href="/terms" className="text-indigo-400 hover:text-indigo-300 underline">
            {t("termsLink")}
          </Link>{" "}
          {t("termsAnd")}{" "}
          <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">
            {t("privacyLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
