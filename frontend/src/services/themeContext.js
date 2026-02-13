import { createContext, useCallback, useContext, useMemo, useState } from "react";

let sessionThemeMode = "dark";

const ThemeModeContext = createContext({
  mode: "dark",
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(sessionThemeMode);

  const toggleTheme = useCallback(() => {
    const nextMode = mode === "dark" ? "light" : "dark";
    sessionThemeMode = nextMode;
    setMode(nextMode);
  }, [mode]);

  const value = useMemo(() => ({ mode, toggleTheme }), [mode, toggleTheme]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
};
