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

export default async function CollectionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data, status } = await getCollection(id);
  if (!data && status === 404) return notFound();
  if (!data) return notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Collection</h1>
        <p className="text-muted-foreground mt-2">Prompt : {data.prompt || "—"}</p>
      </div>

      {Array.isArray(data.items) && data.items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {data.items.map((it, idx) => {
            const uri = (it.imageUri || "").replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/");
            return (
              <div key={`${data.id}-${idx}`} className="rounded-xl overflow-hidden border border-border bg-card">
                {uri ? (
                  <Image src={uri} alt={`item-${idx}`} width={800} height={800} className="w-full h-auto object-cover" priority={idx < 3} unoptimized />
                ) : (
                  <div className="aspect-square flex items-center justify-center text-muted-foreground">Image manquante</div>
                )}
                <div className="p-4 text-sm text-muted-foreground break-all">
                  {it.metadataUri && (
                    <div className="mb-1">
                      Metadata: <a className="underline" href={it.metadataUri.replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/")} target="_blank">IPFS</a>
                    </div>
                  )}
                  {it.imageCid && <div>imageCid: {it.imageCid}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Aucun item dans cette collection.</div>
      )}
    </div>
  );
}


