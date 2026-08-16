import ActivityControl from './components/ActivityControl';
import EcgTrace from './components/EcgTrace';
import MetricCard from './components/MetricCard.jsx';
import TrendChart from './components/TrendChart.jsx';
import { useSimulation } from './hooks/useSimulation';
import { ACTIVITIES, formatDuration } from './lib/simulator';

export default function App() {
  const { snapshot, trend, running, sessionRef, changeActivity, reset, toggleRunning } =
    useSimulation();

  const activity = ACTIVITIES[snapshot.activity];
  const cadence = activity.cadence;

  return (
    <div className="page">
      <header className="masthead">
        <div>
          <h1 className="masthead__title">Watch Simulator</h1>
          <p className="masthead__sub">
            A wearable telemetry dashboard driven by a physiological model — no device,
            no server, no recorded data.
          </p>
        </div>
        <dl className="session">
          <div>
            <dt className="eyebrow">Session</dt>
            <dd className="session__clock">{formatDuration(snapshot.elapsedMs)}</dd>
          </div>
        </dl>
      </header>

      <EcgTrace sessionRef={sessionRef} running={running} />

      <section className="metrics" aria-label="Current readings">
        <MetricCard
          label="Heart rate"
          value={Math.round(snapshot.heartRate)}
          unit="bpm"
          note={`Target ${activity.targetHr} bpm at ${activity.label.toLowerCase()}`}
          accent="var(--pulse)"
        />
        <MetricCard
          label="Energy"
          value={snapshot.calories.toFixed(1)}
          unit="kcal"
          note={`${activity.met.toFixed(1)} MET · 72 kg profile`}
          accent="var(--burn)"
        />
        <MetricCard
          label="Steps"
          value={snapshot.steps.toLocaleString('en-GB')}
          unit="steps"
          note={cadence ? `${cadence} per minute` : 'No cadence at rest'}
          accent="var(--stride)"
        />
      </section>

      <section className="controls">
        <ActivityControl current={snapshot.activity} onChange={changeActivity} />
        <div className="controls__buttons">
          <button type="button" className="button" onClick={toggleRunning}>
            {running ? 'Pause' : 'Resume'}
          </button>
          <button type="button" className="button button--quiet" onClick={reset}>
            Reset session
          </button>
        </div>
      </section>

      <TrendChart data={trend} />

      <footer className="footer">
        <p>
          Every value is generated in the browser from the model in{' '}
          <code>src/lib/simulator.js</code>. Heart rate eases toward an
          activity-dependent target and carries a respiratory oscillation; energy uses
          the standard MET equation. Not medical data.
        </p>
      </footer>
    </div>
  );
}
