"use client";

import { useState, useTransition } from "react";
import PricingCalculator from "@/components/PricingCalculator";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/Button";

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState<number>(100);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Flow: Payer (stub) → Générer (stub) → Publier → Voir la page publique
    startTransition(() => {
      const id = nanoid(8);
      // In a real app, initiate payment then generation; here we just navigate
      router.push(`/collection/${id}`);
    });
  }

  return (
    <main className="container px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">Créer une collection</h1>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium">Prompt IA</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez le style, le thème, etc."
            className="w-full min-h-28 rounded-xl border border-border/60 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Nombre d’images</label>
            <span className="text-xs text-muted-foreground">{count}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10000}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>10 000</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <PricingCalculator count={count} />
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Traitement…" : "Créer et payer"}
          </Button>
        </div>
      </form>
    </main>
  );
}


