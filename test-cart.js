/**
 * Cart logic test — run with: node test-cart.js
 * Tests ingredient parsing and deduplication without hitting Tesco.
 */

let pass = 0;
let fail = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.error(`  ✗ ${label}`);
    fail++;
  }
}

// ── Simulate the ingredient → cart item transformation ──────────────────────

function buildCartItems(recipes) {
  const quantityMap = new Map();
  recipes
    .flatMap(r => r.ingredients.filter(i => !i.in_pantry).map(i => ({ name: i.name, qty: 1 })))
    .forEach(({ name, qty }) => {
      quantityMap.set(name, Math.max(quantityMap.get(name) ?? 0, qty));
    });
  return Array.from(quantityMap.entries()).map(([name, quantity]) => ({ name, quantity }));
}

// ── Tests ───────────────────────────────────────────────────────────────────

console.log('\n1. Cooking quantity is NOT used as shopping quantity');
{
  const recipes = [{
    ingredients: [
      { name: 'Tesco Baby Plum Tomatoes 300G', qty: '300', unit: 'g', price: 0.75, in_pantry: false, on_deal: true },
      { name: 'Tesco Closed Cup Mushrooms 400G', qty: '400', unit: 'g', price: 0.99, in_pantry: false, on_deal: true },
    ]
  }];
  const items = buildCartItems(recipes);
  assert('Tomatoes quantity is 1 (not 300)', items.find(i => i.name.includes('Tomato'))?.quantity === 1);
  assert('Mushrooms quantity is 1 (not 400)', items.find(i => i.name.includes('Mushroom'))?.quantity === 1);
}

console.log('\n2. Pantry items are excluded');
{
  const recipes = [{
    ingredients: [
      { name: 'Olive oil', qty: '2', unit: 'tbsp', price: 0, in_pantry: true },
      { name: 'Tesco Eggs 12 Pack', qty: '12', unit: 'pack', price: 2.50, in_pantry: false },
    ]
  }];
  const items = buildCartItems(recipes);
  assert('Olive oil excluded (pantry)', !items.find(i => i.name.includes('oil')));
  assert('Eggs included', !!items.find(i => i.name.includes('Eggs')));
  assert('Only 1 item in cart', items.length === 1);
}

console.log('\n3. Duplicate ingredients across recipes are deduped');
{
  const recipes = [
    { ingredients: [{ name: 'Tesco Chicken Breast 600G', qty: '300', unit: 'g', price: 4.50, in_pantry: false }] },
    { ingredients: [{ name: 'Tesco Chicken Breast 600G', qty: '600', unit: 'g', price: 4.50, in_pantry: false }] },
  ];
  const items = buildCartItems(recipes);
  assert('Chicken appears only once', items.filter(i => i.name.includes('Chicken')).length === 1);
  assert('Quantity is still 1', items.find(i => i.name.includes('Chicken'))?.quantity === 1);
}

console.log('\n4. Price parsing — £-prefixed values');
{
  const parsePrice = v => parseFloat(String(v ?? '').replace(/^£/, '')) || 99;
  assert('£1.50 parses to 1.5', parsePrice('£1.50') === 1.5);
  assert('1.50 parses to 1.5', parsePrice('1.50') === 1.5);
  assert('null falls back to 99', parsePrice(null) === 99);
  assert('undefined falls back to 99', parsePrice(undefined) === 99);
  assert('"" falls back to 99', parsePrice('') === 99);
}

console.log('\n5. JSON parse safety (db layer simulation)');
{
  const safeParseArray = (str) => { try { return JSON.parse(str || '[]'); } catch { return []; } };
  assert('Valid JSON parses', JSON.stringify(safeParseArray('["vegan","gluten-free"]')) === '["vegan","gluten-free"]');
  assert('Corrupted JSON returns []', JSON.stringify(safeParseArray('{broken}')) === '[]');
  assert('Empty string returns []', JSON.stringify(safeParseArray('')) === '[]');
  assert('null returns []', JSON.stringify(safeParseArray(null)) === '[]');
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${pass + fail} tests: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
