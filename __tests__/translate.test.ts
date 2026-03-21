import { describe, it, expect } from "vitest";
import {
  translateText,
  hasTranslation,
  getLangName,
} from "@/lib/translate";
import type { Lang } from "@/lib/translate";

// ==================== translateText ====================

describe("translateText", () => {
  it("returns same text when from === to", () => {
    expect(translateText("hello", "en", "en")).toBe("hello");
  });

  it("translates exact phrase match (en → ru)", () => {
    const result = translateText("Hello", "en", "ru");
    expect(result).toBe("Здравствуйте");
  });

  it("translates case-insensitively", () => {
    expect(translateText("HELLO", "en", "ru")).toBe("Здравствуйте");
    expect(translateText("hello", "en", "es")).toBe("Hola");
  });

  it("translates to all supported languages", () => {
    const langs: Lang[] = ["en", "ru", "es", "zh", "ar"];
    for (const lang of langs) {
      if (lang === "en") continue;
      const result = translateText("Thank you", "en", lang);
      expect(result).not.toBe("Thank you");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("returns original text when no translation found", () => {
    expect(translateText("some random text xyz", "en", "ru")).toBe("some random text xyz");
  });

  it("translates compound phrases with period delimiter", () => {
    const text = "Thank you. Regards";
    const result = translateText(text, "en", "ru");
    expect(result).toContain("Спасибо");
    expect(result).toContain("С уважением");
  });

  it("trims whitespace before matching", () => {
    expect(translateText("  hello  ", "en", "ru")).toBe("Здравствуйте");
  });

  it("translates report-related phrases", () => {
    const result = translateText("the reported user has been banned", "en", "ru");
    expect(result).toBe("Пользователь, на которого поступила жалоба, заблокирован");
  });

  it("translates safety messages", () => {
    const result = translateText("your safety is our priority", "en", "es");
    expect(result).toBe("Tu seguridad es nuestra prioridad");
  });
});

// ==================== hasTranslation ====================

describe("hasTranslation", () => {
  it("returns false when from === to", () => {
    expect(hasTranslation("hello", "en", "en")).toBe(false);
  });

  it("returns true for known phrases", () => {
    expect(hasTranslation("hello", "en", "ru")).toBe(true);
    expect(hasTranslation("Thank you", "en", "es")).toBe(true);
  });

  it("returns false for unknown phrases", () => {
    expect(hasTranslation("random unknown text", "en", "ru")).toBe(false);
  });

  it("detects compound phrases", () => {
    expect(hasTranslation("Hello. Thank you", "en", "ru")).toBe(true);
  });
});

// ==================== getLangName ====================

describe("getLangName", () => {
  it("returns language name for valid codes", () => {
    expect(getLangName("en")).toBe("English");
    expect(getLangName("ru")).toBe("Русский");
    expect(getLangName("es")).toBe("Español");
    expect(getLangName("zh")).toBe("中文");
    expect(getLangName("ar")).toBe("العربية");
  });

  it("returns code itself for unknown languages", () => {
    expect(getLangName("fr")).toBe("fr");
    expect(getLangName("de")).toBe("de");
  });
});
