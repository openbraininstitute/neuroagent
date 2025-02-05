"use client";

import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeChanger({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Needed to prevent Hydration errors.
  if (!mounted) return null;

  return (
    <button
      className="hover:scale-[1.1] transition border-none"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}
