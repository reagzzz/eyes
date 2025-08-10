"use client";
import Link from "next/link";
import ImageWithSkeleton from "@/components/ImageWithSkeleton";
import { useOnScrollReveal } from "@/lib/scroll-reveal";

import { useEffect, useState } from "react";

type ExploreItem = { _id:string; title?:string; coverCID?:string; supply:number; mintsCount?:number };

export default function ExplorePage() {
  const [items, setItems] = useState<ExploreItem[]>([]);
  const ref = useOnScrollReveal<HTMLDivElement>();

  useEffect(() => {
    fetch("/api/explore").then(r=>r.json()).then((d)=> setItems(d.items||[]));
  }, []);

  return (
    <main className="container px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">Explorer</h1>
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


