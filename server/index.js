import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getDeals, getClubcardDeals, searchIngredient, addToCart, closeBrowser, openLoginPage, checkSessionAlive } from './tesco.js';
import { getLidlDeals } from './lidl.js';
import { getMorrisonsDeals } from './morrisons.js';
import { generateRecipes } from './claude.js';
import { saveRecipe, getSavedRecipes, getPantry, addPantryItem, removePantryItem, deleteRecipe } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// ── Tesco routes ──────────────────────────────────────────────────────────────

app.get('/api/tesco/status', async (req, res) => {
  try {
    const alive = await checkSessionAlive();
    res.json({ authenticated: alive });
  } catch {
    res.json({ authenticated: false });
  }
});

app.post('/api/tesco/login', async (req, res) => {
  try {
    await openLoginPage();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tesco/deals', async (req, res) => {
  try {
    const deals = await getDeals();
    res.json(deals);
  } catch (err) {
    if (err.code === 'TESCO_AUTH') return res.status(401).json({ error: err.message });
    if (err.code === 'TESCO_CAPTCHA') return res.status(503).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tesco/clubcard-deals', async (req, res) => {
  try {
    const deals = await getClubcardDeals();
    res.json(deals);
  } catch (err) {
    if (err.code === 'TESCO_AUTH') return res.status(401).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tesco/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q param required' });
  try {
    const results = await searchIngredient(q);
    res.json(results);
  } catch (err) {
    if (err.code === 'TESCO_AUTH') return res.status(401).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tesco/cart', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  try {
    const result = await addToCart(items.filter(i => i.name));
    res.json(result);
  } catch (err) {
    if (err.code === 'TESCO_AUTH') return res.status(401).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── Lidl routes ───────────────────────────────────────────────────────────────

app.get('/api/lidl/deals', async (req, res) => {
  try {
    const deals = await getLidlDeals();
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Morrisons routes ──────────────────────────────────────────────────────────

app.get('/api/morrisons/deals', async (req, res) => {
  try {
    const deals = await getMorrisonsDeals();
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Recipe routes ─────────────────────────────────────────────────────────────

app.post('/api/recipes', async (req, res) => {
  const { deals = [], dietary, cuisine, count = 5, userPrompt, store = 'tesco' } = req.body;
  if (!userPrompt && !cuisine) return res.status(400).json({ error: 'cuisine or userPrompt is required' });

  try {
    const pantry = getPantry();
    const recipes = await generateRecipes({ deals, pantry, dietary, cuisine, count, userPrompt, store });
    res.json(recipes);
  } catch (err) {
    console.error('Recipe generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/saved', (req, res) => {
  const { diet, maxCost } = req.query;
  res.json(getSavedRecipes({ diet, maxCost: maxCost ? parseFloat(maxCost) : undefined }));
});

app.post('/api/save', (req, res) => {
  const { recipe } = req.body;
  if (!recipe?.name) return res.status(400).json({ error: 'recipe.name required' });
  saveRecipe(recipe);
  res.json({ ok: true });
});

app.post('/api/saved/batch', (req, res) => {
  const { recipes } = req.body;
  if (!Array.isArray(recipes)) return res.status(400).json({ error: 'recipes array required' });
  for (const recipe of recipes) saveRecipe(recipe);
  res.json({ ok: true, count: recipes.length });
});

app.delete('/api/saved/:id', (req, res) => {
  deleteRecipe(parseInt(req.params.id, 10));
  res.json({ ok: true });
});

// ── Pantry routes ─────────────────────────────────────────────────────────────

app.get('/api/pantry', (req, res) => res.json(getPantry()));

app.post('/api/pantry', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  addPantryItem(name);
  res.json(getPantry());
});

app.delete('/api/pantry/:id', (req, res) => {
  removePantryItem(parseInt(req.params.id, 10));
  res.json(getPantry());
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

process.on('SIGINT', async () => { await closeBrowser(); process.exit(0); });
process.on('SIGTERM', async () => { await closeBrowser(); process.exit(0); });
