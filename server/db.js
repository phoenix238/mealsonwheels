import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, '..', 'recipes.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cuisine TEXT,
    diet TEXT,
    estimated_cost REAL,
    ingredients TEXT,
    instructions TEXT,
    servings INTEGER,
    cook_time TEXT,
    updated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pantry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try { db.exec(`ALTER TABLE recipes ADD COLUMN servings INTEGER`); } catch {}
try { db.exec(`ALTER TABLE recipes ADD COLUMN cook_time TEXT`); } catch {}
try { db.exec(`ALTER TABLE recipes ADD COLUMN updated_at DATETIME`); } catch {}

export const saveRecipe = (recipe) => {
  const stmt = db.prepare(`
    INSERT INTO recipes (name, cuisine, diet, estimated_cost, ingredients, instructions, servings, cook_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    recipe.name,
    recipe.cuisine ?? null,
    JSON.stringify(recipe.diet ?? []),
    recipe.estimated_cost ?? 0,
    JSON.stringify(recipe.ingredients ?? []),
    recipe.instructions ?? '',
    recipe.servings ?? null,
    recipe.cook_time ?? null
  );
};

export const getSavedRecipes = ({ diet, maxCost } = {}) => {
  let query = 'SELECT * FROM recipes';
  const conditions = [];
  const params = [];

  if (diet && diet !== 'none') {
    conditions.push(`diet LIKE ?`);
    params.push(`%${diet}%`);
  }
  if (maxCost != null) {
    conditions.push(`estimated_cost <= ?`);
    params.push(maxCost);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params);
  return rows.map(row => ({
    ...row,
    diet: (() => { try { return JSON.parse(row.diet || '[]'); } catch { return []; } })(),
    ingredients: (() => { try { return JSON.parse(row.ingredients || '[]'); } catch { return []; } })(),
  }));
};

export const getPantry = () => db.prepare('SELECT * FROM pantry ORDER BY name').all();

export const addPantryItem = (name) => {
  db.prepare('INSERT OR IGNORE INTO pantry (name) VALUES (?)').run(name.trim().toLowerCase());
  return getPantry();
};

export const removePantryItem = (id) => {
  db.prepare('DELETE FROM pantry WHERE id = ?').run(id);
  return getPantry();
};

export const deleteRecipe = (id) => {
  db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
};

export default db;
