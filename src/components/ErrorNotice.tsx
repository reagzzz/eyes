"use client";

import { cn } from "@/lib/cn";

type ErrorNoticeProps = {
  message: string;
  className?: string;
  children?: React.ReactNode;
};

export default function ErrorNotice({ message, className, children }: ErrorNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/60 backdrop-blur p-6 text-center shadow-sm",
        className
      )}
      role="alert"
    >
      <div className="text-lg font-semibold mb-2">{message}</div>
      {children ? <div className="mt-3 flex items-center justify-center gap-2">{children}</div> : null}
    </div>
  );
}


