import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { jwtVerify } from "jose";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);

// JWT секрет для верификации NextAuth токена
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
  console.warn("[SECURITY] NEXTAUTH_SECRET must be set for socket authentication");
}
const JWT_SECRET_KEY = new TextEncoder().encode(NEXTAUTH_SECRET || "");

// ==================== TRUST SCORE КОНФИГ ====================

type TrustPool = "trusted" | "regular" | "probation";
type TrustBadge = "trusted" | "regular" | "low";

const TRUST_DEFAULTS = {
  defaultScore: 50,
  trustedThreshold: 70,
  probationThreshold: 30,
  rapidSkipThreshold: 5,  // секунд
  rapidSkipLimit: 3,      // скипов подряд
  ghostPenaltyMs: 10 * 60 * 1000, // 10 минут
};

function scoreToPool(score: number): TrustPool {
  if (score >= TRUST_DEFAULTS.trustedThreshold) return "trusted";
  if (score >= TRUST_DEFAULTS.probationThreshold) return "regular";
  return "probation";
}

function scoreToBadge(score: number): TrustBadge {
  if (score >= TRUST_DEFAULTS.trustedThreshold) return "trusted";
  if (score >= TRUST_DEFAULTS.probationThreshold) return "regular";
  return "low";
}

// ==================== ТИПЫ ====================

interface QueueEntry {
  socketId: string;
  userId: string;
  userName: string;
  userImage: string | null;
  categorySlug: string;
  subcategorySlugs: string[];
  tags: string[];
  regionSlug: string;
  joinedAt: number;
  trustPool: TrustPool;
  trustScore: number;
  trustBadge: TrustBadge;
  /** Приоритет подписки: free=1, plus=2, pro=3, +5 с Queue Boost */
  queuePriority: number;
  plan: SubscriptionPlan;
}

interface ActiveSession {
  id: string;
  user1SocketId: string;
  user2SocketId: string;
  categorySlug: string;
  startedAt: number;
}

interface UserTrustData {
  score: number;
  pool: TrustPool;
  badge: TrustBadge;
  rapidSkipStreak: number;
  penaltyUntil: number | null;
  /** Статистика: количество сессий */
  totalSessions: number;
  /** Суммарная длительность всех сессий */
  totalDuration: number;
  /** Сколько раз тебя скипнули */
  timesSkipped: number;
  /** Сколько раз ты скипнул <5 сек */
  rapidSkips: number;
  /** Камера: сумма cameraOnPercent всех сессий */
  cameraSum: number;
  /** Сумма отправленных сообщений */
  messagesSum: number;
  /** Жалоб за последние 30 дней */
  recentReports: number;
}

// ==================== СОСТОЯНИЕ ====================

// Очереди по категориям: categorySlug -> QueueEntry[]
const queues = new Map<string, QueueEntry[]>();

// Активные сессии: sessionId -> ActiveSession
const sessions = new Map<string, ActiveSession>();

// Привязка socket -> user info
const socketUsers = new Map<string, {
  userId: string;
  sessionId?: string;
  lastSkipAt?: number;
  groupRoomId?: string;
}>();

// Trust Score по userId (in-memory, синхронизируется с Redis/DB)
const userTrust = new Map<string, UserTrustData>();

// ==================== GROUP ROOMS ====================

interface GroupParticipant {
  socketId: string;
  userId: string;
  userName: string;
  userImage: string | null;
  joinedAt: number;
}

interface GroupRoom {
  id: string;
  name: string;
  hostUserId: string;
  hostSocketId: string;
  categorySlug: string;
  participants: GroupParticipant[];
  maxParticipants: number;
  createdAt: number;
  isPublic: boolean;
}

const groupRooms = new Map<string, GroupRoom>();
const MAX_GROUP_PARTICIPANTS = 6;

// ==================== ПОДПИСКИ И ЛИМИТЫ ====================

type SubscriptionPlan = "free" | "plus" | "pro";
type BoostType = "queue" | "region" | "spotlight";

interface UserSubData {
  plan: SubscriptionPlan;
  /** Количество чатов за сегодня */
  chatsToday: number;
  /** Дата последнего сброса (YYYY-MM-DD) */
  lastResetDate: string;
  /** Количество ремatch за сегодня */
  rematchesToday: number;
  /** Активные бусты */
  activeBoosts: Array<{ type: BoostType; expiresAt: number }>;
}

const PLAN_CHAT_LIMITS: Record<SubscriptionPlan, number> = {
  free: 15,
  plus: Infinity,
  pro: Infinity,
};

const PLAN_REMATCH_LIMITS: Record<SubscriptionPlan, number> = {
  free: 1,
  plus: 5,
  pro: Infinity,
};

const PLAN_QUEUE_PRIORITY: Record<SubscriptionPlan, number> = {
  free: 1,
  plus: 2,
  pro: 3,
};

// Подписка по userId
const userSubs = new Map<string, UserSubData>();

function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function getOrCreateSub(userId: string): UserSubData {
  let sub = userSubs.get(userId);
  if (!sub) {
    sub = {
      plan: "free",
      chatsToday: 0,
      lastResetDate: getTodayKey(),
      rematchesToday: 0,
      activeBoosts: [],
    };
    userSubs.set(userId, sub);
  }
  // Сброс ежедневных лимитов при новом дне
  const today = getTodayKey();
  if (sub.lastResetDate !== today) {
    sub.chatsToday = 0;
    sub.rematchesToday = 0;
    sub.lastResetDate = today;
  }
  // Очистка истёкших бустов
  sub.activeBoosts = sub.activeBoosts.filter((b) => Date.now() < b.expiresAt);
  return sub;
}

function canStartChat(sub: UserSubData): { allowed: boolean; used: number; limit: number } {
  const limit = PLAN_CHAT_LIMITS[sub.plan];
  return { allowed: sub.chatsToday < limit, used: sub.chatsToday, limit };
}

function hasQueueBoost(sub: UserSubData): boolean {
  return sub.activeBoosts.some((b) => b.type === "queue" && Date.now() < b.expiresAt);
}

// ==================== TRUST SCORE ДВИЖОК ====================

function getOrCreateTrust(userId: string): UserTrustData {
  let trust = userTrust.get(userId);
  if (!trust) {
    trust = {
      score: TRUST_DEFAULTS.defaultScore,
      pool: "regular",
      badge: "regular",
      rapidSkipStreak: 0,
      penaltyUntil: null,
      totalSessions: 0,
      totalDuration: 0,
      timesSkipped: 0,
      rapidSkips: 0,
      cameraSum: 0,
      messagesSum: 0,
      recentReports: 0,
    };
    userTrust.set(userId, trust);
  }
  return trust;
}

function recalcTrustScore(trust: UserTrustData): void {
  const sessions = Math.max(trust.totalSessions, 1);

  // Фактор 1: Средняя длительность сессий (0–30)
  const avgDuration = trust.totalDuration / sessions;
  const durationFactor = Math.min(avgDuration / 180, 1) * 30;

  // Фактор 2: Skip Rate (0–25) — чем меньше тебя скипают, тем лучше
  const skipRatio = trust.timesSkipped / sessions;
  const skipFactor = (1 - Math.min(skipRatio, 1)) * 25;

  // Фактор 3: Чистота от жалоб (0–20)
  const reportPenalty = Math.min(trust.recentReports, 4) * 5;
  const reportFactor = 20 - reportPenalty;

  // Фактор 4: Camera usage (0–15)
  const avgCamera = trust.cameraSum / sessions;
  const cameraFactor = Math.min(avgCamera / 80, 1) * 15;

  // Фактор 5: Chat activity (0–10)
  const avgMessages = trust.messagesSum / sessions;
  const chatFactor = Math.min(avgMessages / 5, 1) * 10;

  const raw = durationFactor + skipFactor + reportFactor + cameraFactor + chatFactor;
  trust.score = Math.round(Math.max(0, Math.min(100, raw)));
  trust.pool = scoreToPool(trust.score);
  trust.badge = scoreToBadge(trust.score);
}

/**
 * Возвращает эффективный пул (с учётом Ghost Skip штрафа).
 */
function getEffectivePool(trust: UserTrustData): TrustPool {
  if (trust.penaltyUntil && Date.now() < trust.penaltyUntil) {
    return "probation";
  }
  // Срок штрафа истёк — сбрасываем
  if (trust.penaltyUntil && Date.now() >= trust.penaltyUntil) {
    trust.penaltyUntil = null;
  }
  return trust.pool;
}

/**
 * Обрабатывает событие «скип» (next-partner или disconnect).
 * Возвращает количество оставшихся скипов до Ghost Skip (-1 если штраф назначен).
 */
function handleSkipEvent(userId: string, sessionDuration: number): number {
  const trust = getOrCreateTrust(userId);

  if (sessionDuration >= TRUST_DEFAULTS.rapidSkipThreshold) {
    // Нормальный выход — сбрасываем стрик
    trust.rapidSkipStreak = 0;
    return TRUST_DEFAULTS.rapidSkipLimit;
  }

  // Быстрый скип
  trust.rapidSkipStreak++;
  trust.rapidSkips++;

  if (trust.rapidSkipStreak >= TRUST_DEFAULTS.rapidSkipLimit) {
    // Ghost Skip! Штраф
    trust.penaltyUntil = Date.now() + TRUST_DEFAULTS.ghostPenaltyMs;
    trust.rapidSkipStreak = 0;
    console.log(`[Trust] Ghost Skip: ${userId} → PROBATION на 10 мин`);
    return -1;
  }

  return TRUST_DEFAULTS.rapidSkipLimit - trust.rapidSkipStreak;
}

/**
 * Записывает поведение за сессию и пересчитывает Trust Score.
 */
function recordSessionBehavior(
  userId: string,
  duration: number,
  wasSkipped: boolean,
  cameraOnPercent: number,
  messagesSent: number,
): void {
  const trust = getOrCreateTrust(userId);
  trust.totalSessions++;
  trust.totalDuration += Math.min(duration, 1800);
  if (wasSkipped) trust.timesSkipped++;
  trust.cameraSum += cameraOnPercent;
  trust.messagesSum += messagesSent;
  recalcTrustScore(trust);
}

// ==================== СЕРВЕР ====================

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// Redis adapter for horizontal scaling
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL) {
  try {
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("[Socket.IO] Redis adapter connected");
  } catch (e) {
    console.warn("[Socket.IO] Redis adapter failed, using in-memory:", e);
  }
}

// ==================== МАТЧИНГ С SHADOW POOLS ====================

/**
 * Ищет лучший матч из очереди С УЧЕТОМ Shadow Pools:
 * - TRUSTED ищет только среди TRUSTED и REGULAR
 * - REGULAR ищет среди REGULAR и TRUSTED
 * - PROBATION ищет ТОЛЬКО среди PROBATION
 */
function findMatch(entry: QueueEntry): QueueEntry | null {
  const queue = queues.get(entry.categorySlug) || [];
  const entryPool = entry.trustPool;

  let bestMatch: QueueEntry | null = null;
  let bestScore = -1;

  for (const candidate of queue) {
    // Не матчим с самим собой
    if (candidate.userId === entry.userId) continue;
    if (candidate.socketId === entry.socketId) continue;

    // ===== SHADOW POOL ФИЛЬТРАЦИЯ =====
    const candidatePool = candidate.trustPool;

    if (entryPool === "probation") {
      // Probation матчится ТОЛЬКО с probation
      if (candidatePool !== "probation") continue;
    } else {
      // Trusted/Regular НЕ матчатся с probation
      if (candidatePool === "probation") continue;
    }

    let score = 1; // Базовый балл за совпадение категории

    // Совпадение подкатегорий
    const commonSubs = entry.subcategorySlugs.filter((s) =>
      candidate.subcategorySlugs.includes(s)
    );
    score += commonSubs.length * 2;

    // Совпадение тегов
    const commonTags = entry.tags.filter((t) =>
      candidate.tags.map((ct) => ct.toLowerCase()).includes(t.toLowerCase())
    );
    score += commonTags.length * 3;

    // Совпадение региона (+4 если оба в одном регионе, кроме global)
    if (
      entry.regionSlug !== "global" &&
      candidate.regionSlug !== "global" &&
      entry.regionSlug === candidate.regionSlug
    ) {
      score += 4;
    }

    // Время ожидания (приоритет тем, кто ждёт дольше)
    const waitTime = Date.now() - candidate.joinedAt;
    if (waitTime > 10000) score += 1; // +1 если ждёт > 10 сек
    if (waitTime > 30000) score += 2; // ещё +2 если > 30 сек

    // ===== TRUST SCORE БОНУС =====
    // Trusted получают бонус к матчингу (+3)
    if (candidatePool === "trusted") score += 3;
    // Trusted-Trusted пара → дополнительный бонус (+2)
    if (entryPool === "trusted" && candidatePool === "trusted") score += 2;

    // ===== ПОДПИСКА: ПРИОРИТЕТ ОЧЕРЕДИ =====
    // Plus/Pro/Boost пользователи получают бонус к матчингу
    score += candidate.queuePriority;
    score += entry.queuePriority;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

function removeFromQueue(socketId: string) {
  for (const [categorySlug, queue] of queues.entries()) {
    const index = queue.findIndex((e) => e.socketId === socketId);
    if (index !== -1) {
      queue.splice(index, 1);
      if (queue.length === 0) queues.delete(categorySlug);
      return;
    }
  }
}

function createSession(
  entry1: QueueEntry,
  entry2: QueueEntry
): ActiveSession {
  const session: ActiveSession = {
    id: uuidv4(),
    user1SocketId: entry1.socketId,
    user2SocketId: entry2.socketId,
    categorySlug: entry1.categorySlug,
    startedAt: Date.now(),
  };
  sessions.set(session.id, session);

  // Обновляем привязку
  const user1 = socketUsers.get(entry1.socketId);
  const user2 = socketUsers.get(entry2.socketId);
  if (user1) user1.sessionId = session.id;
  if (user2) user2.sessionId = session.id;

  return session;
}

// ==================== GROUP ROOM HELPERS ====================

function handleLeaveGroup(socket: Socket, roomId: string) {
  const room = groupRooms.get(roomId);
  if (!room) return;

  const participant = room.participants.find((p) => p.socketId === socket.id);
  if (!participant) return;

  room.participants = room.participants.filter((p) => p.socketId !== socket.id);
  socket.leave(`group:${roomId}`);

  const userInfo = socketUsers.get(socket.id);
  if (userInfo) userInfo.groupRoomId = undefined;

  // Уведомляем остальных
  socket.to(`group:${roomId}`).emit("group-participant-left", {
    userId: participant.userId,
    socketId: socket.id,
  });

  // Если комната пуста — удаляем
  if (room.participants.length === 0) {
    groupRooms.delete(roomId);
    console.log(`[Group] Комната ${room.name} удалена (пуста)`);
    return;
  }

  // Если хост ушёл — передаём хостинг
  if (participant.userId === room.hostUserId) {
    const newHost = room.participants[0];
    room.hostUserId = newHost.userId;
    room.hostSocketId = newHost.socketId;
    io.to(`group:${roomId}`).emit("group-host-changed", {
      userId: newHost.userId,
      userName: newHost.userName,
    });
    console.log(`[Group] Новый хост ${room.name}: ${newHost.userName}`);
  }

  console.log(`[Group] ${participant.userName} покинул ${room.name} (${room.participants.length}/${room.maxParticipants})`);
}

// ==================== INPUT VALIDATION ====================

const MAX_MESSAGE_LENGTH = 2000;
const MAX_ROOM_NAME_LENGTH = 50;
const MAX_CATEGORY_LENGTH = 100;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 50;

function sanitizeString(str: unknown, maxLength: number): string {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLength);
}

function validateCategorySlug(slug: unknown): string | null {
  if (typeof slug !== "string" || slug.length === 0 || slug.length > MAX_CATEGORY_LENGTH) return null;
  // Только буквы, цифры, дефис, underscore
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
  return slug;
}

function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .slice(0, MAX_TAGS)
    .map((t) => t.trim().slice(0, MAX_TAG_LENGTH));
}

// ==================== SOCKET EVENT RATE LIMITING ====================

const socketEventCounts = new Map<string, Map<string, { count: number; resetAt: number }>>();

const EVENT_RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "join-queue": { max: 10, windowMs: 60_000 },
  "pre-screen": { max: 5, windowMs: 60_000 },
  "next-partner": { max: 20, windowMs: 60_000 },
  "send-message": { max: 60, windowMs: 60_000 },
  "signal": { max: 100, windowMs: 60_000 },
  "group-signal": { max: 100, windowMs: 60_000 },
  "group-message": { max: 60, windowMs: 60_000 },
  "create-group-room": { max: 5, windowMs: 60_000 },
  "activate-boost": { max: 3, windowMs: 60_000 },
};

function checkSocketRateLimit(socketId: string, event: string): boolean {
  const limit = EVENT_RATE_LIMITS[event];
  if (!limit) return true; // No limit configured

  if (!socketEventCounts.has(socketId)) {
    socketEventCounts.set(socketId, new Map());
  }
  const events = socketEventCounts.get(socketId)!;
  const now = Date.now();
  const entry = events.get(event);

  if (!entry || now >= entry.resetAt) {
    events.set(event, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }

  entry.count++;
  if (entry.count > limit.max) {
    return false;
  }
  return true;
}

function cleanupSocketRateLimit(socketId: string): void {
  socketEventCounts.delete(socketId);
}

// ==================== STALE SESSION CLEANUP ====================

const STALE_SESSION_MS = 30 * 60 * 1000; // 30 минут

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.startedAt > STALE_SESSION_MS) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[Cleanup] Удалено ${cleaned} устаревших сессий`);
  }
}, 5 * 60 * 1000); // Каждые 5 минут

// ==================== JWT AUTH MIDDLEWARE ====================

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || !NEXTAUTH_SECRET) {
      return next(new Error("Authentication required"));
    }

    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    if (!payload.id || typeof payload.id !== "string") {
      return next(new Error("Invalid token"));
    }

    // Сохраняем данные пользователя из JWT в socket.data
    socket.data.userId = payload.id as string;
    socket.data.userName = (payload.name as string) || "Anonymous";
    socket.data.region = (payload.region as string) || "global";

    next();
  } catch {
    next(new Error("Authentication failed"));
  }
});

// ==================== ОБРАБОТКА СОБЫТИЙ ====================

io.on("connection", (socket: Socket) => {
  const authenticatedUserId = socket.data.userId as string;
  console.log(`[Synapse] Подключение: ${socket.id} (user: ${authenticatedUserId})`);

  // ---- Rate-limit хелпер для событий ----
  function rateLimited(event: string): boolean {
    if (!checkSocketRateLimit(socket.id, event)) {
      socket.emit("error", { message: "Too many requests. Please slow down." });
      console.warn(`[RateLimit] Socket ${socket.id} exceeded rate limit for: ${event}`);
      return true;
    }
    return false;
  }

  // ---- AI Pre-Screen камеры ----
  socket.on("pre-screen", async (data: { frame: string }) => {
    if (rateLimited("pre-screen")) return;

    const userId = authenticatedUserId;

    if (!data.frame || typeof data.frame !== "string") {
      socket.emit("pre-screen-result", { allowed: true });
      return;
    }

    // Проверка размера кадра (макс 500KB base64)
    if (data.frame.length > 680_000) {
      socket.emit("pre-screen-result", { allowed: true });
      return;
    }

    try {
      // Динамический импорт content-moderation (ESM совместимость)
      const { moderateFrame } = await import("../src/lib/content-moderation");
      const result = await moderateFrame(userId, data.frame, undefined, "pre-screen");

      if (!result.allowed) {
        console.log(`[Moderation] Pre-screen BLOCKED user ${userId}: ${result.reason}`);
        socket.emit("pre-screen-blocked", {
          reason: result.reason,
          violations: result.violations,
        });
        // Удаляем из очереди если был
        removeFromQueue(socket.id);
      }

      socket.emit("pre-screen-result", { allowed: result.allowed, reason: result.reason });
    } catch (err) {
      console.error("[Moderation] Pre-screen error:", err);
      // Fail open
      socket.emit("pre-screen-result", { allowed: true });
    }
  });

  // ---- Внутренняя функция входа в очередь ----
  function handleJoinQueue(sock: Socket, data: {
    userId: string;
    userName: string;
    userImage: string | null;
    categorySlug: string;
    subcategorySlugs?: string[];
    tags?: string[];
    regionSlug?: string;
  }) {
    // Используем userId из JWT, а не от клиента
    const userId = authenticatedUserId;
    const userName = sock.data.userName as string;

    // Валидация входных данных
    const categorySlug = validateCategorySlug(data.categorySlug);
    if (!categorySlug) {
      sock.emit("error", { message: "Invalid category" });
      return;
    }

    // Удаляем из старой очереди если был
    removeFromQueue(sock.id);

    // === ПРОВЕРКА ЛИМИТА ЧАТОВ ===
    const sub = getOrCreateSub(userId);
    const chatCheck = canStartChat(sub);
    if (!chatCheck.allowed) {
      sock.emit("chat-limit-reached", {
        used: chatCheck.used,
        limit: chatCheck.limit,
        plan: sub.plan,
      });
      console.log(`[Sub] Лимит чатов: ${userName} (${sub.plan}) — ${chatCheck.used}/${chatCheck.limit}`);
      return;
    }

    // Получаем Trust Score пользователя
    const trust = getOrCreateTrust(userId);
    const effectivePool = getEffectivePool(trust);

    // Приоритет очереди: базовый + буст
    const queuePriority = PLAN_QUEUE_PRIORITY[sub.plan] + (hasQueueBoost(sub) ? 5 : 0);

    const entry: QueueEntry = {
      socketId: sock.id,
      userId,
      userName,
      userImage: data.userImage,
      categorySlug,
      subcategorySlugs: Array.isArray(data.subcategorySlugs) ? data.subcategorySlugs.filter((s): s is string => typeof s === "string").slice(0, 20) : [],
      tags: sanitizeTags(data.tags),
      regionSlug: sanitizeString(data.regionSlug, 50) || "global",
      joinedAt: Date.now(),
      trustPool: effectivePool,
      trustScore: trust.score,
      trustBadge: trust.badge,
      queuePriority,
      plan: sub.plan,
    };

    socketUsers.set(sock.id, { userId });

    // Отправляем бейдж текущему пользователю
    sock.emit("trust-badge", { badge: trust.badge, pool: effectivePool });

    // Пробуем найти матч
    const match = findMatch(entry);

    if (match) {
      // Убираем матч из очереди
      removeFromQueue(match.socketId);

      // Создаём сессию
      const session = createSession(entry, match);

      // === ИНКРЕМЕНТ СЧЁТЧИКА ЧАТОВ ===
      const entrySub = getOrCreateSub(entry.userId);
      entrySub.chatsToday++;
      const matchSub = getOrCreateSub(match.userId);
      matchSub.chatsToday++;

      // Уведомляем обоих с бейджами
      io.to(entry.socketId).emit("match-found", {
        sessionId: session.id,
        peerId: match.userId,
        peerName: match.userName,
        peerImage: match.userImage,
        categorySlug: session.categorySlug,
      });
      io.to(entry.socketId).emit("peer-badge", { badge: match.trustBadge });
      io.to(entry.socketId).emit("chat-count-update", {
        used: entrySub.chatsToday,
        limit: PLAN_CHAT_LIMITS[entrySub.plan],
      });

      io.to(match.socketId).emit("match-found", {
        sessionId: session.id,
        peerId: entry.userId,
        peerName: entry.userName,
        peerImage: entry.userImage,
        categorySlug: session.categorySlug,
      });
      io.to(match.socketId).emit("peer-badge", { badge: entry.trustBadge });
      io.to(match.socketId).emit("chat-count-update", {
        used: matchSub.chatsToday,
        limit: PLAN_CHAT_LIMITS[matchSub.plan],
      });

      console.log(
        `[Synapse] Матч: ${entry.userName}(${effectivePool}) <-> ${match.userName}(${match.trustPool}) (${entry.categorySlug})`
      );
    } else {
      // Добавляем в очередь
      if (!queues.has(entry.categorySlug)) {
        queues.set(entry.categorySlug, []);
      }
      queues.get(entry.categorySlug)!.push(entry);

      sock.emit("match-searching");

      // Отправляем позицию в очереди
      const queue = queues.get(entry.categorySlug)!;
      sock.emit("queue-position", queue.length);
    }
  }

  // ---- Вход в очередь ----
  socket.on("join-queue", (data: {
    userId: string;
    userName: string;
    userImage: string | null;
    categorySlug: string;
    subcategorySlugs?: string[];
    tags?: string[];
    regionSlug?: string;
  }) => {
    if (rateLimited("join-queue")) return;
    handleJoinQueue(socket, data);
  });

  // ---- Выход из очереди ----
  socket.on("leave-queue", () => {
    removeFromQueue(socket.id);
  });

  // ---- WebRTC сигналинг ----
  socket.on("signal", (data: {
    type: "offer" | "answer" | "ice-candidate";
    sessionId: string;
    data: unknown;
  }) => {
    if (rateLimited("signal")) return;
    const session = sessions.get(data.sessionId);
    if (!session) return;

    // Проверяем что отправитель — участник сессии
    if (socket.id !== session.user1SocketId && socket.id !== session.user2SocketId) {
      return; // Не участник — игнорируем
    }

    // Определяем получателя
    const targetSocketId =
      socket.id === session.user1SocketId
        ? session.user2SocketId
        : session.user1SocketId;

    io.to(targetSocketId).emit("partner-signal", {
      type: data.type,
      sessionId: data.sessionId,
      senderId: socket.id,
      data: data.data,
    });
  });

  // ---- Текстовое сообщение ----
  socket.on("send-message", (data: { sessionId: string; message: string }) => {
    if (rateLimited("send-message")) return;
    const session = sessions.get(data.sessionId);
    if (!session) return;

    // Проверяем участие в сессии
    if (socket.id !== session.user1SocketId && socket.id !== session.user2SocketId) return;

    // Валидация длины сообщения
    const message = sanitizeString(data.message, MAX_MESSAGE_LENGTH);
    if (message.length === 0) return;

    const targetSocketId =
      socket.id === session.user1SocketId
        ? session.user2SocketId
        : session.user1SocketId;

    const userInfo = socketUsers.get(socket.id);

    io.to(targetSocketId).emit("chat-message", {
      senderId: userInfo?.userId || "Unknown",
      message,
    });
  });

  // ---- Завершение чата (с трекингом поведения) ----
  socket.on("end-chat", (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) return;

    // Проверяем участие в сессии
    if (socket.id !== session.user1SocketId && socket.id !== session.user2SocketId) return;

    const duration = Math.floor((Date.now() - session.startedAt) / 1000);

    // Записываем поведение обоих участников (нормальное завершение)
    const user1Info = socketUsers.get(session.user1SocketId);
    const user2Info = socketUsers.get(session.user2SocketId);
    if (user1Info) recordSessionBehavior(user1Info.userId, duration, false, 100, 0);
    if (user2Info) recordSessionBehavior(user2Info.userId, duration, false, 100, 0);

    const targetSocketId =
      socket.id === session.user1SocketId
        ? session.user2SocketId
        : session.user1SocketId;

    io.to(targetSocketId).emit("partner-disconnected");
    sessions.delete(sessionId);
  });

  // ---- Следующий собеседник (с Trust Score трекингом) ----
  socket.on("next-partner", (data: {
    userId: string;
    userName: string;
    userImage: string | null;
    categorySlug: string;
    subcategorySlugs?: string[];
    tags?: string[];
  }) => {
    if (rateLimited("next-partner")) return;

    // Завершаем текущую сессию и записываем поведение
    const userInfo = socketUsers.get(socket.id);
    if (userInfo?.sessionId) {
      const session = sessions.get(userInfo.sessionId);
      if (session) {
        const duration = Math.floor((Date.now() - session.startedAt) / 1000);

        // Записываем поведение скипнувшего
        recordSessionBehavior(
          userInfo.userId,
          duration,
          false,   // не был скипнут — сам скипнул
          100,     // камера (пока default, будет от клиента)
          0,       // сообщения (пока default)
        );

        // Записываем поведение того, кого скипнули
        const targetSocketId =
          socket.id === session.user1SocketId
            ? session.user2SocketId
            : session.user1SocketId;
        const targetInfo = socketUsers.get(targetSocketId);
        if (targetInfo) {
          recordSessionBehavior(
            targetInfo.userId,
            duration,
            true,    // был скипнут партнёром
            100,
            0,
          );
        }

        // Ghost Skip проверка
        const skipsLeft = handleSkipEvent(userInfo.userId, duration);
        if (skipsLeft === -1) {
          // Ghost Skip активирован — уведомляем
          socket.emit("rapid-skip-warning", { skipsLeft: 0 });
        } else if (skipsLeft < TRUST_DEFAULTS.rapidSkipLimit) {
          socket.emit("rapid-skip-warning", { skipsLeft });
        }

        io.to(targetSocketId).emit("partner-disconnected");
        sessions.delete(userInfo.sessionId);
      }
    }

    // Re-join queue with the same data (handled internally, not via self-emit)
    handleJoinQueue(socket, data);
  });

  // ---- Активация буста ----
  // ВАЖНО: буст активируется ТОЛЬКО через payment-activator после подтверждения оплаты.
  // Клиент НЕ может напрямую активировать буст — этот endpoint закрыт.
  socket.on("activate-boost", (_data: { userId: string; type: BoostType }) => {
    // Отклоняем прямую активацию — бусты активируются только через API оплаты
    socket.emit("boost-error", { error: "Boost activation requires payment. Use /api/payments." });
    console.warn(`[Security] Direct boost activation attempt from ${authenticatedUserId} — blocked`);
  });

  // ---- Получение статуса подписки ----
  socket.on("get-subscription", (data: { userId: string }) => {
    const sub = getOrCreateSub(authenticatedUserId);
    const chatCheck = canStartChat(sub);
    socket.emit("subscription-status", {
      plan: sub.plan,
      chatsToday: chatCheck.used,
      chatLimit: chatCheck.limit,
      rematchesToday: sub.rematchesToday,
      rematchLimit: PLAN_REMATCH_LIMITS[sub.plan],
      activeBoosts: sub.activeBoosts,
    });
  });

  // ==================== GROUP ROOMS ====================

  // ---- Создание групповой комнаты (только Pro) ----
  socket.on("create-group-room", (data: {
    userId: string;
    userName: string;
    userImage: string | null;
    roomName: string;
    categorySlug: string;
    maxParticipants?: number;
    isPublic?: boolean;
  }) => {
    const userId = authenticatedUserId;
    const sub = getOrCreateSub(userId);
    if (sub.plan !== "pro") {
      socket.emit("group-room-error", { error: "Pro plan required" });
      return;
    }

    // Валидация входных данных
    const roomName = sanitizeString(data.roomName, MAX_ROOM_NAME_LENGTH);
    if (roomName.length === 0) {
      socket.emit("group-room-error", { error: "Room name required" });
      return;
    }
    const categorySlug = validateCategorySlug(data.categorySlug);
    if (!categorySlug) {
      socket.emit("group-room-error", { error: "Invalid category" });
      return;
    }

    const roomId = uuidv4();
    const room: GroupRoom = {
      id: roomId,
      name: roomName,
      hostUserId: userId,
      hostSocketId: socket.id,
      categorySlug,
      participants: [{
        socketId: socket.id,
        userId,
        userName: data.userName,
        userImage: data.userImage,
        joinedAt: Date.now(),
      }],
      maxParticipants: Math.min(data.maxParticipants || 6, MAX_GROUP_PARTICIPANTS),
      createdAt: Date.now(),
      isPublic: data.isPublic ?? true,
    };

    groupRooms.set(roomId, room);
    socket.join(`group:${roomId}`);

    const userInfo = socketUsers.get(socket.id);
    if (userInfo) userInfo.groupRoomId = roomId;

    socket.emit("group-room-created", {
      roomId,
      name: room.name,
      categorySlug: room.categorySlug,
      participants: room.participants.map((p) => ({
        userId: p.userId,
        userName: p.userName,
        userImage: p.userImage,
        socketId: p.socketId,
      })),
      maxParticipants: room.maxParticipants,
    });

    console.log(`[Group] Создана комната: ${room.name} (${roomId}) хостом ${data.userName}`);
  });

  // ---- Присоединение к группе ----
  socket.on("join-group-room", (data: {
    userId: string;
    userName: string;
    userImage: string | null;
    roomId: string;
  }) => {
    const userId = authenticatedUserId;
    const room = groupRooms.get(data.roomId);
    if (!room) {
      socket.emit("group-room-error", { error: "Room not found" });
      return;
    }

    if (room.participants.length >= room.maxParticipants) {
      socket.emit("group-room-error", { error: "Room is full" });
      return;
    }

    if (room.participants.some((p) => p.userId === userId)) {
      socket.emit("group-room-error", { error: "Already in room" });
      return;
    }

    const participant: GroupParticipant = {
      socketId: socket.id,
      userId,
      userName: data.userName,
      userImage: data.userImage,
      joinedAt: Date.now(),
    };

    room.participants.push(participant);
    socket.join(`group:${data.roomId}`);

    const userInfo = socketUsers.get(socket.id);
    if (userInfo) userInfo.groupRoomId = data.roomId;

    // Новому участнику — список всех текущих для создания PeerConnection
    const existingParticipants = room.participants
      .filter((p) => p.socketId !== socket.id)
      .map((p) => ({
        userId: p.userId,
        userName: p.userName,
        userImage: p.userImage,
        socketId: p.socketId,
      }));

    socket.emit("group-room-joined", {
      roomId: room.id,
      name: room.name,
      categorySlug: room.categorySlug,
      participants: existingParticipants,
      maxParticipants: room.maxParticipants,
    });

    // Остальным — уведомление о новом участнике
    socket.to(`group:${data.roomId}`).emit("group-participant-joined", {
      userId: data.userId,
      userName: data.userName,
      userImage: data.userImage,
      socketId: socket.id,
    });

    console.log(`[Group] ${data.userName} присоединился к ${room.name} (${room.participants.length}/${room.maxParticipants})`);
  });

  // ---- WebRTC сигналинг для группы (mesh) ----
  socket.on("group-signal", (data: {
    roomId: string;
    targetSocketId: string;
    type: "offer" | "answer" | "ice-candidate";
    data: unknown;
  }) => {
    if (rateLimited("group-signal")) return;
    const room = groupRooms.get(data.roomId);
    if (!room) return;

    // Проверяем что оба в комнате
    if (!room.participants.some((p) => p.socketId === socket.id)) return;
    if (!room.participants.some((p) => p.socketId === data.targetSocketId)) return;

    io.to(data.targetSocketId).emit("group-peer-signal", {
      roomId: data.roomId,
      senderSocketId: socket.id,
      type: data.type,
      data: data.data,
    });
  });

  // ---- Сообщение в группу ----
  socket.on("group-message", (data: { roomId: string; message: string }) => {
    if (rateLimited("group-message")) return;
    const room = groupRooms.get(data.roomId);
    if (!room) return;

    const participant = room.participants.find((p) => p.socketId === socket.id);
    if (!participant) return;

    const message = sanitizeString(data.message, MAX_MESSAGE_LENGTH);
    if (message.length === 0) return;

    socket.to(`group:${data.roomId}`).emit("group-chat-message", {
      senderId: participant.userId,
      senderName: participant.userName,
      message,
    });
  });

  // ---- Покинуть группу ----
  socket.on("leave-group-room", (data: { roomId: string }) => {
    handleLeaveGroup(socket, data.roomId);
  });

  // ---- Список публичных комнат ----
  socket.on("list-group-rooms", (data: { categorySlug?: string }) => {
    const rooms: Array<{
      roomId: string;
      name: string;
      categorySlug: string;
      participantCount: number;
      maxParticipants: number;
      hostName: string;
    }> = [];

    for (const room of groupRooms.values()) {
      if (!room.isPublic) continue;
      if (data.categorySlug && room.categorySlug !== data.categorySlug) continue;
      rooms.push({
        roomId: room.id,
        name: room.name,
        categorySlug: room.categorySlug,
        participantCount: room.participants.length,
        maxParticipants: room.maxParticipants,
        hostName: room.participants.find((p) => p.userId === room.hostUserId)?.userName || "Unknown",
      });
    }

    socket.emit("group-rooms-list", { rooms });
  });

  // ---- Отключение (с Trust Score трекингом) ----
  socket.on("disconnect", () => {
    console.log(`[Synapse] Отключение: ${socket.id}`);
    cleanupSocketRateLimit(socket.id);

    // Покинуть группу если был в ней
    const userInfoForGroup = socketUsers.get(socket.id);
    if (userInfoForGroup?.groupRoomId) {
      handleLeaveGroup(socket, userInfoForGroup.groupRoomId);
    }

    // Удаляем из очереди
    removeFromQueue(socket.id);

    // Уведомляем партнёра и записываем поведение
    const userInfo = socketUsers.get(socket.id);
    if (userInfo?.sessionId) {
      const session = sessions.get(userInfo.sessionId);
      if (session) {
        const duration = Math.floor((Date.now() - session.startedAt) / 1000);

        // Записываем поведение отключившегося
        recordSessionBehavior(userInfo.userId, duration, false, 100, 0);

        // Записываем поведение оставшегося
        const targetSocketId =
          socket.id === session.user1SocketId
            ? session.user2SocketId
            : session.user1SocketId;
        const targetInfo = socketUsers.get(targetSocketId);
        if (targetInfo) {
          recordSessionBehavior(targetInfo.userId, duration, true, 100, 0);
        }

        io.to(targetSocketId).emit("partner-disconnected");
        sessions.delete(userInfo.sessionId);
      }
    }

    socketUsers.delete(socket.id);
  });
});

// ==================== ЗАПУСК ====================

httpServer.listen(PORT, () => {
  console.log(`\n⚡ Synapse Socket Server запущен на порту ${PORT}\n`);
  console.log(`   WebSocket:     ws://localhost:${PORT}`);
  console.log(`   Клиент:        http://localhost:3000`);
  console.log(`   Trust Score:   ✅ Shadow Pools активны`);
  console.log(`   Ghost Skip:    ${TRUST_DEFAULTS.rapidSkipLimit} быстрых скипов → ${TRUST_DEFAULTS.ghostPenaltyMs / 60000} мин штраф`);
  console.log(`   Пулы:          TRUSTED(>${TRUST_DEFAULTS.trustedThreshold}) | REGULAR(${TRUST_DEFAULTS.probationThreshold}-${TRUST_DEFAULTS.trustedThreshold}) | PROBATION(<${TRUST_DEFAULTS.probationThreshold})`);
  console.log(`   Подписки:      Free(${PLAN_CHAT_LIMITS.free}/день) | Plus(∞) | Pro(∞)\n`);
});
