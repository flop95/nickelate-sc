const KNOWN = new Set([
  'non_superconducting',
  'pressure_dependent_only',
  'irreproducible',
  'unstable_phase',
  'Tc_too_low',
  'synthesis_failed',
  'wrong_structure',
]);

const LABELS = {
  non_superconducting: 'not superconducting',
  pressure_dependent_only: 'pressure only',
  irreproducible: 'not reproduced',
  unstable_phase: 'unstable phase',
  Tc_too_low: 'low Tc',
  synthesis_failed: 'synthesis failed',
  wrong_structure: 'wrong structure',
};

export function formatFailureType(type) {
  if (!type) return '';
  return LABELS[type] || String(type).replace(/_/g, ' ');
}

export default function FailureTag({ type }) {
  if (!type) return null;
  const variant = KNOWN.has(type) ? type : 'default';
  return <span className={`fail-tag t-${variant}`}>{formatFailureType(type)}</span>;
}
