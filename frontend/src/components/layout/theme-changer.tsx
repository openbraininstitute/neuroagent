"use client";

import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeChangerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
    <div className="flex items-center pt-0.5">
      <label className="relative inline-block h-8 w-16">
        <input
          type="checkbox"
          checked={theme === "dark"}
          onChange={() => {
            setTheme(theme === "dark" ? "light" : "dark");
          }}
          className="h-0 w-0 opacity-0"
        />
        <span className="absolute inset-0 flex cursor-pointer items-center rounded-full bg-gray-300 transition-colors duration-300 ease-in-out dark:bg-gray-700">
          <span className="m-0.5 h-7 w-7 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out dark:translate-x-8 dark:bg-black">
            <div className="flex h-full w-full items-center justify-center">
              {theme === "dark" ? <Moon /> : <Sun />}
            </div>
          </span>
        </span>
      </label>
    </div>
  );
}
