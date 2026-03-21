// Translation service for admin responses
// Uses a comprehensive phrase dictionary for offline translation
// Can be replaced with Google Translate API / DeepL in production

type Lang = "en" | "ru" | "es" | "zh" | "ar";

const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  ru: "Русский",
  es: "Español",
  zh: "中文",
  ar: "العربية",
};

// Common admin response phrases — dictionary-based translation
const PHRASE_DICT: Record<string, Record<Lang, string>> = {
  // Greetings & closings
  "hello": { en: "Hello", ru: "Здравствуйте", es: "Hola", zh: "你好", ar: "مرحبا" },
  "thank you for your report": { en: "Thank you for your report", ru: "Спасибо за вашу жалобу", es: "Gracias por tu reporte", zh: "感谢您的举报", ar: "شكراً لتقريرك" },
  "thank you": { en: "Thank you", ru: "Спасибо", es: "Gracias", zh: "谢谢", ar: "شكراً" },
  "regards": { en: "Regards", ru: "С уважением", es: "Saludos", zh: "此致敬礼", ar: "مع تحياتي" },
  "best regards": { en: "Best regards", ru: "С наилучшими пожеланиями", es: "Atentamente", zh: "此致敬礼", ar: "مع أطيب التحيات" },
  "sincerely": { en: "Sincerely", ru: "Искренне", es: "Sinceramente", zh: "真诚地", ar: "بإخلاص" },

  // Report status
  "we have reviewed your report": { en: "We have reviewed your report", ru: "Мы рассмотрели вашу жалобу", es: "Hemos revisado tu reporte", zh: "我们已审查了您的举报", ar: "لقد راجعنا تقريرك" },
  "your report has been received": { en: "Your report has been received", ru: "Ваша жалоба получена", es: "Tu reporte ha sido recibido", zh: "您的举报已收到", ar: "تم استلام تقريرك" },
  "we are investigating this matter": { en: "We are investigating this matter", ru: "Мы расследуем этот вопрос", es: "Estamos investigando este asunto", zh: "我们正在调查此事", ar: "نحن نحقق في هذه المسألة" },
  "the reported user has been warned": { en: "The reported user has been warned", ru: "Пользователь, на которого поступила жалоба, получил предупреждение", es: "El usuario reportado ha sido advertido", zh: "被举报的用户已收到警告", ar: "تم تحذير المستخدم المبلغ عنه" },
  "the reported user has been banned": { en: "The reported user has been banned", ru: "Пользователь, на которого поступила жалоба, заблокирован", es: "El usuario reportado ha sido baneado", zh: "被举报的用户已被封禁", ar: "تم حظر المستخدم المبلغ عنه" },
  "action has been taken": { en: "Action has been taken", ru: "Меры приняты", es: "Se han tomado medidas", zh: "已采取行动", ar: "تم اتخاذ إجراء" },
  "no violation was found": { en: "No violation was found", ru: "Нарушение не обнаружено", es: "No se encontró ninguna violación", zh: "未发现违规行为", ar: "لم يتم العثور على مخالفة" },
  "this report has been resolved": { en: "This report has been resolved", ru: "Эта жалоба решена", es: "Este reporte ha sido resuelto", zh: "此举报已处理", ar: "تم حل هذا التقرير" },

  // Actions taken
  "we have taken appropriate action": { en: "We have taken appropriate action", ru: "Мы приняли соответствующие меры", es: "Hemos tomado las medidas apropiadas", zh: "我们已采取相应措施", ar: "لقد اتخذنا الإجراء المناسب" },
  "the user will be monitored": { en: "The user will be monitored", ru: "Пользователь будет под наблюдением", es: "El usuario será monitoreado", zh: "该用户将被监控", ar: "ستتم مراقبة المستخدم" },
  "please contact us if the issue persists": { en: "Please contact us if the issue persists", ru: "Свяжитесь с нами, если проблема сохранится", es: "Contáctenos si el problema persiste", zh: "如果问题仍然存在，请联系我们", ar: "يرجى الاتصال بنا إذا استمرت المشكلة" },
  "your safety is our priority": { en: "Your safety is our priority", ru: "Ваша безопасность — наш приоритет", es: "Tu seguridad es nuestra prioridad", zh: "您的安全是我们的首要任务", ar: "سلامتك هي أولويتنا" },
  "the content has been removed": { en: "The content has been removed", ru: "Контент был удалён", es: "El contenido ha sido eliminado", zh: "内容已被删除", ar: "تمت إزالة المحتوى" },
  "we apologize for any inconvenience": { en: "We apologize for any inconvenience", ru: "Приносим извинения за неудобства", es: "Nos disculpamos por cualquier inconveniente", zh: "对给您带来的不便深表歉意", ar: "نعتذر عن أي إزعاج" },

  // Specific responses
  "spam has been removed and the user warned": { en: "Spam has been removed and the user warned", ru: "Спам удалён, пользователю отправлено предупреждение", es: "El spam ha sido eliminado y el usuario advertido", zh: "垃圾信息已删除，用户已被警告", ar: "تمت إزالة الرسائل المزعجة وتحذير المستخدم" },
  "this behavior is unacceptable and has been addressed": { en: "This behavior is unacceptable and has been addressed", ru: "Такое поведение недопустимо и было пресечено", es: "Este comportamiento es inaceptable y ha sido abordado", zh: "这种行为是不可接受的，已经处理", ar: "هذا السلوك غير مقبول وقد تمت معالجته" },
  "the account has been permanently suspended": { en: "The account has been permanently suspended", ru: "Аккаунт заблокирован навсегда", es: "La cuenta ha sido suspendida permanentemente", zh: "该账户已被永久封禁", ar: "تم تعليق الحساب بشكل دائم" },

  // Report descriptions (for translating incoming reports to admin locale)
  "user is sending repetitive messages / advertising": { en: "User is sending repetitive messages / advertising", ru: "Пользователь рассылает повторяющиеся сообщения / рекламу", es: "El usuario envía mensajes repetitivos / publicidad", zh: "用户发送重复消息/广告", ar: "يرسل المستخدم رسائل متكررة / إعلانات" },
  "abusive language and threatening behavior": { en: "Abusive language and threatening behavior", ru: "Оскорбительные выражения и угрожающее поведение", es: "Lenguaje abusivo y comportamiento amenazante", zh: "辱骂语言和威胁行为", ar: "لغة مسيئة وسلوك تهديدي" },
  "showing inappropriate content on camera": { en: "Showing inappropriate content on camera", ru: "Показ неприемлемого контента в камеру", es: "Mostrando contenido inapropiado en cámara", zh: "在摄像头上显示不当内容", ar: "عرض محتوى غير لائق أمام الكاميرا" },
  "user appears to be under minimum age": { en: "User appears to be under minimum age", ru: "Пользователь, возможно, не достиг минимального возраста", es: "El usuario parece ser menor de edad mínima", zh: "用户似乎未达到最低年龄", ar: "يبدو أن المستخدم أقل من الحد الأدنى للعمر" },
  "attempting to scam / phishing links": { en: "Attempting to scam / phishing links", ru: "Попытка мошенничества / фишинговые ссылки", es: "Intento de estafa / enlaces de phishing", zh: "试图诈骗/钓鱼链接", ar: "محاولة احتيال / روابط تصيد" },
  "suspicious behavior during chat": { en: "Suspicious behavior during chat", ru: "Подозрительное поведение во время чата", es: "Comportamiento sospechoso durante el chat", zh: "聊天期间的可疑行为", ar: "سلوك مشبوه أثناء المحادثة" },

  // Ban reasons — for admin ban modal translator
  "your account has been blocked": { en: "Your account has been blocked", ru: "Ваш аккаунт заблокирован", es: "Tu cuenta ha sido bloqueada", zh: "您的账户已被封禁", ar: "تم حظر حسابك" },
  "violation of community rules": { en: "Violation of community rules", ru: "Нарушение правил сообщества", es: "Violación de las reglas de la comunidad", zh: "违反社区规则", ar: "انتهاك قواعد المجتمع" },
  "inappropriate behavior": { en: "Inappropriate behavior", ru: "Неприемлемое поведение", es: "Comportamiento inapropiado", zh: "不当行为", ar: "سلوك غير لائق" },
  "spam activity": { en: "Spam activity", ru: "Спам-активность", es: "Actividad de spam", zh: "垃圾信息活动", ar: "نشاط بريد مزعج" },
  "harassment of other users": { en: "Harassment of other users", ru: "Преследование других пользователей", es: "Acoso a otros usuarios", zh: "骚扰其他用户", ar: "مضايقة مستخدمين آخرين" },
  "sharing inappropriate content": { en: "Sharing inappropriate content", ru: "Распространение неприемлемого контента", es: "Compartir contenido inapropiado", zh: "分享不当内容", ar: "مشاركة محتوى غير لائق" },
  "suspected underage user": { en: "Suspected underage user", ru: "Подозрение на несовершеннолетнего пользователя", es: "Sospecha de usuario menor de edad", zh: "疑似未成年用户", ar: "مشتبه بأنه مستخدم قاصر" },
  "scam or fraud attempt": { en: "Scam or fraud attempt", ru: "Попытка мошенничества", es: "Intento de estafa o fraude", zh: "诈骗或欺诈企图", ar: "محاولة احتيال" },
  "multiple violations of platform rules": { en: "Multiple violations of platform rules", ru: "Многократные нарушения правил платформы", es: "Múltiples violaciones de las reglas de la plataforma", zh: "多次违反平台规则", ar: "انتهاكات متعددة لقواعد المنصة" },
  "threatening behavior towards other users": { en: "Threatening behavior towards other users", ru: "Угрожающее поведение по отношению к другим пользователям", es: "Comportamiento amenazante hacia otros usuarios", zh: "对其他用户的威胁行为", ar: "سلوك تهديدي تجاه مستخدمين آخرين" },
  "your account has been permanently blocked for violating platform rules": { en: "Your account has been permanently blocked for violating platform rules", ru: "Ваш аккаунт заблокирован навсегда за нарушение правил платформы", es: "Tu cuenta ha sido bloqueada permanentemente por violar las reglas de la plataforma", zh: "您的账户因违反平台规则已被永久封禁", ar: "تم حظر حسابك نهائيًا بسبب انتهاك قواعد المنصة" },
  "you have been blocked for inappropriate behavior on camera": { en: "You have been blocked for inappropriate behavior on camera", ru: "Вы заблокированы за неприемлемое поведение в камеру", es: "Has sido bloqueado por comportamiento inapropiado en cámara", zh: "您因在摄像头上的不当行为而被封禁", ar: "تم حظرك بسبب سلوك غير لائق أمام الكاميرا" },
  "you can appeal this decision by contacting support": { en: "You can appeal this decision by contacting support", ru: "Вы можете обжаловать это решение, связавшись с поддержкой", es: "Puedes apelar esta decisión contactando al soporte", zh: "您可以联系客服对此决定提出申诉", ar: "يمكنك الطعن في هذا القرار عن طريق الاتصال بالدعم" },

  // Common admin reply phrases (Russian-first for admin convenience)
  "you are violating the rules": { en: "You are violating the rules", ru: "Вы нарушаете правила", es: "Estás violando las reglas", zh: "您违反了规则", ar: "أنت تنتهك القواعد" },
  "you are violating the terms of use": { en: "You are violating the terms of use", ru: "Вы нарушаете правила пользования", es: "Estás violando los términos de uso", zh: "您违反了使用条款", ar: "أنت تنتهك شروط الاستخدام" },
  "your behavior is unacceptable": { en: "Your behavior is unacceptable", ru: "Ваше поведение недопустимо", es: "Tu comportamiento es inaceptable", zh: "您的行为不可接受", ar: "سلوكك غير مقبول" },
  "this is your last warning": { en: "This is your last warning", ru: "Это ваше последнее предупреждение", es: "Esta es tu última advertencia", zh: "这是对您的最后警告", ar: "هذا هو تحذيرك الأخير" },
  "next violation will result in a ban": { en: "Next violation will result in a ban", ru: "Следующее нарушение приведёт к блокировке", es: "La próxima violación resultará en un bloqueo", zh: "下次违规将导致封禁", ar: "المخالفة القادمة ستؤدي إلى الحظر" },
  "you have been warned": { en: "You have been warned", ru: "Вам вынесено предупреждение", es: "Has sido advertido", zh: "您已被警告", ar: "تم تحذيرك" },
  "please follow the community guidelines": { en: "Please follow the community guidelines", ru: "Пожалуйста, соблюдайте правила сообщества", es: "Por favor, sigue las pautas de la comunidad", zh: "请遵守社区准则", ar: "يرجى اتباع إرشادات المجتمع" },
  "we do not tolerate this kind of behavior": { en: "We do not tolerate this kind of behavior", ru: "Мы не допускаем подобное поведение", es: "No toleramos este tipo de comportamiento", zh: "我们不容忍这种行为", ar: "نحن لا نتسامح مع هذا النوع من السلوك" },
  "your account has been suspended": { en: "Your account has been suspended", ru: "Ваш аккаунт приостановлен", es: "Tu cuenta ha sido suspendida", zh: "您的账户已被暂停", ar: "تم تعليق حسابك" },
  "stop sending spam": { en: "Stop sending spam", ru: "Прекратите рассылку спама", es: "Deja de enviar spam", zh: "停止发送垃圾信息", ar: "توقف عن إرسال الرسائل المزعجة" },
  "do not share personal information": { en: "Do not share personal information", ru: "Не делитесь личной информацией", es: "No compartas información personal", zh: "不要分享个人信息", ar: "لا تشارك المعلومات الشخصية" },
  "respect other users": { en: "Respect other users", ru: "Уважайте других пользователей", es: "Respeta a otros usuarios", zh: "尊重其他用户", ar: "احترم المستخدمين الآخرين" },
  "your complaint has been reviewed": { en: "Your complaint has been reviewed", ru: "Ваша жалоба рассмотрена", es: "Tu queja ha sido revisada", zh: "您的投诉已被审查", ar: "تمت مراجعة شكواك" },
  "the violator has been punished": { en: "The violator has been punished", ru: "Нарушитель наказан", es: "El infractor ha sido castigado", zh: "违规者已受到处罚", ar: "تمت معاقبة المخالف" },
  "thank you for helping keep the platform safe": { en: "Thank you for helping keep the platform safe", ru: "Спасибо за помощь в обеспечении безопасности платформы", es: "Gracias por ayudar a mantener la plataforma segura", zh: "感谢您帮助维护平台安全", ar: "شكراً لمساعدتك في الحفاظ على أمان المنصة" },
  "the user has been blocked": { en: "The user has been blocked", ru: "Пользователь заблокирован", es: "El usuario ha sido bloqueado", zh: "用户已被封禁", ar: "تم حظر المستخدم" },
  "the user has received a warning": { en: "The user has received a warning", ru: "Пользователь получил предупреждение", es: "El usuario ha recibido una advertencia", zh: "用户已收到警告", ar: "تلقى المستخدم تحذيراً" },
  "we will continue to monitor the situation": { en: "We will continue to monitor the situation", ru: "Мы продолжим следить за ситуацией", es: "Continuaremos monitoreando la situación", zh: "我们将继续监控情况", ar: "سنواصل مراقبة الوضع" },
  "if this happens again, contact us": { en: "If this happens again, contact us", ru: "Если это повторится, свяжитесь с нами", es: "Si esto vuelve a suceder, contáctenos", zh: "如果再次发生，请联系我们", ar: "إذا تكرر ذلك، اتصل بنا" },
};

// Build reverse lookup: for each language, map localized phrase → english key
const REVERSE_LOOKUP: Record<Lang, Record<string, string>> = { en: {}, ru: {}, es: {}, zh: {}, ar: {} };
for (const [enKey, translations] of Object.entries(PHRASE_DICT)) {
  for (const [lang, phrase] of Object.entries(translations)) {
    REVERSE_LOOKUP[lang as Lang][phrase.toLowerCase()] = enKey;
  }
}

function findTranslation(text: string, from: Lang, to: Lang): string | null {
  const lower = text.toLowerCase().trim();
  // Direct lookup (key is english)
  if (PHRASE_DICT[lower] && PHRASE_DICT[lower][to]) {
    return PHRASE_DICT[lower][to];
  }
  // Reverse lookup: find english key from source language, then get target
  const enKey = REVERSE_LOOKUP[from]?.[lower];
  if (enKey && PHRASE_DICT[enKey] && PHRASE_DICT[enKey][to]) {
    return PHRASE_DICT[enKey][to];
  }
  return null;
}

// Translate text using phrase dictionary (sync, for pre-defined admin phrases only)
// Looks up the full text first, then tries sentence-by-sentence
export function translateText(text: string, from: Lang, to: Lang): string {
  if (from === to) return text;

  // Try exact match
  const exact = findTranslation(text, from, to);
  if (exact) return exact;

  // Try splitting by common delimiters and translating each part
  const delimiters = [". ", ".\n", "\n"];
  for (const delim of delimiters) {
    if (text.includes(delim)) {
      const parts = text.split(delim);
      const translated = parts.map(part => {
        const found = findTranslation(part, from, to);
        return found || part;
      });
      return translated.join(delim);
    }
  }

  return text; // no translation available
}

// ==================== GOOGLE TRANSLATE (FREE) ====================

const GOOGLE_LANG_MAP: Record<Lang, string> = {
  en: "en", ru: "ru", es: "es", zh: "zh-CN", ar: "ar",
};

/**
 * Реальный перевод через Google Translate API (бесплатный, без ключа).
 * Используется для произвольного текста (жалобы, сообщения пользователей).
 * Сначала пробует словарь, если нет — Google Translate.
 */
export async function translateTextAsync(text: string, from: Lang | "auto", to: Lang): Promise<string> {
  if (from === to) return text;

  // Сначала пробуем словарь (для стандартных фраз)
  if (from !== "auto") {
    const dictResult = findTranslation(text, from, to);
    if (dictResult) return dictResult;
  }

  // Google Translate free API
  try {
    const sl = from === "auto" ? "auto" : GOOGLE_LANG_MAP[from] || from;
    const tl = GOOGLE_LANG_MAP[to] || to;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn("[Translate] Google API returned", res.status);
      return text;
    }

    const data = await res.json();
    // Ответ: [[["translated text","original text",null,null,10]],null,"en"]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0]
        .filter((segment: unknown) => Array.isArray(segment) && segment[0])
        .map((segment: unknown[]) => segment[0])
        .join("");
      if (translated) return translated;
    }

    return text;
  } catch (err) {
    console.warn("[Translate] Google Translate failed:", err);
    return text;
  }
}

// Check if translation is available for given text
export function hasTranslation(text: string, from: Lang, to: Lang): boolean {
  if (from === to) return false;
  if (findTranslation(text, from, to)) return true;

  const delimiters = [". ", ".\n", "\n"];
  for (const delim of delimiters) {
    if (text.includes(delim)) {
      const parts = text.split(delim);
      return parts.some(part => findTranslation(part, from, to) !== null);
    }
  }
  return false;
}

export function getLangName(code: string): string {
  return LANG_NAMES[code as Lang] || code;
}

export type { Lang };
