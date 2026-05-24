import { PRESSURE_MODES } from '../utils/pressureModes.js';

export default function PressureModeTabs({ value, onChange, counts }) {
  return (
    <div
      role="radiogroup"
      aria-label="Pressure mode"
      className="pressure-mode-tabs"
    >
      {PRESSURE_MODES.map(mode => {
        const active = value === mode.id;
        const count = counts?.[mode.id];
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange && onChange(mode.id)}
            className={`pressure-mode-tab${active ? ' is-active' : ''}`}
          >
            <span>{mode.label}</span>
            {count != null && <span className="pressure-mode-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
