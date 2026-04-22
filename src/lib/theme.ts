import { levelFromXp } from "./gamification";

export type Theme = "light" | "dark" | "aurora" | "carbon" | "solar";

const KEY = "flowsphere-theme";
const ALL_THEMES: Theme[] = ["light", "dark", "aurora", "carbon", "solar"];

export interface ThemeMeta {
  id: Theme;
  label: string;
  description: string;
  unlockLevel: number; // 0 = always unlocked
  swatch: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "dark",
    label: "Ember Cosmos",
    description: "The signature warm-black canvas with amber heat.",
    unlockLevel: 0,
    swatch: "linear-gradient(135deg, hsl(24 18% 6%), hsl(38 100% 56%))",
  },
  {
    id: "light",
    label: "Daylight",
    description: "Warm cream with amber accents for daytime focus.",
    unlockLevel: 0,
    swatch: "linear-gradient(135deg, hsl(45 60% 94%), hsl(22 95% 52%))",
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Borealis greens dancing on cobalt.",
    unlockLevel: 3,
    swatch: "linear-gradient(135deg, hsl(165 80% 45%), hsl(220 80% 25%))",
  },
  {
    id: "carbon",
    label: "Carbon",
    description: "Pure black canvas, surgical accents.",
    unlockLevel: 7,
    swatch: "linear-gradient(135deg, hsl(0 0% 6%), hsl(15 90% 55%))",
  },
  {
    id: "solar",
    label: "Solar",
    description: "Warm amber heat, golden hour every hour.",
    unlockLevel: 12,
    swatch: "linear-gradient(135deg, hsl(38 95% 55%), hsl(15 90% 55%))",
  },
];

// ── pub/sub so any component can react to theme changes instantly ──
type Listener = (t: Theme) => void;
const listeners = new Set<Listener>();

export const subscribeTheme = (fn: Listener) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const emit = (t: Theme) => listeners.forEach((fn) => fn(t));

export const getTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(KEY) as Theme | null;
  if (stored && ALL_THEMES.includes(stored)) return stored;
  return "dark";
};

export const applyTheme = (t: Theme) => {
  const root = document.documentElement;
  for (const id of ALL_THEMES) root.classList.remove(`theme-${id}`);
  root.classList.remove("light", "dark");
  if (t === "light") root.classList.add("light");
  else root.classList.add("dark");
  if (t !== "light" && t !== "dark") root.classList.add(`theme-${t}`);
  localStorage.setItem(KEY, t);
  emit(t);
};

// ── cross-tab sync: when another tab changes the theme, mirror it here ──
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue && ALL_THEMES.includes(e.newValue as Theme)) {
      const t = e.newValue as Theme;
      const root = document.documentElement;
      for (const id of ALL_THEMES) root.classList.remove(`theme-${id}`);
      root.classList.remove("light", "dark");
      if (t === "light") root.classList.add("light");
      else root.classList.add("dark");
      if (t !== "light" && t !== "dark") root.classList.add(`theme-${t}`);
      emit(t);
    }
  });
}

export const isThemeUnlocked = (t: Theme, totalXp: number): boolean => {
  const meta = THEMES.find((m) => m.id === t);
  if (!meta) return false;
  if (meta.unlockLevel === 0) return true;
  return levelFromXp(totalXp).level >= meta.unlockLevel;
};

const SEEN_KEY = "flowsphere-unlocked-themes-seen";

export const getSeenUnlocks = (): Theme[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
};

export const markUnlockSeen = (t: Theme) => {
  const seen = new Set(getSeenUnlocks());
  seen.add(t);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
};

export const getUnseenUnlocks = (totalXp: number): ThemeMeta[] => {
  const seen = new Set(getSeenUnlocks());
  return THEMES.filter(
    (m) => m.unlockLevel > 0 && isThemeUnlocked(m.id, totalXp) && !seen.has(m.id),
  );
};

// ── runtime verification: confirms the theme is correctly mounted on <html> ──
export interface ThemeHealthReport {
  expected: Theme;
  rootElement: "html";
  htmlClasses: string[];
  bodyClasses: string[];
  hasCorrectClass: boolean;
  hasStrayClasses: boolean;
  primaryTokenResolved: string;
  backgroundTokenResolved: string;
  storedValue: string | null;
  ok: boolean;
  issues: string[];
}

export const verifyThemeApplied = (expected: Theme): ThemeHealthReport => {
  const html = document.documentElement;
  const htmlClasses = Array.from(html.classList);
  const bodyClasses = Array.from(document.body.classList);
  const issues: string[] = [];

  const expectedClass = expected === "light" ? "light" : expected === "dark" ? "dark" : `theme-${expected}`;
  const baseClass = expected === "light" ? "light" : "dark";

  const hasCorrectClass =
    htmlClasses.includes(baseClass) &&
    (expected === "light" || expected === "dark" || htmlClasses.includes(`theme-${expected}`));

  if (!hasCorrectClass) issues.push(`Missing expected class "${expectedClass}" on <html>`);

  // Stray theme classes (a different unlocked theme leaked through)
  const otherThemes = ALL_THEMES.filter((t) => t !== expected && t !== "light" && t !== "dark");
  const stray = otherThemes.filter((t) => htmlClasses.includes(`theme-${t}`));
  if (stray.length) issues.push(`Stray theme classes present: ${stray.join(", ")}`);

  // Theme classes should live on <html>, not <body> or any other container
  const bodyHasTheme = bodyClasses.some((c) => c === "light" || c === "dark" || c.startsWith("theme-"));
  if (bodyHasTheme) issues.push("Theme class found on <body> (should only be on <html>)");

  // Resolve a couple of tokens to confirm the cascade is alive
  const styles = getComputedStyle(html);
  const primaryTokenResolved = styles.getPropertyValue("--primary").trim();
  const backgroundTokenResolved = styles.getPropertyValue("--background").trim();
  if (!primaryTokenResolved) issues.push("--primary token did not resolve");
  if (!backgroundTokenResolved) issues.push("--background token did not resolve");

  const storedValue = localStorage.getItem(KEY);
  if (storedValue !== expected) issues.push(`localStorage out of sync (stored: ${storedValue})`);

  return {
    expected,
    rootElement: "html",
    htmlClasses,
    bodyClasses,
    hasCorrectClass,
    hasStrayClasses: stray.length > 0,
    primaryTokenResolved,
    backgroundTokenResolved,
    storedValue,
    ok: issues.length === 0,
    issues,
  };
};
