import React, { useState } from 'react';

const SUGGESTIONS = [
  'Meal prep for the week',
  'Quick weeknight dinners',
  'Budget week under £20',
  'Vegetarian variety',
  'Help me shop for the week',
  'High protein meals',
];

export default function ChatInput({ onGenerate, loading }) {
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim() || loading) return;
    onGenerate(text.trim());
    setText('');
  };

  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 4px rgba(42,31,14,.07)' }}>
      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#9c8c7c', display: 'block', marginBottom: 8 }}>
        What do you want this week?
      </label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="e.g. meal prep 4 lunches for work, or just help me shop for the week…"
          rows={2}
          style={{ flex: 1, padding: '10px 13px', border: '1px solid #d4ccc2', borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#2a1f0e', outline: 'none', background: '#faf7f2', resize: 'none', lineHeight: 1.5 }}
        />
        <button
          onClick={submit}
          disabled={!text.trim() || loading}
          style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#1f7a3d,#35a857)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !text.trim() || loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: !text.trim() || loading ? 0.5 : 1, whiteSpace: 'nowrap', alignSelf: 'stretch' }}
        >
          {loading ? '…' : '✨ Go'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => { setText(s); }}
            style={{ padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", background: '#faf7f2', color: '#6b5d4f', border: '1px solid #d4ccc2', transition: 'all .15s' }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
