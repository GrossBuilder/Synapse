"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";

type BillingPeriod = "monthly" | "yearly";
type PaymentMethod = "usdt" | "stripe";

const PLANS = [
  {
    id: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    color: "gray",
    features: ["15ChatsPerDay", "1RematchPerDay", "yourRegion", "standardQueue"],
  },
  {
    id: "plus",
    monthlyPrice: 4.99,
    yearlyPrice: 49.99,
    color: "indigo",
    popular: true,
    features: [
      "unlimitedChats",
      "5RematchesPerDay",
      "allRegions",
      "x2Priority",
      "invisibleSkip",
      "verifiedBadge",
      "noAds",
    ],
  },
  {
    id: "pro",
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    color: "purple",
    features: [
      "everythingInPlus",
      "x3Priority",
      "unlimitedRematches",
      "groupRooms",
      "chatAnalytics",
    ],
  },
];

export default function SubscriptionsPage() {
  const { data: session } = useSession();
  const t = useTranslations("pricing");
  const tc = useTranslations("common");
  const router = useRouter();
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");

  const getPrice = (plan: (typeof PLANS)[number]) =>
    billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

  const getSavings = (plan: (typeof PLANS)[number]) => {
    if (plan.monthlyPrice === 0) return 0;
    return Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100);
  };

  const handleChoosePlan = (planId: string) => {
    if (paymentMethod === "usdt") {
      router.push(`/checkout?purpose=subscription&plan=${planId}&billing=${billing}`);
    } else {
      router.push(`/checkout?purpose=subscription&plan=${planId}&billing=${billing}&method=stripe`);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-950 pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.push("/lobby")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {tc("back")}
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{t("title")}</h1>
            <p className="text-gray-400">{t("subtitle")}</p>
          </div>

          {/* Billing period toggle */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center bg-gray-900 border border-gray-800 rounded-full p-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  billing === "monthly"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t("monthly")}
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billing === "yearly"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t("yearly")}
                <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  -{getSavings(PLANS[1])}%
                </span>
              </button>
            </div>
          </div>

          {/* Payment method selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-3">
              <button
                onClick={() => setPaymentMethod("stripe")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  paymentMethod === "stripe"
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : "border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600"
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v4H3V5zm0 6h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8zm4 3a1 1 0 100 2h4a1 1 0 100-2H7z" />
                </svg>
                {t("methodCard")}
              </button>
              <button
                onClick={() => setPaymentMethod("usdt")}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  paymentMethod === "usdt"
                    ? "border-green-500 bg-green-500/10 text-white"
                    : "border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600"
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 10.5h8M8 13.5h8M12 7v10" strokeLinecap="round" />
                </svg>
                USDT (TRC-20)
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const price = getPrice(plan);
              const isPopular = "popular" in plan && plan.popular;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-gray-900/50 border rounded-2xl p-6 flex flex-col ${
                    isPopular
                      ? "border-indigo-500 shadow-lg shadow-indigo-500/10"
                      : "border-gray-800"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {t("popular")}
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white">{t(`plans.${plan.id}.name`)}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      {price === 0 ? (
                        <span className="text-3xl font-bold text-white">{t("free")}</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-white">${price}</span>
                          <span className="text-sm text-gray-400">
                            {billing === "yearly" ? t("perYear") : t("perMonth")}
                          </span>
                        </>
                      )}
                    </div>
                    {billing === "yearly" && price > 0 && (
                      <p className="text-xs text-green-400 mt-1">
                        ~${(price / 12).toFixed(2)}{t("perMonth")} · {t("save")} {getSavings(plan)}%
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm text-gray-300">
                        <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t(`features.${feat}`)}
                      </li>
                    ))}
                  </ul>

                  {price > 0 && session ? (
                    <button
                      onClick={() => handleChoosePlan(plan.id)}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isPopular
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                          : "bg-gray-800 hover:bg-gray-700 text-gray-200"
                      }`}
                    >
                      {t("choosePlan")}
                    </button>
                  ) : price === 0 ? (
                    <div className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-800/50 text-gray-500 text-center">
                      {t("currentPlan")}
                    </div>
                  ) : (
                    <button
                      onClick={() => router.push("/auth/signin")}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
                    >
                      {t("choosePlan")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Payment info */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              {paymentMethod === "stripe" ? t("stripeNote") : t("usdtNote")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
