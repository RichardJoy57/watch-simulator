import { ACTIVITIES } from '../lib/simulator.js';

export default function ActivityControl({ current, onChange }) {
  return (
    <div className="activity">
      <span className="eyebrow">Activity</span>
      <div className="activity__options" role="group" aria-label="Select activity">
        {Object.entries(ACTIVITIES).map(([key, config]) => (
          <button
            key={key}
            type="button"
            className="activity__option"
            aria-pressed={current === key}
            onClick={() => onChange(key)}
          >
            {config.label}
            <span className="activity__met">{config.met.toFixed(1)} MET</span>
          </button>
        ))}
      </div>
    </div>
  );
}
