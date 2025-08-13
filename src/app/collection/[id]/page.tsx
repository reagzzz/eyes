import { getBaseUrl, toHttpFromIpfs } from "@/server/url";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/collections/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) {
    // @ts-ignore
    const { notFound } = await import("next/navigation");
    return notFound();
  }
  const { item } = await res.json();

  const first = item?.items?.[0];
  const imgSrc = first ? toHttpFromIpfs(first.imageUri || (first.imageCid ? `ipfs://${first.imageCid}` : "")) : "";

  return (
    <main className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-6">Collection</h1>
      <p className="text-sm text-muted-foreground mb-4">ID : {item.id}</p>

      <h2 className="text-xl font-medium mb-4">{item.title}</h2>

      {imgSrc ? (
        <img
          src={imgSrc}
          alt={item.title || "image"}
          className="rounded-xl border bg-card w-[600px] h-[600px] object-cover"
        />
      ) : (
        <div className="w-[600px] h-[600px] rounded-xl border grid place-items-center">
          <span className="text-muted-foreground">Aucune image</span>
        </div>
      )}

      <pre className="mt-8 text-xs bg-muted/30 rounded-lg p-4 overflow-auto">{JSON.stringify(item, null, 2)}</pre>
    </main>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


