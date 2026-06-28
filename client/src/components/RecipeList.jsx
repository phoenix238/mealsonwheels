import React, { useState, useRef, useEffect } from 'react';
import RecipeCard from './RecipeCard.jsx';
import { addToCart } from '../api.js';
import { useIsMobile } from '../hooks/useIsMobile.js';

const SIDEBAR_WIDTH = 268;

export default function RecipeList({ recipes, store }) {
  const [selected, setSelected] = useState(new Set());
  const [cartState, setCartState] = useState('idle');
  const [saveState, setSaveState] = useState('idle');
  const cartTimerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const isMobile = useIsMobile();
  const isInStore = store !== 'tesco';

  useEffect(() => () => {
    if (cartTimerRef.current) clearTimeout(cartTimerRef.current);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  if (!recipes.length) return null;

  const toggle = (i) => setSelected(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const toggleAll = () => {
    setSelected(selected.size === recipes.length ? new Set() : new Set(recipes.map((_, i) => i)));
  };

  const handleAddSelected = async () => {
    const selectedRecipes = recipes.filter((_, i) => selected.has(i));
    const quantityMap = new Map();
    selectedRecipes
      .flatMap(r => r.ingredients.filter(i => !i.in_pantry).map(i => ({ name: i.name, qty: 1 })))
      .forEach(({ name, qty }) => {
        quantityMap.set(name, Math.max(quantityMap.get(name) ?? 0, qty));
      });
    const items = Array.from(quantityMap.entries()).map(([name, quantity]) => ({ name, quantity }));

    if (!items.length) return;
    setCartState('loading');
    try {
      const result = await addToCart(items);
      setCartState(result.failed?.length ? 'partial' : 'done');
      if (cartTimerRef.current) clearTimeout(cartTimerRef.current);
      cartTimerRef.current = setTimeout(() => setCartState('idle'), 3000);
    } catch (e) {
      setCartState(e.code === 'TESCO_AUTH' ? 'auth' : 'idle');
      if (cartTimerRef.current) clearTimeout(cartTimerRef.current);
      cartTimerRef.current = setTimeout(() => setCartState('idle'), 4000);
    }
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      await fetch('/api/saved/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes }),
      });
      setSaveState('saved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('idle');
    }
  };

  return (
    <div style={{ paddingBottom: selected.size ? 72 : 0 }}>
      {/* Select all + save row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button
          onClick={toggleAll}
          style={{ fontSize: 12, color: '#6b5d4f', background: 'none', border: '1px solid #d4ccc2', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          {selected.size === recipes.length ? 'Deselect all' : 'Select all'}
        </button>
        {selected.size > 0 && (
          <span style={{ fontSize: 12, color: '#9c8c7c' }}>{selected.size} selected</span>
        )}
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: saveState === 'saved' ? '#1f7a3d' : '#fff', background: saveState === 'saved' ? '#e8f3ed' : '#1f7a3d', border: saveState === 'saved' ? '1px solid #1f7a3d' : 'none', borderRadius: 6, padding: '5px 13px', cursor: saveState === 'saving' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: saveState === 'saving' ? 0.6 : 1 }}
        >
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved!' : '💾 Save this plan'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: 14 }}>
        {recipes.map((r, i) => (
          <RecipeCard
            key={i}
            recipe={r}
            rank={i + 1}
            isBestValue={i === 0}
            selected={selected.has(i)}
            onToggle={() => toggle(i)}
          />
        ))}
      </div>

      {/* Sticky add-to-Tesco bar — not shown for Lidl/Morrisons */}
      {selected.size > 0 && !isInStore && (
        <div style={{ position: 'fixed', bottom: 0, left: isMobile ? 0 : SIDEBAR_WIDTH, right: 0, background: '#1f7a3d', padding: isMobile ? '12px 16px' : '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100, boxShadow: '0 -4px 20px rgba(31,122,61,.3)' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
            {selected.size} recipe{selected.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleAddSelected}
            disabled={cartState === 'loading'}
            style={{ background: '#fff', color: '#1f7a3d', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: cartState === 'loading' ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: cartState === 'loading' ? 0.7 : 1 }}
          >
            {cartState === 'loading' ? 'Adding to Tesco…' : cartState === 'done' ? '✓ Added!' : cartState === 'partial' ? '⚠ Partially added' : cartState === 'auth' ? '⚠ Signed out of Tesco' : '🛒 Add all to Tesco cart'}
          </button>
        </div>
      )}
    </div>
  );
}
