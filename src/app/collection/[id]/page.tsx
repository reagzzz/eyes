import { notFound } from "next/navigation";
import IpfsImage from "@/components/IpfsImage";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`/api/collections/${id}`, { cache: "no-store" });
  if (!res.ok) return notFound();
  const json = await res.json();
  if (!json?.ok || !json?.item) return notFound();
  const item = json.item;
  const items = Array.isArray(item?.items) ? item.items : [];

  return (
    <main className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-6">Collection</h1>
      <p className="text-sm text-muted-foreground mb-4">ID : {item.id}</p>

      <h2 className="text-xl font-medium mb-4">{item.title}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((it: any, i: number) => {
          const src = it?.imageUri ?? it?.imageCid ?? "";
          return (
            <div key={i} className="rounded-xl overflow-hidden border bg-card">
              <IpfsImage src={src} alt={item.title || `item-${i}`} className="w-full h-[360px] object-cover" />
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


