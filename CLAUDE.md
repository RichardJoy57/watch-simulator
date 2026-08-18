# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A fitness-watch telemetry dashboard (React + TypeScript + Vite) that runs entirely client-side.
Heart rate, calories and step cadence are produced by a physiological model (`src/lib/simulator.ts`),
not replayed from a recording — the dashboard reacts live when the user changes activity. Nothing on
the page is real medical data; the ECG trace is a caricature, not a diagnostic waveform.

## Commands

```bash
npm run dev          # start Vite dev server
npm run build         # production build to dist/
npm run preview       # preview the production build
npm test               # run the vitest suite once
npm run test:watch    # vitest in watch mode
```

Run a single test file: `npx vitest run src/lib/simulator.test.ts`
Run tests matching a name: `npx vitest run -t "eases heart rate"`

There is no separate lint/typecheck script; `tsc` runs implicitly via Vite's build. TypeScript is
strict (`strict`, `noUnusedLocals`, `noUnusedParameters` all on in `tsconfig.json`).

## Architecture

### The model is deliberately isolated from React

`src/lib/simulator.ts` holds the entire physiological model and imports nothing from React, so it
can be unit-tested in isolation (see `src/lib/simulator.test.ts`) and reasoned about without a DOM.

- `step(session, dtMs)` is a pure function: same input → same output, no mutation. This is the one
  invariant the test suite leans on most heavily — preserve it in any change to the model.
- Heart rate eases exponentially toward an activity's target (`targetHr`) rather than snapping to
  it, plus a respiratory sinus oscillation (wider swing at rest than during activity).
- Calories use the standard MET equation: `kcal/min = MET × 3.5 × kg / 200`.
- Steps accumulate as a fractional remainder (`stepRemainder`) and only the visible counter
  increments on whole footfalls — this is why cadence-based step tests allow a small range rather
  than an exact count.
- `ACTIVITIES` is declared `as const satisfies Record<string, ActivityConfig>`; `ActivityKey` is
  derived from it (`keyof typeof ACTIVITIES`) rather than hand-maintained, so adding an activity
  only means adding one entry to `ACTIVITIES`.

### Three consumers, three refresh rates

This is the main architectural decision in the app, implemented in `src/hooks/useSimulation.ts` and
`src/components/EcgTrace.tsx`:

| Consumer | Rate | Mechanism |
| --- | --- | --- |
| Physiological model (`step`) | 20 Hz | `setInterval` inside `useSimulation` |
| Metric cards, clock | 4 Hz | published to React state (`snapshot`) |
| Trend chart | 1 Hz | appended to a 90-point capped window (`trend`) |
| ECG waveform | ~60 Hz | `requestAnimationFrame` in `EcgTrace`, reads `sessionRef` directly, paints to `<canvas>` |

The model must integrate at 20 Hz or the heart-rate easing looks stepped, but re-rendering the whole
tree 20×/sec is wasteful, so `useSimulation` only calls `setState` every 5th tick (4 Hz). The ECG
canvas needs every frame, so `EcgTrace` bypasses React state entirely: it takes a `MutableRefObject<Session>`
(`sessionRef`, kept live by `useSimulation` on every model tick) and reads `sessionRef.current.heartRate`
inside its own rAF loop. `EcgTrace` never re-renders after mount — if you need it to react to new
props, that defeats the reason it exists.

When touching `useSimulation`, preserve this split: don't move the 20 Hz tick onto React state, and
don't make `EcgTrace` subscribe to state instead of reading the ref.

### Layout

```
src/lib/simulator.ts        physiological model — no React, fully unit-testable
src/hooks/useSimulation.ts  drives the model at 20 Hz, publishes state at 4 Hz / 1 Hz
src/components/
  EcgTrace.tsx               canvas waveform, rAF, outside the render cycle
  MetricCard.tsx             one reading
  TrendChart.tsx             90-second heart-rate window (Recharts)
  ActivityControl.tsx        activity selector
src/App.tsx
src/index.css                design tokens and layout
```

## Design language

Clinical telemetry paper, not the dark-mode-and-neon convention of fitness apps: a 1 mm/5 mm ECG
grid as the page background, IBM Plex Condensed for readings, IBM Plex Mono for instrument labels,
and a single stylus-red accent reserved for the heart-rate trace.

## Deployment

Fully static, no backend and no environment variables. Deployed to Vercel at
https://watch-simulator.vercel.app/ using the detected Vite defaults (`npm run build`, output `dist`).
