/**
 * Context-Aware Text Moderation — Hybrid System
 *
 * Level 1: Local pattern analysis (~1ms) — catches obvious violations
 * Level 2: OpenAI Moderation API (~200ms) — called only for ambiguous cases
 *
 * Categories:
 *   - drugs: наркотики, продажа веществ
 *   - terrorism: терроризм, вербовка, экстремизм
 *   - fraud: финансовые пирамиды, мошенничество
 *   - prostitution: проституция, эскорт-услуги
 *   - weapons: продажа оружия
 *   - violence: угрозы насилием, убийством
 *   - exploitation: эксплуатация, торговля людьми
 *   - hacking: взлом аккаунтов, продажа данных
 */

// ==================== ТИПЫ ====================

export type ThreatCategory =
  | "drugs"
  | "terrorism"
  | "fraud"
  | "prostitution"
  | "weapons"
  | "violence"
  | "exploitation"
  | "hacking";

export interface TextModerationResult {
  /** Безопасно ли сообщение */
  safe: boolean;
  /** Итоговый score 0.0—1.0 */
  score: number;
  /** Обнаруженные категории угроз */
  categories: Array<{
    category: ThreatCategory;
    score: number;
    matchedPatterns: string[];
  }>;
  /** Какое действие применить */
  action: "allow" | "warn" | "block";
  /** Уровень проверки: local / api / hybrid */
  level: "local" | "api" | "hybrid";
  /** Время обработки мс */
  processingMs: number;
}

// ==================== ПАТТЕРНЫ ====================

interface ThreatPattern {
  /** Regex-паттерн (case insensitive) */
  pattern: RegExp;
  /** Вес паттерна 0.0—1.0 */
  weight: number;
  /** Категория */
  category: ThreatCategory;
  /** Описание для логов */
  label: string;
}

/**
 * Контекстные паттерны — не отдельные слова, а фразы и сочетания,
 * которые указывают на незаконную деятельность в контексте.
 */
const THREAT_PATTERNS: ThreatPattern[] = [
  // ==================== НАРКОТИКИ ====================
  // Продажа/распространение (контекст: предложение купить, закладки)
  { pattern: /прода[юм]?\s*(стаф|вещест|закладк|гашиш|мариху|кокаин|героин|мефедрон|амфетамин|метадон|экстази|лсд|спайс|соль|скорост)/iu, weight: 0.95, category: "drugs", label: "drug-sale-ru" },
  { pattern: /(?:есть|имеет?ся|предлаг)\s*(стаф|закладк|грамм?|дорож|дозы?)/iu, weight: 0.9, category: "drugs", label: "drug-offer-ru" },
  { pattern: /закладк[аиу]?\s+(?:готов|ждёт|лежит|оставил|забер)/iu, weight: 0.95, category: "drugs", label: "drug-stash-ru" },
  { pattern: /(?:купи(?:ть|шь)?|заказ(?:ать|ывай))\s*(?:грамм?|закладк|дозу|стаф|гашиш|мариху|кокаин|героин|мефедрон|амфетамин)/iu, weight: 0.9, category: "drugs", label: "drug-buy-ru" },
  { pattern: /(?:sell|buy|order)\s*(?:weed|coke|cocaine|heroin|meth|mdma|ecstasy|lsd|shrooms|amphetamine|fentanyl|xanax|oxy)/iu, weight: 0.9, category: "drugs", label: "drug-sale-en" },
  { pattern: /(?:got|have|selling)\s*(?:stash|stuff|pack|gram|dose|supply)\b/iu, weight: 0.8, category: "drugs", label: "drug-offer-en" },
  { pattern: /(?:dead\s*drop|drop\s*loc|pickup\s*point)/iu, weight: 0.85, category: "drugs", label: "drug-drop-en" },
  { pattern: /(?:darknet|даркнет|тор\s*браузер|silk\s*road|hydra)/iu, weight: 0.7, category: "drugs", label: "darknet-ref" },
  { pattern: /(?:дур[ьи]|нарк[оа]|трав[ку]|ганж|план)\s*(?:прода|куп|заказ|дост|привез)/iu, weight: 0.85, category: "drugs", label: "drug-slang-ru" },
  { pattern: /(?:comprar?|vender?)\s*(?:droga|coca[ií]na|hero[ií]na|marihuana|metanfetamina|[eé]xtasis)/iu, weight: 0.9, category: "drugs", label: "drug-sale-es" },

  // ==================== ТЕРРОРИЗМ / ВЕРБОВКА ====================
  { pattern: /(?:присоедин(?:яйс|ись|иться)|вступ(?:ай|ить|и)\s*(?:в\s*ряды|к\s*нам))\s*(?:джихад|халифат|борьб[уе]|сопротивлен)/iu, weight: 0.95, category: "terrorism", label: "recruit-ru" },
  { pattern: /(?:вербу[юем]|набира[юем])\s*(?:бойц|солдат|воин|людей|добровольц|наёмник)/iu, weight: 0.95, category: "terrorism", label: "recruit-soldiers-ru" },
  { pattern: /(?:взорв|подорв|бомб[уаы])\s*(?:здани|мост|метро|аэропорт|вокзал|посольств|школ)/iu, weight: 0.95, category: "terrorism", label: "bombing-threat-ru" },
  { pattern: /(?:слав[аеу])\s*(?:игил|isis|талибан|аль[-\s]?каид)/iu, weight: 0.95, category: "terrorism", label: "terror-glorify-ru" },
  { pattern: /(?:join|recruit|enlist)\s*(?:jihad|caliphate|isis|fight\s*for|holy\s*war|cause)/iu, weight: 0.95, category: "terrorism", label: "recruit-en" },
  { pattern: /(?:make|build|plant)\s*(?:bomb|explosive|ied|device)/iu, weight: 0.95, category: "terrorism", label: "bomb-making-en" },
  { pattern: /(?:allahu?\s*akbar|glory\s*to)\s*(?:isis|taliban|al[-\s]?qaeda)/iu, weight: 0.95, category: "terrorism", label: "terror-glorify-en" },
  { pattern: /(?:jihad|джихад|шахид|мученик\s*за\s*веру|martyr\s*for)/iu, weight: 0.7, category: "terrorism", label: "terrorism-terms" },
  { pattern: /(?:ехать?\s*воевать|поехал[иа]?\s*на\s*войну|воевать\s*(?:за|против))/iu, weight: 0.8, category: "terrorism", label: "war-recruit-ru" },
  { pattern: /(?:наёмник|контракт(?:ник)?)\s*(?:зарплат|платят|получ|тысяч|\$|долл)/iu, weight: 0.85, category: "terrorism", label: "mercenary-ru" },

  // ==================== ФИНАНСОВОЕ МОШЕННИЧЕСТВО ====================
  { pattern: /(?:вложи|инвестир)\S*\s*(?:\d+\s*(?:[\$€₽]|доллар|евро|рубл|руб|тысяч|usd|usdt|btc))/iu, weight: 0.7, category: "fraud", label: "invest-money-ru" },
  { pattern: /(?:вложи|инвестир)\S*\s*[\d.,]+\s*[\$€₽]?.*(?:получи|верн[уё]|заработа)\S*\s*[\d.,]+/iu, weight: 0.9, category: "fraud", label: "pyramid-promise-ru" },
  { pattern: /(?:пассивн\w*\s*доход|без\s*вложений\s*заработ|лёгк\w*\s*деньг|деньги\s*из\s*воздух)/iu, weight: 0.8, category: "fraud", label: "passive-income-ru" },
  { pattern: /(?:финансов\w*\s*пирамид|сетев\w*\s*маркетинг|mlm|понци|ponzi)/iu, weight: 0.85, category: "fraud", label: "pyramid-scheme" },
  { pattern: /(?:дай|скинь|отправь|переведи)\s*(?:данные\s*карт|номер\s*карт|cvv|пин[-\s]?код|реквизит)/iu, weight: 0.9, category: "fraud", label: "card-fishing-ru" },
  { pattern: /(?:invest|deposit|send)\s*(?:\d+\s*(?:\$|usd|btc|eth|usdt))/iu, weight: 0.7, category: "fraud", label: "invest-money-en" },
  { pattern: /(?:invest|put\s*in)\s*[\d.,]+\s*.*(?:get\s*back|return|earn|make)\s*[\d.,]+/iu, weight: 0.9, category: "fraud", label: "pyramid-promise-en" },
  { pattern: /(?:passive\s*income|easy\s*money|money\s*from\s*nothing|get\s*rich\s*quick|guaranteed\s*(?:profit|return))/iu, weight: 0.8, category: "fraud", label: "passive-income-en" },
  { pattern: /(?:(?:send|give)\s*(?:me\s*)?(?:your\s*)?(?:card|credit|bank|account)\s*(?:number|details|info))/iu, weight: 0.9, category: "fraud", label: "card-fishing-en" },
  { pattern: /(?:крипт\w*\s*схем|удвоени[ея]\s*(?:крипт|биткоин|btc|eth)|double\s*your\s*(?:crypto|btc|bitcoin))/iu, weight: 0.9, category: "fraud", label: "crypto-scam" },
  { pattern: /(?:переведи\s*на\s*(?:кошел[её]к|wallet|счёт|карт)|срочно\s*(?:нужн|переведи).*(?:деньг|денег|\$))/iu, weight: 0.75, category: "fraud", label: "money-transfer-ru" },

  // ==================== ПРОСТИТУЦИЯ / СЕКС-УСЛУГИ ====================
  { pattern: /(?:эскорт|интим)\s*(?:услуг|сервис|за\s*встреч|за\s*деньг|за\s*\d)/iu, weight: 0.9, category: "prostitution", label: "escort-ru" },
  { pattern: /(?:секс|минет|анал)\s*(?:за\s*деньг|за\s*\d|платн|цена|стоимость|прайс)/iu, weight: 0.95, category: "prostitution", label: "paid-sex-ru" },
  { pattern: /(?:ищу\s*(?:девочк|девушк|парн)|нужн[аы]\s*(?:девочк|девушк))\s*(?:на\s*ночь|для\s*встреч|для\s*секс|за\s*деньг)/iu, weight: 0.9, category: "prostitution", label: "seeking-ru" },
  { pattern: /(?:escort\s*service|paid\s*sex|sex\s*for\s*money|sex\s*work|sugar\s*(?:daddy|baby)\s*(?:pay|money|arrangement))/iu, weight: 0.9, category: "prostitution", label: "escort-en" },
  { pattern: /(?:час\s*(?:стои[тм]|обойдёт|цена)|ночь\s*(?:стои[тм]|цена))\s*(?:\d|тысяч|\$)/iu, weight: 0.85, category: "prostitution", label: "pricing-ru" },
  { pattern: /(?:массаж\s*(?:с\s*продолж|интим|эротич|полн\w*\s*релакс)|happy\s*ending)/iu, weight: 0.85, category: "prostitution", label: "massage-cover-ru" },

  // ==================== ОРУЖИЕ ====================
  { pattern: /(?:прода[юм]?|куп(?:ить|лю))\s*(?:оружи|пистолет|автомат|винтовк|ствол|глок|калашников|ak[-\s]?47|гранат)/iu, weight: 0.95, category: "weapons", label: "weapon-trade-ru" },
  { pattern: /(?:sell|buy|trade)\s*(?:gun|pistol|rifle|weapon|firearm|ammo|ammunition|glock|ak[-\s]?47|grenade)/iu, weight: 0.95, category: "weapons", label: "weapon-trade-en" },
  { pattern: /(?:сделать|собрать|изготовить)\s*(?:бомб[уы]|взрывчатк|взрывно)/iu, weight: 0.95, category: "weapons", label: "bomb-diy-ru" },
  { pattern: /(?:how\s*to\s*(?:make|build|assemble))\s*(?:bomb|explosive|weapon|gun|firearm)/iu, weight: 0.95, category: "weapons", label: "bomb-diy-en" },

  // ==================== НАСИЛИЕ / УГРОЗЫ ====================
  { pattern: /(?:убь[юёу]|зарежу|задушу|застрелю|сожгу|взорву)\s*(?:тебя|тебе|вас|его|её|их|всех|себя)/iu, weight: 0.9, category: "violence", label: "death-threat-ru" },
  { pattern: /(?:i(?:'ll|'m\s*gonna|will))\s*(?:kill|murder|shoot|stab|burn|blow\s*up)\s*(?:you|him|her|them|everyone)/iu, weight: 0.9, category: "violence", label: "death-threat-en" },
  { pattern: /(?:школ\w*\s*(?:стрельб|расстрел|резн)|school\s*shoot|mass\s*shoot)/iu, weight: 0.95, category: "violence", label: "mass-shooting" },
  { pattern: /(?:надо\s*(?:убить|убрать|ликвидировать|устранить)\s*(?:всех|людей|их|этих))/iu, weight: 0.9, category: "violence", label: "mass-violence-ru" },

  // ==================== ЭКСПЛУАТАЦИЯ / ТОРГОВЛЯ ЛЮДЬМИ ====================
  { pattern: /(?:продам|куплю)\s*(?:девушк|девочк|ребёнк|ребенк|детей|женщин|людей|орган[ы])/iu, weight: 0.95, category: "exploitation", label: "human-trafficking-ru" },
  { pattern: /(?:sell|buy|trade)\s*(?:girl|child|children|women|people|organ[s]?|kidney)/iu, weight: 0.95, category: "exploitation", label: "human-trafficking-en" },
  { pattern: /(?:работа\s*за\s*грани[цч])\s*(?:без\s*документ|отберём\s*паспорт|заберём\s*паспорт)/iu, weight: 0.9, category: "exploitation", label: "labor-exploit-ru" },
  { pattern: /(?:childporn|cp\b|детск\w*\s*порн|малолетк\w*\s*(?:голы|нагие|фото|видео))/iu, weight: 1.0, category: "exploitation", label: "csam" },

  // ==================== ХАКЕРСТВО / КРАЖИ ДАННЫХ ====================
  { pattern: /(?:взлом(?:аю|ать)?|хакну[тв]?|hack)\s*(?:аккаунт|акк|account|instagram|whatsapp|telegram|email|почту|вк|vk|facebook|банк)/iu, weight: 0.9, category: "hacking", label: "account-hack" },
  { pattern: /(?:прода[юм]?|sell|buy)\s*(?:базу?\s*данных|database|утечк|leak|логины|пароли|password|credentials|карт\w*\s*данн)/iu, weight: 0.9, category: "hacking", label: "data-trade" },
  { pattern: /(?:ddos|ддос|ботнет|botnet)\s*(?:атак|attack|сервис|service|заказ)/iu, weight: 0.9, category: "hacking", label: "ddos-service" },
  { pattern: /(?:фишинг|phishing)\s*(?:сайт|page|страниц|сделаю|create)/iu, weight: 0.9, category: "hacking", label: "phishing-service" },
  { pattern: /(?:обнал|обналичи|отмыва)\s*(?:деньг|денег|средств)/iu, weight: 0.9, category: "hacking", label: "money-launder-ru" },
  { pattern: /(?:launder|wash)\s*(?:money|cash|funds)/iu, weight: 0.9, category: "hacking", label: "money-launder-en" },

  // ==================== CHINESE (ZH) ====================
  // Наркотики
  { pattern: /(?:卖|买|出售|购买)\s*(?:毒品|大麻|可卡因|海洛因|冰毒|摇头丸|麻古|K粉|氯胺酮)/iu, weight: 0.95, category: "drugs", label: "drug-trade-zh" },
  { pattern: /(?:藏货|取货|死投|交货点|暗网|丝绸之路)/iu, weight: 0.85, category: "drugs", label: "drug-drop-zh" },
  { pattern: /(?:吸毒|嗑药|飞叶子|溜冰)\s*(?:一起|约|来)/iu, weight: 0.8, category: "drugs", label: "drug-use-zh" },
  // Терроризм
  { pattern: /(?:加入|招募|参加)\s*(?:圣战|jihad|ISIS|基地组织|哈里发|恐怖组织)/iu, weight: 0.95, category: "terrorism", label: "recruit-zh" },
  { pattern: /(?:制造|做|组装)\s*(?:炸弹|爆炸物|炸药)/iu, weight: 0.95, category: "terrorism", label: "bomb-zh" },
  { pattern: /(?:雇佣兵|佣兵|打仗)\s*(?:工资|报酬|美元|薪水)/iu, weight: 0.85, category: "terrorism", label: "mercenary-zh" },
  // Мошенничество
  { pattern: /(?:投资|转账|汇款)\s*(?:\d+\s*(?:美元|元|块|万|USDT|BTC))/iu, weight: 0.7, category: "fraud", label: "invest-zh" },
  { pattern: /(?:投资|投入).*(?:回报|赚回|翻倍|保证.*收益)/iu, weight: 0.9, category: "fraud", label: "pyramid-zh" },
  { pattern: /(?:被动收入|轻松赚钱|躺赚|稳赚不赔|保本保息)/iu, weight: 0.8, category: "fraud", label: "passive-income-zh" },
  { pattern: /(?:传销|庞氏骗局|资金盘|杀猪盘)/iu, weight: 0.9, category: "fraud", label: "scam-scheme-zh" },
  { pattern: /(?:给我|发给我|提供)\s*(?:银行卡|卡号|密码|验证码|身份证)/iu, weight: 0.9, category: "fraud", label: "card-fishing-zh" },
  // Проституция
  { pattern: /(?:陪睡|约炮|一夜情|包夜|出台)\s*(?:价格|多少钱|收费|\d)/iu, weight: 0.9, category: "prostitution", label: "escort-zh" },
  { pattern: /(?:性服务|按摩|特殊服务|全套)\s*(?:价格|收费|多少|加微信)/iu, weight: 0.85, category: "prostitution", label: "sex-service-zh" },
  // Оружие
  { pattern: /(?:卖|买|出售)\s*(?:枪|手枪|步枪|武器|弹药|手雷)/iu, weight: 0.95, category: "weapons", label: "weapon-zh" },
  // Насилие
  { pattern: /(?:杀了你|弄死你|干掉你|砍死|捅死|烧死)\s*(?:你|他|她|他们|所有人)/iu, weight: 0.9, category: "violence", label: "death-threat-zh" },
  { pattern: /(?:校园.*枪击|大规模.*枪击|屠杀)/iu, weight: 0.95, category: "violence", label: "mass-violence-zh" },
  // Эксплуатация
  { pattern: /(?:卖|买|贩卖)\s*(?:女孩|儿童|小孩|女人|器官|肾)/iu, weight: 0.95, category: "exploitation", label: "trafficking-zh" },
  { pattern: /(?:儿童色情|恋童|幼女)/iu, weight: 1.0, category: "exploitation", label: "csam-zh" },
  // Хакерство
  { pattern: /(?:破解|黑|盗)\s*(?:账号|密码|微信|QQ|银行|邮箱)/iu, weight: 0.9, category: "hacking", label: "hack-zh" },
  { pattern: /(?:卖|出售)\s*(?:数据库|个人信息|身份证|银行卡信息)/iu, weight: 0.9, category: "hacking", label: "data-trade-zh" },
  { pattern: /(?:DDoS|洗钱|套现|黑产)/iu, weight: 0.9, category: "hacking", label: "cybercrime-zh" },

  // ==================== ARABIC (AR) ====================
  // Наркотики
  { pattern: /(?:بيع|شراء|أبيع|أشتري)\s*(?:مخدرات|حشيش|كوكايين|هيروين|كبتاغون|ترامادول|حبوب)/iu, weight: 0.95, category: "drugs", label: "drug-trade-ar" },
  { pattern: /(?:تخبئة|توصيل|طلب)\s*(?:مخدرات|بضاعة|حبوب|حشيش)/iu, weight: 0.85, category: "drugs", label: "drug-delivery-ar" },
  // Терроризм
  { pattern: /(?:انضم|التحق|تجنيد)\s*(?:الجهاد|داعش|القاعدة|الخلافة)/iu, weight: 0.95, category: "terrorism", label: "recruit-ar" },
  { pattern: /(?:صنع|تصنيع|تجميع)\s*(?:قنبلة|متفجرات|عبوة ناسفة)/iu, weight: 0.95, category: "terrorism", label: "bomb-ar" },
  { pattern: /(?:المجد|النصر)\s*(?:لداعش|للقاعدة|للمجاهدين)/iu, weight: 0.95, category: "terrorism", label: "terror-glorify-ar" },
  { pattern: /(?:مرتزقة|مقاتلين)\s*(?:راتب|مال|دولار|أجر)/iu, weight: 0.85, category: "terrorism", label: "mercenary-ar" },
  // Мошенничество
  { pattern: /(?:استثمر|حوّل|أرسل)\s*(?:\d+\s*(?:دولار|ريال|درهم|USDT|BTC))/iu, weight: 0.7, category: "fraud", label: "invest-ar" },
  { pattern: /(?:استثمر|ادفع).*(?:عائد|ربح|مضمون|ضعف)/iu, weight: 0.9, category: "fraud", label: "pyramid-ar" },
  { pattern: /(?:دخل سلبي|ربح سهل|ربح مضمون|ثراء سريع)/iu, weight: 0.8, category: "fraud", label: "passive-income-ar" },
  { pattern: /(?:أرسل|أعطني)\s*(?:رقم البطاقة|بيانات البنك|كلمة السر|رمز التحقق)/iu, weight: 0.9, category: "fraud", label: "card-fishing-ar" },
  // Проституция
  { pattern: /(?:خدمات جنسية|مرافقة|ليلة|ساعة)\s*(?:بسعر|مقابل|ب\d)/iu, weight: 0.9, category: "prostitution", label: "escort-ar" },
  { pattern: /(?:مساج|تدليك)\s*(?:كامل|خاص|سعيد|بنهاية)/iu, weight: 0.85, category: "prostitution", label: "massage-ar" },
  // Оружие
  { pattern: /(?:بيع|شراء|أبيع)\s*(?:سلاح|مسدس|بندقية|ذخيرة|قنبلة)/iu, weight: 0.95, category: "weapons", label: "weapon-ar" },
  // Насилие
  { pattern: /(?:سأقتلك|سأذبحك|سأحرقك|راح أقتل)\s*(?:أنت|أنتم|هو|هي|الجميع)/iu, weight: 0.9, category: "violence", label: "death-threat-ar" },
  // Эксплуатация
  { pattern: /(?:بيع|شراء|تجارة)\s*(?:بنات|أطفال|نساء|أعضاء|كلى)/iu, weight: 0.95, category: "exploitation", label: "trafficking-ar" },
  { pattern: /(?:أطفال.*إباحي|قاصرات|قاصرين)/iu, weight: 1.0, category: "exploitation", label: "csam-ar" },
  // Хакерство
  { pattern: /(?:اختراق|تهكير|سرقة)\s*(?:حساب|باسوورد|واتساب|تلغرام|بنك|إيميل)/iu, weight: 0.9, category: "hacking", label: "hack-ar" },
  { pattern: /(?:بيع|شراء)\s*(?:قاعدة بيانات|بيانات مسربة|بطاقات)/iu, weight: 0.9, category: "hacking", label: "data-trade-ar" },
  { pattern: /(?:غسيل أموال|تبييض أموال)/iu, weight: 0.9, category: "hacking", label: "money-launder-ar" },
];

// ==================== AMPLIFIER PATTERNS ====================
// Паттерны-усилители: повышают score если рядом есть контактная информация
const CONTACT_AMPLIFIERS: RegExp[] = [
  /(?:telegram|телеграм|тг|电报|تلغرام|@\w{3,}|t\.me\/)/iu,
  /(?:whatsapp|вотсап|ватсап|واتساب)\s*[\d+]/iu,
  /(?:微信|加我微信|wechat|威信)/iu,
  /(?:пиши\s*(?:в\s*лс|лично|в\s*личк)|dm\s*me|write\s*me|contact\s*me|راسلني|联系我|加我)/iu,
  /\+?\d[\d\s\-()]{8,}/u, // phone number
  /[\w.+-]+@[\w.-]+\.\w{2,}/u, // email
];

// ==================== LOCAL ANALYSIS ====================

function analyzeLocal(text: string): TextModerationResult {
  const start = Date.now();
  const lowerText = text.toLowerCase();

  const categoryScores = new Map<ThreatCategory, { score: number; patterns: string[] }>();

  // Check each pattern
  for (const tp of THREAT_PATTERNS) {
    if (tp.pattern.test(text)) {
      const existing = categoryScores.get(tp.category) || { score: 0, patterns: [] };
      // Take the max weight for the category (don't just sum — would over-count)
      existing.score = Math.max(existing.score, tp.weight);
      existing.patterns.push(tp.label);
      categoryScores.set(tp.category, existing);
    }
  }

  // Check for contact amplifiers — if the user provides contact info alongside threats, boost score
  const hasContactInfo = CONTACT_AMPLIFIERS.some((r) => r.test(text));

  const categories: TextModerationResult["categories"] = [];
  let maxScore = 0;

  for (const [category, data] of categoryScores) {
    let finalScore = data.score;
    // Amplify if contact info present (indicates active solicitation, not just discussion)
    if (hasContactInfo && finalScore >= 0.5) {
      finalScore = Math.min(1.0, finalScore + 0.15);
    }
    categories.push({
      category,
      score: finalScore,
      matchedPatterns: data.patterns,
    });
    maxScore = Math.max(maxScore, finalScore);
  }

  // Determine action
  let action: TextModerationResult["action"] = "allow";
  if (maxScore >= 0.85) {
    action = "block";
  } else if (maxScore >= 0.5) {
    action = "warn";
  }

  return {
    safe: action === "allow",
    score: maxScore,
    categories,
    action,
    level: "local",
    processingMs: Date.now() - start,
  };
}

// ==================== OPENAI MODERATION API ====================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com";

async function analyzeOpenAI(text: string): Promise<TextModerationResult | null> {
  if (!OPENAI_API_KEY) return null;

  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OPENAI_BASE_URL}/v1/moderations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: text }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("[TextMod] OpenAI API error:", response.status);
      return null;
    }

    const data = await response.json();
    const result = data.results?.[0];
    if (!result) return null;

    const categories: TextModerationResult["categories"] = [];
    let maxScore = 0;

    // Map OpenAI categories to our categories
    const mapping: Record<string, ThreatCategory> = {
      "hate": "violence",
      "hate/threatening": "violence",
      "harassment": "violence",
      "harassment/threatening": "violence",
      "self-harm": "violence",
      "self-harm/intent": "violence",
      "self-harm/instructions": "violence",
      "sexual": "prostitution",
      "sexual/minors": "exploitation",
      "violence": "violence",
      "violence/graphic": "violence",
    };

    const scores = result.category_scores || {};
    const mergedScores = new Map<ThreatCategory, number>();

    for (const [openaiCat, ourCat] of Object.entries(mapping)) {
      const score = scores[openaiCat] || 0;
      if (score > 0.3) {
        const currentMax = mergedScores.get(ourCat) || 0;
        mergedScores.set(ourCat, Math.max(currentMax, score));
      }
    }

    for (const [cat, score] of mergedScores) {
      categories.push({
        category: cat,
        score,
        matchedPatterns: [`openai:${cat}`],
      });
      maxScore = Math.max(maxScore, score);
    }

    let action: TextModerationResult["action"] = "allow";
    if (maxScore >= 0.75) {
      action = "block";
    } else if (maxScore >= 0.4) {
      action = "warn";
    }

    return {
      safe: action === "allow",
      score: maxScore,
      categories,
      action,
      level: "api",
      processingMs: Date.now() - start,
    };
  } catch {
    console.error("[TextMod] OpenAI analysis failed");
    return null;
  }
}

// ==================== HYBRID PIPELINE ====================

/**
 * Основная функция модерации текста.
 *
 * Level 1 (local): score < 0.3 → ALLOW (очевидно безопасно)
 * Level 1 (local): score >= 0.85 → BLOCK (очевидно опасно)
 * Level 1 (local): score 0.3—0.85 → Level 2 (OpenAI) → точный вердикт
 * Fallback: если OpenAI недоступен → используем local result
 */
export async function moderateText(text: string): Promise<TextModerationResult> {
  // Skip very short messages
  if (text.length < 5) {
    return { safe: true, score: 0, categories: [], action: "allow", level: "local", processingMs: 0 };
  }

  // Level 1: Local analysis
  const localResult = analyzeLocal(text);

  // Obviously safe — no patterns matched
  if (localResult.score < 0.3) {
    return localResult;
  }

  // Obviously dangerous — block immediately
  if (localResult.score >= 0.85) {
    return localResult;
  }

  // Ambiguous zone (0.3—0.85) — ask OpenAI if available
  const apiResult = await analyzeOpenAI(text);
  if (apiResult) {
    // Merge: take the higher score from either system
    const mergedCategories = [...localResult.categories];
    for (const apiCat of apiResult.categories) {
      const existing = mergedCategories.find((c) => c.category === apiCat.category);
      if (existing) {
        existing.score = Math.max(existing.score, apiCat.score);
        existing.matchedPatterns.push(...apiCat.matchedPatterns);
      } else {
        mergedCategories.push(apiCat);
      }
    }

    const maxScore = Math.max(localResult.score, apiResult.score);
    let action: TextModerationResult["action"] = "allow";
    if (maxScore >= 0.75) action = "block";
    else if (maxScore >= 0.4) action = "warn";

    return {
      safe: action === "allow",
      score: maxScore,
      categories: mergedCategories,
      action,
      level: "hybrid",
      processingMs: localResult.processingMs + apiResult.processingMs,
    };
  }

  // OpenAI unavailable — fallback to local
  return localResult;
}

/**
 * Быстрая синхронная проверка (только локальный уровень).
 * Используется когда важна скорость и не нужна API-проверка.
 */
export function moderateTextSync(text: string): TextModerationResult {
  if (text.length < 5) {
    return { safe: true, score: 0, categories: [], action: "allow", level: "local", processingMs: 0 };
  }
  return analyzeLocal(text);
}
