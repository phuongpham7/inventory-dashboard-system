export const money = (n) => '$' + Number(n).toLocaleString('en-US');
export const vehicleName = (v) => `${v.year} ${v.make} ${v.model}`;
export const ageClass = (d) => (d > 180 ? 'c' : d > 90 ? 'w' : '');
