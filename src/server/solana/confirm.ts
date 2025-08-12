import { Connection } from "@solana/web3.js";

export async function waitForFinalized(
  connection: Connection,
  signature: string,
  timeoutMs = 45000,
  pollEveryMs = 800
): Promise<{ ok: true } | { ok: false; reason: string }>{
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const st = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const s = st.value[0];
      if (s?.confirmationStatus === "finalized") {
        if (s.err) return { ok: false, reason: "tx_err" };
        return { ok: true };
      }
      if (s?.err) return { ok: false, reason: "tx_err" };
    } catch (e: unknown) {
      // best-effort; keep polling
      // eslint-disable-next-line no-console
      console.warn("[confirm] getSignatureStatuses error:", (e as Error)?.message || e);
    }
    await new Promise((r) => setTimeout(r, pollEveryMs));
  }
  return { ok: false, reason: "timeout" };
}


