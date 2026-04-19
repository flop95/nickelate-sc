import { useEffect, useRef, useState } from 'react';

// options: [{ value: string, count: number }]
// selected: string[]
// onChange: (nextSelected) => void
export default function MultiSelectFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const toggle = value => {
    if (selected.includes(value)) onChange(selected.filter(v => v !== value));
    else onChange([...selected, value]);
  };

  const activeCount = selected.length;

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: activeCount > 0 ? 'var(--color-accent-dim)' : 'transparent',
          border: '1px solid ' + (activeCount > 0 ? 'var(--color-accent)' : 'var(--color-border-strong)'),
          color: activeCount > 0 ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          padding: '6px 12px',
          cursor: 'pointer',
          letterSpacing: '0.02em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 100ms ease-out',
        }}
      >
        {label}
        {activeCount > 0 && <span style={{ opacity: 0.85 }}>({activeCount})</span>}
        <span style={{ opacity: 0.5, fontSize: 9 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="ms-popover">
          {options.length === 0 && (
            <div style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)' }}>
              no values
            </div>
          )}
          {options.map(opt => {
            const isSel = selected.includes(opt.value);
            return (
              <div
                key={opt.value}
                className={'ms-option' + (isSel ? ' is-selected' : '')}
                onClick={() => toggle(opt.value)}
              >
                <span className="ms-checkbox">{isSel ? '✓' : ''}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {opt.value || '(empty)'}
                </span>
                <span className="ms-count">{opt.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Small chip pill — shows selected value with × remove
export function FilterChip({ label, onRemove }) {
  return (
    <span
      onClick={onRemove}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        padding: '3px 8px',
        border: '1px solid var(--color-accent)',
        background: 'var(--color-accent-dim)',
        color: 'var(--color-accent)',
        cursor: 'pointer',
        borderRadius: 10,
        transition: 'all 100ms ease-out',
      }}
    >
      {label}
      <span style={{ opacity: 0.7, fontSize: 12, lineHeight: 1 }}>×</span>
    </span>
  );
}
