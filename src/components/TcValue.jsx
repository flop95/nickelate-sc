// Renders a Tc value with glow for >77K, gold for >30K, muted otherwise.
// Keeps the visual hierarchy rule in one place so every table agrees.
export default function TcValue({ value, suffix = 'K', align = 'right', size = 12 }) {
  if (value == null) {
    return (
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: size,
        color: 'var(--color-text-muted)',
        textAlign: align,
        display: 'block',
      }}>—</span>
    );
  }
  const n = Number(value);
  let className = '';
  let color = 'var(--color-text-secondary)';
  if (n > 77) {
    className = 'tc-exceptional';
    color = undefined;
  } else if (n > 30) {
    className = 'tc-strong';
    color = undefined;
  }
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: size,
        textAlign: align,
        display: 'block',
        color,
      }}
    >
      {n}{suffix}
    </span>
  );
}
