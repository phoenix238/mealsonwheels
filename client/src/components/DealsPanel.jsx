import React, { useState } from 'react';
import { fetchDeals } from '../api.js';

export default function DealsPanel({ deals, setDeals, compact }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDeals();
      if (data.error) throw new Error(data.error);
      setDeals(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetched = deals.length > 0;

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
          letterSpacing: '.1px', opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '↻ Fetching…' : fetched ? `✓ ${deals.length} Deals` : 'Fetch Deals'}
      </button>
      {error && <span style={{ fontSize: 11, color: '#b91c1c' }}>{error}</span>}
    </>
  );
}
