"use client";

import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem storageKey="pharmora-appearance" disableTransitionOnChange>{children}</ThemeProvider>;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  return <button type="button" className="iconbutton theme-toggle" aria-label={label} title={label} onClick={() => setTheme(dark ? "light" : "dark")}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>;
}
