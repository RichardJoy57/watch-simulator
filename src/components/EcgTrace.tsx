import { useEffect, useRef, type MutableRefObject } from 'react';
import { ecgSample, type Session } from '../lib/simulator';

type TracePoint = { x: number; v: number };

type TraceState = {
  x: number;
  beatPhase: number;
  last: number;
  points: TracePoint[];
};

type EcgTraceProps = {
  sessionRef: MutableRefObject<Session>;
  running: boolean;
};

/**
 * The scrolling ECG trace.
 *
 * This component never re-renders after mount. It reads the live session out
 * of a ref inside requestAnimationFrame and paints to a canvas, which keeps a
 * 60 fps waveform completely outside React's render cycle.
 */
export default function EcgTrace({ sessionRef, running }: EcgTraceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<TraceState>({ x: 0, beatPhase: 0, last: 0, points: [] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame: number;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    function draw(now: number) {
      if (!canvas || !ctx) return;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const s = stateRef.current;

      const dt = s.last ? Math.min(now - s.last, 60) : 16;
      s.last = now;

      if (running && !prefersReducedMotion) {
        const hr = sessionRef.current.heartRate;
        const beatDurationMs = 60000 / hr;
        s.beatPhase = (s.beatPhase + dt / beatDurationMs) % 1;

        const pxPerMs = 0.09;
        s.x += dt * pxPerMs;

        s.points.push({ x: s.x, v: ecgSample(s.beatPhase) });
        while (s.points.length && s.points[0].x < s.x - w) s.points.shift();
      }

      ctx.clearRect(0, 0, w, h);

      const mid = h * 0.55;
      const amplitude = h * 0.34;

      ctx.beginPath();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--trace-color');
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      s.points.forEach((p, i) => {
        const px = p.x - (s.x - w);
        const py = mid - p.v * amplitude;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      const head = s.points[s.points.length - 1];
      if (head) {
        ctx.beginPath();
        ctx.arc(w, mid - head.v * amplitude, 3, 0, Math.PI * 2);
        ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--trace-color');
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [sessionRef, running]);

  return (
    <div className="ecg">
      <div className="ecg__label">
        <span className="eyebrow">Lead II · synthetic</span>
        <span className="eyebrow eyebrow--muted">25 mm/s</span>
      </div>
      <canvas ref={canvasRef} className="ecg__canvas" aria-hidden="true" />
      <p className="visually-hidden">
        A simulated electrocardiogram trace. All values on this page are generated
        by a model and are not real measurements.
      </p>
    </div>
  );
}
