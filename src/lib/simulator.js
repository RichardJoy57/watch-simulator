/**
 * Physiological model behind the simulated watch.
 *
 * Nothing here is random noise dressed up as data. Each activity has a
 * metabolic equivalent (MET), a step cadence and a steady-state heart rate.
 * When the wearer changes activity the heart rate does not jump — it
 * approaches the new target exponentially, the way a real one does, and it
 * carries a small respiratory oscillation on top.
 *
 * Keeping this in a plain module (no React) means the model can be unit
 * tested on its own and the UI never has to know how a heart works.
 */

export const ACTIVITIES = {
  rest: { label: 'Resting', met: 1.0, cadence: 0, targetHr: 62, lag: 0.045 },
  walk: { label: 'Walking', met: 3.5, cadence: 108, targetHr: 96, lag: 0.055 },
  jog: { label: 'Jogging', met: 7.0, cadence: 156, targetHr: 142, lag: 0.07 },
  run: { label: 'Running', met: 11.0, cadence: 178, targetHr: 170, lag: 0.085 },
};

export const DEFAULT_PROFILE = {
  weightKg: 72,
  restingHr: 62,
  maxHr: 190,
};

/** A fresh session. Everything the simulation needs lives in here. */
export function createSession(profile = DEFAULT_PROFILE) {
  return {
    profile,
    activity: 'rest',
    elapsedMs: 0,
    heartRate: profile.restingHr,
    calories: 0,
    steps: 0,
    stepRemainder: 0,
    phase: 0,
  };
}

/**
 * Advance the session by `dtMs` milliseconds and return the next state.
 *
 * Pure: same input, same output, no mutation. That makes it safe to call
 * from a React effect without worrying about stale closures corrupting
 * anything, and it makes the model trivial to test.
 */
export function step(session, dtMs) {
  const dtSec = dtMs / 1000;
  const activity = ACTIVITIES[session.activity];
  const { weightKg } = session.profile;

  // Heart rate eases toward the target rather than snapping to it.
  // `lag` is the fraction of the remaining gap closed per second.
  const gap = activity.targetHr - session.heartRate;
  const eased = session.heartRate + gap * activity.lag * dtSec * 12;

  // Respiratory sinus arrhythmia: heart rate rises and falls slightly with
  // the breath. Roughly a 4-second cycle, wider when at rest.
  const phase = (session.phase + dtSec / 4) % 1;
  const breathAmplitude = session.activity === 'rest' ? 2.4 : 1.1;
  const breath = Math.sin(phase * Math.PI * 2) * breathAmplitude;

  const heartRate = clamp(eased + breath + jitter(0.4), 40, session.profile.maxHr);

  // Calories: the standard MET equation, per second.
  // kcal/min = MET x 3.5 x kg / 200
  const kcalPerSec = (activity.met * 3.5 * weightKg) / 200 / 60;
  const calories = session.calories + kcalPerSec * dtSec;

  // Steps accumulate fractionally and only tick over as whole steps, so the
  // counter never shows a fraction of a footfall.
  const rawSteps = session.stepRemainder + (activity.cadence / 60) * dtSec;
  const wholeSteps = Math.floor(rawSteps);

  return {
    ...session,
    elapsedMs: session.elapsedMs + dtMs,
    heartRate,
    calories,
    steps: session.steps + wholeSteps,
    stepRemainder: rawSteps - wholeSteps,
    phase,
  };
}

export function setActivity(session, activity) {
  if (!ACTIVITIES[activity]) return session;
  return { ...session, activity };
}

/**
 * One cycle of a synthetic ECG, sampled at `t` in [0, 1).
 *
 * Sum of Gaussians standing in for the P wave, QRS complex and T wave. It is
 * a caricature of a real trace, not a diagnostic one — enough to read as a
 * heartbeat on screen, and deliberately not enough to mistake for clinical data.
 */
export function ecgSample(t) {
  return (
    gaussian(t, 0.18, 0.022) * 0.14 + // P
    gaussian(t, 0.28, 0.008) * -0.16 + // Q
    gaussian(t, 0.31, 0.0095) * 1.0 + // R
    gaussian(t, 0.35, 0.011) * -0.28 + // S
    gaussian(t, 0.56, 0.042) * 0.32 // T
  );
}

function gaussian(x, mu, sigma) {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
}

function jitter(scale) {
  return (Math.random() - 0.5) * 2 * scale;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
