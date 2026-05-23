import { useEffect, useMemo, useState } from 'react';
import FigureOne from './FigureOne.jsx';
import landscape from '../data/landscape.json';
import nickelateDataset from '../data/nickelate_dataset.json';
import './FigureOnePage.css';

const LANDSCAPE_FILTER = new Set(['Sr3Ni2O7']);

function materialFromLandscape(entry) {
  return {
    id: entry.id,
    formula: entry.formula,
    P: entry.P,
    Tc: entry.Tc,
    family: entry.family,
    measured: entry.measured,
    isAnchor: !!entry.isAnchor,
    isFailure: !!entry.isFailure,
    proposalRound: entry.proposalRound ?? null,
    confidence: entry.isAnchor ? 0.85 : (entry.measured ? 0.6 : 0.4),
    pressureRange: null,
    labelOverride: null,
  };
}

function materialFromMeasurement(m) {
  const confMap = { exact: 0.8, approximate: 0.6, inferred: 0.4 };
  return {
    id: `M${m.id}`,
    formula: m.material,
    P: m.pressure_gpa,
    Tc: m.onset_tc,
    family: 'nickelate',
    measured: true,
    isAnchor: false,
    isFailure: m.onset_tc === 0,
    proposalRound: null,
    confidence: confMap[m.pressure_confidence] ?? 0.5,
    pressureRange: m.pressure_range,
    labelOverride: null,
  };
}

const LABELED_IDS = [
  'La3Ni2O7',
  'YBCO',
  'Hg1223',
  'LaH10',
  'H3S',
  'YH9',
  'CaH6',
  'MgB2',
];

function formatPressure(P) {
  return P < 0.01 ? P.toExponential(1) : P;
}

export default function FigureOnePage() {
  const [selectedId, setSelectedId] = useState('La3Ni2O7');

  useEffect(() => {
    console.info(
      `[FigureOne] Filtered from landscape before plotting: ${[...LANDSCAPE_FILTER].join(', ')} because its own ref field labels it a design-bundle scratch entry.`
    );
  }, []);

  const materials = useMemo(() => {
    const fromLandscape = landscape.materials
      .filter(entry => !LANDSCAPE_FILTER.has(entry.id))
      .map(entry => {
        const mat = materialFromLandscape(entry);
        if (entry.id === 'Hg1223') mat.labelOverride = 'HgBa₂Ca₂Cu₃O₈*';
        return mat;
      });
    const fromNickelate = nickelateDataset.measurements
      .filter(m => m.pressure_gpa != null && m.onset_tc != null)
      .map(materialFromMeasurement);
    return [...fromLandscape, ...fromNickelate];
  }, []);

  const selectedMaterial = materials.find(m => m.id === selectedId) || null;

  return (
    <div className="journal-shell">
      <div className="journal-page">
        <header className="journal-masthead">
          <div className="journal-brand">nickelate<span>.</span>sc</div>
          <div className="journal-issue">Vol.&nbsp;1, No.&nbsp;1 — April 2026</div>
        </header>

        <div className="journal-running-head">
          <span>A ranked screening platform for ambient-pressure superconductivity</span>
          <span>FIG. 1 — The pressure-temperature landscape</span>
        </div>

        <section className="figure-hero" aria-label="Figure one">
          <div className="figure-kicker">Interactive figure</div>
          <div>
            <h1>FIG. 1 — The pressure-temperature landscape</h1>
            <p>
              All known and predicted superconductors plotted on a logarithmic pressure axis,
              with ambient-pressure candidates held against verified high-Tc anchors and known
              failure memory.
            </p>
          </div>
        </section>

        <section className="figure-plate" aria-label="Pressure-temperature landscape chart">
          <FigureOne
            materials={materials}
            labeledIds={LABELED_IDS}
            selectedMaterialId={selectedId}
            onSelectMaterial={(id) => setSelectedId(prev => (prev === id ? null : id))}
          />
        </section>

        <section className="figure-inspector" aria-label="Anchored material">
          <div className="figure-inspector-head">
            <span className="title">Inspector</span>
            <span className="rubric">{materials.length} plotted materials</span>
          </div>

          {selectedMaterial ? (
            <div className="figure-inspector-grid">
              <div>
                <div className="inspector-label">Selected material</div>
                <div className="inspector-formula">{selectedMaterial.formula}</div>
                <div className="inspector-meta">
                  <i>P</i> = <strong>{formatPressure(selectedMaterial.P)}</strong> GPa
                  &nbsp;·&nbsp;
                  <i>T</i><sub>c</sub> = <strong>{selectedMaterial.Tc}</strong> K
                  &nbsp;·&nbsp;
                  <span>{selectedMaterial.family}</span>
                </div>
              </div>

              <div>
                <div className="inspector-label">Record state</div>
                <div className="inspector-note">
                  {selectedMaterial.isAnchor ? 'anchor' : 'comparison material'}
                  {selectedMaterial.isFailure ? ' · failure memory' : ''}
                  {selectedMaterial.measured ? ' · measured' : ' · predicted'}
                  {' · '}
                  id: {selectedMaterial.id}
                </div>
              </div>
            </div>
          ) : (
            <div className="inspector-empty">No material anchored.</div>
          )}
        </section>

        <footer className="journal-colophon">
          <div className="left">
            Typeset in Bodoni Moda, STIX Two Text, and Latin Modern Roman. Printed on ivory.
          </div>
          <div className="right">
            Issue prepared by <a href="https://github.com/flop95" target="_blank" rel="noopener">flop95</a>.
          </div>
        </footer>
      </div>
    </div>
  );
}
