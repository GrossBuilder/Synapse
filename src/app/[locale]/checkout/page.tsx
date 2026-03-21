"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";
import QRCode from "@/components/QRCode";
import { Button } from "@/components/ui";
import { Suspense } from "react";

interface PaymentData {
  paymentId: string;
  walletAddress: string;
  amount: string;
  currency: string;
  network: string;
  label: string;
  basePrice: number;
  expiresAt: number;
  expiresIn: number;
}

interface PaymentStatus {
  paymentId: string;
  status: "pending" | "confirming" | "completed" | "expired" | "failed";
  txId: string | null;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();
  const t = useTranslations("payment");

  const purpose = searchParams.get("purpose") || "subscription";
  const plan = searchParams.get("plan") || "plus";
  const boostType = searchParams.get("boost") || "queue";

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "completed" | "expired" | "error">("idle");
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [authStatus, router]);

  // Создаём платёж при монтировании
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    const createPayment = async () => {
      setLoading(true);
      try {
        let body: Record<string, string>;
        if (purpose === "subscription") {
          body = { purpose: "subscription", plan };
        } else if (purpose === "boost") {
          body = { purpose: "boost", boostType };
        } else {
          body = { purpose: "verified_badge" };
        }

        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create payment");
        }

        const data: PaymentData = await res.json();
        setPayment(data);
        setPaymentStatus("pending");
        setTimeLeft(Math.floor(data.expiresIn / 1000));
      } catch {
        setPaymentStatus("error");
      } finally {
        setLoading(false);
      }
    };

    createPayment();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [authStatus, purpose, plan, boostType]);

  // Таймер обратного отсчёта
  useEffect(() => {
    if (paymentStatus !== "pending" || !payment) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentStatus("expired");
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paymentStatus, payment]);

  // Поллинг статуса платежа каждые 15 сек
  useEffect(() => {
    if (paymentStatus !== "pending" || !payment) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payments?id=${payment.paymentId}`);
        if (!res.ok) return;
        const data: PaymentStatus = await res.json();

        if (data.status === "completed") {
          setPaymentStatus("completed");
          setTxId(data.txId);
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        } else if (data.status === "expired") {
          setPaymentStatus("expired");
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch { /* silent */ }
    };

    // Первоначально через 10 сек, далее каждые 15 сек
    const initialTimeout = setTimeout(() => {
      checkStatus();
      pollRef.current = setInterval(checkStatus, 15000);
    }, 10000);

    return () => {
      clearTimeout(initialTimeout);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentStatus, payment]);

  const handleCopy = useCallback(async (text: string, type: "address" | "amount") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (authStatus === "loading" || loading) {
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

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-lg mx-auto">
        {/* Error state */}
        {paymentStatus === "error" && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">{t("errorTitle")}</h2>
            <p className="text-gray-400 mb-6">{t("errorDesc")}</p>
            <Button variant="primary" onClick={() => router.push("/lobby")}>
              {t("backToLobby")}
            </Button>
          </div>
        )}

        {/* completed state */}
        {paymentStatus === "completed" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2 text-green-400">{t("successTitle")}</h2>
            <p className="text-gray-400 mb-2">{t("successDesc")}</p>
            {payment && (
              <p className="text-sm text-gray-500 mb-6">
                {payment.label} — {payment.amount} USDT
              </p>
            )}
            {txId && (
              <p className="text-xs text-gray-600 mb-6 break-all">
                TX: {txId}
              </p>
            )}
            <Button variant="primary" onClick={() => router.push("/lobby")}>
              {t("continue")}
            </Button>
          </div>
        )}

        {/* Expired */}
        {paymentStatus === "expired" && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⏰</div>
            <h2 className="text-xl font-bold mb-2 text-amber-400">{t("expiredTitle")}</h2>
            <p className="text-gray-400 mb-6">{t("expiredDesc")}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="primary" onClick={() => window.location.reload()}>
                {t("retry")}
              </Button>
              <Button variant="secondary" onClick={() => router.push("/lobby")}>
                {t("backToLobby")}
              </Button>
            </div>
          </div>
        )}

        {/* Pending — main checkout UI */}
        {paymentStatus === "pending" && payment && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-1">{t("title")}</h1>
              <p className="text-gray-400">{payment.label}</p>
            </div>

            {/* Timer */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono ${
                timeLeft < 120 ? "bg-red-900/30 text-red-400" : "bg-gray-800 text-gray-300"
              }`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* Amount to send */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-400 mb-2">{t("sendExactly")}</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-bold text-white font-mono">
                  {payment.amount}
                </span>
                <span className="text-lg text-gray-400">USDT</span>
              </div>
              <p className="text-xs text-amber-400 mt-2">{t("exactAmountWarning")}</p>
              <button
                onClick={() => handleCopy(payment.amount, "amount")}
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

            {/* Wallet address */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <p className="text-sm text-gray-400 mb-3">{t("walletAddress")}</p>

              {/* QR Code */}
              <div className="w-52 h-52 mx-auto mb-4 bg-white rounded-xl p-2 flex items-center justify-center">
                <QRCode data={payment.walletAddress} size={192} />
              </div>

              <div className="bg-gray-800/50 rounded-xl p-3 relative group">
                <p className="text-sm font-mono text-gray-300 break-all pr-10">
                  {payment.walletAddress}
                </p>
                <button
                  onClick={() => handleCopy(payment.walletAddress, "address")}
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

              <p className="text-xs text-gray-500 mt-2 text-center">
                {payment.network}
              </p>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
              <p className="text-sm text-gray-400">{t("waitingPayment")}</p>
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
                onClick={() => router.push("/lobby")}
                className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
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
