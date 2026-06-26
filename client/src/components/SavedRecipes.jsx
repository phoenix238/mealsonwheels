import React, { useEffect, useState } from 'react';
import { fetchSaved, addToCart } from '../api.js';

const costColor = (cost) => cost < 3 ? '#1f7a3d' : cost < 5 ? '#d4892a' : '#c05a2a';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'cheap', label: 'Under £3' },
];

export default function SavedRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [cartAdded, setCartAdded] = useState({});
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    setLoading(true);
    fetchSaved()
      .then(setRecipes)
      .finally(() => setLoading(false));
  }, []);

  const filtered = recipes.filter(r => {
    if (filter === 'vegetarian') return r.diet?.includes('vegetarian');
    if (filter === 'cheap') return (r.estimated_cost ?? 0) < 3;
    return true;
  });

  const handleAddToCart = async (recipe) => {
    const items = recipe.ingredients?.filter(i => !i.in_pantry).map(i => ({ name: i.name, quantity: parseInt(i.qty) || 1 })) ?? [];
    if (!items.length) return;
    setCartAdded(p => ({ ...p, [recipe.id]: 'loading' }));
    try {
      await addToCart(items);
      setCartAdded(p => ({ ...p, [recipe.id]: 'done' }));
    } catch {
      setCartAdded(p => ({ ...p, [recipe.id]: 'idle' }));
    }
  };

  const toggleExpanded = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ padding: '20px 20px 32px' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#2a1f0e', marginBottom: 5 }}>Saved Recipes</h2>
          <p style={{ fontSize: 13, color: '#9c8c7c' }}>Your recipe history — re-add any week's haul to your Tesco cart.</p>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{ padding: '5px 13px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", background: filter === f.id ? '#1f7a3d' : '#fff', color: filter === f.id ? '#fff' : '#2a1f0e', border: filter === f.id ? '1px solid #1f7a3d' : '1px solid #d4ccc2' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: '#9c8c7c' }}>
          <div style={{ width: 24, height: 24, border: '3px solid #d4ccc2', borderTopColor: '#1f7a3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p style={{ fontSize: 13, color: '#b0a090', textAlign: 'center', padding: '40px 0' }}>No saved recipes yet. Generate some from the Recipes tab!</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(r => {
          const cc = costColor(r.estimated_cost ?? 0);
          const state = cartAdded[r.id] ?? 'idle';
          const isExpanded = expanded[r.id] ?? false;
          return (
            <div key={r.id} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(42,31,14,.06)', overflow: 'hidden', border: '1px solid #f0ebe3' }}>
              <div style={{ display: 'flex' }}>
                <div style={{ width: 5, background: cc, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600, color: '#2a1f0e', marginBottom: 3 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: '#9c8c7c', display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {r.created_at && <span>{formatDate(r.created_at)}</span>}
                      {r.cuisine && <><span style={{ color: '#d4ccc2' }}>·</span><span>{r.cuisine}</span></>}
                      {r.servings && <><span style={{ color: '#d4ccc2' }}>·</span><span>Serves {r.servings}</span></>}
                      {r.cook_time && <><span style={{ color: '#d4ccc2' }}>·</span><span>{r.cook_time}</span></>}
                      <span style={{ color: '#d4ccc2' }}>·</span><span style={{ fontWeight: 600, color: cc }}>£{(r.estimated_cost ?? 0).toFixed(2)}</span>
                    </div>
                    {r.diet?.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {r.diet.map(d => (
                          <span key={d} style={{ background: '#eef5f0', color: '#2a7a50', fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 4, textTransform: 'capitalize' }}>{d}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => handleAddToCart(r)}
                      disabled={state === 'loading' || state === 'done'}
                      style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: state === 'done' ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', background: state === 'done' ? '#e8f3ed' : '#1f7a3d', color: state === 'done' ? '#1f7a3d' : '#fff', border: state === 'done' ? '1px solid #1f7a3d' : 'none', opacity: state === 'loading' ? 0.6 : 1 }}
                    >
                      {state === 'done' ? '✓ In Cart' : state === 'loading' ? 'Adding…' : '+ Add to Cart'}
                    </button>
                    <button
                      onClick={() => toggleExpanded(r.id)}
                      style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e8e0d4', background: '#faf7f2', cursor: 'pointer', fontSize: 11, color: '#9c8c7c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid #f0ebe3', background: '#faf7f2', padding: '14px 16px 14px 21px' }}>
                  {(!r.ingredients || r.ingredients.length === 0) ? (
                    <p style={{ fontSize: 12, color: '#b0a090' }}>No ingredient details available.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#9c8c7c', marginBottom: 8 }}>Ingredients</div>
                        {r.ingredients.map((ing, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #ede8e0', fontSize: 12, gap: 6 }}>
                            <span style={{ color: '#2a1f0e', flex: 1 }}>
                              {ing.qty} {ing.unit ? `${ing.unit} ` : ''}{ing.name}
                              {ing.in_pantry && <span style={{ marginLeft: 4, background: '#f5f0e8', color: '#8c7b65', fontSize: 9, fontWeight: 500, padding: '1px 5px', borderRadius: 3 }}>Pantry</span>}
                              {ing.on_deal && !ing.in_pantry && <span style={{ marginLeft: 4, background: '#e8f3ed', color: '#1f7a3d', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>Deal</span>}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: ing.in_pantry ? '#b0a090' : ing.on_deal ? '#1f7a3d' : '#2a1f0e', minWidth: 34, textAlign: 'right' }}>
                              {ing.in_pantry ? '—' : `£${(ing.price ?? 0).toFixed(2)}`}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#9c8c7c', marginBottom: 8 }}>Method</div>
                        <p style={{ fontSize: 12, color: '#3a2d1e', lineHeight: 1.75 }}>{r.instructions}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
