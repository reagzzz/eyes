import * as Sentry from "@sentry/nextjs";

export function captureError(error: unknown, tags?: Record<string, string | number | boolean | undefined>) {
  try {
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: Object.fromEntries(
        Object.entries(tags || {}).filter(([, v]) => v !== undefined && v !== null)
      ) as Record<string, string>,
    });
  } catch {
    // noop
  }
}


