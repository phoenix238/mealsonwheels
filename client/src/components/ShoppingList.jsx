import React, { useState } from 'react';
import { addToCart } from '../api.js';

export default function ShoppingList() {
  const [text, setText] = useState('');
  const [cartState, setCartState] = useState('idle');
  const [results, setResults] = useState(null);

  const handleAdd = async () => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;

    setCartState('loading');
    setResults(null);
    try {
      const items = lines.map(name => ({ name, quantity: 1 }));
      const result = await addToCart(items);
      setResults(result);
      setCartState(result.failed?.length ? 'partial' : 'done');
    } catch (e) {
      setCartState('error');
    }
  };

  return (
    <div style={{ padding: '20px 20px 32px' }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#2a1f0e', marginBottom: 5 }}>Shopping List</h2>
        <p style={{ fontSize: 13, color: '#9c8c7c', maxWidth: 480 }}>Paste your shopping list — one item per line — and we'll find them on Tesco and add them to your basket automatically.</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(42,31,14,.06)' }}>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setCartState('idle'); setResults(null); }}
          placeholder={'Milk\nEggs\nBread\nChicken breast\nBroccoli\n…'}
          rows={10}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d4ccc2', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#2a1f0e', outline: 'none', background: '#faf7f2', resize: 'vertical', lineHeight: 1.7 }}
        />
        {cartState === 'error' && (
          <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 8 }}>Failed to add items — check your Tesco session and try again.</p>
        )}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#9c8c7c' }}>
            {text.split('\n').filter(l => l.trim()).length} items
          </span>
          <button
            onClick={handleAdd}
            disabled={!text.trim() || cartState === 'loading'}
            style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#1f7a3d,#35a857)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: !text.trim() || cartState === 'loading' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: !text.trim() || cartState === 'loading' ? 0.5 : 1 }}
          >
            {cartState === 'loading' ? '↻ Adding to Tesco…' : cartState === 'error' ? '↻ Try Again' : '🛒 Add to Tesco Cart'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 4px rgba(42,31,14,.06)' }}>
          {results.added?.length > 0 && (
            <div style={{ marginBottom: results.failed?.length ? 14 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#1f7a3d', marginBottom: 8 }}>✓ Added ({results.added.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {results.added.map((name, i) => (
                  <span key={i} style={{ background: '#e8f3ed', color: '#1f7a3d', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>{name}</span>
                ))}
              </div>
            </div>
          )}
          {results.failed?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#c05a2a', marginBottom: 8 }}>✗ Not found ({results.failed.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {results.failed.map((f, i) => (
                  <span key={i} style={{ background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>{f.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
