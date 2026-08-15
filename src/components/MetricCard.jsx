export default function MetricCard({ label, value, unit, note, accent }) {
  return (
    <article className="metric" style={{ '--metric-accent': accent }}>
      <h2 className="metric__label">{label}</h2>
      <p className="metric__value">
        <span className="metric__number">{value}</span>
        <span className="metric__unit">{unit}</span>
      </p>
      <p className="metric__note">{note}</p>
    </article>
  );
}
