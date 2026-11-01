// Server-side proxy: adds the token so it never reaches browser code.
// DEMO ONLY: every visitor acts as the one user in API_TOKEN.
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_URL || "http://localhost:4000";

async function proxy(req, { params }) {
  const token = process.env.API_TOKEN;
  if (!token)
    return Response.json(
      { error: "API_TOKEN is not set on the Next.js server" },
      { status: 500 },
    );

  const { pathname, search } = new URL(req.url);
  const url = `${BACKEND}${pathname}${search}`;
  const headers = { authorization: `Bearer ${token}` };
  for (const name of ["x-request-id", "content-type"]) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
      cache: "no-store",
    });
    const out = {
      "content-type": res.headers.get("content-type") || "application/json",
    };
    const rid = res.headers.get("x-request-id");
    if (rid) out["x-request-id"] = rid;
    return new Response(res.body, { status: res.status, headers: out });
  } catch {
    return Response.json(
      { error: "Inventory service unreachable" },
      { status: 502 },
    );
  }
}

export { proxy as GET, proxy as POST };
