const BASE = '/api';

async function apiFetch(url, options = {}) {
  const r = await fetch(url, options);
  const data = await r.json();
  if (!r.ok) {
    if (r.status === 401) window.dispatchEvent(new Event('tesco-auth-error'));
    throw Object.assign(new Error(data.error || `HTTP ${r.status}`), { status: r.status });
  }
  return data;
}

export const fetchDeals = () => apiFetch(`${BASE}/tesco/deals`);
export const fetchClubcardDeals = () => apiFetch(`${BASE}/tesco/clubcard-deals`);
export const fetchLidlDeals = () => apiFetch(`${BASE}/lidl/deals`);
export const fetchMorrisonsDeals = () => apiFetch(`${BASE}/morrisons/deals`);

export const generateRecipes = (payload) =>
  apiFetch(`${BASE}/recipes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const addToCart = (items) =>
  apiFetch(`${BASE}/tesco/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

export const fetchSaved = (params = {}) => {
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)));
  return apiFetch(`${BASE}/saved?${qs}`);
};

export const fetchPantry = () => apiFetch(`${BASE}/pantry`);

export const addPantryItem = (name) =>
  apiFetch(`${BASE}/pantry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

export const removePantryItem = (id) =>
  apiFetch(`${BASE}/pantry/${id}`, { method: 'DELETE' });

export const checkTescoStatus = () => apiFetch(`${BASE}/tesco/status`);
export const openTescoLogin = () => apiFetch(`${BASE}/tesco/login`, { method: 'POST' });

export const saveBatch = (recipes) =>
  apiFetch(`${BASE}/saved/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipes }),
  });

export const deleteRecipe = (id) => apiFetch(`${BASE}/saved/${id}`, { method: 'DELETE' });
