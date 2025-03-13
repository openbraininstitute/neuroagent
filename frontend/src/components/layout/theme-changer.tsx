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
      <label className="relative inline-block w-16 h-8">
        <input
          type="checkbox"
          checked={theme === "dark"}
          onChange={() => {
            setTheme(theme === "dark" ? "light" : "dark");
          }}
          className="opacity-0 w-0 h-0"
        />
        <span className="absolute cursor-pointer inset-0 bg-gray-300 rounded-full flex items-center dark:bg-gray-700 transition-colors duration-300 ease-in-out">
          <span className="m-0.5 w-7 h-7 bg-white rounded-full shadow-md dark:translate-x-8 dark:bg-black transition-transform duration-300 ease-in-out">
            <div className="flex justify-center items-center w-full h-full">
              {theme === "dark" ? <Moon /> : <Sun />}
            </div>
          </span>
        </span>
      </label>
    </div>
  );
}
