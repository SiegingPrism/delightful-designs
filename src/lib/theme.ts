import { levelFromXp } from "./gamification";

export type Theme = "light" | "dark" | "aurora" | "carbon" | "solar";

const KEY = "flowsphere-theme";
const ALL_THEMES: Theme[] = ["light", "dark", "aurora", "carbon", "solar"];

export interface ThemeMeta {
  id: Theme;
  label: string;
  description: string;
  unlockLevel: number; // 0 = always unlocked
  swatch: string; // CSS gradient/color preview
}

export const THEMES: ThemeMeta[] = [
  {
    id: "light",
    label: "Daylight",
    description: "Soft warm light, the FlowSphere default.",
    unlockLevel: 0,
    swatch: "linear-gradient(135deg, hsl(30 30% 97%), hsl(246 80% 60%))",
  },
  {
    id: "dark",
    label: "Midnight",
    description: "Deep indigo for late sessions.",
    unlockLevel: 0,
    swatch: "linear-gradient(135deg, hsl(230 25% 7%), hsl(250 90% 70%))",
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

export const getTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(KEY) as Theme | null;
  if (stored && ALL_THEMES.includes(stored)) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const applyTheme = (t: Theme) => {
  const root = document.documentElement;
  // Remove all theme classes, then apply the right one
  for (const id of ALL_THEMES) root.classList.remove(`theme-${id}`);
  root.classList.toggle("dark", t === "dark" || t === "carbon" || t === "aurora");
  // Custom themes get a marker class so index.css can override tokens
  if (t !== "light" && t !== "dark") root.classList.add(`theme-${t}`);
  localStorage.setItem(KEY, t);
};

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

/** Returns themes that are unlocked but have never been celebrated. */
export const getUnseenUnlocks = (totalXp: number): ThemeMeta[] => {
  const seen = new Set(getSeenUnlocks());
  return THEMES.filter(
    (m) => m.unlockLevel > 0 && isThemeUnlocked(m.id, totalXp) && !seen.has(m.id),
  );
};
