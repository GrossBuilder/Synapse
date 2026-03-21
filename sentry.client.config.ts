import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  
  // Отключаем в dev если DSN не настроен
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,
  
  // Фильтруем чувствительные данные
  beforeSend(event) {
    // Не отправляем PII
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    return event;
  },
});
