const EMPTY = { calls: [], logs: [] };
let snapshot = EMPTY;
const listeners = new Set();

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getSnapshot = () => snapshot; // must return the same object until something changes
export const getServerSnapshot = () => EMPTY;

export const isBad = (status) => status === 0 || status >= 400; // 0 = network failure

export function record(entry) {
  const level =
    entry.status === 0 || entry.status >= 500
      ? "error"
      : entry.status >= 400
        ? "warn"
        : "info";
  snapshot = {
    calls: [...snapshot.calls, { ms: entry.ms, status: entry.status }].slice(
      -100,
    ),
    logs: [
      { ts: new Date().toISOString(), level, ...entry },
      ...snapshot.logs,
    ].slice(0, 30),
  };
  listeners.forEach((fn) => fn());
}

export const percentile = (values, p) =>
  values.length
    ? [...values].sort((a, b) => a - b)[
        Math.min(values.length - 1, Math.floor(values.length * p))
      ]
    : 0;
