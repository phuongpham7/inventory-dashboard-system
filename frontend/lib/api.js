export const ACTIONS = [
  "Price Reduction Planned",
  "Transfer to Another Lot",
  "Wholesale/Auction",
  "Promotion Planned",
  "No Action Needed",
];

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Reads retry with exponential backoff on network or 5xx errors. Writes never retry,
// so a slow response cannot create a duplicate action. The request id ties the browser
// call to the backend log line for the same request.
async function request(path, { method = "GET", body, signal } = {}) {
  const retries = method === "GET" ? 2 : 0;
  const rid = globalThis.crypto?.randomUUID?.() || String(Date.now());
  for (let n = 0; ; n++) {
    try {
      const res = await fetch("/api" + path, {
        method,
        signal,
        headers: { "content-type": "application/json", "x-request-id": rid },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new ApiError(res.status, j.error || res.statusText);
      }
      return await res.json();
    } catch (e) {
      if (
        e.name === "AbortError" ||
        (e.status && e.status < 500) ||
        n >= retries
      )
        throw e;
      await sleep(250 * 2 ** n);
    }
  }
}

const qs = (o) =>
  new URLSearchParams(
    Object.entries(o).filter(([, v]) => v !== "" && v != null),
  ).toString();

export const api = {
  list: (p, signal) => request("/vehicles?" + qs(p), { signal }),
  summary: (signal) => request("/vehicles/summary", { signal }),
  aging: (limit, signal) =>
    request("/vehicles/aging?limit=" + limit, { signal }),
  distribution: (signal) => request("/vehicles/aging/distribution", { signal }),
  facets: (signal) => request("/vehicles/facets", { signal }),
  actions: (id, signal) => request("/vehicles/" + id + "/actions", { signal }),
  logAction: (id, body) =>
    request("/vehicles/" + id + "/actions", { method: "POST", body }),
};
