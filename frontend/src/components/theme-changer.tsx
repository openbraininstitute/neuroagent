"use client";

import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export default function ThemeChanger({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  // Had to be done to prevent Hydration error
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

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

  return (
    <Button
      variant="link"
      size="icon"
      className="hover:scale-[1.1] transition border-none"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-[100%] rotate-0 scale-100 transition-all" />
      ) : (
        <Moon className="h-[100%] rotate-0 scale-100 transition-all" />
      )}
    </Button>
  );
}
