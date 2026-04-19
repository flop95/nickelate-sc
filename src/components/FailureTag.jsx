const KNOWN = new Set([
  'non_superconducting',
  'pressure_dependent_only',
  'irreproducible',
  'unstable_phase',
  'Tc_too_low',
  'synthesis_failed',
  'wrong_structure',
]);

export default function FailureTag({ type }) {
  if (!type) return null;
  const variant = KNOWN.has(type) ? type : 'default';
  return <span className={`fail-tag t-${variant}`}>{type}</span>;
}
