// nickelate.sc logo mark — row of cyan nodes with a connecting bond line.
// Slow horizontal drift (subtle, not distracting) when motion is allowed.
// On reduced-motion, renders perfectly static.
export default function LatticeSpin({ size = 28, showOverlay = null }) {
  const height = Math.max(10, Math.round(size / 2));
  const width = Math.max(40, Math.round(size * 2));
  const y = height / 2;
  const nodeR = Math.max(2, Math.round(size / 8));

  return (
    <div style={{
      position: 'relative',
      width,
      height,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="lattice-spin-group"
        style={{ display: 'block' }}
      >
        {/* Bond line */}
        <line
          x1={nodeR}
          y1={y}
          x2={width - nodeR}
          y2={y}
          stroke="var(--accent)"
          strokeWidth="1"
        />
        {/* Four nodes, center pair slightly larger */}
        <circle cx={nodeR} cy={y} r={nodeR * 0.9} fill="var(--accent)" />
        <circle cx={width * 0.33} cy={y} r={nodeR * 1.1} fill="var(--accent)" />
        <circle cx={width * 0.67} cy={y} r={nodeR * 0.9} fill="var(--accent)" />
        <circle cx={width - nodeR} cy={y} r={nodeR * 1.1} fill="var(--accent)" />
      </svg>
      {showOverlay && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: size * 0.5,
          color: 'var(--fg-3)',
          pointerEvents: 'none',
        }}>
          {showOverlay}
        </div>
      )}
    </div>
  );
}
