// Next.js calls this for every error thrown while serving a request. It writes them to the admin error log.
export async function onRequestError(error: unknown, request: { path: string }) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const err = error as { message?: string; stack?: string };
    const { logError } = await import("./lib/log-error");
    await logError({ source: "server", message: err?.message ?? String(error), stack: err?.stack, path: request?.path });
  }
}
