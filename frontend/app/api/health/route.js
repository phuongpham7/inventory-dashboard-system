export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL || "http://localhost:4000";

export async function GET() {
  const started = Date.now();
  try {
    const res = await fetch(`${BACKEND}/readyz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return Response.json({
      api: "up",
      database: res.ok ? "connected" : "not ready",
      latency_ms: Date.now() - started,
    });
  } catch {
    return Response.json({
      api: "down",
      database: "unknown",
      latency_ms: Date.now() - started,
    });
  }
}
