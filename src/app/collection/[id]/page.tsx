// src/app/collection/[id]/page.tsx
import 'server-only';
import { notFound } from 'next/navigation';
import { getBaseUrl } from '@/src/lib/baseUrl';

type PageProps = { params: Promise<{ id: string }> };

function cidToHttp(cid?: string) {
  if (!cid) return null as string | null;
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;
  const res = await fetch(`${getBaseUrl()}/api/collections/${id}`, { cache: 'no-store' });
  if (!res.ok) return notFound();
  const { item } = (await res.json()) as { item: any };

  const first = item?.items?.[0] ?? null;
  const imgSrc = cidToHttp(first?.imageCid);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-2">Collection</h1>
      <p className="text-sm text-muted-foreground mb-6">ID : {item.id}</p>

      <h2 className="text-xl font-medium mb-4">{item.title}</h2>

      {imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={item.title} src={imgSrc} className="rounded-xl border bg-card aspect-square object-cover w-[560px] max-w-full" />
      ) : (
        <div className="rounded-xl border bg-card aspect-square w-[560px] max-w-full grid place-items-center">
          <span className="text-muted-foreground">Aucune image</span>
        </div>
      )}

      <pre className="mt-8 text-xs bg-muted p-4 rounded-lg overflow-auto">{JSON.stringify(item, null, 2)}</pre>
    </div>
  );
}

import Image from "next/image";
import { notFound } from "next/navigation";
import { getBaseUrl } from "@/server/baseUrl";
import { toGatewayUrl } from "@/server/ipfs-url";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = await getBaseUrl();
  const res = await fetch(new URL(`/api/collections/${id}`, base), { cache: "no-store" });
  if (!res.ok) return notFound();
  const json = await res.json();
  if (!json?.ok || !json?.item) return notFound();
  const item = json.item as { id: string; title: string; items: any[] };
  const items = Array.isArray(item?.items) ? item.items : [];

  return (
    <main className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-6">Collection</h1>
      <p className="text-sm text-muted-foreground mb-4">ID : {item.id}</p>

      <h2 className="text-xl font-medium mb-4">{item.title}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((it: any, i: number) => {
          const src = toGatewayUrl(it?.imageUri || it?.imageCid || "");
          return (
            <div key={i} className="rounded-xl overflow-hidden border bg-card relative h-[360px]">
              {src ? (
                <Image src={src} alt={item.title || `item-${i}`} fill sizes="360px" className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground">Aucune image</div>
              )}
            </div>
          );
        })}
        {items.length === 0 ? (
          <div className="w-full h-[360px] rounded-xl border grid place-items-center">
            <span className="text-muted-foreground">Aucune image</span>
          </div>
        ) : null}
      </div>

      <pre className="mt-8 text-xs bg-muted/30 rounded-lg p-4 overflow-auto">{JSON.stringify(item, null, 2)}</pre>
    </main>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


