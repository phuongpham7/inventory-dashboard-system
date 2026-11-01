"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { api } from "../lib/api";
import {
  getServerSnapshot,
  getSnapshot,
  isBad,
  percentile,
  subscribe,
} from "../lib/telemetry";

export default function HealthPanel() {
  const ref = useRef(null);
  const [status, setStatus] = useState(null);
  const { calls, logs } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  async function check() {
    setStatus(null);
    try {
      setStatus(await api.health());
    } catch {
      setStatus({ api: "down", database: "unknown" });
    }
  }
  function show() {
    ref.current?.showModal();
    check();
  }

  const ms = calls.map((c) => c.ms);
  const bad = calls.filter((c) => isBad(c.status)).length;
  const stats = [
    ["Requests", calls.length],
    [
      "Error rate",
      `${calls.length ? Math.round((bad / calls.length) * 100) : 0}%`,
    ],
    ["p50 latency", `${percentile(ms, 0.5)} ms`],
    ["p95 latency", `${percentile(ms, 0.95)} ms`],
  ];

  return (
    <>
      <button className="btn" onClick={show}>
        System health
      </button>
      <dialog ref={ref} aria-labelledby="health-title">
        <h2 id="health-title">System health</h2>
        <div className="sub">
          Measured in this browser since the page loaded, plus a live backend
          check
        </div>

        <div className="status-line" aria-live="polite">
          {status === null ? (
            "Checking backend…"
          ) : (
            <>
              <span className={`chip ${status.api === "up" ? "" : "none"}`}>
                API: {status.api}
              </span>{" "}
              <span
                className={`chip ${status.database === "connected" ? "" : "none"}`}
              >
                Database: {status.database}
              </span>
              {status.latency_ms != null && (
                <span className="sub">
                  {" "}
                  · check took {status.latency_ms} ms
                </span>
              )}
            </>
          )}
        </div>

        <div className="hl">
          {stats.map(([label, value]) => (
            <div key={label}>
              <div className="num">{value}</div>
              <div className="sub">{label}</div>
            </div>
          ))}
        </div>

        <div className="sub">
          Recent requests (search the backend logs for a request_id)
        </div>
        <pre>
          {logs
            .slice(0, 8)
            .map((l) => JSON.stringify(l))
            .join("\n") || "No requests yet."}
        </pre>

        <div className="acts">
          <button className="btn" onClick={check}>
            Re-check backend
          </button>
          <button className="btn p" onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
