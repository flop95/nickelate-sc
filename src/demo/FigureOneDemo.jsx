import { useState, useMemo, useEffect } from 'react';
import FigureOne from '../components/FigureOne.jsx';
import landscape from '../data/landscape.json';
import nickelateDataset from '../data/nickelate_dataset.json';

// IDs filtered from landscape before plotting. Keep the raw JSON intact for
// future reference, but exclude entries whose own ref field flags them as not
// a published result.
const LANDSCAPE_FILTER = new Set(['Sr3Ni2O7']);

// ============================================================
// Adapter — convert landscape entries → Material shape
// ============================================================
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

// ============================================================
// Adapter — convert nickelate measurement → Material shape
// ============================================================
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
    // Tc = 0 = known failure (e.g., id=7, La₃Ni₂O₇ on STO at ambient)
    isFailure: m.onset_tc === 0,
    proposalRound: null,
    confidence: confMap[m.pressure_confidence] ?? 0.5,
    pressureRange: m.pressure_range,
    labelOverride: null,
  };
}

// Materials to label adjacent to their marks per FIG. 1 spec
const LABELED_IDS = [
  'La3Ni2O7',    // nickelate anchor (bulk, under pressure)
  'YBCO',        // cuprate anchor (ambient)
  'Hg1223',      // cuprate under pressure (labelOverride to HgBa₂Ca₂Cu₃O₈*)
  'LaH10',       // hydride anchor
  'H3S',         // hydride anchor
  'YH9',         // hydride anchor
  'CaH6',        // hydride anchor
  'MgB2',        // conventional BCS anchor
];

export default function FigureOneDemo() {
  const [selectedId, setSelectedId] = useState('La3Ni2O7');

  useEffect(() => {
    console.info(
      `[FigureOneDemo] Filtered from landscape before plotting: ${[...LANDSCAPE_FILTER].join(', ')} — reason: entry's own ref field labels it a design-bundle scratch entry, not a published result.`
    );
  }, []);

  const materials = useMemo(() => {
    const fromLandscape = landscape.materials
      .filter(entry => !LANDSCAPE_FILTER.has(entry.id))
      .map(entry => {
        const mat = materialFromLandscape(entry);
        // Pressure-enhanced Hg-1223 gets asterisk per design spec
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
    <div
      style={{
        background: '#F5F0E1',
        color: '#1A1814',
        minHeight: '100vh',
        padding: '40px 48px',
        fontFamily: "'STIX Two Text', 'New Century Schoolbook', 'Century Schoolbook', Georgia, serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Masthead */}
        <header
          style={{
            borderBottom: '2px solid #0A0907',
            paddingBottom: 8,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div
            style={{
              fontFamily: "'Bodoni Moda', Didot, serif",
              fontSize: 34,
              letterSpacing: '-0.01em',
              color: '#0A0907',
              lineHeight: 1,
            }}
          >
            nickelate<span>.</span>sc
          </div>
          <div
            style={{
              fontFamily: "'Latin Modern Roman', serif",
              fontStyle: 'italic',
              fontSize: 12,
            }}
          >
            FIG. 1 — demo harness
          </div>
        </header>

        <div
          style={{
            fontFamily: "'Latin Modern Roman', serif",
            fontStyle: 'italic',
            fontSize: 10,
            opacity: 0.75,
            marginBottom: 40,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Standalone rendering of FigureOne.jsx · merged landscape.json + nickelate_dataset.json</span>
          <span>{materials.length} points plotted</span>
        </div>

        {/* The chart */}
        <FigureOne
          materials={materials}
          labeledIds={LABELED_IDS}
          selectedMaterialId={selectedId}
          onSelectMaterial={(id) => setSelectedId(prev => (prev === id ? null : id))}
        />

        {/* Selection readout + dev affordances */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 14,
            borderTop: '1px solid #0A0907',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 40,
          }}
        >
          <div>
            <div
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontVariantCaps: 'all-small-caps',
                fontSize: 10,
                color: '#0A0907',
                marginBottom: 6,
              }}
            >
              Selected material
            </div>
            {selectedMaterial ? (
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <div
                  style={{
                    fontFamily: "'Bodoni Moda', Didot, serif",
                    fontSize: 24,
                    letterSpacing: '-0.015em',
                    color: '#0A0907',
                    marginBottom: 4,
                  }}
                >
                  {selectedMaterial.formula}
                </div>
                <div style={{ fontFamily: "'Latin Modern Roman', serif", fontSize: 11 }}>
                  <i>P</i> = <b>{selectedMaterial.P < 0.01 ? selectedMaterial.P.toExponential(1) : selectedMaterial.P}</b> GPa
                  &nbsp;·&nbsp;
                  <i>T</i><sub>c</sub> = <b>{selectedMaterial.Tc}</b> K
                  &nbsp;·&nbsp;
                  <span style={{ opacity: 0.7 }}>family: {selectedMaterial.family}</span>
                </div>
                <div
                  style={{
                    fontFamily: "'Latin Modern Roman', serif",
                    fontStyle: 'italic',
                    fontSize: 10,
                    opacity: 0.7,
                    marginTop: 6,
                  }}
                >
                  id: {selectedMaterial.id} · {selectedMaterial.isAnchor ? 'anchor' : ''}
                  {selectedMaterial.isFailure ? ' failure' : ''}
                  {selectedMaterial.measured ? ' measured' : ' predicted'}
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontFamily: "'Latin Modern Roman', serif",
                  fontStyle: 'italic',
                  fontSize: 12,
                  opacity: 0.7,
                }}
              >
                No selection. Click any plotted point to anchor the inspector.
              </div>
            )}
          </div>

          <div>
            <div
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontVariantCaps: 'all-small-caps',
                fontSize: 10,
                color: '#0A0907',
                marginBottom: 6,
              }}
            >
              Interaction notes
            </div>
            <div
              style={{
                fontFamily: "'Latin Modern Roman', serif",
                fontStyle: 'italic',
                fontSize: 11,
                lineHeight: 1.55,
                opacity: 0.85,
              }}
            >
              Hover any mark for coordinate readout. Click to select (square highlight appears). Click the same mark again to deselect. Arrow to any mark and press Enter or Space for keyboard selection.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
