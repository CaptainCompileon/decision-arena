import type { ModelStats } from "@/lib/bench";
import type { ModelId } from "@/lib/types";
import { modelColor as COLOR } from "./ui";

const W = 360;
const H = 300;
const PAD = { l: 44, r: 12, t: 12, b: 36 };
const x = (v: number) => PAD.l + v * (W - PAD.l - PAD.r);
const y = (v: number) => H - PAD.b - v * (H - PAD.t - PAD.b);

// Confidence (x) against how often that confidence was right (y).
export function ReliabilityChart({ stats }: { stats: Partial<Record<ModelId, ModelStats>> }) {
  const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full max-w-md" role="img" aria-label="Reliability chart">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={PAD.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)">
            {t * 100}%
          </text>
          <text x={x(t)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">
            {t * 100}%
          </text>
        </g>
      ))}
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--muted)" strokeDasharray="4 4" />
      <text x={(x(0) + x(1)) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--muted)">
        stated confidence
      </text>
      <text
        transform={`translate(11 ${(y(0) + y(1)) / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize="11"
        fill="var(--muted)"
      >
        actually right
      </text>
      {(Object.keys(stats) as ModelId[]).map((m) => {
        const pts = stats[m]!.bins.filter((b) => b.n > 0);
        const max = Math.max(1, ...Object.values(stats).flatMap((s) => s!.bins.map((b) => b.n)));
        return (
          <g key={m}>
            <polyline
              fill="none"
              stroke={COLOR[m]}
              strokeWidth="2"
              points={pts.map((b) => `${x(b.confidence)},${y(b.accuracy)}`).join(" ")}
            />
            {pts.map((b) => (
              <circle
                key={b.lo}
                cx={x(b.confidence)}
                cy={y(b.accuracy)}
                r={3 + 6 * Math.sqrt(b.n / max)}
                fill={COLOR[m]}
                fillOpacity="0.8"
              >
                <title>{`${b.n} answers at ~${Math.round(b.confidence * 100)}% confidence, ${Math.round(b.accuracy * 100)}% right`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
