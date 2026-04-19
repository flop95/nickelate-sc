/**
 * Find contradictions in the nickelate dataset.
 *
 * Groups entries by (material + substrate + strain within ±0.1%) and flags
 * groups where onset_tc differs by more than the given threshold (default 5K).
 *
 * For each contradiction, identifies the most likely explanatory variable
 * by checking which fields differ between the high-Tc and low-Tc entries.
 */

const STRAIN_TOLERANCE = 0.1; // %
const TC_THRESHOLD = 5; // K

function strainClose(a, b) {
  if (a == null || b == null) return a == null && b == null;
  return Math.abs(a - b) <= STRAIN_TOLERANCE;
}

function findExplanatoryVariable(high, low) {
  // Check pressure class first — ambient vs under-pressure is the biggest confounder
  if ((high.pressureClass || '') !== (low.pressureClass || '')) {
    return { variable: "pressure_class", high: high.pressureClass || "unknown", low: low.pressureClass || "unknown" };
  }
  // Check growth method (highest-impact variable per PAT-02)
  if ((high.growth || '') !== (low.growth || '') && high.growth && low.growth) {
    return { variable: "growth_method", high: high.growth, low: low.growth };
  }
  // Oxygen treatment
  if ((high.oxygenTreat || '') !== (low.oxygenTreat || '')) {
    return { variable: "oxygen_treatment", high: high.oxygenTreat || "none", low: low.oxygenTreat || "none" };
  }
  // Doping
  if ((high.doping || '') !== (low.doping || '')) {
    return { variable: "doping", high: high.doping || "undoped", low: low.doping || "undoped" };
  }
  // Year (later measurements may benefit from improved techniques)
  if (high.year !== low.year) {
    return { variable: "year", high: String(high.year), low: String(low.year) };
  }
  // Group (different labs, different film quality)
  if ((high.group || '') !== (low.group || '')) {
    return { variable: "group", high: high.group, low: low.group };
  }
  return { variable: "unknown", high: "—", low: "—" };
}

function generateHypothesis(explanatory, tcDiff) {
  const { variable, high, low } = explanatory;
  switch (variable) {
    case "pressure_class":
      return `Pressure difference (${high} vs ${low}) — applied pressure enhances Tc by ${tcDiff.toFixed(0)}K on same substrate. Not a true contradiction.`;
    case "growth_method":
      return `Growth method difference (${high} vs ${low}) accounts for ${tcDiff.toFixed(0)}K gap — non-equilibrium techniques produce fewer oxygen vacancies.`;
    case "oxygen_treatment":
      return `Oxygen treatment difference (${high} vs ${low}) likely changes vacancy concentration, shifting Tc by ${tcDiff.toFixed(0)}K.`;
    case "doping":
      return `Doping variant (${high} vs ${low}) changes carrier concentration, explaining the ${tcDiff.toFixed(0)}K difference.`;
    case "year":
      return `Later measurement (${high} vs ${low}) likely benefits from improved synthesis — film quality is still rapidly evolving.`;
    case "group":
      return `Different groups (${high} vs ${low}) — lab-to-lab variation in film quality is still large in this young field.`;
    default:
      return `${tcDiff.toFixed(0)}K discrepancy on same material/substrate/strain — no obvious single explanatory variable.`;
  }
}

export function findContradictions(dataset, threshold = TC_THRESHOLD) {
  // Group by material + substrate + strain
  const groups = {};
  dataset.forEach(entry => {
    const key = `${entry.material}||${entry.substrate}||${Math.round((entry.strain || 0) * 10)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });

  const contradictions = [];

  Object.values(groups).forEach(group => {
    if (group.length < 2) return;

    // Find max and min Tc in the group
    const sorted = [...group].sort((a, b) => b.onsetTc - a.onsetTc);
    const high = sorted[0];
    const low = sorted[sorted.length - 1];
    const tcDiff = high.onsetTc - low.onsetTc;

    if (tcDiff <= threshold) return;

    const explanatory = findExplanatoryVariable(high, low);
    const hypothesis = generateHypothesis(explanatory, tcDiff);

    contradictions.push({
      material: high.material,
      substrate: high.substrate,
      strain: high.strain,
      entries: sorted,
      high_tc: high.onsetTc,
      low_tc: low.onsetTc,
      tc_diff: tcDiff,
      explanatory_variable: explanatory.variable,
      hypothesis,
    });
  });

  // Filter out pressure-explained contradictions — expected physics, not real contradictions
  const filtered = contradictions.filter(c => c.explanatory_variable !== "pressure_class");

  // Sort by Tc difference (most surprising first)
  filtered.sort((a, b) => b.tc_diff - a.tc_diff);
  return filtered;
}
