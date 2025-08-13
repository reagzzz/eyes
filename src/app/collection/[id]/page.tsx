import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type CollectionItem = {
  imageCid?: string;
  imageUri?: string;
  metadataCid?: string;
  metadataUri?: string;
};

type CollectionPayload = {
  id: string;
  prompt: string;
  items: CollectionItem[];
  createdAt?: string | null;
};

async function getCollection(id: string): Promise<{ data: CollectionPayload | null; status: number }> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const url = `${base}/api/collections/${id}`;
  const res = await fetch(url, { cache: "no-store" }).catch(() => null as any);
  if (!res) return { data: null, status: 500 };
  if (res.status === 404) return { data: null, status: 404 };
  if (!res.ok) return { data: null, status: res.status };
  const json = await res.json().catch(() => ({}));
  const item = (json?.item || json?.collection) as CollectionPayload | undefined;
  if (!json?.ok || !item) return { data: null, status: 500 };
  return { data: item, status: 200 };
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/collections/${id}`, { cache: "no-store" });
  if (!res.ok) return notFound();
  const json = await res.json().catch(() => ({} as any));
  const item = json?.item ?? null;
  if (!json?.ok || !item) return notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Collection {id}</h1>
      <pre className="text-xs whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-4">
        {JSON.stringify(item, null, 2)}
      </pre>
    </main>
  );
}


