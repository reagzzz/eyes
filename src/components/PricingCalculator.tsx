"use client";

import { useEffect, useState } from "react";

type Props = {
  count: number;
};

export default function PricingCalculator({ count }: Props) {
  const [price, setPrice] = useState<string>("-");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchQuote() {
      setLoading(true);
      try {
        const res = await fetch(`/api/pricing/quote`, { method:"POST", body: JSON.stringify({ count }), headers: { "Content-Type":"application/json" }, signal: controller.signal });
        const data = (await res.json()) as { sol: number };
        setPrice(data.sol.toFixed(4));
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (!err?.name?.includes("Abort")) {
          setPrice("-");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchQuote();
    return () => controller.abort();
  }, [count]);

  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{loading ? "Calcul en cours…" : "Prix estimé"}</span>
      <span className="rounded-md border border-border/60 bg-card/60 px-2 py-1 font-semibold shadow-sm">
        {loading ? "…" : `${price} SOL`}
      </span>
    </div>
  );
}


