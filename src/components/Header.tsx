"use client";

import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import ThemeToggle from "@/components/ThemeToggle";
import { usePathname } from "next/navigation";
import { useParallax } from "@/lib/scroll-reveal";
import MobileNav from "@/components/MobileNav";

export default function Header() {
  const pathname = usePathname();
  const parallaxRef = useParallax<HTMLDivElement>();
  const isActive = (href: string) => pathname === href;

  return (
    <header ref={parallaxRef} className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 will-change-transform">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="inline-block size-6 rounded-md bg-gradient-to-br from-primary to-primary/60" />
            PumpFun Kit
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/create" className={`rounded-md px-3 py-2 hover:text-foreground hover:bg-foreground/5 transition-colors ${isActive("/create") ? "text-foreground underline underline-offset-8 decoration-primary/60" : ""}`}>
              Créer
            </Link>
            <Link href="/explore" className={`rounded-md px-3 py-2 hover:text-foreground hover:bg-foreground/5 transition-colors ${isActive("/explore") ? "text-foreground underline underline-offset-8 decoration-primary/60" : ""}`}>
              Explorer
            </Link>
            <Link href="/activity" className={`rounded-md px-3 py-2 hover:text-foreground hover:bg-foreground/5 transition-colors ${isActive("/activity") ? "text-foreground underline underline-offset-8 decoration-primary/60" : ""}`}>
              Activity
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <MobileNav />
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}


