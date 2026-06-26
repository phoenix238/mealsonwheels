import React, { useState } from 'react';

const DIETS = [
  { id: 'none', label: 'All' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'GF' },
];
const CUISINES = ['Random', 'Italian', 'Asian', 'Mexican', 'Middle Eastern', 'British', 'Mediterranean'];

export default function FilterBar({ onChange }) {
  const [dietary, setDietary] = useState('none');
  const [count, setCount] = useState(5);
  const [cuisine, setCuisine] = useState('Random');

  const update = (patch) => {
    const next = { dietary, cuisine: { mode: 'single', style: cuisine }, count, ...patch };
    if (patch.cuisine) next.cuisine = { mode: 'single', style: patch.cuisine };
    onChange(next);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 4px rgba(42,31,14,.07)', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>

      {/* Dietary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#9c8c7c' }}>Dietary</label>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {DIETS.map(d => (
            <button
              key={d.id}
              onClick={() => { setDietary(d.id); update({ dietary: d.id }); }}
              style={{
                padding: '5px 13px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                background: dietary === d.id ? '#1f7a3d' : '#fff',
                color: dietary === d.id ? '#fff' : '#2a1f0e',
                border: dietary === d.id ? '1px solid #1f7a3d' : '1px solid #d4ccc2',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipes count */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 150, flex: 1, maxWidth: 210 }}>
        <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#9c8c7c' }}>Recipes — {count}</label>
        <input
          type="range" min={1} max={7} value={count}
          onChange={e => { const v = parseInt(e.target.value, 10); setCount(v); update({ count: v }); }}
        />
      </div>

      {/* Cuisine */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#9c8c7c' }}>Cuisine</label>
        <select
          value={cuisine}
          onChange={e => { setCuisine(e.target.value); update({ cuisine: e.target.value }); }}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d4ccc2', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#2a1f0e', background: '#fff', cursor: 'pointer', outline: 'none' }}
        >
          {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}
