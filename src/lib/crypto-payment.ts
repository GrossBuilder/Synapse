/**
 * Crypto Payment Engine — USDT TRC-20 платежи для Synapse.
 *
 * Модель: один приёмный кошелёк + уникальная сумма (amount + cents).
 * Каждый платёж получает уникальный amount (например 4.99 + 0.001–0.999),
 * чтобы однозначно привязать транзакцию к заказу.
 *
 * Проверка оплаты: TronGrid API (бесплатно, без апи-ключа для базового уровня).
 */

import type { SubscriptionPlan, BoostType } from "@/types";
import { PRICING, YEARLY_PRICING, BOOST_PRICING, VERIFIED_BADGE_PRICE } from "./subscription";
import type { BillingPeriod } from "./subscription";

// ==================== КОНФИГУРАЦИЯ ====================

/** Адрес кошелька для приёма USDT TRC-20 */
export const USDT_WALLET_ADDRESS = process.env.USDT_WALLET_ADDRESS || "";

/** USDT TRC-20 контракт на TRON */
export const USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

/** TronGrid API endpoint */
export const TRONGRID_API = process.env.TRONGRID_API_URL || "https://api.trongrid.io";

/** API ключ TronGrid (опционально, для увеличения лимитов) */
export const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY || "";

/** Сколько подтверждений считать платёж завершённым */
export const MIN_CONFIRMATIONS = 19;

/** Время жизни платежа (30 минут) */
export const PAYMENT_TTL_MS = 30 * 60 * 1000;

/** Точность USDT — 6 знаков после запятой (1 USDT = 1_000_000 sun) */
export const USDT_DECIMALS = 6;

// ==================== ТИПЫ ====================

export type PaymentPurpose =
  | { type: "subscription"; plan: SubscriptionPlan; billing?: BillingPeriod }
  | { type: "boost"; boostType: BoostType }
  | { type: "verified_badge" };

export interface CryptoPayment {
  id: string;
  userId: string;
  /** Уникальная сумма в USDT (базовая цена + микро-фракция) */
  expectedAmount: number;
  /** Строковое представление для отображения (с 3 знаками) */
  displayAmount: string;
  purpose: PaymentPurpose;
  walletAddress: string;
  status: "pending" | "confirming" | "completed" | "expired" | "failed";
  /** ID транзакции в TRON (после обнаружения) */
  txId: string | null;
  /** Фактически полученная сумма */
  receivedAmount: number | null;
  createdAt: number;
  expiresAt: number;
  completedAt: number | null;
}

// ==================== ХРАНИЛИЩЕ (Redis для персистенции) ====================

import { redis, REDIS_KEYS } from "./redis";
import crypto from "crypto";

// TTL для Redis ключей платежей (35 минут — чуть больше PAYMENT_TTL)
const REDIS_PAYMENT_TTL = 35 * 60;
// TX ID хранится 7 дней для replay protection
const REDIS_TX_TTL = 7 * 24 * 60 * 60;

// ==================== ГЕНЕРАЦИЯ ПЛАТЕЖА ====================

/**
 * Генерирует уникальную микро-фракцию к сумме (0.001 – 0.999).
 * Использует атомарный Redis-счётчик.
 */
async function generateUniqueMicro(): Promise<number> {
  const counter = await redis.incr(REDIS_KEYS.PAYMENT_MICRO_COUNTER);
  const micro = ((counter - 1) % 999) + 1; // 1–999
  return micro / 1000;
}

/**
 * Получить базовую цену для заказа.
 */
export function getBasePrice(purpose: PaymentPurpose): number {
  switch (purpose.type) {
    case "subscription": {
      const pricing = purpose.billing === "yearly" ? YEARLY_PRICING : PRICING;
      return pricing[purpose.plan];
    }
    case "boost":
      return BOOST_PRICING[purpose.boostType].price;
    case "verified_badge":
      return VERIFIED_BADGE_PRICE;
  }
}

/**
 * Описание платежа для отображения.
 */
export function getPurposeLabel(purpose: PaymentPurpose): string {
  switch (purpose.type) {
    case "subscription": {
      const name = purpose.plan === "plus" ? "Plus" : "Pro";
      const period = purpose.billing === "yearly" ? "1 year" : "1 month";
      return `Synapse ${name} — ${period}`;
    }
    case "boost":
      return BOOST_PRICING[purpose.boostType].label;
    case "verified_badge":
      return "Verified Badge";
  }
}

/**
 * Создать новый крипто-платёж.
 * Возвращает объект с адресом, уникальной суммой и QR-данными.
 */
export async function createPayment(
  userId: string,
  purpose: PaymentPurpose,
): Promise<CryptoPayment> {
  // Отменяем старые pending-платежи этого пользователя
  const existingIds = await redis.smembers(REDIS_KEYS.USER_PAYMENTS(userId));
  for (const id of existingIds) {
    const raw = await redis.get(REDIS_KEYS.PAYMENT(id));
    if (raw) {
      const p = JSON.parse(raw) as CryptoPayment;
      if (p.status === "pending") {
        p.status = "expired";
        await redis.del(REDIS_KEYS.PAYMENT(id));
        await redis.srem(REDIS_KEYS.USER_PAYMENTS(userId), id);
      }
    }
  }

  const basePrice = getBasePrice(purpose);
  if (basePrice <= 0) {
    throw new Error("Cannot create payment for free plan");
  }

  const micro = await generateUniqueMicro();
  const expectedAmount = parseFloat((basePrice + micro).toFixed(3));

  const id = `pay_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const now = Date.now();

  const payment: CryptoPayment = {
    id,
    userId,
    expectedAmount,
    displayAmount: expectedAmount.toFixed(3),
    purpose,
    walletAddress: USDT_WALLET_ADDRESS,
    status: "pending",
    txId: null,
    receivedAmount: null,
    createdAt: now,
    expiresAt: now + PAYMENT_TTL_MS,
    completedAt: null,
  };

  await redis.set(REDIS_KEYS.PAYMENT(id), JSON.stringify(payment), "EX", REDIS_PAYMENT_TTL);
  await redis.sadd(REDIS_KEYS.USER_PAYMENTS(userId), id);
  await redis.sadd(REDIS_KEYS.PENDING_PAYMENTS, id);

  return payment;
}

// ==================== ПРОВЕРКА ОПЛАТЫ ====================

/**
 * Получить список TRC-20 транзакций на кошелёк через TronGrid.
 */
async function fetchRecentTransfers(): Promise<TronTRC20Transfer[]> {
  const url = `${TRONGRID_API}/v1/accounts/${USDT_WALLET_ADDRESS}/transactions/trc20?only_to=true&limit=50&contract_address=${USDT_CONTRACT}`;

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (TRONGRID_API_KEY) {
    headers["TRON-PRO-API-KEY"] = TRONGRID_API_KEY;
  }

  const res = await fetch(url, { headers, next: { revalidate: 0 } });
  if (!res.ok) {
    console.error(`[CryptoPay] TronGrid error: ${res.status}`);
    return [];
  }

  const json = await res.json();
  return (json.data || []) as TronTRC20Transfer[];
}

interface TronTRC20Transfer {
  transaction_id: string;
  from: string;
  to: string;
  value: string;         // в sun (6 decimals для USDT)
  token_info: {
    symbol: string;
    address: string;
    decimals: number;
  };
  block_timestamp: number;
  type: string;
}

/**
 * Получить все pending-платежи из Redis.
 */
async function getAllPendingPayments(): Promise<CryptoPayment[]> {
  const ids = await redis.smembers(REDIS_KEYS.PENDING_PAYMENTS);
  if (ids.length === 0) return [];

  const keys = ids.map((id) => REDIS_KEYS.PAYMENT(id));
  const values = await redis.mget(...keys);
  const payments: CryptoPayment[] = [];
  const staleIds: string[] = [];

  for (let i = 0; i < values.length; i++) {
    const raw = values[i];
    if (raw) {
      const p = JSON.parse(raw) as CryptoPayment;
      if (p.status === "pending") payments.push(p);
    } else {
      // Key expired from Redis — remove from set
      staleIds.push(ids[i]);
    }
  }

  if (staleIds.length > 0) {
    await redis.srem(REDIS_KEYS.PENDING_PAYMENTS, ...staleIds);
  }

  return payments;
}

/**
 * Проверить все pending-платежи и сопоставить с транзакциями.
 * Вызывается по cron (каждые 30 сек) или по запросу пользователя.
 */
export async function checkPendingPayments(): Promise<{
  confirmed: CryptoPayment[];
  expired: CryptoPayment[];
}> {
  const confirmed: CryptoPayment[] = [];
  const expired: CryptoPayment[] = [];

  const allPending = await getAllPendingPayments();

  // Сначала чистим просроченные
  for (const payment of allPending) {
    if (payment.status === "pending" && Date.now() > payment.expiresAt) {
      payment.status = "expired";
      expired.push(payment);
      await redis.del(REDIS_KEYS.PAYMENT(payment.id));
      await redis.srem(REDIS_KEYS.USER_PAYMENTS(payment.userId), payment.id);
      await redis.srem(REDIS_KEYS.PENDING_PAYMENTS, payment.id);
    }
  }

  // Если нет активных — не делаем запрос
  const activePending = allPending.filter((p) => p.status === "pending");
  if (activePending.length === 0) return { confirmed, expired };

  // Запрашиваем транзакции
  const transfers = await fetchRecentTransfers();

  for (const tx of transfers) {
    // Атомарная проверка + блокировка TX ID (SET NX предотвращает race condition)
    const locked = await redis.set(REDIS_KEYS.COMPLETED_TX(tx.transaction_id), "processing", "EX", REDIS_TX_TTL, "NX");
    if (!locked) continue; // уже обработана или обрабатывается

    // Контракт совпадает?
    if (tx.token_info.address !== USDT_CONTRACT) continue;

    // Конвертируем value из sun (string) в USDT
    const decimals = tx.token_info.decimals || USDT_DECIMALS;
    const receivedAmount = parseInt(tx.value, 10) / Math.pow(10, decimals);

    // Ищем подходящий pending-платёж по сумме (±0.0005 USDT толеранс)
    for (const payment of activePending) {
      if (payment.status !== "pending") continue;

      const diff = Math.abs(receivedAmount - payment.expectedAmount);
      if (diff < 0.0005) {
        // Совпадение найдено!
        payment.status = "completed";
        payment.txId = tx.transaction_id;
        payment.receivedAmount = receivedAmount;
        payment.completedAt = Date.now();

        // Обновляем TX статус на completed (ключ уже создан через SET NX выше)
        await redis.set(REDIS_KEYS.COMPLETED_TX(tx.transaction_id), "completed", "EX", REDIS_TX_TTL);
        // Удаляем из pending
        await redis.del(REDIS_KEYS.PAYMENT(payment.id));
        await redis.srem(REDIS_KEYS.USER_PAYMENTS(payment.userId), payment.id);
        await redis.srem(REDIS_KEYS.PENDING_PAYMENTS, payment.id);

        confirmed.push(payment);

        console.log(
          `[CryptoPay] Подтверждён платёж ${payment.id}: ${receivedAmount} USDT, tx=${tx.transaction_id}`,
        );
        break;
      }
    }
  }

  return { confirmed, expired };
}

/**
 * Проверить конкретный платёж по ID.
 */
export async function checkPaymentStatus(
  paymentId: string,
): Promise<CryptoPayment | null> {
  const raw = await redis.get(REDIS_KEYS.PAYMENT(paymentId));
  if (!raw) return null;

  const payment = JSON.parse(raw) as CryptoPayment;

  // Если уже завершён — просто вернуть
  if (payment.status !== "pending") return payment;

  // Проверить просрочку
  if (Date.now() > payment.expiresAt) {
    payment.status = "expired";
    await redis.del(REDIS_KEYS.PAYMENT(paymentId));
    await redis.srem(REDIS_KEYS.USER_PAYMENTS(payment.userId), paymentId);
    return payment;
  }

  // Запросить транзакции и попробовать найти оплату
  await checkPendingPayments();

  const updated = await redis.get(REDIS_KEYS.PAYMENT(paymentId));
  return updated ? JSON.parse(updated) as CryptoPayment : payment;
}

// ==================== УТИЛИТЫ ====================

/**
 * Получить все активные платежи пользователя.
 */
export async function getUserPayments(userId: string): Promise<CryptoPayment[]> {
  const ids = await redis.smembers(REDIS_KEYS.USER_PAYMENTS(userId));
  if (ids.length === 0) return [];

  const keys = ids.map((id) => REDIS_KEYS.PAYMENT(id));
  const values = await redis.mget(...keys);
  const payments: CryptoPayment[] = [];
  for (const raw of values) {
    if (raw) payments.push(JSON.parse(raw) as CryptoPayment);
  }
  return payments;
}

/**
 * Количество активных pending-платежей (для мониторинга).
 */
export async function getPendingCount(): Promise<number> {
  const all = await getAllPendingPayments();
  return all.length;
}

/**
 * Очистить все просроченные (для cron).
 */
export async function cleanupExpired(): Promise<number> {
  const all = await getAllPendingPayments();
  let cleaned = 0;
  for (const payment of all) {
    if (Date.now() > payment.expiresAt && payment.status === "pending") {
      await redis.del(REDIS_KEYS.PAYMENT(payment.id));
      await redis.srem(REDIS_KEYS.USER_PAYMENTS(payment.userId), payment.id);
      cleaned++;
    }
  }
  return cleaned;
}
