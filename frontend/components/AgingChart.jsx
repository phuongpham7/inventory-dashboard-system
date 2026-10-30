"use client";
import { useState } from "react";

const W = 640,
  H = 280,
  L = 40,
  R = 8,
  T = 30,
  B = 44;
const nice = (n) => {
  const p = 10 ** Math.floor(Math.log10(n));
  const f = n / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
};

export default function AgingChart({ dist, count, onShowAll }) {
  const [open, setOpen] = useState(true);
  const buckets = dist?.buckets || [];
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const step = nice(Math.ceil(max / 4));
  const top = step * 4;
  const bw = (W - L - R) / (buckets.length || 1);
  const y = (v) => T + (H - T - B) * (1 - v / top);
  const firstAging = buckets.findIndex((b) => b.aging);
  const summary = buckets
    .map(
      (b) =>
        `${b.label} days: ${b.total} vehicles${b.aging ? `, ${b.no_action} with no action` : ""}`,
    )
    .join(". ");

  return (
    <section className={open ? "" : "closed"}>
      <div className="bar">
        <div>
          <h2>
            <button
              className="collapse"
              aria-expanded={open}
              aria-controls="aging-body"
              onClick={() => setOpen((o) => !o)}
            >
              <span className={`chev ${open ? "open" : ""}`} aria-hidden="true">
                ▸
              </span>
              Aging stock{count != null ? ` (${count})` : ""}
            </button>
          </h2>
          <div className="sub">
            How long vehicles have been in stock. Amber bars are aging vehicles
            with no action yet.
          </div>
        </div>
        <button className="btn" onClick={onShowAll}>
          Show all aging stock
        </button>
      </div>

      <div id="aging-body" hidden={!open}>
        <div className="chart">
          {!dist ? (
            <div className="empty">Loading chart…</div>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`Vehicles by time in stock. ${summary}`}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i}>
                  <line
                    className="ch-grid"
                    x1={L}
                    x2={W - R}
                    y1={y(i * step)}
                    y2={y(i * step)}
                  />
                  <text
                    className="ch-axis"
                    x={L - 6}
                    y={y(i * step) + 4}
                    textAnchor="end"
                  >
                    {i * step}
                  </text>
                </g>
              ))}

              {buckets.map((b, i) => {
                const cx = L + bw * (i + 0.5);
                const x = cx - bw * 0.32;
                const w = bw * 0.64;
                return (
                  <g key={b.label}>
                    <title>{`${b.label} days: ${b.total} vehicles${b.aging ? ` (${b.no_action} no action, ${b.with_action} action logged)` : ""}`}</title>
                    {b.aging ? (
                      <>
                        <rect
                          className="ch-w"
                          x={x}
                          y={y(b.no_action)}
                          width={w}
                          height={y(0) - y(b.no_action)}
                        />
                        <rect
                          className="ch-ok"
                          x={x}
                          y={y(b.total)}
                          width={w}
                          height={y(b.no_action) - y(b.total)}
                        />
                      </>
                    ) : (
                      <rect
                        className="ch-n"
                        x={x}
                        y={y(b.total)}
                        width={w}
                        height={y(0) - y(b.total)}
                      />
                    )}
                    <text
                      className="ch-txt"
                      x={cx}
                      y={y(b.total) - 6}
                      textAnchor="middle"
                    >
                      {b.total}
                    </text>
                    <text
                      className="ch-axis"
                      x={cx}
                      y={H - B + 20}
                      textAnchor="middle"
                    >
                      {b.label}
                    </text>
                  </g>
                );
              })}

              {firstAging > 0 && (
                <g>
                  <line
                    className="ch-limit"
                    x1={L + bw * firstAging}
                    x2={L + bw * firstAging}
                    y1={T - 8}
                    y2={H - B}
                  />
                  <text
                    className="ch-axis"
                    x={L + bw * firstAging + 6}
                    y={T - 12}
                  >
                    Aging: over {dist.aging_days} days
                  </text>
                </g>
              )}
              <text
                className="ch-axis"
                x={L + (W - L - R) / 2}
                y={H - 6}
                textAnchor="middle"
              >
                Days in stock
              </text>
            </svg>
          )}
        </div>

        <div className="legend">
          <span>
            <i className="sw ch-n" /> Under {dist?.aging_days ?? 90} days
          </span>
          <span>
            <i className="sw ch-w" /> Aging, no action yet
          </span>
          <span>
            <i className="sw ch-ok" /> Aging, action logged
          </span>
        </div>

        <table className="sr-only">
          <caption>Vehicles by time in stock</caption>
          <thead>
            <tr>
              <th>Days in stock</th>
              <th>Vehicles</th>
              <th>No action yet</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.label}>
                <td>{b.label}</td>
                <td>{b.total}</td>
                <td>{b.aging ? b.no_action : "n/a"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
