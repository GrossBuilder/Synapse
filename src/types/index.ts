// ==================== КАТЕГОРИИ ====================

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  color: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  icon?: string;
}

// ==================== ПОЛЬЗОВАТЕЛЬ ====================

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio: string | null;
  experienceLevel: "BEGINNER" | "INTERMEDIATE" | "EXPERT";
  isVerified: boolean;
  isPremium: boolean;
  interests: UserInterest[];
  tags: string[];
}

export interface UserInterest {
  subcategoryId: string;
  subcategory: Subcategory;
}

// ==================== МАТЧИНГ ====================

export interface MatchRequest {
  userId: string;
  categorySlug: string;
  subcategorySlugs?: string[];
  tags?: string[];
  regionSlug?: string;
  experienceLevel?: string;
}

export interface MatchResult {
  sessionId: string;
  peerId: string;
  peerName: string;
  peerImage: string | null;
  categorySlug: string;
}

// ==================== WEBRTC / СОКЕТЫ ====================

export interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  sessionId: string;
  senderId: string;
  receiverId: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface SocketEvents {
  // Клиент → Сервер
  "join-queue": (data: MatchRequest) => void;
  "leave-queue": () => void;
  "signal": (data: SignalData) => void;
  "end-chat": (sessionId: string) => void;
  "next-partner": (data: MatchRequest) => void;
  "send-message": (data: { sessionId: string; message: string }) => void;

  // Сервер → Клиент
  "match-found": (data: MatchResult) => void;
  "match-searching": () => void;
  "partner-signal": (data: SignalData) => void;
  "partner-disconnected": () => void;
  "chat-message": (data: { senderId: string; message: string }) => void;
  "queue-position": (position: number) => void;
  "error": (message: string) => void;
}

// ==================== ЧАТ ====================

export interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  timestamp: number;
}

export interface ChatSessionInfo {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerImage: string | null;
  categorySlug: string;
  startedAt: number;
}

// ==================== TRUST SCORE ====================

/** Пул репутации: trusted (быстрый матч), regular, probation (медленный матч) */
export type TrustPool = "trusted" | "regular" | "probation";

/** Бейдж, видимый пользователю */
export type TrustBadge = "trusted" | "regular" | "low";

/** Факторы расчёта Trust Score (0–100) */
export interface TrustFactors {
  /** Средняя длительность сессий (0–30 баллов) — > 3 мин = хорошо */
  sessionDuration: number;
  /** % скипов от собеседника (0–25 баллов) — чем меньше скипают, тем лучше */
  skipRate: number;
  /** Чистота от жалоб за 30 дней (0–20 баллов) */
  reportCleanness: number;
  /** % времени с включённой камерой (0–15 баллов) */
  cameraUsage: number;
  /** Текстовая активность в чате (0–10 баллов) */
  chatActivity: number;
}

/** Полный объект Trust Score пользователя */
export interface TrustScore {
  userId: string;
  score: number;          // 0–100
  pool: TrustPool;
  badge: TrustBadge;
  factors: TrustFactors;
  /** Счётчик быстрых скипов подряд (< 5 сек) */
  rapidSkipStreak: number;
  /** Временный штраф до указанного timestamp (Ghost Skip) */
  penaltyUntil: number | null;
  updatedAt: number;
}

/** Метрика поведения за одну сессию */
export interface SessionBehavior {
  userId: string;
  sessionId: string;
  duration: number;           // секунды
  wasSkippedByPartner: boolean;
  skippedPartner: boolean;
  cameraOnPercent: number;    // 0–100
  messagesSent: number;
  reportFiled: boolean;
  timestamp: number;
}

/** События Trust Score для сокетов */
export interface TrustSocketEvents {
  /** Сервер → Клиент: бейдж текущего пользователя */
  "trust-badge": (data: { badge: TrustBadge; pool: TrustPool }) => void;
  /** Сервер → Клиент: бейдж собеседника */
  "peer-badge": (data: { badge: TrustBadge }) => void;
  /** Сервер → Клиент: предупреждение о Ghost Skip */
  "rapid-skip-warning": (data: { skipsLeft: number }) => void;
}

// ==================== ПОДПИСКА И МОНЕТИЗАЦИЯ ====================

/** Тарифный план */
export type SubscriptionPlan = "free" | "plus" | "pro";

/** Статус подписки */
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "trial";

/** Тип буста */
export type BoostType = "queue" | "region" | "spotlight";

/** Лимиты по тарифу */
export interface PlanLimits {
  chatsPerDay: number;        // free: 15, plus: Infinity, pro: Infinity
  queuePriority: number;      // free: 1, plus: 2, pro: 3
  rematchPerDay: number;       // free: 1, plus: 5, pro: Infinity
  allRegions: boolean;         // free: false, plus: true, pro: true
  invisibleSkip: boolean;      // free: false, plus: true, pro: true
  verifiedBadgeFree: boolean;  // free: false, plus: true, pro: true
  createGroupRooms: boolean;   // free: false, plus: false, pro: true
  chatAnalytics: boolean;      // free: false, plus: false, pro: true
  noAds: boolean;              // free: false, plus: true, pro: true
}

/** Подписка пользователя */
export interface UserSubscription {
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  limits: PlanLimits;
  /** Количество чатов за сегодня */
  chatsToday: number;
  /** Количество рематчей за сегодня */
  rematchesToday: number;
  /** Дата начала подписки */
  startedAt: number;
  /** Дата окончания подписки (null = бессрочно для free) */
  expiresAt: number | null;
}

/** Активный буст пользователя */
export interface ActiveBoost {
  userId: string;
  type: BoostType;
  activatedAt: number;
  expiresAt: number;
}

/** Информация о ценах (для UI) */
export interface PricingInfo {
  plan: SubscriptionPlan;
  name: string;
  price: number;            // USD/month
  features: string[];
}

/** События подписки для сокетов */
export interface SubscriptionSocketEvents {
  /** Сервер → Клиент: лимит чатов достигнут */
  "chat-limit-reached": (data: { used: number; limit: number; plan: SubscriptionPlan }) => void;
  /** Сервер → Клиент: буст активирован */
  "boost-activated": (data: { type: BoostType; expiresAt: number }) => void;
  /** Сервер → Клиент: буст истёк */
  "boost-expired": (data: { type: BoostType }) => void;
  /** Сервер → Клиент: обновление счётчика чатов */
  "chat-count-update": (data: { used: number; limit: number }) => void;
}
