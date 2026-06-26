import React, { useState, useEffect, useRef } from 'react';
import DealsPanel from './components/DealsPanel.jsx';
import ChatInput from './components/ChatInput.jsx';
import RecipeList from './components/RecipeList.jsx';
import Pantry from './components/Pantry.jsx';
import SavedRecipes from './components/SavedRecipes.jsx';
import ShoppingList from './components/ShoppingList.jsx';
import { generateRecipes, fetchPantry, checkTescoStatus, openTescoLogin } from './api.js';

const refreshPantry = (setPantry) => fetchPantry().then(setPantry).catch(() => {});
import { SIDEBAR_WIDTH } from './constants.js';

const TABS = ['Recipes', 'Shopping List', 'Pantry', 'Saved'];

export default function App() {
  const [tab, setTab] = useState('Recipes');
  const [deals, setDeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pantry, setPantry] = useState([]);
  const [tescoStatus, setTescoStatus] = useState('unknown');
  const errorTimerRef = useRef(null);

  useEffect(() => {
    fetchPantry().then(setPantry).catch(() => {});
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const { authenticated } = await checkTescoStatus();
        // null = browser not yet launched (not the same as signed out)
        setTescoStatus(authenticated === null ? 'unknown' : authenticated ? 'ok' : 'expired');
      } catch {
        setTescoStatus('unknown');
      }
    };
    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = () => setTescoStatus('expired');
    window.addEventListener('tesco-auth-error', handler);
    return () => window.removeEventListener('tesco-auth-error', handler);
  }, []);

  const showError = (msg) => {
    setError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setError(null), 8000);
  };

  useEffect(() => () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); }, []);

  const handleGenerate = async (userPrompt) => {
    setLoading(true);
    setError(null);
    setRecipes([]);
    try {
      const data = await generateRecipes({ deals, userPrompt });
      setRecipes(data);
      setTab('Recipes');
    } catch (e) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = recipes.reduce((s, r) => s + (r.estimated_cost ?? 0), 0);

  const dotColor = tescoStatus === 'ok' ? '#1f7a3d' : tescoStatus === 'expired' ? '#f59e0b' : '#d4ccc2';
  const dotTitle = tescoStatus === 'ok' ? 'Tesco: logged in' : tescoStatus === 'expired' ? 'Tesco: session expired' : 'Tesco: checking…';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#faf7f2' }}>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #ede8e0', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 0 #ede8e0, 0 4px 16px rgba(42,31,14,.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 42, height: 42, background: 'linear-gradient(145deg,#1a6e35,#2db356)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: '0 3px 10px rgba(31,122,61,.28)' }}>🍃</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: '#1a1208', letterSpacing: '-.3px', lineHeight: 1.2 }}>Tesco Recipe Planner</div>
            <div style={{ fontSize: 11, color: '#a89880', letterSpacing: '.2px' }}>Smart deals · AI recipes · One-click cart</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              title={dotTitle}
              style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dotColor, transition: 'background .3s' }}
            />
            <button
              onClick={async () => {
                try { await openTescoLogin(); } catch {}
                setTescoStatus('unknown');
                setTimeout(async () => {
                  try {
                    const { authenticated } = await checkTescoStatus();
                    setTescoStatus(authenticated === null ? 'unknown' : authenticated ? 'ok' : 'expired');
                  } catch {}
                }, 5000);
              }}
              title="Open Tesco login in Chrome"
              style={{ fontSize: 12, fontWeight: 600, color: '#1f7a3d', background: '#e8f3ed', border: '1px solid #b6dfc5', borderRadius: 7, padding: '6px 13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
            >
              🔑 Tesco Login
            </button>
          </div>
          <DealsPanel deals={deals} setDeals={setDeals} compact />
        </div>
      </header>

      {/* Session expired banner */}
      {tescoStatus === 'expired' && (
        <div style={{ background: '#fef3c7', borderBottom: '1px solid #f59e0b', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
          <span style={{ fontSize: 13, color: '#92400e', fontWeight: 500 }}>
            ⚠️ Tesco signed you out — click "Tesco Login" to log back in.
          </span>
          <button onClick={() => setTescoStatus('unknown')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Tabs */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #ede8e0', padding: '0 20px', flexShrink: 0, display: 'flex' }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ padding: '14px 18px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#1f7a3d' : '#6b5d4f', borderBottom: tab === t ? '3px solid #1f7a3d' : '3px solid transparent', marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Deals sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', width: SIDEBAR_WIDTH, background: '#fff', borderRight: '1px solid #ede8e0', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid #ede8e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8c7b65' }}>Active Deals</span>
            <span style={{ background: '#e8f3ed', color: '#1f7a3d', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{deals.length}</span>
          </div>
          <div style={{ overflowY: 'auto', padding: '10px 12px', flex: 1 }}>
            {deals.length === 0 ? (
              <p style={{ fontSize: 12, color: '#b0a090', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>Fetch deals to see<br />what's on offer</p>
            ) : deals.map((d, i) => {
              const extractPrice = (raw) => raw ? (String(raw).match(/£[\d.]+/)?.[0] ?? null) : null;
              const ccPrice = extractPrice(d.clubcard_price);
              const dealPrice = extractPrice(d.deal_price);
              const origPrice = extractPrice(d.original_price);
              const dtPrice = extractPrice(d.deal_type);
              const displayPrice = ccPrice ?? dealPrice ?? dtPrice;
              const rawDt = d.deal_type;
              const cleanLabel = rawDt
                ? rawDt.toUpperCase().includes('CLUBCARD') ? 'Clubcard Price'
                  : rawDt.length > 28 ? rawDt.slice(0, 25) + '…'
                  : rawDt
                : null;
              return (
              <div key={i} style={{ padding: '10px 12px', background: '#faf7f2', borderRadius: 6, marginBottom: 8, borderLeft: '3px solid #1f7a3d' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2a1f0e', marginBottom: 1, lineHeight: 1.3 }}>{d.name}</div>
                {displayPrice && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 4 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: '#1f7a3d' }}>{displayPrice}</span>
                    {origPrice && displayPrice !== origPrice && <span style={{ fontSize: 11, color: '#b09070', textDecoration: 'line-through' }}>{origPrice}</span>}
                  </div>
                )}
                {cleanLabel && <span style={{ display: 'inline-block', background: 'rgba(31,122,61,.1)', color: '#1f7a3d', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '.3px' }}>{cleanLabel}</span>}
              </div>
            );})}
          </div>
        </aside>

        {/* Main scroll area */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'Recipes' && (
            <div style={{ padding: '18px 20px 32px' }}>
              <ChatInput onGenerate={handleGenerate} loading={loading} />

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: 13, borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{error}</span>
                  <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: 16, lineHeight: 1, marginLeft: 10 }}>×</button>
                </div>
              )}

              {recipes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ fontSize: 13, color: '#9c8c7c' }}>
                    <strong style={{ color: '#2a1f0e' }}>{recipes.length} recipes</strong> · Est. total <strong style={{ color: '#1f7a3d' }}>£{totalCost.toFixed(2)}</strong> / week
                  </div>
                </div>
              )}

              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#9c8c7c' }}>
                  <div style={{ width: 28, height: 28, border: '3px solid #d4ccc2', borderTopColor: '#1f7a3d', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
                  <p style={{ fontSize: 13 }}>Claude is planning your week…</p>
                </div>
              )}

              {!loading && recipes.length === 0 && !error && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#b0a090' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🍽️</div>
                  <p style={{ fontSize: 14 }}>Fetch deals then describe what you want to Claude</p>
                </div>
              )}

              {!loading && <RecipeList recipes={recipes} />}
            </div>
          )}

          {tab === 'Shopping List' && <ShoppingList />}
          {tab === 'Saved' && <SavedRecipes />}
          {tab === 'Pantry' && <Pantry pantry={pantry} setPantry={setPantry} />}
        </main>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
