import { useEffect, useState } from "react";
import { applyTheme, getTheme, subscribeTheme, type Theme } from "@/lib/theme";

/**
 * Global theme hook. Any component using this re-renders when the
 * theme changes from anywhere (Settings, TopBar, another tab, dev tools).
 */
export const useTheme = (): [Theme, (t: Theme) => void] => {
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  useEffect(() => {
    setThemeState(getTheme());
    const unsub = subscribeTheme((next) => setThemeState(next));
    return () => { unsub(); };
  }, []);

  const setTheme = (t: Theme) => applyTheme(t);

  return [theme, setTheme];
};
