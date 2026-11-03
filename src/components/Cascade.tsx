"use client";

import { useState } from "react";
import { MODELS, cascade, type BenchRun } from "@/lib/bench";
import type { ChallengerConfig } from "@/lib/types";
import { USE_CASES } from "@/lib/usecases";
import { Card, ModelDot, Stat, modelName, pct, usd } from "./ui";

const W = 520;
const H = 260;
const PAD = { l: 48, r: 16, t: 14, b: 36 };

export function Cascade({ runs, challenger }: { runs: Record<string, BenchRun>; challenger: ChallengerConfig }) {
  const [threshold, setThreshold] = useState(0.8);
  const all = Object.values(runs);
  const runChallenger = all[0]?.challenger ?? challenger;

  // The React Compiler memoizes these, so the sweep only reruns when runs change.
  const sweep = Array.from({ length: 21 }, (_, i) => cascade(USE_CASES, all, i / 20));
  const current = cascade(USE_CASES, all, threshold);
  // Both baselines cover the same items as the cascade: at 0% nothing is
  // escalated, at 100% everything the challenger can handle is.
  const elephantOnly = sweep[0];
  const challengerOnly = sweep[sweep.length - 1];

  if (!all.length || !elephantOnly.answered) {
    return (
      <Card>
        <p className="text-sm text-muted">Run the benchmark first; the cascade is simulated from its results.</p>
      </Card>
    );
  }

  const maxCost = Math.max(...sweep.map((p) => p.costPer1k), 1e-9);
  const minAcc = Math.min(...sweep.map((p) => p.accuracy)) - 0.05;
  const x = (c: number) => PAD.l + (c / maxCost) * (W - PAD.l - PAD.r);
  const y = (a: number) => H - PAD.b - ((a - minAcc) / (1 - minAcc)) * (H - PAD.t - PAD.b);

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-medium">Elephant first, challenger only when unsure</h3>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          elephant-1 answers every item. If its least confident answer on an item is below the threshold,
          the item goes to the challenger instead. Items the challenger can&apos;t handle (images) stay with
          elephant-1. This is simulated from your benchmark runs, so moving the slider is free.
        </p>

        <label className="mt-5 block">
          <div className="flex justify-between text-sm">
            <span>Escalate below confidence</span>
            <span className="font-mono">{pct(threshold)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Cascade accuracy" value={pct(current.accuracy, 1)} hint={`${usd(current.costPer1k)} per 1k`} />
          <Stat label="Sent to challenger" value={pct(current.escalated)} hint="of items" />
          <Stat
            label="elephant-1 only"
            value={pct(elephantOnly.accuracy, 1)}
            hint={`${usd(elephantOnly.costPer1k)} per 1k`}
          />
          <Stat
            label="Challenger wherever it can"
            value={pct(challengerOnly.accuracy, 1)}
            hint={`${usd(challengerOnly.costPer1k)} per 1k, images stay with elephant-1`}
          />
        </div>
      </Card>

      <Card>
        <h3 className="font-medium">Accuracy against cost</h3>
        <p className="mt-1 text-sm text-muted">Every threshold from 0% to 100%. Top left is the place to be.</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full max-w-2xl" role="img" aria-label="Cascade curve">
          {[0, 0.5, 1].map((t) => (
            <text
              key={t}
              x={x(t * maxCost)}
              y={H - PAD.b + 16}
              textAnchor={t === 1 ? "end" : t === 0 ? "start" : "middle"}
              fontSize="11"
              fill="var(--muted)"
            >
              {usd(t * maxCost)}
            </text>
          ))}
          {[minAcc, (minAcc + 1) / 2, 1].map((a) => (
            <g key={a}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(a)} y2={y(a)} stroke="var(--line)" />
              <text x={PAD.l - 8} y={y(a)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)">
                {pct(a)}
              </text>
            </g>
          ))}
          <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--muted)">
            cost per 1,000 decisions
          </text>
          <polyline
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="1.5"
            points={sweep.map((p) => `${x(p.costPer1k)},${y(p.accuracy)}`).join(" ")}
          />
          <circle cx={x(sweep[0].costPer1k)} cy={y(sweep[0].accuracy)} r="6" fill="var(--elephant)">
            <title>elephant-1 only</title>
          </circle>
          <circle cx={x(challengerOnly.costPer1k)} cy={y(challengerOnly.accuracy)} r="6" fill="var(--challenger)">
            <title>Challenger wherever it can</title>
          </circle>
          <circle cx={x(current.costPer1k)} cy={y(current.accuracy)} r="7" fill="none" stroke="var(--foreground)" strokeWidth="2">
            <title>Current threshold</title>
          </circle>
        </svg>
        <div className="mt-2 flex flex-wrap gap-x-5 text-xs text-muted">
          {MODELS.map((m) => (
            <span key={m} className="flex items-center gap-1.5">
              <ModelDot model={m} /> {modelName(m, runChallenger)}
            </span>
          ))}
          <span>○ current threshold</span>
        </div>
      </Card>
    </div>
  );
}
