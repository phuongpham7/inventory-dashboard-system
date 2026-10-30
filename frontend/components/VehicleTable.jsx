import { ageClass, money, vehicleName } from "../lib/format";
import ActionChip from './ActionChip';

export default function VehicleTable({ list, busy, onAct }) {
  return (
    <div className="tw" aria-busy={busy}>
      {!list ? (
        <div className="empty">Loading vehicles…</div>
      ) : list.items.length === 0 ? (
        <div className="empty">
          No vehicles match these filters. Clear a filter to see more stock.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Time in stock</th>
              <th className="r">Price</th>
              <th>Action status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.items.map((v) => (
              <tr key={v.id}>
                <td>
                  <b>{vehicleName(v)}</b>
                  <div className="sub mono">{v.vin}</div>
                </td>
                <td>
                  <span className={`age mono ${ageClass(v.age_days)}`}>
                    {v.age_days} days{v.is_aging ? " · Aging" : ""}
                  </span>
                </td>
                <td className="r mono">{money(v.price)}</td>
                <td>
                  {v.is_aging ? (
                    <ActionChip vehicle={v} />
                  ) : (
                    <span className="sub">Not needed</span>
                  )}
                </td>
                <td className="r">
                  {v.is_aging && (
                    <button className="btn" onClick={() => onAct(v)}>
                      Log action
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
