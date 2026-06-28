import React, { useState, useEffect, useMemo } from 'react';

const CATEGORY_ORDER = ['produce', 'meat', 'dairy', 'bakery', 'frozen', 'tins', 'dry', 'other'];

const CATEGORIES = {
  produce: {
    label: '🥦 Produce',
    keywords: ['tomato', 'lettuce', 'carrot', 'onion', 'garlic', 'pepper', 'broccoli', 'spinach', 'cucumber', 'courgette', 'leek', 'potato', 'sweet potato', 'mushroom', 'celery', 'avocado', 'lime', 'lemon', 'orange', 'apple', 'banana', 'berry', 'fruit', 'veg', 'salad', 'cabbage', 'kale', 'cauliflower', 'aubergine', 'ginger', 'spring onion', 'chilli', 'herb', 'coriander', 'basil', 'parsley', 'mint', 'thyme', 'rosemary'],
  },
  meat: {
    label: '🥩 Meat & Fish',
    keywords: ['chicken', 'beef', 'pork', 'lamb', 'mince', 'steak', 'bacon', 'sausage', 'turkey', 'fish', 'salmon', 'tuna', 'cod', 'prawn', 'shrimp', 'mackerel', 'sardine', 'anchovy', 'duck', 'venison', 'ham', 'chorizo'],
  },
  dairy: {
    label: '🥛 Dairy & Eggs',
    keywords: ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'egg', 'creme fraiche', 'soured cream', 'mozzarella', 'cheddar', 'parmesan', 'feta', 'brie', 'camembert'],
  },
  bakery: {
    label: '🍞 Bakery',
    keywords: ['bread', 'roll', 'tortilla', 'wrap', 'pita', 'pitta', 'naan', 'bagel', 'bun', 'baguette', 'ciabatta'],
  },
  frozen: {
    label: '❄️ Frozen',
    keywords: ['frozen'],
  },
  tins: {
    label: '🥫 Tins & Jars',
    keywords: ['tin', 'tinned', 'canned', 'can of', 'jar', 'passata', 'baked bean', 'chickpea', 'lentil', 'kidney bean', 'coconut milk', 'chopped tomato'],
  },
  dry: {
    label: '🌾 Dry Goods & Sauces',
    keywords: ['pasta', 'rice', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'stock', 'noodle', 'oat', 'cereal', 'spice', 'seasoning', 'salt', 'cumin', 'paprika', 'turmeric', 'oregano', 'soy sauce', 'fish sauce', 'worcestershire', 'mustard', 'ketchup', 'mayonnaise', 'honey', 'syrup', 'dried'],
  },
};

function categorise(name) {
  const lower = name.toLowerCase();
  if (lower.includes('frozen')) return 'frozen';
  for (const [key, { keywords }] of Object.entries(CATEGORIES)) {
    if (keywords.some(k => lower.includes(k))) return key;
  }
  return 'other';
}

function consolidateIngredients(recipes) {
  const map = new Map();
  for (const recipe of recipes) {
    for (const ing of (recipe.ingredients ?? [])) {
      if (ing.in_pantry) continue;
      const key = ing.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { name: ing.name, qty: ing.qty ?? '', unit: ing.unit ?? '', price: ing.price ?? 0 });
      }
    }
  }
  return [...map.values()];
}

function buildGroups(recipes) {
  const items = consolidateIngredients(recipes);
  const grouped = {};
  for (const item of items) {
    const cat = categorise(item.name);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  return CATEGORY_ORDER
    .filter(k => grouped[k])
    .map(k => ({ key: k, label: CATEGORIES[k]?.label ?? '📦 Other', items: grouped[k] }));
}

function formatItem(item) {
  const parts = [item.qty, item.unit].filter(v => v && String(v).trim()).join(' ');
  return parts ? `${item.name} (${parts})` : item.name;
}

const STORE_NAMES = { lidl: 'Lidl', morrisons: 'Morrisons' };

export default function InStoreList({ recipes, store }) {
  const storeName = STORE_NAMES[store] ?? 'Store';
  const groups = useMemo(() => buildGroups(recipes), [recipes]);
  const totalItems = useMemo(() => groups.reduce((s, g) => s + g.items.length, 0), [groups]);

  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('shopping-checked') ?? '{}'); } catch { return {}; }
  });
  const [shared, setShared] = useState(false);

  useEffect(() => {
    localStorage.setItem('shopping-checked', JSON.stringify(checked));
  }, [checked]);

  const toggle = (key) => setChecked(c => ({ ...c, [key]: !c[key] }));
  const clearAll = () => setChecked({});

  const doneItems = groups.reduce((s, g) => s + g.items.filter(i => checked[i.name.toLowerCase().trim()]).length, 0);

  const listText = [
    `🛒 Shopping List — ${storeName}`,
    '',
    ...groups.flatMap(g => [
      g.label,
      ...g.items.map(i => `  □ ${formatItem(i)}`),
      '',
    ]),
  ].join('\n').trim();

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Shopping List — ${storeName}`, text: listText });
      } else {
        await navigator.clipboard.writeText(listText);
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      }
    } catch {}
  };

  if (recipes.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#b0a090' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🛍️</div>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>Generate some recipes first,<br />then your in-store list will appear here.</p>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#1f7a3d' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
        <p style={{ fontSize: 14 }}>Everything is already in your pantry!</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 16px 64px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 600, color: '#2a1f0e', margin: 0 }}>
            {storeName} Shopping List
          </h2>
          <p style={{ fontSize: 12, color: '#9c8c7c', margin: '3px 0 0' }}>
            {doneItems} of {totalItems} items ticked off
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {doneItems > 0 && (
            <button
              onClick={clearAll}
              style={{ padding: '8px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontFamily: "'DM Sans', sans-serif" }}
            >
              Clear
            </button>
          )}
          <button
            onClick={share}
            style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#1f7a3d,#35a857)', color: '#fff', border: 'none', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          >
            {shared ? '✓ Copied!' : '📤 Share List'}
          </button>
        </div>
      </div>

      <div style={{ height: 6, background: '#ede8e0', borderRadius: 3, marginBottom: 22, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg,#1f7a3d,#35a857)',
          borderRadius: 3,
          width: `${totalItems > 0 ? (doneItems / totalItems) * 100 : 0}%`,
          transition: 'width .3s',
        }} />
      </div>

      {groups.map(group => (
        <div key={group.key} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6b5d4f', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            {group.label}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(42,31,14,.06)' }}>
            {group.items.map((item, i) => {
              const key = item.name.toLowerCase().trim();
              const done = !!checked[key];
              return (
                <div
                  key={i}
                  onClick={() => toggle(key)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '14px 16px',
                    borderBottom: i < group.items.length - 1 ? '1px solid #f0ebe3' : 'none',
                    cursor: 'pointer', gap: 14, userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    border: done ? '2px solid #1f7a3d' : '2px solid #d4ccc2',
                    background: done ? '#1f7a3d' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s',
                  }}>
                    {done && <span style={{ color: '#fff', fontSize: 14, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{
                    fontSize: 15, flex: 1, lineHeight: 1.4,
                    color: done ? '#b0a090' : '#2a1f0e',
                    textDecoration: done ? 'line-through' : 'none',
                    transition: 'all .15s',
                  }}>
                    {formatItem(item)}
                  </span>
                  {item.price > 0 && (
                    <span style={{ fontSize: 12, color: '#9c8c7c', flexShrink: 0 }}>~£{item.price.toFixed(2)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {doneItems === totalItems && totalItems > 0 && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#1f7a3d' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>All done! Happy cooking.</p>
        </div>
      )}
    </div>
  );
}
