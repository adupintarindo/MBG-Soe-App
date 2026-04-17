"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Lang } from "@/lib/i18n";

export type Theme = "light" | "dark";

export const THEME_KEY = "mbg-theme";
export const LANG_KEY = "mbg-lang";

interface PrefsValue {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  toggleTheme: () => void;
}

const PrefsContext = createContext<PrefsValue | null>(null);

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function readInitialLang(): Lang {
  if (typeof document === "undefined") return "ID";
  const attr = document.documentElement.getAttribute("lang");
  return attr === "en" ? "EN" : "ID";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function applyLang(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", lang === "EN" ? "en" : "id");
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(THEME_KEY);
      if (storedTheme === "light" || storedTheme === "dark") {
        setThemeState(storedTheme);
        applyTheme(storedTheme);
      } else {
        applyTheme(readInitialTheme());
      }
      const storedLang = window.localStorage.getItem(LANG_KEY);
      if (storedLang === "ID" || storedLang === "EN") {
        setLangState(storedLang);
        applyLang(storedLang);
      } else {
        applyLang(readInitialLang());
      }
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    applyLang(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo<PrefsValue>(
    () => ({ theme, lang, setTheme, setLang, toggleTheme }),
    [theme, lang, setTheme, setLang, toggleTheme]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    // Fallback when used outside provider (e.g. static prerender).
    return {
      theme: "light",
      lang: "ID",
      setTheme: () => {},
      setLang: () => {},
      toggleTheme: () => {}
    };
  }
  return ctx;
}

export function useTheme() {
  const { theme, setTheme, toggleTheme } = usePrefs();
  return { theme, setTheme, toggleTheme };
}

export function useLang() {
  const { lang, setLang } = usePrefs();
  return { lang, setLang };
}
