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

interface NavbarProps {
  action?: React.ReactNode;
}

export default function Navbar({ action }: NavbarProps) {
  const { data: session } = useSession();
  const t = useTranslations();
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [badge, setBadge] = useState<TrustBadgeType>("regular");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Stable identifier — only re-fetch when actual user changes, not on session object reference change
  const userId = session?.user?.email ?? "";

  // Fetch subscription and badge when logged in
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const signal = controller.signal;

    fetch("/api/subscription", { signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) setPlan(data.plan);
      })
      .catch(() => {});
    fetch("/api/profile", { signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.trustBadge) setBadge(data.trustBadge);
        if (data.image) setAvatarUrl(data.image);
      })
      .catch(() => {});
    // Check admin status (separate from user session)
    fetch("/api/admin/check", { signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.isAdmin) setIsAdmin(true);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [userId]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <SynapseLogo size={32} />
            <SynapseWordmark className="text-xl" />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Nav Links (desktop) */}
            <div className="hidden md:flex items-center gap-4 mr-1">
              <Link
                href="/guide"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                {t("nav.guide")}
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                {t("nav.terms")}
              </Link>
              <Link
                href="/subscriptions"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                {t("nav.subscriptions")}
              </Link>
              <Link
                href="/support"
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                {t("nav.support")}
              </Link>
            </div>
            <LanguageSwitcher />

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              aria-label={t("common.menu")}
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
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-700" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                      {session.user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-gray-300">
                    {session.user?.name}
                  </span>
                  <SubscriptionBadge plan={plan} />
                </Link>
                <Link
                  href="/profile"
                  className="text-sm text-gray-300 hover:text-white transition-colors font-medium"
                >
                  {t("profile.title")}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {t("common.logout")}
                </button>
                {action && <div className="ml-1">{action}</div>}
                {/* Admin gear icon */}
                {isAdmin && (
                  <a
                    href="/admin"
                    className="ml-1 p-1.5 text-gray-500 hover:text-indigo-400 transition-colors rounded-lg hover:bg-gray-800/50"
                    title="Admin Panel"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </a>
                )}
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
            href="/guide"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-gray-400 hover:text-white transition-colors text-sm py-2"
          >
            {t("nav.guide")}
          </Link>
          <Link
            href="/terms"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-gray-400 hover:text-white transition-colors text-sm py-2"
          >
            {t("nav.terms")}
          </Link>
          <Link
            href="/subscriptions"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-gray-400 hover:text-white transition-colors text-sm py-2"
          >
            {t("nav.subscriptions")}
          </Link>
          <Link
            href="/support"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-gray-400 hover:text-white transition-colors text-sm py-2"
          >
            {t("nav.support")}
          </Link>
          {session ? (
            <>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-2 hover:opacity-80 transition-opacity"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-700" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    {session.user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
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
              {action && <div className="pt-2">{action}</div>}
              {/* Admin gear icon (mobile) */}
              {isAdmin && (
                <a
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-gray-500 hover:text-indigo-400 transition-colors py-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">Admin Panel</span>
                </a>
              )}
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
