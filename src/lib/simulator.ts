/**
 * Physiological model behind the simulated watch.
 *
 * Nothing here is random noise dressed up as data. Each activity has a
 * metabolic equivalent (MET), a step cadence and a steady-state heart rate.
 * When the wearer changes activity the heart rate does not jump — it
 * approaches the new target exponentially, the way a real one does, and it
 * carries a small respiratory oscillation on top.
 */

/** One activity's physiological constants. */
export type ActivityConfig = {
  label: string;
  met: number;
  cadence: number;
  targetHr: number;
  lag: number;
};

// `as const` tells TypeScript to remember the exact keys and values here,
// rather than widening them to "some object with string keys". That is what
// makes ActivityKey below resolve to the four literal names.
export const ACTIVITIES = {
  rest: { label: 'Resting', met: 1.0, cadence: 0, targetHr: 62, lag: 0.045 },
  walk: { label: 'Walking', met: 3.5, cadence: 108, targetHr: 96, lag: 0.055 },
  jog: { label: 'Jogging', met: 7.0, cadence: 156, targetHr: 142, lag: 0.07 },
  run: { label: 'Running', met: 11.0, cadence: 178, targetHr: 170, lag: 0.085 },
} as const satisfies Record<string, ActivityConfig>;

/** 'rest' | 'walk' | 'jog' | 'run' — derived, so it can never drift out of sync. */
export type ActivityKey = keyof typeof ACTIVITIES;

export type Profile = {
  weightKg: number;
  restingHr: number;
  maxHr: number;
};

export type Session = {
  profile: Profile;
  activity: ActivityKey;
  elapsedMs: number;
  heartRate: number;
  calories: number;
  steps: number;
  stepRemainder: number;
  phase: number;
};

/** One second of recorded history, as fed to the trend chart. */
export type TrendPoint = {
  t: number;
  heartRate: number;
  calories: number;
  steps: number;
};

export const DEFAULT_PROFILE: Profile = {
  weightKg: 72,
  restingHr: 62,
  maxHr: 190,
};

/** A fresh session. Everything the simulation needs lives in here. */
export function createSession(profile: Profile = DEFAULT_PROFILE): Session {
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
 * Pure: same input, same output, no mutation.
 */
export function step(session: Session, dtMs: number): Session {
  const dtSec = dtMs / 1000;
  const activity = ACTIVITIES[session.activity];
  const { weightKg } = session.profile;

  // Heart rate eases toward the target rather than snapping to it.
  const gap = activity.targetHr - session.heartRate;
  const eased = session.heartRate + gap * activity.lag * dtSec * 12;

  // Respiratory sinus arrhythmia: heart rate rises and falls with the breath.
  const phase = (session.phase + dtSec / 4) % 1;
  const breathAmplitude = session.activity === 'rest' ? 2.4 : 1.1;
  const breath = Math.sin(phase * Math.PI * 2) * breathAmplitude;

  const heartRate = clamp(eased + breath + jitter(0.4), 40, session.profile.maxHr);

  // Calories: the standard MET equation, per second.
  const kcalPerSec = (activity.met * 3.5 * weightKg) / 200 / 60;
  const calories = session.calories + kcalPerSec * dtSec;

  // Steps accumulate fractionally and only tick over as whole steps.
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

export function setActivity(session: Session, activity: ActivityKey): Session {
  return { ...session, activity };
}

/**
 * One cycle of a synthetic ECG, sampled at `t` in [0, 1).
 *
 * Sum of Gaussians standing in for the P wave, QRS complex and T wave. A
 * caricature of a real trace, not a diagnostic one.
 */
export function ecgSample(t: number): number {
  return (
    gaussian(t, 0.18, 0.022) * 0.14 + // P
    gaussian(t, 0.28, 0.008) * -0.16 + // Q
    gaussian(t, 0.31, 0.0095) * 1.0 + // R
    gaussian(t, 0.35, 0.011) * -0.28 + // S
    gaussian(t, 0.56, 0.042) * 0.32 // T
  );
}

function gaussian(x: number, mu: number, sigma: number): number {
  return Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
}

function jitter(scale: number): number {
  return (Math.random() - 0.5) * 2 * scale;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}
