import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/60">
      <div className="container px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-3">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-base font-extrabold tracking-tight">
            <span className="inline-block size-5 rounded-md bg-gradient-to-br from-primary to-primary/60" />
            PumpFun Kit
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            Générez, publiez et explorez des collections — rapidement et avec style.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="font-semibold">Produit</div>
            <ul className="space-y-1 text-muted-foreground">
              <li><Link className="hover:text-foreground" href="/create">Créer</Link></li>
              <li><Link className="hover:text-foreground" href="/explore">Explorer</Link></li>
              <li><Link className="hover:text-foreground" href="/activity">Activity</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Ressources</div>
            <ul className="space-y-1 text-muted-foreground">
              <li><a className="hover:text-foreground" href="#">Docs</a></li>
              <li><a className="hover:text-foreground" href="#">FAQ</a></li>
              <li><a className="hover:text-foreground" href="#">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="flex md:justify-end items-start gap-3">
          <a href="#" aria-label="Twitter" className="inline-flex size-9 items-center justify-center rounded-lg border hover:bg-foreground/5 transition-colors">
            <Twitter className="size-4" />
          </a>
          <a href="#" aria-label="Github" className="inline-flex size-9 items-center justify-center rounded-lg border hover:bg-foreground/5 transition-colors">
            <Github className="size-4" />
          </a>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-xs text-muted-foreground">
        <div className="container px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span>© {new Date().getFullYear()} PumpFun Kit</span>
          <span>Made with Next.js + Tailwind</span>
        </div>
      </div>
    </footer>
  );
}


