"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Filters from "./Filters";
import AgingChart from "./AgingChart";
import VehicleTable from "./VehicleTable";
import ActionDialog from "./ActionDialog";

const PAGE_SIZE = 12;
const DEFAULT_FILTERS = {
  q: "",
  make: "",
  model: "",
  bucket: "all",
  sort: "age_desc",
};

export default function Dashboard() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [list, setList] = useState(null);
  const [summary, setSummary] = useState(null);
  const [dist, setDist] = useState(null);
  const [facets, setFacets] = useState({ makes: [], models: {} });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(true);
  const [reload, setReload] = useState(0);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState("");

  // KPIs, aging panel and filter options. Re-run after an action is saved or on Retry.
  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      api.summary(ac.signal),
      api.distribution(ac.signal),
      api.facets(ac.signal),
    ])
      .then(([s, d, f]) => {
        setSummary(s);
        setDist(d);
        setFacets(f);
        setError(null);
      })
      .catch((e) => e.name !== "AbortError" && setError(e));
    return () => ac.abort();
  }, [reload]);

  // The table. Aborting the previous request means a slow, outdated response can never overwrite a newer one.
  useEffect(() => {
    const ac = new AbortController();
    setBusy(true);
    api
      .list({ ...filters, page, size: PAGE_SIZE }, ac.signal)
      .then((r) => {
        setList(r);
        setError(null);
      })
      .catch((e) => e.name !== "AbortError" && setError(e))
      .finally(() => !ac.signal.aborted && setBusy(false));
    return () => ac.abort();
  }, [filters, page, reload]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const change = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const showAging = () => {
    change({ bucket: "aging" });
    document
      .getElementById("all-vehicles")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="wrap">
      <h1>Inventory</h1>
      <div className="sub">
        Care Motors · stock updates as actions are logged
      </div>

      {error && (
        <div className="err" role="alert">
          <span>Couldn’t load inventory. {error.message}.</span>
          <button className="btn" onClick={() => setReload((n) => n + 1)}>
            Retry
          </button>
        </div>
      )}

      <div className="kpis" aria-live="polite">
        {summary &&
          [
            ["Units in stock", summary.total, "", ""],
            [
              "Aging over 90 days",
              summary.aging,
              "w",
              `${Math.round((summary.aging / (summary.total || 1)) * 100)}% of stock`,
            ],
            [
              "Aging with no action",
              summary.unactioned,
              summary.unactioned ? "w" : "",
              "Needs a decision",
            ],
            ["Average age", `${summary.avg_age_days} days`, "", ""],
          ].map(([label, value, cls, note]) => (
            <div key={label} className={`kpi ${cls}`}>
              <div className="num">{value}</div>
              <div className="sub">
                {label}
                {note ? ` · ${note}` : ""}
              </div>
            </div>
          ))}
      </div>

      <AgingChart dist={dist} count={summary?.aging} onShowAll={showAging} />

      <div className="bar" id="all-vehicles">
        <h2>All vehicles</h2>
        <div className="sub">{list ? `${list.total} vehicles` : ""}</div>
      </div>
      <Filters filters={filters} facets={facets} onChange={change} />
      <VehicleTable list={list} busy={busy} onAct={setActive} />
      <div className="pager">
        <span className="sub">
          {list && list.total
            ? `Showing ${(list.page - 1) * list.size + 1}–${Math.min(list.total, list.page * list.size)} of ${list.total}`
            : ""}
        </span>
        <span>
          <button
            className="btn"
            disabled={!list || list.page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>{" "}
          <button
            className="btn"
            disabled={!list || list.page >= list.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </span>
      </div>

      <ActionDialog
        vehicle={active}
        onClose={() => setActive(null)}
        onSaved={() => {
          setActive(null);
          setToast("Action saved");
          setReload((n) => n + 1);
        }}
      />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
