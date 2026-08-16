import { ACTIVITIES,type ActivityKey } from '../lib/simulator';

type ActivityControlProps = {          
  current: ActivityKey;
  onChange: (activity: ActivityKey) => void;
};

export default function ActivityControl({ current, onChange }: ActivityControlProps) {
  const entries = Object.entries(ACTIVITIES) as [ActivityKey, (typeof ACTIVITIES)[ActivityKey]][];
  return (
    <div className="activity">
      <span className="eyebrow">Activity</span>
      <div className="activity__options" role="group" aria-label="Select activity">
        {entries.map(([key, config]) => (
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
