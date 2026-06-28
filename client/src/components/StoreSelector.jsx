import React from 'react';

const STORES = [
  { id: 'tesco', label: 'Tesco', color: '#1f7a3d', light: '#e8f3ed', border: '#1f7a3d' },
  { id: 'lidl', label: 'Lidl', color: '#0050aa', light: '#e8eef7', border: '#0050aa' },
  { id: 'morrisons', label: 'Morrisons', color: '#9a6c00', light: '#fef8e7', border: '#f4a800' },
];

export default function StoreSelector({ store, setStore, isMobile }) {
  return (
    <div style={{ display: 'flex', gap: isMobile ? 6 : 5, alignItems: 'center' }}>
      {!isMobile && (
        <span style={{ fontSize: 11, color: '#9c8c7c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px', marginRight: 3 }}>Store</span>
      )}
      {STORES.map(s => (
        <button
          key={s.id}
          onClick={() => setStore(s.id)}
          style={{
            padding: isMobile ? '6px 10px' : '5px 11px',
            borderRadius: 20,
            fontSize: isMobile ? 13 : 12,
            fontWeight: store === s.id ? 700 : 500,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            background: store === s.id ? s.light : 'transparent',
            color: store === s.id ? s.color : '#6b5d4f',
            border: store === s.id ? `1.5px solid ${s.border}` : '1.5px solid #d4ccc2',
            transition: 'all .15s',
            flexShrink: 0,
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
