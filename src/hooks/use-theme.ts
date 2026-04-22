import { useEffect, useState } from "react";
import { applyTheme, getTheme, subscribeTheme, type Theme } from "@/lib/theme";

/**
 * Global theme hook. Any component using this re-renders when the
 * theme changes from anywhere (Settings, TopBar, another tab, dev tools).
 */
export const useTheme = (): [Theme, (t: Theme) => void] => {
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  useEffect(() => {
    // Re-sync once on mount in case the inline index.html script and
    // React's first render disagreed on the value.
    setThemeState(getTheme());
    return subscribeTheme((next) => setThemeState(next));
  }, []);

  const setTheme = (t: Theme) => applyTheme(t);

  return [theme, setTheme];
};
