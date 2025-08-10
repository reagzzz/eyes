import { mockCollections } from "@/lib/mock";

export default function ActivityPage() {
  return (
    <main className="container px-4 sm:px-6 lg:px-8 py-12 max-w-3xl">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">Activity (mock)</h1>
      <ul className="space-y-3">
        {mockCollections.map((c, i) => (
          <li key={i} className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-sm text-muted-foreground">Supply: {c.supply}</div>
            </div>
            <span className="text-xs rounded-md bg-primary text-white px-2 py-1 shadow-sm">Minted</span>
          </li>
        ))}
      </ul>
    </main>
  );
}


