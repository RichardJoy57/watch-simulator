import type { CSSProperties } from 'react';
type MetricCardProps = {
  label: string;
  value: number | string;
  unit: string;
  note: string;
  accent: string;
};
export default function MetricCard({ label, value, unit, note, accent }: MetricCardProps) {
  const style = { '--metric-accent': accent } as CSSProperties;
  return (
    <article className="metric" style={style}>
      <h2 className="metric__label">{label}</h2>
      <p className="metric__value">
        <span className="metric__number">{value}</span>
        <span className="metric__unit">{unit}</span>
      </p>
      <p className="metric__note">{note}</p>
    </article>
  );
}
