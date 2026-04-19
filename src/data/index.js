// Central data import — maps JSON snake_case to component camelCase
import rawDataset from './nickelate_dataset.json';
import rawPatterns from './patterns.json';
import rawPredictions from './predictions.json';

// Map a measurement from JSON schema to the engine component's expected shape
function mapMeasurement(m) {
  return {
    id: m.id,
    material: m.material,
    substrate: m.substrate,
    subA: m.substrate_a,
    filmA: m.film_a,
    filmC: m.film_c,
    strain: m.strain,
    onsetTc: m.onset_tc,
    zeroRTc: m.zero_r_tc,
    thickness: m.thickness || null,
    doping: m.doping,
    growth: m.growth_method,
    oxygenTreat: m.oxygen_treatment,
    year: m.year,
    group: m.group,
    journal: m.source,
    arxiv: m.arxiv,
    notes: m.notes,
    pressureClass: m.pressure_class,
    tags: m.tags,
  };
}

// All 22 measurements in engine-compatible format
export const allMeasurements = rawDataset.measurements.map(mapMeasurement);

// Engine dataset: only the original 18 film entries (ids 1-18)
export const engineDataset = allMeasurements.filter(m => m.id <= 18);

// Timeline events with resolved measurement data
export const timelineEvents = rawDataset.timeline.map(t => {
  const measurement = allMeasurements.find(m => m.id === t.measurement_id);
  return {
    date: t.date,
    tc: measurement.onsetTc,
    type: t.type,
    label: t.label,
    detail: measurement.notes,
    color: t.color,
    measurementId: t.measurement_id,
  };
});

// Substrate short names for screener display
const substrateAbbrev = {
  "SrLaAlO₄": "SLAO", "LaAlO₃": "LAO", "NdGaO₃": "NGO", "SrTiO₃": "STO",
};

// Screener published data: subset of measurements used in screener view
export const screenerPublished = rawDataset.screener_published_ids.map(id => {
  const m = allMeasurements.find(e => e.id === id);
  const abbr = substrateAbbrev[m.substrate] || m.substrate;
  return {
    substrate: `${m.substrate} (${abbr})`,
    a: m.subA,
    onsetTc: m.onsetTc,
    zeroRTc: m.zeroRTc,
    source: m.journal,
    note: m.notes?.slice(0, 60) || '',
  };
});

// Candidate substrates (pass through directly)
export const candidateSubstrates = rawDataset.candidate_substrates;

// Patterns, predictions (pass through — already in final shape)
export const patterns = rawPatterns;
export const predictions = rawPredictions;

// Timeline milestones (static reference lines)
export const timelineMilestones = [
  { tc: 77, label: "Liquid nitrogen (77K)", color: "#5B9BD5" },
  { tc: 96, label: "Current bulk record (96K)", color: "#E24B4A" },
];

// arXiv alerts — imported statically (run `python scripts/arxiv_watcher.py` to generate/update)
import rawArxivAlerts from './arxiv_alerts.json';
export const arxivAlerts = rawArxivAlerts;
