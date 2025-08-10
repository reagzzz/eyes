"use client";
import { useEffect, useState } from "react";

type Row = {
  _id: string;
  title?: string;
  supply?: number;
  mintsCount?: number;
  volumeSol24h?: number;
  createdAt?: string;
};

export default function ActivityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/explore");
        const data = await res.json();
        const items: Row[] = (data.items || []).sort(
          (a: Row, b: Row) => (b.volumeSol24h || 0) - (a.volumeSol24h || 0)
        );
        setRows(items);
      } catch {
        // noop
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="container px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">Activity</h1>
      {loading ? (
        <div className="text-muted-foreground">Chargement…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/50 backdrop-blur shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Collection</th>
                <th className="text-right px-4 py-3 font-medium">Mints</th>
                <th className="text-right px-4 py-3 font-medium">Volume 24h (SOL)</th>
                <th className="text-right px-4 py-3 font-medium">Créée</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-t border-border/50">
                  <td className="px-4 py-3 font-medium">{r.title || r._id}</td>
                  <td className="px-4 py-3 text-right">{r.mintsCount || 0}</td>
                  <td className="px-4 py-3 text-right">{(r.volumeSol24h || 0).toFixed(3)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}


