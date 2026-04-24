import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";

export interface AchievementMeta {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  sort_order: number;
}

let cachedCatalog: AchievementMeta[] | null = null;
let inflight: Promise<AchievementMeta[]> | null = null;

async function loadCatalog(): Promise<AchievementMeta[]> {
  if (cachedCatalog) return cachedCatalog;
  if (inflight) return inflight;
  inflight = supabase
    .from("achievements")
    .select("id, title, description, icon, category, threshold, sort_order")
    .order("sort_order", { ascending: true })
    .then(({ data }) => {
      cachedCatalog = (data ?? []) as AchievementMeta[];
      inflight = null;
      return cachedCatalog;
    });
  return inflight;
}

/** Fires a toast the first time a new achievement appears on the user. */
export const useAchievementToasts = () => {
  const unlocked = useAppStore((s) => s.unlockedAchievements);
  const seen = useRef<Set<string> | null>(null);
  const catalogRef = useRef<Map<string, AchievementMeta>>(new Map());

  useEffect(() => {
    loadCatalog().then((c) => {
      catalogRef.current = new Map(c.map((a) => [a.id, a]));
    });
  }, []);

  useEffect(() => {
    if (seen.current === null) {
      // First mount: snapshot what's already unlocked, don't re-toast history
      seen.current = new Set(unlocked.map((u) => u.achievementId));
      return;
    }
    for (const u of unlocked) {
      if (seen.current.has(u.achievementId)) continue;
      seen.current.add(u.achievementId);
      const meta = catalogRef.current.get(u.achievementId);
      if (meta) {
        toast.success(`${meta.icon}  ${meta.title}`, { description: meta.description });
      }
    }
  }, [unlocked]);
};

export const useAchievementCatalog = () => {
  const [catalog, setCatalog] = useState<AchievementMeta[]>(cachedCatalog ?? []);
  useEffect(() => {
    let active = true;
    loadCatalog().then((c) => {
      if (active) setCatalog(c);
    });
    return () => {
      active = false;
    };
  }, []);
  return catalog;
};
