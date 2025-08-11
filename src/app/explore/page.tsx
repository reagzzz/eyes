"use client";
import Link from "next/link";
import ImageWithSkeleton from "@/components/ImageWithSkeleton";
import { useOnScrollReveal } from "@/lib/scroll-reveal";

import { useEffect, useState } from "react";

type ExploreItem = { _id:string; title?:string; coverCID?:string; supply:number; mintsCount?:number };

export default function ExplorePage() {
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useOnScrollReveal<HTMLDivElement>();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/explore");
        if (!res.ok) {
          setError("failed");
          return;
        }
        const d = await res.json();
        setItems(d.items || []);
      } catch (e) {
        setError("failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="container px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">Explorer</h1>
      {loading && <div className="text-gray-500 mb-6">Chargement…</div>}
      {!loading && items.length === 0 && !error && (
        <div className="text-gray-600 mb-6">Aucune collection live pour l’instant</div>
      )}
      {!loading && error && (
        <div className="text-red-600 mb-6">Une erreur est survenue lors du chargement.</div>
      )}
      <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((c) => (
          <Link
            key={c._id}
            href={`/collection/${c._id}`}
            className="group rounded-2xl border border-border/60 overflow-hidden bg-card/60 backdrop-blur shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <ImageWithSkeleton src={c.coverCID ? `https://gateway.pinata.cloud/ipfs/${c.coverCID}` : `https://picsum.photos/seed/${c._id}/800/600`} alt={c.title || c._id} className="h-48 w-full" rounded="rounded-none" />
            <div className="p-4">
              <div className="font-semibold group-hover:underline">{c.title || c._id}</div>
              <div className="text-sm text-muted-foreground">Supply: {c.supply}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}


