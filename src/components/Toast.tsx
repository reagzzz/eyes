"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { keyOf } from "@/lib/key";
import { cn } from "@/lib/cn";

type ToastItem = { id: number; message: string; type?: "success" | "error" };

type ToastContextValue = {
  show: (message: string, type?: ToastItem["type"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type?: ToastItem["type"]) => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2400);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic className="pointer-events-none fixed inset-0 z-[60] flex items-end sm:items-start px-4 py-6 sm:p-6">
        <div className="flex w-full flex-col items-center space-y-2 sm:items-end">
          {items.map((t, i) => (
            <div
              key={t.id ?? keyOf("toast", i)}
              className={cn(
                "pointer-events-auto w-full sm:max-w-sm rounded-xl border shadow-md backdrop-blur px-4 py-3 text-sm",
                "bg-card/80 border-border/60",
                t.type === "success" && "border-green-500/40",
                t.type === "error" && "border-red-500/40"
              )}
              role="status"
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}


