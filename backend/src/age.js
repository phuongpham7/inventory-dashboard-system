// Age is always derived from date_received, never stored, so it cannot go stale.
const DAY = 864e5;
const todayStart = () => {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
};

export const daysAgo = (d) => new Date(todayStart() - d * DAY);
export const ageOf = (date) =>
  Math.floor((todayStart() - new Date(date).getTime()) / DAY);
export const DAY_MS = DAY;
export const todayDate = () => new Date(todayStart());
