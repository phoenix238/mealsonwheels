import React, { useState } from 'react';
import { fetchDeals, fetchLidlDeals, fetchMorrisonsDeals } from '../api.js';

const STORE_FETCH = {
  tesco: fetchDeals,
  lidl: fetchLidlDeals,
  morrisons: fetchMorrisonsDeals,
};

const STORE_LABEL = { tesco: 'Tesco', lidl: 'Lidl', morrisons: 'Morrisons' };

export default function DealsPanel({ deals, setDeals, store = 'tesco' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = STORE_FETCH[store] ?? fetchDeals;
      const data = await fn();
      if (data.error) throw new Error(data.error);
      setDeals(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetched = deals.length > 0;
  const name = STORE_LABEL[store] ?? 'Deals';

  return (
    <>
      <button
        onClick={load}
        disabled={loading}
        style={{
          padding: '8px 16px', borderRadius: 24, fontSize: 13, fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
          background: fetched ? '#e8f3ed' : '#fff',
          color: fetched ? '#1f7a3d' : '#2a1f0e',
          border: fetched ? '1px solid #1f7a3d' : '1px solid #d4ccc2',
          letterSpacing: '.1px', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap',
        }}
      >
        {loading ? `↻ Fetching ${name}…` : fetched ? `✓ ${deals.length} Deals` : `Fetch ${name} Deals`}
      </button>
      {error && <span style={{ fontSize: 11, color: '#b91c1c', maxWidth: 180 }}>{error}</span>}
    </>
  );
}
