// Small text helpers for the chat: friendlier chip labels and less repetitive replies.

/** Rewrites the engine's follow-up chip labels into short, natural Russian; null hides a chip. */
export function chipLabel(label: string): string | null {
  const l = label.trim();
  if (/^начать заново$/i.test(l)) return null;
  if (/^что приготовить\??$/i.test(l)) return "Подобрать рецепт";
  let m = l.match(/^Не обязательно:\s*(.+)$/i);
  if (m) return cap(m[1]) + " — не обязательно";
  m = l.match(/^Без ограничения по времени$/i);
  if (m) return "Можно дольше";
  return l;
}

/** Two intro sentences ending with ":" in a row read as a stutter — keep the last one. */
export function tidyReply(text: string): string {
  const parts = text.split(/(?<=:)\s+(?=[А-ЯЁA-Z])/);
  if (parts.length >= 2 && parts.slice(0, -1).every((p) => p.trim().endsWith(":"))) {
    const last = parts[parts.length - 1];
    return last.trim().endsWith(":") ? last : parts[parts.length - 2] + " " + last;
  }
  return text;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const MOOD_LABEL: Record<string, string> = {
  cozy: "Уютное", light: "Лёгкое", hearty: "Сытное", quick: "Побыстрее", comfort: "Простое", fresh: "Свежее", spicy: "Острое", sweet: "Сладкое",
};

/** First words that continue the current topic ("а без лука?", "побыстрее", "ещё варианты"). */
export const CONTINUES_TOPIC = /^(а|и|ещ[её]|без|побыстрее|быстрее|можно|только|не\b|лучше|другое|другие|покажи|давай|да\b|нет\b|сколько|чем|как|а если)/i;
