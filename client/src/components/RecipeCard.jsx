import React, { useState, useRef, useEffect } from 'react';
import { addToCart } from '../api.js';

const costColor = (cost) => cost < 3 ? '#1f7a3d' : cost < 5 ? '#d4892a' : '#c05a2a';

export default function RecipeCard({ recipe, rank, isBestValue, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [cartState, setCartState] = useState('idle');
  const [pantryOverrides, setPantryOverrides] = useState(new Set()); // pantry items to include
  const [cartRemovals, setCartRemovals] = useState(new Set());       // non-pantry items to skip
  const timerRef = useRef(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const shoppingItems = recipe.ingredients
    .filter(i => (!i.in_pantry && !cartRemovals.has(i.name)) || pantryOverrides.has(i.name))
    .map(i => ({ name: i.name, quantity: 1 }));

  const handleAddToCart = async () => {
    if (!shoppingItems.length) return;
    setCartState('loading');
    try {
      const result = await addToCart(shoppingItems);
      setCartState(result.failed?.length ? 'partial' : 'done');
    } catch (e) {
      setCartState(e.code === 'TESCO_AUTH' ? 'auth' : 'idle');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCartState('idle'), 4000);
    }
  };

  const cc = costColor(recipe.estimated_cost ?? 0);

  return (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(42,31,14,.08), 0 0 0 1px rgba(42,31,14,.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Colour bar / checkbox */}
        <div
          onClick={onToggle}
          style={{ width: 36, background: selected ? '#1f7a3d' : cc, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .15s' }}
        >
          {selected && <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>✓</span>}
        </div>
        <div style={{ flex: 1, padding: '14px 16px' }}>
          {isBestValue && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fffbe6', color: '#8a6b00', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, marginBottom: 8 }}>
              🏆 Best Value
            </div>
          )}
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: '#2a1f0e', marginBottom: 3, lineHeight: 1.3 }}>{recipe.name}</div>
          <div style={{ fontSize: 12, color: '#9c8c7c', marginBottom: 9, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{recipe.cuisine}</span>
            {recipe.servings && <><span style={{ color: '#d4ccc2' }}>·</span><span>Serves {recipe.servings}</span></>}
            {recipe.cook_time && <><span style={{ color: '#d4ccc2' }}>·</span><span>{recipe.cook_time}</span></>}
          </div>

          {recipe.diet?.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
              {recipe.diet.map(d => (
                <span key={d} style={{ background: '#eef5f0', color: '#2a7a50', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize' }}>{d}</span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #f0ebe3', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontSize: 21, fontWeight: 700, color: cc, lineHeight: 1 }}>£{(recipe.estimated_cost ?? 0).toFixed(2)}</span>
              <div style={{ fontSize: 11, color: '#9c8c7c', marginTop: 1 }}>
                {recipe.ingredients?.filter(i => i.on_deal).length ?? 0} on deal
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={handleAddToCart}
                disabled={cartState === 'loading' || cartState === 'done' || !shoppingItems.length}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  cursor: cartState === 'done' || !shoppingItems.length ? 'default' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                  background: cartState === 'done' ? '#e8f3ed' : cartState === 'partial' ? '#fef3c7' : '#1f7a3d',
                  color: cartState === 'done' ? '#1f7a3d' : cartState === 'partial' ? '#92400e' : '#fff',
                  border: cartState === 'done' ? '1px solid #1f7a3d' : cartState === 'partial' ? '1px solid #f59e0b' : 'none',
                  opacity: cartState === 'loading' || !shoppingItems.length ? 0.5 : 1,
                }}
              >
                {cartState === 'loading' ? 'Adding…' : cartState === 'done' ? '✓ In Cart' : cartState === 'partial' ? '⚠ Partial' : cartState === 'auth' ? '⚠ Signed out' : 'Add to Cart'}
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e8e0d4', background: '#faf7f2', cursor: 'pointer', fontSize: 11, color: '#9c8c7c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                {expanded ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #f0ebe3', background: '#faf7f2', padding: '14px 16px 14px 21px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#9c8c7c', marginBottom: 8 }}>Ingredients</div>
            {recipe.ingredients?.map((ing, i) => {
              const overridden = pantryOverrides.has(ing.name);
              return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #ede8e0', fontSize: 12, gap: 6 }}>
                <span style={{ color: '#2a1f0e', flex: 1, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  {ing.qty} {ing.unit ? `${ing.unit} ` : ''}{ing.name}
                  {ing.in_pantry && !overridden && (
                    <>
                      <span style={{ background: '#f5f0e8', color: '#8c7b65', fontSize: 9, fontWeight: 500, padding: '1px 5px', borderRadius: 3 }}>Pantry</span>
                      <button
                        onClick={() => setPantryOverrides(prev => new Set([...prev, ing.name]))}
                        title="Add to cart anyway"
                        style={{ background: 'none', border: '1px solid #d4ccc2', borderRadius: 4, color: '#6b5d4f', fontSize: 11, lineHeight: 1, padding: '1px 5px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                      >+</button>
                    </>
                  )}
                  {ing.in_pantry && overridden && <span style={{ background: '#e8f3ed', color: '#1f7a3d', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>Adding</span>}
                  {!ing.in_pantry && !cartRemovals.has(ing.name) && (
                    <>
                      {ing.on_deal && <span style={{ background: '#e8f3ed', color: '#1f7a3d', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>Deal</span>}
                      <button
                        onClick={() => setCartRemovals(prev => new Set([...prev, ing.name]))}
                        title="I already have this"
                        style={{ background: 'none', border: '1px solid #d4ccc2', borderRadius: 4, color: '#6b5d4f', fontSize: 11, lineHeight: 1, padding: '1px 5px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                      >−</button>
                    </>
                  )}
                  {!ing.in_pantry && cartRemovals.has(ing.name) && (
                    <span style={{ background: '#f5f0e8', color: '#8c7b65', fontSize: 9, fontWeight: 500, padding: '1px 5px', borderRadius: 3, cursor: 'pointer' }}
                      onClick={() => setCartRemovals(prev => { const n = new Set(prev); n.delete(ing.name); return n; })}
                      title="Click to re-add"
                    >Skipping ×</span>
                  )}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: (ing.in_pantry && !overridden) || cartRemovals.has(ing.name) ? '#b0a090' : ing.on_deal ? '#1f7a3d' : '#2a1f0e', minWidth: 34, textAlign: 'right' }}>
                  {(ing.in_pantry && !overridden) || cartRemovals.has(ing.name) ? '—' : `£${(ing.price ?? 0).toFixed(2)}`}
                </span>
              </div>
            );})}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#9c8c7c', marginBottom: 8 }}>Method</div>
            <p style={{ fontSize: 12, color: '#3a2d1e', lineHeight: 1.75 }}>{recipe.instructions}</p>
          </div>
        </div>
      )}
    </div>
  );
}
