"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";
import QRCode from "@/components/QRCode";
import { Button } from "@/components/ui";
import { Suspense } from "react";

const PLAN_PRICES: Record<string, Record<string, number>> = {
  plus:  { monthly: 4.99, yearly: 49.99 },
  pro:   { monthly: 9.99, yearly: 99.99 },
};

const BOOST_PRICES: Record<string, number> = {
  queue: 0.99,
  region: 1.49,
  spotlight: 1.99,
};

/* ─── helpers shared by both flows ─── */

function useCheckoutParams() {
  const searchParams = useSearchParams();
  const purpose = searchParams.get("purpose") || "subscription";
  const plan = searchParams.get("plan") || "plus";
  const boostType = searchParams.get("boost") || "queue";
  const billing = searchParams.get("billing") || "monthly";
  const method = searchParams.get("method") || "usdt";

  let price = 0;
  let label = "";
  if (purpose === "subscription") {
    price = PLAN_PRICES[plan]?.[billing] || 4.99;
    const planName = plan === "plus" ? "Synapse+" : "Synapse Pro";
    label = `${planName} — ${billing === "yearly" ? "1 year" : "1 month"}`;
  } else if (purpose === "boost") {
    price = BOOST_PRICES[boostType] || 0.99;
    label = `Boost: ${boostType}`;
  } else {
    price = 2.99;
    label = "Verified Badge";
  }

  return { purpose, plan, boostType, billing, method, price, label };
}

/* ━━━━━━━━━━━━━━ Card (Stripe / LemonSqueezy) ━━━━━━━━━━━━━━ */

function CardCheckout({ price, label, plan, billing, purpose, boostType }: {
  price: number; label: string; plan: string; billing: string; purpose: string; boostType: string;
}) {
  const router = useRouter();
  const t = useTranslations("payment");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (res.status === 503) {
        setNotConfigured(true);
      } else {
        setError(data.error || t("cardError"));
      }
    } catch {
      setError(t("cardError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1">{t("title")}</h1>
          <p className="text-gray-400">{label}</p>
        </div>

        {/* Order summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-400 mb-2">{t("cardTotal")}</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-bold text-white font-mono">${price.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">{label}</p>
        </div>

        {/* Accepted cards */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <p className="text-sm font-medium text-gray-300">{t("cardAccepted")}</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="bg-white text-[#1A1F71] font-bold text-xs px-3 py-1.5 rounded italic tracking-tight">VISA</span>
            <span className="bg-white rounded px-2 py-1 flex items-center gap-0.5">
              <span className="w-4 h-4 rounded-full bg-red-500 -mr-1.5" />
              <span className="w-4 h-4 rounded-full bg-amber-400 opacity-80" />
            </span>
            <span className="bg-white text-black font-medium text-xs px-3 py-1.5 rounded">Apple Pay</span>
            <span className="bg-white text-black font-medium text-xs px-3 py-1.5 rounded flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Pay
            </span>
          </div>
          <p className="text-xs text-gray-500 text-center">{t("cardSecure")}</p>
        </div>

        {/* Coming soon notice if not configured */}
        {notConfigured ? (
          <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-2xl p-6 text-center space-y-3">
            <div className="text-4xl">🚧</div>
            <h3 className="text-lg font-semibold text-indigo-300">{t("cardComingSoon")}</h3>
            <p className="text-sm text-gray-400">{t("cardComingSoonDesc")}</p>
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  purpose,
                  plan,
                  billing,
                  method: "usdt",
                  ...(purpose === "boost" ? { boost: boostType } : {}),
                });
                router.push(`/checkout?${params.toString()}`);
              }}
              className="mt-2 inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {t("cardSwitchUsdt")}
            </button>
          </div>
        ) : (
          /* Pay button */
          <div className="space-y-3">
            {error && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={loading}
              className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                loading
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                  {t("cardRedirecting")}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {t("cardPayButton")} ${price.toFixed(2)}
                </>
              )}
            </button>
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-3">
          <p className="text-sm font-medium text-gray-300">{t("cardHowItWorks")}</p>
          <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
            <li>{t("cardStep1")}</li>
            <li>{t("cardStep2")}</li>
            <li>{t("cardStep3")}</li>
          </ol>
        </div>

        {/* Cancel */}
        <div className="text-center">
          <button
            onClick={() => router.push("/subscriptions")}
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </main>
    </>
  );
}

/* ━━━━━━━━━━━━━━ USDT TRC-20 ━━━━━━━━━━━━━━ */

function UsdtCheckout({ price, label, purpose, plan, billing, boostType }: {
  price: number; label: string; purpose: string; plan: string; billing: string; boostType: string;
}) {
  const router = useRouter();
  const t = useTranslations("payment");

  const [walletAddress, setWalletAddress] = useState("");
  const [walletLoading, setWalletLoading] = useState(true);
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);

  useEffect(() => {
    fetch("/api/payments/wallet")
      .then((r) => r.json())
      .then((data) => {
        if (data.walletAddress) setWalletAddress(data.walletAddress);
      })
      .catch(() => {})
      .finally(() => setWalletLoading(false));
  }, []);

  const handleCopy = useCallback(async (text: string, type: "address" | "amount") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleVerify = async () => {
    const trimmed = txHash.trim();
    if (!trimmed || trimmed.length < 20) {
      setErrorMsg(t("invalidTxHash"));
      setStatus("error");
      return;
    }

    setVerifying(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: trimmed, purpose, plan, billing, boostType }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
      } else {
        setErrorMsg(data.error || t("verifyFailed"));
        setStatus("error");
      }
    } catch {
      setErrorMsg(t("verifyFailed"));
      setStatus("error");
    } finally {
      setVerifying(false);
    }
  };

  // Success state
  if (status === "success") {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-12 px-6 max-w-lg mx-auto">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2 text-green-400">{t("successTitle")}</h2>
            <p className="text-gray-400 mb-2">{t("successDesc")}</p>
            <p className="text-sm text-gray-500 mb-2">{label} — ${price} USDT</p>
            <p className="text-xs text-gray-600 mb-6 break-all font-mono">TX: {txHash.trim()}</p>
            <Button variant="primary" onClick={() => router.push("/lobby")}>
              {t("continue")}
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-1">{t("title")}</h1>
          <p className="text-gray-400">{label}</p>
        </div>

        {/* Amount card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-400 mb-2">{t("sendExactly")}</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-bold text-white font-mono">{price.toFixed(2)}</span>
            <span className="text-lg text-gray-400">USDT</span>
          </div>
          <button
            onClick={() => handleCopy(price.toFixed(2), "amount")}
            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {copied === "amount" ? "✓ " + t("copied") : t("copyAmount")}
          </button>
        </div>

        {/* Network warning */}
        <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-400 text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-300">{t("networkWarning")}</p>
            <p className="text-xs text-amber-400/70 mt-1">{t("networkWarningDesc")}</p>
          </div>
        </div>

        {/* Wallet address + QR */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-sm text-gray-400 mb-3">{t("walletAddress")}</p>

          {walletLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : !walletAddress ? (
            <p className="text-sm text-red-400 text-center py-8">{t("cardComingSoon")}</p>
          ) : (
            <>
              <div className="w-52 h-52 mx-auto mb-4 bg-white rounded-xl p-2 flex items-center justify-center">
                <QRCode data={walletAddress} size={192} />
              </div>

              <div className="bg-gray-800/50 rounded-xl p-3 relative group">
                <p className="text-sm font-mono text-gray-300 break-all pr-10">
                  {walletAddress}
                </p>
                <button
                  onClick={() => handleCopy(walletAddress, "address")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-400 transition-colors"
                >
              {copied === "address" ? (
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2 text-center">TRC-20 (TRON)</p>
            </>
          )}
        </div>

        {/* TX Hash input */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t("txHashLabel")}
            </label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => {
                setTxHash(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder={t("txHashPlaceholder")}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {status === "error" && errorMsg && (
            <p className="text-sm text-red-400">{errorMsg}</p>
          )}

          <button
            onClick={handleVerify}
            disabled={verifying || !txHash.trim()}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              verifying || !txHash.trim()
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {verifying ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                {t("verifyingTx")}
              </>
            ) : (
              t("confirmPayment")
            )}
          </button>
        </div>

        {/* Steps */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-3">
          <p className="text-sm font-medium text-gray-300">{t("howToPay")}</p>
          <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
            <li>{t("step4")}</li>
          </ol>
        </div>

        {/* Cancel */}
        <div className="text-center">
          <button
            onClick={() => router.push("/subscriptions")}
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </main>
    </>
  );
}

/* ━━━━━━━━━━━━━━ Main Router ━━━━━━━━━━━━━━ */

function CheckoutContent() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const params = useCheckoutParams();

  if (authStatus === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  if (authStatus === "loading") {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-12 px-6 max-w-lg mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        </main>
      </>
    );
  }

  if (params.method === "stripe") {
    return (
      <CardCheckout
        price={params.price}
        label={params.label}
        plan={params.plan}
        billing={params.billing}
        purpose={params.purpose}
        boostType={params.boostType}
      />
    );
  }

  return (
    <UsdtCheckout
      price={params.price}
      label={params.label}
      purpose={params.purpose}
      plan={params.plan}
      billing={params.billing}
      boostType={params.boostType}
    />
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
