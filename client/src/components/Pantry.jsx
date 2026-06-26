import React, { useState } from 'react';
import { addPantryItem, removePantryItem } from '../api.js';

export default function Pantry({ pantry = [], setPantry }) {
  const [input, setInput] = useState('');
  const [addError, setAddError] = useState(null);
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!input.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const updated = await addPantryItem(input.trim());
      setPantry(updated);
      setInput('');
    } catch {
      setAddError('Failed to add item — try again.');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try {
      const updated = await removePantryItem(id);
      setPantry(updated);
    } catch {
      // Silently retry — don't block the UI for a delete failure
    }
  };

  return (
    <div style={{ padding: '20px 20px 32px' }}>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#2a1f0e', marginBottom: 5 }}>Your Pantry</h2>
        <p style={{ fontSize: 13, color: '#9c8c7c', maxWidth: 480 }}>Staples and condiments you always have. Claude excludes these from your shopping list automatically.</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', marginBottom: 22, boxShadow: '0 1px 4px rgba(42,31,14,.06)' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setAddError(null); }}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Add item… e.g. olive oil, cumin"
            style={{ flex: 1, padding: '9px 13px', border: '1px solid #d4ccc2', borderRadius: 6, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#2a1f0e', outline: 'none', background: '#faf7f2' }}
          />
          <button
            onClick={add}
            disabled={adding || !input.trim()}
            style={{ padding: '9px 18px', background: '#1f7a3d', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: adding || !input.trim() ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', opacity: adding || !input.trim() ? 0.6 : 1 }}
          >
            {adding ? '…' : '+ Add'}
          </button>
        </div>
        {addError && (
          <p style={{ fontSize: 12, color: '#b91c1c', marginTop: 6 }}>{addError}</p>
        )}
      </div>

      {pantry.length === 0 ? (
        <p style={{ fontSize: 13, color: '#b0a090', textAlign: 'center', padding: '32px 0' }}>No pantry items yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))', gap: 8 }}>
          {pantry.map(item => (
            <div key={item.id} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', boxShadow: '0 1px 3px rgba(42,31,14,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid #f0ebe3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ width: 7, height: 7, background: '#1f7a3d', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#2a1f0e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>{item.name}</span>
              </div>
              <button
                onClick={() => remove(item.id)}
                style={{ width: 20, height: 20, background: 'none', border: '1px solid #e0d8ce', borderRadius: 4, cursor: 'pointer', fontSize: 11, color: '#c09070', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
