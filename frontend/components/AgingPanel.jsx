import { money, vehicleName } from '../lib/format';

export function ActionChip({ vehicle }) {
  return vehicle.current_action ? (
    <span className="chip">{vehicle.current_action.status}</span>
  ) : (
    <span className="chip none">No action yet</span>
  );
}

export default function AgingPanel({ aging, onAct, onShowAll }) {
  return (
    <section>
      <div className="bar">
        <div>
          <h2>Aging stock</h2>
          <div className="sub">Vehicles in stock for more than 90 days, oldest first</div>
        </div>
        <button className="btn" onClick={onShowAll}>Show all aging stock</button>
      </div>
      <div className="ag">
        {aging.length === 0 && <div className="empty">No aging stock. Everything is under 90 days.</div>}
        {aging.map((v) => (
          <div key={v.id} className={`tag ${v.age_days > 180 ? 'cr' : ''}`}>
            <div className="num">{v.age_days}<small>days</small></div>
            <b>{vehicleName(v)}</b>
            <span className="sub">VIN …{v.vin.slice(-6)} · {money(v.price)}</span>
            <div className="row">
              <ActionChip vehicle={v} />
              <button className="btn" onClick={() => onAct(v)}>Log action</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
