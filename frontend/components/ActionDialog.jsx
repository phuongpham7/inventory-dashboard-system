'use client';
import { useEffect, useRef, useState } from 'react';
import { api, ACTIONS } from '../lib/api';
import { vehicleName } from '../lib/format';

export default function ActionDialog({ vehicle, onClose, onSaved }) {
  const ref = useRef(null);
  const [status, setStatus] = useState(ACTIONS[0]);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vehicle) {
      ref.current?.close();
      return;
    }
    setStatus(vehicle.current_action?.status || ACTIONS[0]);
    setNotes('');
    setError('');
    setHistory(null);
    ref.current?.showModal();
    const ac = new AbortController();
    api.actions(vehicle.id, ac.signal).then(setHistory).catch(() => setHistory([]));
    return () => ac.abort();
  }, [vehicle]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.logAction(vehicle.id, { action_status: status, notes });
      onSaved();
    } catch (e) {
      setError(`Couldn’t save the action. ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="dlg-title">
      <h2 id="dlg-title">{vehicle ? vehicleName(vehicle) : ''}</h2>
      {vehicle && <div className="sub">{vehicle.age_days} days in stock · VIN {vehicle.vin}</div>}
      <label htmlFor="act-status">Status or planned action</label>
      <select id="act-status" value={status} onChange={(e) => setStatus(e.target.value)}>
        {ACTIONS.map((a) => <option key={a}>{a}</option>)}
      </select>
      <label htmlFor="act-notes">Notes (optional)</label>
      <textarea id="act-notes" rows={3} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="sub" style={{ marginTop: 12 }}>History</div>
      <ul className="hist">
        {history === null && <li>Loading history…</li>}
        {history && history.length === 0 && <li>No actions logged yet.</li>}
        {history && history.map((a) => (
          <li key={a.id}><b>{a.action_status}</b> · {new Date(a.created_at).toLocaleDateString()}{a.notes && <><br />{a.notes}</>}</li>
        ))}
      </ul>
      {error && <div className="form-err" role="alert">{error}</div>}
      <div className="acts">
        <button className="btn" onClick={() => ref.current?.close()}>Cancel</button>
        <button className="btn p" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save action'}</button>
      </div>
    </dialog>
  );
}
