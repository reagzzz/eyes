"use client";

import { useState, useTransition } from "react";
import { keyOf } from "@/lib/key";
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
  const [publishing, setPublishing] = useState(false);

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
        console.log("[flow] tx signature:", txSig);
        toast(`Signature: ${txSig.slice(0,6)}...${txSig.slice(-6)}`, "success");
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

        // Short-circuit if confirmed already
        if (confirmJson?.ok && confirmJson?.pending === false) {
          toast("Paiement confirmé", "success");
        } else if (confirmJson?.ok && confirmJson?.pending === true) {
          // Poll payment status
          toast("Paiement en attente de confirmations…", "success");
          await new Promise<void>((resolve, reject) => {
            const started = Date.now();
            const it = setInterval(async () => {
              try {
                const r = await fetch(`/api/payments/status?sig=${encodeURIComponent(txSig)}`);
                const j = await r.json().catch(() => ({} as any));
                console.log("[flow] status:", j);
                if (j?.status === "confirmed" || j?.status === "finalized") {
                  clearInterval(it);
                  resolve();
                }
                if (j?.status === "err") {
                  clearInterval(it);
                  reject(new Error("tx_err"));
                }
                if (Date.now() - started > 60000) { // safety cap 60s
                  clearInterval(it);
                  resolve();
                }
              } catch (e) {
                clearInterval(it);
                reject(e as Error);
              }
            }, 2000);
          });
          toast("Paiement confirmé", "success");
        } else {
          throw new Error(confirmJson?.error || "confirm_failed");
        }

        console.log("[flow] summary:", {
          rpc: getRpcUrl(),
          signature: txSig,
          explorerUrl,
          confirmationStatus: confirmJson?.finalStatus ?? null,
          lamportsToTreasury: confirmJson?.totalToTreasury ?? null,
        });

        // 4) Génération d'images via IA
        toast("Génération en cours…", "success");
        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, count, model }),
        });
        if (!genRes.ok) {
          const t = await genRes.text();
          console.error("[flow] generate_failed", genRes.status, t);
          toast(`Erreur génération: ${genRes.status}`, "error");
          return;
        }
        const gen = await genRes.json().catch(() => ({} as any));
        if (!gen?.ok || !Array.isArray(gen?.items) || gen.items.length === 0) {
          console.error("[flow] generate bad body", gen);
          toast("Aucune image générée", "error");
          return;
        }
        toast(`${gen.items.length} image(s) générée(s)`, "success");
        const generated = gen.items as Array<{ imageCid: string; metadataCid: string; imageUri: string; metadataUri: string }>;

        // 5) Mint (MVP: utilise le premier metadataUri)
        const first = generated[0];
        toast("Mint en cours…", "success");
        const mintRes = await fetch("/api/mint/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: publicKey!.toBase58(),
            metadataUri: first.metadataUri,
            name: "AI NFT",
            symbol: "AINFT",
          }),
        });
        if (!mintRes.ok) {
          const t = await mintRes.text();
          console.error("[flow] mint_failed", mintRes.status, t);
          toast(`Erreur mint: ${mintRes.status}`, "error");
          return;
        }
        const mintJson = await mintRes.json().catch(() => ({} as any));
        console.log("[mint]", mintJson);
        toast("NFT minté !", "success");

        // 6) Aperçu simple (client) puis sauvegarde de la collection
        setPublishing(true);
        try {
          const payload = {
            id: crypto.randomUUID(),
            title: (prompt || "").slice(0, 64) || "Untitled",
            prompt: prompt || null,
            items: Array.isArray(generated) ? generated : [],
            payment: {
              signature: txSig,
              totalLamports: lamports,
              treasury,
            },
            createdAt: new Date().toISOString(),
          };
          console.log("[flow] save payload:", payload);
          const res = await fetch("/api/collections/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const bodyTxt = await res.clone().text();
          console.log("[flow] save res:", { status: res.status, body: bodyTxt });
          if (!res.ok) {
            toast(`Erreur sauvegarde: ${res.status}`, "error");
            return;
          }
          const saved = JSON.parse(bodyTxt);
          if (!saved?.ok || !saved?.id) {
            toast("Réponse sauvegarde invalide", "error");
            return;
          }
          toast("Collection créée ✅", "success");
          router.push(`/collection/${saved.id}`);
          return;
        } finally {
          setPublishing(false);
        }
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
          <Button type="submit" size="lg" disabled={isPending || publishing}>
            {publishing ? "Publication…" : isPending ? "Traitement…" : "Payer et lancer la génération"}
          </Button>
        </div>
      </form>
    </main>
  );
}


