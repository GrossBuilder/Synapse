import { Category } from "@/types";

export const CATEGORIES: Category[] = [
  {
    id: "tech",
    name: "Технологии",
    slug: "tech",
    icon: "💻",
    description: "Программирование, дизайн, AI и всё о цифровом мире",
    color: "#6366f1",
    subcategories: [
      { id: "tech-prog", name: "Программирование", slug: "programming", categoryId: "tech", icon: "⌨️" },
      { id: "tech-design", name: "Дизайн", slug: "design", categoryId: "tech", icon: "🎨" },
      { id: "tech-ai", name: "AI / Machine Learning", slug: "ai-ml", categoryId: "tech", icon: "🤖" },
      { id: "tech-gamedev", name: "Геймдев", slug: "gamedev", categoryId: "tech", icon: "🎮" },
      { id: "tech-cyber", name: "Кибербезопасность", slug: "cybersecurity", categoryId: "tech", icon: "🔒" },
      { id: "tech-devops", name: "DevOps / Cloud", slug: "devops", categoryId: "tech", icon: "☁️" },
      { id: "tech-mobile", name: "Мобильная разработка", slug: "mobile-dev", categoryId: "tech", icon: "📱" },
      { id: "tech-data", name: "Data Science", slug: "data-science", categoryId: "tech", icon: "📊" },
    ],
  },
  {
    id: "business",
    name: "Бизнес",
    slug: "business",
    icon: "💼",
    description: "Стартапы, маркетинг, финансы и предпринимательство",
    color: "#f59e0b",
    subcategories: [
      { id: "biz-startup", name: "Стартапы", slug: "startups", categoryId: "business", icon: "🚀" },
      { id: "biz-marketing", name: "Маркетинг", slug: "marketing", categoryId: "business", icon: "📢" },
      { id: "biz-finance", name: "Финансы", slug: "finance", categoryId: "business", icon: "💰" },
      { id: "biz-crypto", name: "Криптовалюты", slug: "crypto", categoryId: "business", icon: "₿" },
      { id: "biz-freelance", name: "Фриланс", slug: "freelance", categoryId: "business", icon: "🏠" },
      { id: "biz-ecommerce", name: "E-commerce", slug: "ecommerce", categoryId: "business", icon: "🛒" },
    ],
  },
  {
    id: "creative",
    name: "Творчество",
    slug: "creative",
    icon: "🎨",
    description: "Музыка, рисование, фото, видео и другие виды искусства",
    color: "#ec4899",
    subcategories: [
      { id: "cr-music", name: "Музыка", slug: "music", categoryId: "creative", icon: "🎵" },
      { id: "cr-art", name: "Рисование", slug: "art", categoryId: "creative", icon: "🖌️" },
      { id: "cr-photo", name: "Фото / Видео", slug: "photo-video", categoryId: "creative", icon: "📸" },
      { id: "cr-writing", name: "Писательство", slug: "writing", categoryId: "creative", icon: "✍️" },
      { id: "cr-3d", name: "3D-моделирование", slug: "3d-modeling", categoryId: "creative", icon: "🧊" },
      { id: "cr-film", name: "Кинематограф", slug: "filmmaking", categoryId: "creative", icon: "🎬" },
    ],
  },
  {
    id: "science",
    name: "Наука",
    slug: "science",
    icon: "🔬",
    description: "Физика, математика, биология, психология и философия",
    color: "#10b981",
    subcategories: [
      { id: "sci-physics", name: "Физика", slug: "physics", categoryId: "science", icon: "⚛️" },
      { id: "sci-math", name: "Математика", slug: "math", categoryId: "science", icon: "📐" },
      { id: "sci-bio", name: "Биология", slug: "biology", categoryId: "science", icon: "🧬" },
      { id: "sci-psych", name: "Психология", slug: "psychology", categoryId: "science", icon: "🧠" },
      { id: "sci-phil", name: "Философия", slug: "philosophy", categoryId: "science", icon: "💭" },
      { id: "sci-astro", name: "Астрономия", slug: "astronomy", categoryId: "science", icon: "🌌" },
    ],
  },
  {
    id: "sports",
    name: "Спорт",
    slug: "sports",
    icon: "⚽",
    description: "Фитнес, футбол, единоборства, шахматы и киберспорт",
    color: "#ef4444",
    subcategories: [
      { id: "sp-fitness", name: "Фитнес", slug: "fitness", categoryId: "sports", icon: "💪" },
      { id: "sp-football", name: "Футбол", slug: "football", categoryId: "sports", icon: "⚽" },
      { id: "sp-martial", name: "Единоборства", slug: "martial-arts", categoryId: "sports", icon: "🥊" },
      { id: "sp-chess", name: "Шахматы", slug: "chess", categoryId: "sports", icon: "♟️" },
      { id: "sp-esports", name: "Киберспорт", slug: "esports", categoryId: "sports", icon: "🎯" },
      { id: "sp-yoga", name: "Йога / Медитация", slug: "yoga", categoryId: "sports", icon: "🧘" },
    ],
  },
  {
    id: "education",
    name: "Образование",
    slug: "education",
    icon: "📚",
    description: "Языки, подготовка к экзаменам, менторство и карьерные консультации",
    color: "#8b5cf6",
    subcategories: [
      { id: "edu-lang", name: "Изучение языков", slug: "languages", categoryId: "education", icon: "🌍" },
      { id: "edu-exam", name: "Подготовка к экзаменам", slug: "exam-prep", categoryId: "education", icon: "📝" },
      { id: "edu-mentor", name: "Менторство", slug: "mentoring", categoryId: "education", icon: "🎓" },
      { id: "edu-career", name: "Карьера", slug: "career", categoryId: "education", icon: "📈" },
    ],
  },
  {
    id: "entertainment",
    name: "Развлечения",
    slug: "entertainment",
    icon: "🎭",
    description: "Кино, игры, аниме, книги и путешествия",
    color: "#f97316",
    subcategories: [
      { id: "ent-movies", name: "Кино / Сериалы", slug: "movies", categoryId: "entertainment", icon: "🎬" },
      { id: "ent-games", name: "Видеоигры", slug: "gaming", categoryId: "entertainment", icon: "🕹️" },
      { id: "ent-anime", name: "Аниме / Манга", slug: "anime", categoryId: "entertainment", icon: "🎌" },
      { id: "ent-books", name: "Книги", slug: "books", categoryId: "entertainment", icon: "📖" },
      { id: "ent-travel", name: "Путешествия", slug: "travel", categoryId: "entertainment", icon: "✈️" },
      { id: "ent-food", name: "Кулинария", slug: "cooking", categoryId: "entertainment", icon: "🍳" },
    ],
  },
  {
    id: "networking",
    name: "Нетворкинг",
    slug: "networking",
    icon: "🤝",
    description: "Поиск кофаундера, команды и обмен профессиональным опытом",
    color: "#06b6d4",
    subcategories: [
      { id: "net-cofounder", name: "Поиск кофаундера", slug: "cofounder", categoryId: "networking", icon: "🤝" },
      { id: "net-team", name: "Поиск команды", slug: "team-search", categoryId: "networking", icon: "👥" },
      { id: "net-exchange", name: "Обмен опытом", slug: "experience-exchange", categoryId: "networking", icon: "💡" },
      { id: "net-collab", name: "Коллаборации", slug: "collaborations", categoryId: "networking", icon: "🔗" },
    ],
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getAllSubcategories() {
  return CATEGORIES.flatMap((c) => c.subcategories);
}
