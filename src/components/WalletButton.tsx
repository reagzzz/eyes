"use client";

import { ComponentType, useEffect, useState } from "react";

type WalletButtonComponent = ComponentType<{ className?: string }>;

export function WalletButton() {
  const [Button, setButton] = useState<WalletButtonComponent | null>(null);

  useEffect(() => {
    let mounted = true;
    import("@solana/wallet-adapter-react-ui").then((mod) => {
      if (mounted) setButton(() => mod.WalletMultiButton as unknown as WalletButtonComponent);
    });
    return () => { mounted = false; };
  }, []);

  if (!Button) {
    return (
      <button className="rounded-md border px-3 py-2 text-sm opacity-70 cursor-default" aria-disabled>
        Connect Wallet
      </button>
    );
  }

  return <Button className="btn" />;
}


