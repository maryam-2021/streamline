import { useEffect, useState } from "react";

export const useTheme = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem("streamline-theme") || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("streamline-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggleTheme };
};
