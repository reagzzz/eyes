"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
// import { Button } from "@/components/ui/Button";
import { useOnScrollReveal } from "@/lib/scroll-reveal";

export default function Home() {
  const ref = useOnScrollReveal<HTMLDivElement>();
  return (
    <main className="px-4 sm:px-6 lg:px-8 py-16 max-w-6xl mx-auto">
      <section ref={ref} className="text-center space-y-6">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
          Générez et publiez votre collection en quelques minutes
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
          Décrivez votre idée, choisissez le nombre d’images à générer et lancez votre mint.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/create"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-200 active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 bg-primary text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-primary/90 h-12 px-5 text-base"
          >
            Créer une collection <ArrowRight className="size-4 ml-2" />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all duration-200 active:translate-y-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 bg-card text-foreground border border-border hover:bg-card/60 hover:shadow-sm h-12 px-5 text-base"
          >
            Explorer
          </Link>
        </div>
      </section>
    </main>
  );
}
