"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      onClick={toggle}
      className="inline-flex size-9 items-center justify-center rounded-lg border hover:bg-foreground/5 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 motion-safe:active:scale-[.98]"
    >
      <span aria-hidden>{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}</span>
    </button>
  );
}


