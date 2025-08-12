"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { getRpcUrl } from "@/server/solana/rpc";
import { useToast } from "@/components/Toast";
import ErrorNotice from "@/components/ErrorNotice";

type CollectionDto = {
  _id: string;
  title?: string;
  description?: string;
  metadataUri?: string;
  symbol?: string;
  metadataCIDs?: string[];
};

export default function CollectionPage() {
  const { publicKey, signTransaction, connected, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { show } = useToast();
  const params = useParams<{ id: string }>();

  const [collection, setCollection] = useState<CollectionDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);

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
      setConfirmError(null);
      const res = await fetch("/api/mint/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58(), lamports: 10000 }),
      });
      if (!res.ok) {
        const serverMsg = await res.text().catch(() => "");
        const msg = serverMsg?.trim() ? serverMsg : `HTTP ${res.status}`;
        show(`❌ Compose failed: ${msg}` , "error");
        return;
      }
      const data = (await res.json()) as { ok: boolean; tx?: string };
      if (!data.ok || !data.tx) {
        show("❌ Compose failed: no_tx", "error");
        return;
      }

      const rpc = getRpcUrl();
      const connection = new Connection(rpc, "confirmed");
      const txBytes = Uint8Array.from(atob(data.tx), (c) => c.charCodeAt(0));
      const tx = VersionedTransaction.deserialize(txBytes);

      let sig: string;
      const w = (window as unknown as { solana?: { signAndSendTransaction?: (t: VersionedTransaction) => Promise<{ signature: string } | string> } }).solana;
      if (w?.signAndSendTransaction) {
        const r = await w.signAndSendTransaction(tx);
        sig = typeof r === "string" ? r : r.signature;
      } else if (sendTransaction) {
        sig = await sendTransaction(tx, connection);
      } else if (signTransaction) {
        const signed = await signTransaction(tx);
        sig = await connection.sendRawTransaction(signed.serialize());
      } else {
        throw new Error("Wallet cannot send transaction");
      }

      // Immediately show explorer and start confirmation
      show(`✅ Tx envoyée`, "success");
      window.open(`https://explorer.solana.com/tx/${sig}?cluster=devnet`, "_blank", "noreferrer");
      setLastSig(sig);
      setConfirming(true);
      const TREASURY = (process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET || "").trim();
      const expectedLamports = 10000; // same as compose lamports; replace by quote when available
      try {
        const r = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signature: sig, expectedLamports, treasury: TREASURY }),
        });
        const j = await r.json().catch(() => ({}));
        if (!(r.ok && j?.ok)) {
          const err = j?.error || `HTTP_${r.status}`;
          setConfirmError(err);
        }
      } catch (e) {
        setConfirmError((e as Error)?.message || "confirm_failed");
      } finally {
        setConfirming(false);
      }
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
        <ErrorNotice message="Collection introuvable">
          <a
            href="/explore"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800"
          >
            Retour à l’explore
          </a>
        </ErrorNotice>
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
      {confirming && (
        <div className="mt-3 text-sm text-gray-600 flex items-center">
          <svg className="animate-spin mr-2 h-4 w-4 text-gray-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          En attente de confirmation (jusqu’à 60s)…
        </div>
      )}
      {!!confirmError && (
        <div className="mt-2 text-sm text-red-600">
          {confirmError === "timeout" ? (
            <>
              Confirmation expirée. <button
                className="underline"
                onClick={async () => {
                  if (!lastSig) return;
                  setConfirming(true);
                  setConfirmError(null);
                  try {
                    const TREASURY = (process.env.NEXT_PUBLIC_PLATFORM_TREASURY_WALLET || "").trim();
                    const expectedLamports = 10000;
                    const r = await fetch("/api/payments/confirm", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ signature: lastSig, expectedLamports, treasury: TREASURY }),
                    });
                    const j = await r.json().catch(() => ({}));
                    if (r.ok && j?.ok) {
                      setConfirming(false);
                      setConfirmError(null);
                    } else {
                      const err = j?.error || `HTTP_${r.status}`;
                      setConfirmError(err);
                      setConfirming(false);
                    }
                  } catch (e) {
                    setConfirmError((e as Error)?.message || "retry_failed");
                    setConfirming(false);
                  }
                }}
              >Réessayer</button>
            </>
          ) : (
            <>Erreur: {confirmError}</>
          )}
        </div>
      )}
      {lastSig && (
        <div className="mt-2 text-xs text-gray-500">
          Debug: <a className="underline" href={`/api/_debug/sig/${lastSig}`} target="_blank" rel="noreferrer">/api/_debug/sig/{lastSig.slice(0,6)}…</a>
        </div>
      )}
    </div>
  );
}


