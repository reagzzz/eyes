"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = original; };
    }
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        className="md:hidden inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">Open menu</span>
        <div className="relative size-5">
          <span className={`absolute inset-x-0 top-1 h-0.5 bg-foreground transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`absolute inset-x-0 top-2.5 h-0.5 bg-foreground transition-opacity ${open ? "opacity-0" : ""}`} />
          <span className={`absolute inset-x-0 top-4 h-0.5 bg-foreground transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
        </div>
      </button>
      {open && (
        <div
          ref={dialogRef}
          id="mobile-menu"
          className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur p-6"
          role="dialog"
          aria-modal="true"
        >
          <nav className="space-y-2 text-lg">
            <Link className="block rounded-md px-3 py-2 hover:bg-foreground/5" href="/create">Créer</Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-foreground/5" href="/explore">Explorer</Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-foreground/5" href="/activity">Activity</Link>
          </nav>
        </div>
      )}
    </>
  );
}


