import { useEffect, useRef, useState } from 'react';
import { geocodePlaces } from '../utils/mapbox';

const PRESETS = [
  { id: 'cal-poly',     label: 'Cal Poly',         lat: 35.3050, lng: -120.6625 },
  { id: 'downtown-slo', label: 'Downtown SLO',     lat: 35.2796, lng: -120.6597 },
  { id: 'tech-park',    label: 'Airport',          lat: 35.2374, lng: -120.6418 },
  { id: 'french',       label: 'Adventist Health', lat: 35.2604, lng: -120.6469 },
  { id: 'cuesta',       label: 'Cuesta College',   lat: 35.3018, lng: -120.7372 },
  { id: 'remote',       label: 'I work remote',    remote: true },
];

export default function WorkLocationField({ label, value, onChange }) {
  const [query, setQuery] = useState(value?.label || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ctrlRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (value?.label !== query && value) setQuery(value.label || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open || !query || value?.remote) { setResults([]); return; }
    if (ctrlRef.current) ctrlRef.current.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const t = setTimeout(() => {
      geocodePlaces(query, { signal: ctrl.signal }).then(setResults);
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, open, value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pickPreset = (p) => {
    if (p.remote) {
      onChange({ remote: true, label: 'Remote' });
      setQuery('Remote');
    } else {
      onChange({ lat: p.lat, lng: p.lng, label: p.label });
      setQuery(p.label);
    }
    setOpen(false);
    setResults([]);
  };

  const pickResult = (r) => {
    onChange({ lat: r.lat, lng: r.lng, label: r.label });
    setQuery(r.label);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="form-group work-loc-field" ref={wrapRef}>
      <label>{label}</label>
      <input
        type="text"
        placeholder="Type an address…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <ul className="geo-suggestions">
          {results.map((r, i) => (
            <li key={i} onMouseDown={() => pickResult(r)}>{r.label}</li>
          ))}
        </ul>
      )}
      <div className="preset-chips">
        {PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            className={`chip ${value && (value.remote ? p.remote : value.label === p.label) ? 'active' : ''}`}
            onClick={() => pickPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
