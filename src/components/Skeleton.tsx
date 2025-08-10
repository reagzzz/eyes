export default function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return (
    <div
      className={
        "animate-pulse rounded-md bg-foreground/10 dark:bg-foreground/15 relative overflow-hidden " +
        className
      }
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent [@media_(prefers-reduced-motion:_reduce)]:hidden" />
      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}


