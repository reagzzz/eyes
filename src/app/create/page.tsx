"use client";

import { useState, useTransition } from "react";
import PricingCalculator from "@/components/PricingCalculator";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, SystemProgram, Transaction, TransactionInstruction, PublicKey } from "@solana/web3.js";
import { getRpcUrl } from "@/server/solana/rpc";
import { useToast } from "@/components/Toast";

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState<number>(100);
  const [model, setModel] = useState<string>(process.env.NEXT_PUBLIC_STABILITY_DEFAULT_MODEL || "sd35-medium");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { show: toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey || !connected) {
      setVisible(true);
      return;
    }

    startTransition(async () => {
      try {
        // 1) Create payment intent
        const intentRes = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: publicKey.toBase58(), count, model }),
        });
        if (!intentRes.ok) throw new Error(await intentRes.text());
        const { paymentId, lamports, sol, treasury, memo } = (await intentRes.json()) as {
          paymentId: string; lamports: number; sol: number; treasury: string; memo: string;
        };

        toast(`Montant à payer: ${sol} SOL`, "success");

        // 2) Build and send SOL transfer with memo
        const rpc = getRpcUrl();
        const connection = new Connection(rpc, { commitment: "confirmed" });

        const tx = new Transaction();
        tx.add(
          SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(treasury), lamports })
        );
        const memoProgramId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
        // Construct memo data as Node Buffer for web3.js
        const memoData = typeof Buffer !== "undefined" ? Buffer.from(memo, "utf8") : new Uint8Array(new TextEncoder().encode(memo));
        tx.add(new TransactionInstruction({ programId: memoProgramId, keys: [], data: memoData as unknown as Buffer }));
        tx.feePayer = publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const txSig = await sendTransaction(tx, connection);
        console.log("[flow] signature:", txSig);
        const explorerUrl = `https://explorer.solana.com/tx/${txSig}?cluster=devnet`;
        console.log("[flow] explorer:", explorerUrl);

        // 3) Confirm on server
        const confirmRes = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature: txSig, expectedLamports: lamports, treasury }),
        });
        if (!confirmRes.ok) {
          const txt = await confirmRes.text();
          console.warn("[flow] confirm non-200:", txt);
          // In case of timeout, open debug automatically
          try { window.open(`/api/_debug/sig/${encodeURIComponent(txSig)}`, "_blank", "noreferrer"); } catch {}
          throw new Error(txt || `confirm_${confirmRes.status}`);
        }
        const confirmJson = await confirmRes.json().catch(() => ({} as any));
        console.log("[flow] confirm json:", confirmJson);
        if (!confirmJson?.ok) {
          if (confirmJson?.error === "timeout") {
            try { window.open(`/api/_debug/sig/${encodeURIComponent(txSig)}`, "_blank", "noreferrer"); } catch {}
          }
          throw new Error(confirmJson?.error || "confirm_failed");
        }

        toast("Paiement confirmé", "success");
        console.log("[flow] summary:", {
          rpc: getRpcUrl(),
          signature: txSig,
          explorerUrl,
          confirmationStatus: confirmJson?.finalStatus ?? null,
          lamportsToTreasury: confirmJson?.totalToTreasury ?? null,
        });

        // 4) Start generation (with Turnstile token if configured) then publish
        let turnstileToken: string | undefined = undefined;
        try {
          const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
          type Turnstile = { render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; [k: string]: unknown }) => void };
          const t = (window as unknown as { turnstile?: Turnstile }).turnstile;
          if (siteKey && t) {
            turnstileToken = await new Promise<string>((resolve, reject) => {
              t.render(document.createElement("div"), {
                sitekey: siteKey,
                callback: (token: string) => resolve(token),
                "error-callback": () => reject(new Error("turnstile_error")),
                action: "generate",
              });
            });
          }
        } catch {}

        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, count, model, turnstileToken }),
        });
        if (!genRes.ok) throw new Error(await genRes.text());
        const { collectionId } = await genRes.json();

        const publishRes = await fetch("/api/collections/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collectionId, title: prompt.slice(0, 32) || "Collection", mintPriceSol: sol, symbol: "COLL", wallet: publicKey.toBase58() }),
        });
        if (!publishRes.ok) throw new Error(await publishRes.text());
        router.push(`/collection/${collectionId}`);
      } catch (error: unknown) {
        console.error("flow_failed", error);
        const message = error instanceof Error ? error.message : "échec";
        toast(`Erreur: ${message}`, "error");
      }
    });
  }

  return (
    <main className="container px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">Créer une collection</h1>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium">Prompt IA</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Décrivez le style, le thème, etc."
            className="w-full min-h-28 rounded-xl border border-border/60 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Nombre d’images</label>
            <span className="text-xs text-muted-foreground">{count}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10000}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>10 000</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Modèle</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex items-center justify-between">
          <PricingCalculator count={count} />
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Traitement…" : "Payer et lancer la génération"}
          </Button>
        </div>
      </form>
    </main>
  );
}


