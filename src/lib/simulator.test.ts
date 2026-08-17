import { describe, expect, it } from 'vitest';
import {
  ACTIVITIES,
  createSession,
  formatDuration,
  setActivity,
  step,
  type Session,
} from './simulator';

/**
 * The model is a pure function, which is what makes it worth testing first:
 * no DOM, no timers, no mocking. Given a session and a duration, it returns
 * a new session. Everything below is a statement about physiology that the
 * code should honour.
 */

/** Run the model for `seconds` at 20 Hz, the rate the app uses. */
function advance(session: Session, seconds: number): Session {
  const dtMs = 50;
  let s = session;
  for (let i = 0; i < (seconds * 1000) / dtMs; i++) {
    s = step(s, dtMs);
  }
  return s;
}

describe('createSession', () => {
  it('starts at rest with nothing accumulated', () => {
    const s = createSession();
    expect(s.activity).toBe('rest');
    expect(s.elapsedMs).toBe(0);
    expect(s.calories).toBe(0);
    expect(s.steps).toBe(0);
  });

  it('starts at the profile resting heart rate', () => {
    const s = createSession();
    expect(s.heartRate).toBe(s.profile.restingHr);
  });
});

describe('step', () => {
  it('does not mutate the session it is given', () => {
    const before = createSession();
    const snapshot = { ...before };
    step(before, 50);
    expect(before).toEqual(snapshot);
  });

  it('advances elapsed time by exactly the delta', () => {
    const s = step(createSession(), 50);
    expect(s.elapsedMs).toBe(50);
  });

  it('burns no steps at rest', () => {
    const s = advance(createSession(), 60);
    expect(s.steps).toBe(0);
  });

  it('accumulates whole steps only', () => {
    const running = setActivity(createSession(), 'run');
    const s = advance(running, 10);
    expect(Number.isInteger(s.steps)).toBe(true);
    expect(s.steps).toBeGreaterThan(0);
  });

  it('accumulates steps at roughly the activity cadence', () => {
    const walking = setActivity(createSession(), 'walk');
    const s = advance(walking, 60);
    // 108 steps/min for one minute, allowing for the fractional remainder.
    expect(s.steps).toBeGreaterThanOrEqual(106);
    expect(s.steps).toBeLessThanOrEqual(108);
  });

  it('burns more energy running than walking over the same period', () => {
    const walked = advance(setActivity(createSession(), 'walk'), 60);
    const ran = advance(setActivity(createSession(), 'run'), 60);
    expect(ran.calories).toBeGreaterThan(walked.calories);
  });

  it('eases heart rate toward the target rather than jumping', () => {
    const running = setActivity(createSession(), 'run');
    const afterOneTick = step(running, 50);
    // A real heart does not reach 170 bpm in 50 ms.
    expect(afterOneTick.heartRate).toBeLessThan(70);
  });

  it('approaches the activity target given enough time', () => {
    // The model adds per-tick jitter and a respiratory oscillation, so any
    // single sample can sit well off the target. The mean is the meaningful
    // assertion; testing one instant would be flaky by construction.
    let s = advance(setActivity(createSession(), 'run'), 120);
    const samples: number[] = [];
    for (let i = 0; i < 20 * 60; i++) {
      s = step(s, 50);
      samples.push(s.heartRate);
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(Math.abs(mean - ACTIVITIES.run.targetHr)).toBeLessThan(2);
  });

  it('never exceeds the profile maximum heart rate', () => {
    const s = advance(setActivity(createSession(), 'run'), 300);
    expect(s.heartRate).toBeLessThanOrEqual(s.profile.maxHr);
  });

  it('recovers toward resting when activity returns to rest', () => {
    const exerted = advance(setActivity(createSession(), 'run'), 90);
    const recovered = advance(setActivity(exerted, 'rest'), 120);
    expect(recovered.heartRate).toBeLessThan(exerted.heartRate);
  });
});

describe('setActivity', () => {
  it('changes activity without discarding accumulated progress', () => {
    const walked = advance(setActivity(createSession(), 'walk'), 30);
    const switched = setActivity(walked, 'run');
    expect(switched.activity).toBe('run');
    expect(switched.steps).toBe(walked.steps);
    expect(switched.calories).toBe(walked.calories);
  });
});

describe('formatDuration', () => {
  it('pads to hh:mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(9000)).toBe('00:00:09');
    expect(formatDuration(65000)).toBe('00:01:05');
    expect(formatDuration(3_725_000)).toBe('01:02:05');
  });
});
