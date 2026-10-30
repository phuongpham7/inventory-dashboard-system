export default function ActionChip({ vehicle }) {
  return vehicle.current_action ? (
    <span className="chip">{vehicle.current_action.status}</span>
  ) : (
    <span className="chip none">No action yet</span>
  );
}
