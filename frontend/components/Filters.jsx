'use client';
import { useEffect, useState } from 'react';

export default function Filters({ filters, facets, onChange }) {
  const [q, setQ] = useState(filters.q);

  // Debounce typing so the API is hit once per pause, not once per keystroke.
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => onChange({ q }), 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const models = filters.make ? facets.models[filters.make] || [] : [...new Set(Object.values(facets.models).flat())].sort();

  return (
    <div className="filters">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search VIN, make or model" aria-label="Search vehicles" />
      <select aria-label="Make" value={filters.make} onChange={(e) => onChange({ make: e.target.value, model: '' })}>
        <option value="">All makes</option>
        {facets.makes.map((m) => <option key={m}>{m}</option>)}
      </select>
      <select aria-label="Model" value={filters.model} onChange={(e) => onChange({ model: e.target.value })}>
        <option value="">All models</option>
        {models.map((m) => <option key={m}>{m}</option>)}
      </select>
      <select aria-label="Age" value={filters.bucket} onChange={(e) => onChange({ bucket: e.target.value })}>
        <option value="all">Any age</option>
        <option value="0-30">0–30 days</option>
        <option value="31-90">31–90 days</option>
        <option value="aging">Aging (over 90 days)</option>
      </select>
      <select aria-label="Sort" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value })}>
        <option value="age_desc">Oldest first</option>
        <option value="age_asc">Newest first</option>
        <option value="price_desc">Price, high to low</option>
        <option value="price_asc">Price, low to high</option>
      </select>
    </div>
  );
}
