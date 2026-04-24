import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/lib/store";

interface AchievementMeta {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

let cachedCatalog: AchievementMeta[] | null = null;
const subscribers = new Set<(c: AchievementMeta[]) => void>();

async function loadCatalog() {
  if (cachedCatalog) return cachedCatalog;
  const { data } = await supabase
    .from("achievements")
    .select("id, title, description, icon, category")
    .order("sort_order", { ascending: true });
  cachedCatalog = data ?? [];
  subscribers.forEach((cb) => cb(cachedCatalog!));
  return cachedCatalog;
}

/** Fire a toast whenever a new achievement appears on the user. */
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
  const ref = useRef<AchievementMeta[]>(cachedCatalog ?? []);
  const force = useRef(0);
  useEffect(() => {
    let active = true;
    const cb = (c: AchievementMeta[]) => {
      if (!active) return;
      ref.current = c;
      force.current += 1;
    };
    if (cachedCatalog) cb(cachedCatalog);
    subscribers.add(cb);
    loadCatalog();
    return () => {
      active = false;
      subscribers.delete(cb);
    };
  }, []);
  return ref.current;
};
