"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, VersionedTransaction, clusterApiUrl } from "@solana/web3.js";
import { useToast } from "@/components/Toast";

type CollectionDto = {
  _id: string;
  title?: string;
  description?: string;
  metadataUri?: string;
  symbol?: string;
  metadataCIDs?: string[];
};

export default function CollectionPage() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { show } = useToast();
  const params = useParams<{ id: string }>();

  const [collection, setCollection] = useState<CollectionDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id as string | undefined;
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/collections/${id}`);
        if (!res.ok) {
          setError("not_found");
          return;
        }
        const data: CollectionDto = await res.json();
        if (!cancelled) setCollection(data);
      } catch (err) {
        console.error("Erreur fetch collection:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const resolveMetadataUri = (col: CollectionDto): string | undefined => {
    if (col.metadataUri) return col.metadataUri;
    const cid = col.metadataCIDs && col.metadataCIDs[0];
    return cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : undefined;
  };

  const handleMint = async () => {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    if (!collection) {
      show("❌ Collection introuvable", "error");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/mint/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          metadataUri: resolveMetadataUri(collection),
          name: collection.title || collection._id || "NFT",
          symbol: collection.symbol || "NFT",
          collectionId: collection._id,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { txBase64, mintAddress }: { txBase64: string; mintAddress: string } = await res.json();

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const txBytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(txBytes);

      if (!signTransaction) throw new Error("Wallet does not support signTransaction");
      const signedTx = await signTransaction(transaction);
      const txid = await connection.sendRawTransaction(signedTx.serialize());

      show(`✅ NFT minté avec succès • ${mintAddress}`, "success");
      window.open(`https://explorer.solana.com/tx/${txid}?cluster=devnet`, "_blank");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(err);
      show(`❌ Erreur lors du mint: ${message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !collection) return <div className="p-6 text-gray-500">Chargement…</div>;

  if (error === "not_found") {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-gray-200 p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Collection introuvable</h2>
          <p className="text-gray-600 mb-4">La collection demandée n’existe pas ou a été supprimée.</p>
          <a
            href="/explore"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800"
          >
            Retour à l’explore
          </a>
        </div>
      </div>
    );
  }

  if (!collection) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{collection.title || collection._id}</h1>
      {collection.description && <p className="mb-6 text-gray-600">{collection.description}</p>}

      <button
        className="relative px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-lg shadow-lg hover:scale-105 transition-transform disabled:opacity-50 flex items-center justify-center"
        onClick={handleMint}
        disabled={!connected || loading}
      >
        {loading && (
          <svg
            className="animate-spin mr-2 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
        )}
        {loading ? "Minting..." : "Mint NFT"}
      </button>
    </div>
  );
}


