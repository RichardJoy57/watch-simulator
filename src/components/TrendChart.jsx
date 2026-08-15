import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Heart rate over the last 90 seconds.
 *
 * The window is capped in the hook rather than here, so this component stays
 * a pure function of the data it is handed.
 */
export default function TrendChart({ data }) {
  if (data.length < 2) {
    return (
      <div className="trend trend--empty">
        <p>Collecting data. The trend appears after a few seconds.</p>
      </div>
    );
  }

  return (
    <div className="trend">
      <div className="trend__head">
        <span className="eyebrow">Heart rate · last 90 s</span>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--pulse)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--pulse)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--grid-strong)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--grid-strong)' }}
            tickFormatter={(t) => `${t}s`}
            minTickGap={28}
          />
          <YAxis
            domain={[40, 190]}
            tick={{ fontSize: 11, fill: 'var(--ink-soft)', fontFamily: 'IBM Plex Mono' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--paper)',
              border: '1px solid var(--grid-strong)',
              borderRadius: 2,
              fontFamily: 'IBM Plex Mono',
              fontSize: 12,
            }}
            labelFormatter={(t) => `t = ${t}s`}
            formatter={(v) => [`${v} bpm`, 'Heart rate']}
          />
          <Area
            type="monotone"
            dataKey="heartRate"
            stroke="var(--pulse)"
            strokeWidth={1.8}
            fill="url(#hrFill)"
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
