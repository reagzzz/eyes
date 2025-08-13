import { getBaseUrl, toHttpFromIpfs } from "@/server/url";

export default async function ExplorerPage() {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/collections/list`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  const items = Array.isArray(json?.items) ? json.items : [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-3xl font-semibold mb-6">Explorer</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map((c: any) => {
          const first = c.items?.[0];
          const img = toHttpFromIpfs(first?.imageUri ?? "");
          return (
            <a key={c.id} href={`/collection/${c.id}`} className="block rounded-xl overflow-hidden bg-card border border-border hover:shadow-md transition">
              {img ? (
                <img src={img} alt={c.title || "Untitled"} className="w-full h-64 object-cover" />
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-muted-foreground">No preview</div>
              )}
              <div className="p-4">
                <div className="font-medium">{c.title || "Untitled"}</div>
                <div className="text-xs text-muted-foreground break-all">ID: {c.id}</div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}


