import type { Connection, Finality, ParsedTransactionWithMeta } from "@solana/web3.js";

// Polls signature status until confirmed/finalized or timeout
export async function waitForConfirmation(
  connection: Connection,
  signature: string,
  opts?: { timeoutMs?: number; commitment?: Finality }
) {
  const timeoutMs = opts?.timeoutMs ?? 60000;
  const commitment: Finality = opts?.commitment ?? "confirmed";
  const startedAt = Date.now();
  let tick = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("timeout");
    }
    try {
      const res = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const status = res.value[0];
      // eslint-disable-next-line no-console
      console.log(`[confirm] tick=${tick} status=${status?.confirmationStatus ?? "none"}`);
      if (status?.err) {
        throw new Error(typeof status.err === "string" ? status.err : "tx_err");
      }
      if (status?.confirmationStatus === commitment || status?.confirmationStatus === "finalized") {
        return status;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[confirm] getSignatureStatuses error:", (e as Error)?.message || e);
    }
    tick += 1;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export async function fetchParsedTx(
  connection: Connection,
  signature: string
): Promise<ParsedTransactionWithMeta | null> {
  return connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
}


