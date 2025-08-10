"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import ImageWithSkeleton from "@/components/ImageWithSkeleton";
import { useToast } from "@/components/Toast";
import { useEffect, useState, useCallback } from "react";
import { useWallet, useWalletModal } from "@solana/wallet-adapter-react";

export default function CollectionPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  type Col = { _id:string; title?:string; imageCIDs?:string[] } | null;
  const [col, setCol] = useState<Col>(null);
  useEffect(() => {
    if(!id) return;
    fetch(`/api/collections/${id}`).then(r=>r.json()).then(setCol);
  }, [id]);

  const { show } = useToast();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [minting, setMinting] = useState(false);
  const [metadataUri, setMetadataUri] = useState<string | undefined>(undefined);
  const [pinLoading, setPinLoading] = useState(false);

  const isDevUi =
    (process.env.NEXT_PUBLIC_ENV && process.env.NEXT_PUBLIC_ENV !== "production") ||
    process.env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet";

  const onGenerateTestMetadata = useCallback(async () => {
    try {
      setPinLoading(true);
      const res = await fetch("/api/test/pin", { method: "POST" });
      if (!res.ok) throw new Error(`pin_failed (${res.status})`);
      const data: { metadataUri: string; imageCid: string; jsonCid: string } = await res.json();
      setMetadataUri(data.metadataUri);
      show("Metadata de test généré", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      show(`Erreur génération metadata: ${msg}`, "error");
    } finally {
      setPinLoading(false);
    }
  }, [show]);

  const onMint = useCallback(async () => {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    try {
      setMinting(true);
      const wallet = publicKey.toBase58();
      const body = {
        wallet,
        metadataUri: metadataUri ?? "https://gateway.pinata.cloud/ipfs/placeholder.json",
        name: "Test NFT",
        symbol: "TST",
      } satisfies { wallet: string; metadataUri: string; name: string; symbol: string };

      const res = await fetch("/api/mint/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Mint failed (${res.status})`);
      const data: { txSignature: string; mintAddress: string; explorerUrl: string } = await res.json();
      show(`NFT minté ! `, "success");
      // Optionally surface link
      show(`Voir sur explorer`, "info");
      window.open(data.explorerUrl, "_blank", "noopener,noreferrer");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      show(`Erreur de mint: ${msg}`, "error");
    } finally {
      setMinting(false);
    }
  }, [publicKey, setVisible, show]);

  return (
    <main className="container px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{col?.title || col?._id || "Collection"}</h1>
        <Button onClick={onMint} size="lg" disabled={!publicKey || minting}>
          {minting ? "Minting..." : "Mint"}
        </Button>
      </div>

      {isDevUi && (
        <div className="mb-6 rounded-xl border border-border/60 bg-card/60 p-4 flex items-center gap-3 text-sm">
          <Button size="sm" variant="secondary" onClick={onGenerateTestMetadata} disabled={pinLoading}>
            {pinLoading ? "Génération…" : "Générer metadata de test"}
          </Button>
          {metadataUri && (
            <span className="truncate text-muted-foreground" title={metadataUri}>
              {metadataUri}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {(col?.imageCIDs || []).slice(0, 24).map((cid: string, i: number) => (
          <ImageWithSkeleton key={i} src={`https://gateway.pinata.cloud/ipfs/${cid}`} alt={`image-${i}`} className="aspect-square" />
        ))}
      </div>
    </main>
  );
}


