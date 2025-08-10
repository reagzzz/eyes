"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface UIButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, UIButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-200 active:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

    const variants: Record<Variant, string> = {
      primary:
        "bg-primary text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-primary/90",
      secondary:
        "bg-card text-foreground border border-border hover:bg-card/60 hover:shadow-sm",
      ghost: "bg-transparent text-foreground hover:bg-foreground/5 border border-transparent",
      danger:
        "bg-red-600 text-white shadow-sm hover:bg-red-600/90 hover:shadow-md",
    };

    const sizes: Record<Size, string> = {
      sm: "h-9 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-5 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";


