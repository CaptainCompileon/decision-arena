import { optionLabel, optionsOf } from "@/lib/answers";
import { CHALLENGER_PROVIDERS, ELEPHANT } from "@/lib/providers";
import type { Answer, ChallengerConfig, ModelId, Question } from "@/lib/types";

export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;

export function usd(x: number) {
  if (x === 0) return "$0";
  if (x < 0.001) return `$${x.toFixed(6)}`;
  if (x < 1) return `$${x.toFixed(4)}`;
  return `$${x.toFixed(2)}`;
}

export function modelName(model: ModelId, challenger: ChallengerConfig) {
  return model === "elephant"
    ? ELEPHANT.label
    : `${challenger.model} · ${CHALLENGER_PROVIDERS[challenger.provider].label}`;
}

export const modelText = { elephant: "text-elephant", challenger: "text-challenger" } as const;
export const modelBg = { elephant: "bg-elephant", challenger: "bg-challenger" } as const;

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-5 ${className}`}>{children}</section>
  );
}

export function ModelDot({ model }: { model: ModelId }) {
  return <span className={`inline-block size-2.5 shrink-0 rounded-full ${modelBg[model]}`} aria-hidden />;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 font-mono text-lg tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

// One bar per option. The pick is solid, the ground truth (if known) is ticked.
export function ProbBars({
  question,
  answer,
  model,
  label,
}: {
  question: Question;
  answer: Answer;
  model: ModelId;
  label?: string;
}) {
  return (
    <ul className="space-y-1.5">
      {optionsOf(question).map((o) => {
        const p = answer.probabilities[o] ?? 0;
        const isPick = o === answer.pick;
        return (
          <li key={o} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className={isPick ? "font-medium" : "text-muted"}>
                {optionLabel(question, o)}
                {label === o && <span className="ml-1.5 text-good" title="Ground truth">✓</span>}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted">{pct(p, 1)}</span>
            </div>
            <div className="mt-0.5 h-1.5 rounded-full bg-line">
              <div
                className={`h-full rounded-full ${modelBg[model]} ${isPick ? "" : "opacity-35"}`}
                style={{ width: `${Math.max(p * 100, 0.5)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
