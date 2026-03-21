"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import SubscriptionBadge from "./SubscriptionBadge";
import TrustBadge from "./TrustBadge";
import { SynapseLogo, SynapseWordmark } from "./SynapseLogo";
import type { SubscriptionPlan, TrustBadge as TrustBadgeType } from "@/types";

export default function Navbar() {
  const { data: session } = useSession();
  const t = useTranslations();
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [badge, setBadge] = useState<TrustBadgeType>("regular");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch subscription and badge when logged in
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) setPlan(data.plan);
      })
      .catch(() => {});
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.trustBadge) setBadge(data.trustBadge);
      })
      .catch(() => {});
  }, [session]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <SynapseLogo size={32} />
            <SynapseWordmark className="text-xl" />
          </Link>

          {/* Nav Links (desktop) */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/lobby"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
            >
              {t("nav.findPartner")}
            </Link>
            <Link
              href="/categories"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
            >
              {t("nav.categories")}
            </Link>
          </div>

          {/* Auth + Language (desktop) */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {session ? (
              <div className="hidden md:flex items-center gap-3">
                <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    {session.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-300">
                    {session.user?.name}
                  </span>
                  <SubscriptionBadge plan={plan} />
                  <TrustBadge badge={badge} size="sm" showLabel={false} />
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {t("common.logout")}
                </button>
                <Link
                  href="/lobby"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {t("common.start")}
                </Link>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="hidden md:block bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t("common.login")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800 px-4 pb-4 pt-2 space-y-3">
          <Link
            href="/lobby"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-gray-300 hover:text-white transition-colors text-sm font-medium py-2"
          >
            {t("nav.findPartner")}
          </Link>
          <Link
            href="/categories"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-gray-300 hover:text-white transition-colors text-sm font-medium py-2"
          >
            {t("nav.categories")}
          </Link>
          {session ? (
            <>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {session.user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-300">{session.user?.name}</span>
                <SubscriptionBadge plan={plan} />
                <TrustBadge badge={badge} size="sm" showLabel={false} />
              </Link>
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="block text-sm text-gray-400 hover:text-white transition-colors py-2"
              >
                {t("common.logout")}
              </button>
              <Link
                href="/lobby"
                onClick={() => setMobileMenuOpen(false)}
                className="block bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center"
              >
                {t("common.start")}
              </Link>
            </>
          ) : (
            <Link
              href="/auth/signin"
              onClick={() => setMobileMenuOpen(false)}
              className="block bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center"
            >
              {t("common.login")}
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
