import { useCallback, useEffect, useRef, useState } from 'react';
import { createSession, setActivity, step } from '../lib/simulator.js';

/**
 * Runs the simulation and hands the UI two things at two different speeds.
 *
 * The model itself ticks at 20 Hz, because heart-rate easing looks wrong if
 * you integrate it once a second. But re-rendering the whole dashboard 20
 * times a second is wasteful, so React state is only published at 4 Hz, and
 * the trend chart samples once a second.
 *
 * The live session also lives in a ref, so the ECG canvas can read the
 * current heart rate every animation frame without subscribing to state
 * and dragging the rest of the tree into its render cycle.
 */
const MODEL_HZ = 20;
const PUBLISH_HZ = 4;
const TREND_SECONDS = 90;

export function useSimulation() {
  const sessionRef = useRef(createSession());
  const [snapshot, setSnapshot] = useState(sessionRef.current);
  const [trend, setTrend] = useState([]);
  const [running, setRunning] = useState(true);

  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    const dtMs = 1000 / MODEL_HZ;
    let ticks = 0;
    let secondAccumulator = 0;

    const id = setInterval(() => {
      if (!runningRef.current) return;

      sessionRef.current = step(sessionRef.current, dtMs);
      ticks += 1;
      secondAccumulator += dtMs;

      if (ticks % (MODEL_HZ / PUBLISH_HZ) === 0) {
        setSnapshot(sessionRef.current);
      }

      if (secondAccumulator >= 1000) {
        secondAccumulator -= 1000;
        const s = sessionRef.current;
        setTrend((prev) => {
          const next = [
            ...prev,
            {
              t: Math.round(s.elapsedMs / 1000),
              heartRate: Math.round(s.heartRate),
              calories: Number(s.calories.toFixed(2)),
              steps: s.steps,
            },
          ];
          return next.length > TREND_SECONDS ? next.slice(-TREND_SECONDS) : next;
        });
      }
    }, dtMs);

    return () => clearInterval(id);
  }, []);

  const changeActivity = useCallback((activity) => {
    sessionRef.current = setActivity(sessionRef.current, activity);
    setSnapshot(sessionRef.current);
  }, []);

  const reset = useCallback(() => {
    sessionRef.current = createSession();
    setSnapshot(sessionRef.current);
    setTrend([]);
  }, []);

  const toggleRunning = useCallback(() => setRunning((r) => !r), []);

  return { snapshot, trend, running, sessionRef, changeActivity, reset, toggleRunning };
}
