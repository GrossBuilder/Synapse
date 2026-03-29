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
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getPasswordStrength = (pw: string): number => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = [
    t("strengthWeak"),
    t("strengthWeak"),
    t("strengthFair"),
    t("strengthGood"),
    t("strengthStrong"),
  ];
  const strengthColors = [
    "bg-red-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-emerald-500",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      setIsLoading(false);
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError(t("passwordMismatch"));
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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {mode === "register" && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < passwordStrength ? strengthColors[passwordStrength] : "bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs mt-1 ${
                    passwordStrength <= 1 ? "text-red-400" :
                    passwordStrength === 2 ? "text-yellow-400" :
                    passwordStrength === 3 ? "text-blue-400" : "text-emerald-400"
                  }`}>
                    {strengthLabels[passwordStrength]}
                  </p>
                </div>
              )}
              {mode === "register" && !password && (
                <p className="text-xs text-gray-600 mt-1">{t("passwordHint")}</p>
              )}
            </div>

            {/* Confirm password — only for registration */}
            {mode === "register" && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  {t("confirmPassword")}
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("confirmPasswordPlaceholder")}
                    required
                    minLength={8}
                    className={`w-full px-4 py-3 pr-12 bg-gray-800/50 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-colors ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : confirmPassword && confirmPassword === password
                        ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500"
                        : "border-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-400 mt-1">{t("passwordMismatch")}</p>
                )}
              </div>
            )}

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
