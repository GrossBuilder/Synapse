"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";
import { CATEGORIES } from "@/lib/categories";

export default function Home() {
  const t = useTranslations();

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-indigo-300">
              {t("hero.badge")}
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            {t("hero.title")}{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {t("hero.titleHighlight")}
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/lobby"
              className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-lg transition-all duration-300 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              {t("hero.cta")}
            </Link>
            <Link
              href="/categories"
              className="px-8 py-4 bg-gray-800/50 hover:bg-gray-800 text-gray-300 rounded-2xl font-medium text-lg transition-all border border-gray-700/50"
            >
              {t("hero.viewCategories")}
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">8</div>
              <div className="text-sm text-gray-500">{t("hero.statsCategories")}</div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">50+</div>
              <div className="text-sm text-gray-500">{t("hero.statsSubcategories")}</div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">P2P</div>
              <div className="text-sm text-gray-500">{t("hero.statsEncryption")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("howItWorks.title")}
            </h2>
            <p className="text-gray-400 text-lg">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: t("howItWorks.step1Title"),
                desc: t("howItWorks.step1Desc"),
                icon: "🎯",
                color: "from-indigo-500 to-blue-500",
              },
              {
                step: "02",
                title: t("howItWorks.step2Title"),
                desc: t("howItWorks.step2Desc"),
                icon: "⚡",
                color: "from-purple-500 to-pink-500",
              },
              {
                step: "03",
                title: t("howItWorks.step3Title"),
                desc: t("howItWorks.step3Desc"),
                icon: "🎥",
                color: "from-green-500 to-emerald-500",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative group p-8 bg-gray-900/50 border border-gray-800 rounded-2xl hover:border-gray-700 transition-all duration-300"
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <div
                  className={`inline-block text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r ${item.color} text-white mb-3`}
                >
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="py-24 px-6 bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("categoriesSection.title")}
            </h2>
            <p className="text-gray-400 text-lg">
              {t("categoriesSection.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/lobby?category=${cat.slug}`}
                className="group p-6 bg-gray-900/80 border border-gray-800 rounded-2xl hover:border-gray-600 transition-all duration-300 text-center"
              >
                <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <h3 className="font-semibold text-white mb-1">
                  {t(`categories.${cat.slug}`)}
                </h3>
                <p className="text-xs text-gray-500">
                  {cat.subcategories.length} {t("categoriesSection.directions")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {t("features.title")}{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Synapse?
                </span>
              </h2>
              <div className="space-y-6">
                {[
                  {
                    title: t("features.smartMatching"),
                    desc: t("features.smartMatchingDesc"),
                    icon: "🧠",
                  },
                  {
                    title: t("features.security"),
                    desc: t("features.securityDesc"),
                    icon: "🛡️",
                  },
                  {
                    title: t("features.webrtc"),
                    desc: t("features.webrtcDesc"),
                    icon: "⚡",
                  },
                  {
                    title: t("features.pwa"),
                    desc: t("features.pwaDesc"),
                    icon: "📱",
                  },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xl">{feature.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-400">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl mb-4">🔗</div>
                  <p className="text-xl font-semibold text-gray-300">
                    {t("hero.connectingMinds")}
                  </p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center animate-float">
                <span className="text-2xl">💻</span>
              </div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center animate-float">
                <span className="text-2xl">🎵</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-gray-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("pricing.title")}
            </h2>
            <p className="text-gray-400 text-lg">{t("pricing.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="p-8 bg-gray-900/80 border border-gray-800 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">{t("pricing.free")}</h3>
              <div className="text-4xl font-bold mb-6">{t("pricing.freePrice")}</div>
              <ul className="space-y-3 text-sm text-gray-400 mb-8">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> {t("pricing.freeFeature1")}</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> {t("pricing.freeFeature2")}</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> {t("pricing.freeFeature3")}</li>
              </ul>
              <Link href="/lobby" className="block w-full py-3 text-center bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors">
                {t("pricing.getStarted")}
              </Link>
            </div>

            {/* Plus */}
            <div className="p-8 bg-gradient-to-b from-indigo-900/30 to-gray-900/80 border-2 border-indigo-500/50 rounded-2xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">
                POPULAR
              </div>
              <h3 className="text-lg font-semibold mb-2">Synapse+</h3>
              <div className="text-4xl font-bold mb-1">$4.99<span className="text-lg font-normal text-gray-400">{t("pricing.perMonth")}</span></div>
              <div className="text-xs text-gray-500 mb-6">$49.99/year</div>
              <ul className="space-y-3 text-sm text-gray-400 mb-8">
                <li className="flex items-center gap-2"><span className="text-indigo-400">✓</span> {t("pricing.plusFeature1")}</li>
                <li className="flex items-center gap-2"><span className="text-indigo-400">✓</span> {t("pricing.plusFeature2")}</li>
                <li className="flex items-center gap-2"><span className="text-indigo-400">✓</span> {t("pricing.plusFeature3")}</li>
              </ul>
              <Link href="/checkout?purpose=subscription&plan=plus&method=usdt" className="block w-full py-3 text-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors">
                {t("pricing.choosePlan")}
              </Link>
            </div>

            {/* Pro */}
            <div className="p-8 bg-gray-900/80 border border-gray-800 rounded-2xl">
              <h3 className="text-lg font-semibold mb-2">Synapse Pro</h3>
              <div className="text-4xl font-bold mb-1">$9.99<span className="text-lg font-normal text-gray-400">{t("pricing.perMonth")}</span></div>
              <div className="text-xs text-gray-500 mb-6">$99.99/year</div>
              <ul className="space-y-3 text-sm text-gray-400 mb-8">
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> {t("pricing.proFeature1")}</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> {t("pricing.proFeature2")}</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">✓</span> {t("pricing.proFeature3")}</li>
              </ul>
              <Link href="/checkout?purpose=subscription&plan=pro&method=usdt" className="block w-full py-3 text-center bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors">
                {t("pricing.choosePlan")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("cta.title")}
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            {t("cta.subtitle")}
          </p>
          <Link
            href="/lobby"
            className="inline-block px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-indigo-500/25"
          >
            {t("cta.button")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="text-sm text-gray-400">
              Synapse &copy; {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {t("footer.description")}
          </p>
        </div>
      </footer>
    </>
  );
}
