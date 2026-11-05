"use client";

import { useState } from "react";
import { optionLabel } from "@/lib/answers";
import {
  agreement,
  flipRequest,
  hasChoice,
  modelsIn,
  score,
  type BenchRun,
  type ItemRun,
  type ModelStats,
} from "@/lib/bench";
import { decide, pool, stateOf, type DecideOutcome, type Settings } from "@/lib/client";
import type { LocalBackend, ModelId } from "@/lib/types";
import { USE_CASES, type UseCase } from "@/lib/usecases";
import type { RunSource } from "./Arena";
import { ReliabilityChart } from "./ReliabilityChart";
import { Card, ModelDot, Stat, modelName, modelText, pct, usd } from "./ui";

const CONCURRENCY = 4;
// The local server handles one request at a time; sending more only makes
// them queue, and the queueing would count as latency.
const LOCAL_CONCURRENCY = 1;

export function Benchmark({
  settings,
  runs,
  runSource,
  ready,
  local,
  onNeedKeys,
  onRun,
  onClear,
}: {
  settings: Settings;
  runs: Record<string, BenchRun>;
  runSource: RunSource;
  ready: boolean;
  local: LocalBackend | null;
  onNeedKeys: () => void;
  onRun: (run: BenchRun, opts: { addsToShown: boolean }) => void;
  onClear: () => void;
}) {
  const [flipTest, setFlipTest] = useState(true);
  const [withLocal, setWithLocal] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [selected, setSelected] = useState(USE_CASES[0].id);

  const allRuns = Object.values(runs);
  const present = modelsIn(allRuns);
  const stats = Object.fromEntries(
    present.map((m) => [m, score(USE_CASES, allRuns, m, { sharedWith: present })]),
  ) as Partial<Record<ModelId, ModelStats>>;
  const allItems = Object.fromEntries(present.map((m) => [m, score(USE_CASES, allRuns, m)])) as Partial<
    Record<ModelId, ModelStats>
  >;
  const runChallenger = allRuns[0]?.challenger ?? settings.challenger;
  const runLocal = allRuns.find((r) => r.local)?.local;
  const fullModels: ModelId[] = local && withLocal ? ["elephant", "local", "challenger"] : ["elephant", "challenger"];

  // With addsToShown, only `models` are run and their results are written
  // into the runs already shown (used to add the local model to a snapshot).
  async function runUseCases(list: UseCase[], models: ModelId[], addsToShown = false) {
    if (!addsToShown && !ready) return onNeedKeys();
    const sessionId = crypto.randomUUID();
    const total = list.reduce(
      (s, u) => s + u.items.length * models.length * (flipTest && hasChoice(u) ? 2 : 1),
      0,
    );
    let done = 0;
    for (const uc of list) {
      setProgress({ done, total, label: uc.title });
      const existing = addsToShown ? runs[uc.id] : undefined;
      const items: ItemRun[] = uc.items.map((it) => {
        const prev = existing?.items.find((r) => r.itemId === it.id);
        return { itemId: it.id, runs: { ...prev?.runs }, flipped: { ...prev?.flipped } };
      });
      const remoteTasks: (() => Promise<void>)[] = [];
      const localTasks: (() => Promise<void>)[] = [];
      for (const [i, item] of uc.items.entries()) {
        for (const m of models) {
          const variants: ("runs" | "flipped")[] = flipTest && hasChoice(uc) ? ["runs", "flipped"] : ["runs"];
          for (const v of variants) {
            (m === "local" ? localTasks : remoteTasks).push(async () => {
              let out: DecideOutcome;
              if (item.images?.length && (m === "challenger" || (m === "local" && !local?.images))) {
                out = { ok: false, error: "No image input", unsupported: true };
              } else {
                const request = { state: await stateOf(item), questions: uc.questions };
                out = await decide(m, v === "flipped" ? flipRequest(request) : request, settings, sessionId);
              }
              items[i][v][m] = out;
              done++;
              setProgress({ done, total, label: uc.title });
            });
          }
        }
      }
      await Promise.all([pool(remoteTasks, CONCURRENCY), pool(localTasks, LOCAL_CONCURRENCY)]);
      onRun(
        {
          useCaseId: uc.id,
          finishedAt: new Date().toISOString(),
          challenger: existing?.challenger ?? settings.challenger,
          local: models.includes("local") ? local?.label : existing?.local,
          items,
        },
        { addsToShown },
      );
    }
    setProgress(null);
  }

  function exportSnapshot() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), runs }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "latest.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const busy = progress !== null;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            {runSource === "snapshot" && (
              <span className="text-muted">Showing the published snapshot. Run it yourself to replace it.</span>
            )}
            {runSource === "local" && <span className="text-muted">Showing your own runs, saved in this browser.</span>}
            {runSource === "none" && <span className="text-muted">No runs yet.</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={flipTest} onChange={(e) => setFlipTest(e.target.checked)} />
              Option-order flip test
            </label>
            {local && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={withLocal} onChange={(e) => setWithLocal(e.target.checked)} />
                <ModelDot model="local" /> Include local
              </label>
            )}
            {local && allRuns.length > 0 && (
              <button
                disabled={busy}
                onClick={() => runUseCases(USE_CASES, ["local"], true)}
                className="rounded-md border border-line px-4 py-2 font-medium hover:border-foreground disabled:opacity-50"
                title="Runs only the local model and adds it to the results shown, free"
              >
                Add local runs
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => runUseCases(USE_CASES, fullModels)}
              className="rounded-md bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
            >
              Run all five
            </button>
            {runSource === "local" && (
              <>
                <button onClick={exportSnapshot} className="text-muted hover:text-foreground">
                  Export
                </button>
                <button onClick={onClear} disabled={busy} className="text-muted hover:text-foreground">
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted">
              <span>{progress.label}</span>
              <span className="font-mono">
                {progress.done}/{progress.total} calls
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-line">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {allRuns.length > 0 && (
        <>
          <div className={`grid gap-4 ${present.length > 2 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
            {present.map((m) => (
              <SummaryCard
                key={m}
                model={m}
                title={modelName(m, runChallenger, runLocal)}
                s={stats[m]!}
                all={allItems[m]!}
                agreesWithHosted={m === "local" ? agreement(allRuns, "local", "elephant") : undefined}
              />
            ))}
          </div>
          <p className="-mt-2 text-xs text-muted">
            {present.length > 2 ? "Every card counts" : "Both cards count"} only the items all{" "}
            {present.length} models could answer, so they compare the same questions.
          </p>

          <Card>
            <h3 className="font-medium">Does its 80% mean 80%?</h3>
            <p className="mt-1 text-sm text-muted">
              Each dot is a group of answers with similar confidence. On the diagonal, a model is exactly as
              sure as it should be; below it, overconfident. Dot size is the number of answers.
            </p>
            <ReliabilityChart stats={stats} />
          </Card>

          <Card>
            <h3 className="font-medium">By use case</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 pr-4 font-normal">Use case</th>
                    {present.map((m) => (
                      <th key={m} className="py-2 pr-4 font-normal">
                        <span className="flex items-center gap-1.5">
                          <ModelDot model={m} /> accuracy
                        </span>
                      </th>
                    ))}
                    {present.map((m) => (
                      <th key={m} className="py-2 pr-4 font-normal">
                        <span className="flex items-center gap-1.5">
                          <ModelDot model={m} /> flips
                        </span>
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {USE_CASES.map((u) => {
                    const run = runs[u.id];
                    const per = run
                      ? (Object.fromEntries(present.map((m) => [m, score([u], [run], m)])) as Record<ModelId, ModelStats>)
                      : null;
                    return (
                      <tr
                        key={u.id}
                        className={`border-t border-line ${selected === u.id ? "bg-background" : ""}`}
                      >
                        <td className="py-2 pr-4">
                          <button className="text-left hover:underline" onClick={() => setSelected(u.id)}>
                            {u.title}
                          </button>
                        </td>
                        {present.map((m) => (
                          <td key={m} className="py-2 pr-4 font-mono tabular-nums">
                            {!per ? "–" : per[m].answered ? pct(per[m].accuracy) : per[m].unsupported ? "can't see images" : "–"}
                          </td>
                        ))}
                        {present.map((m) => (
                          <td key={m} className="py-2 pr-4 font-mono tabular-nums">
                            {per?.[m].flipRate != null ? pct(per[m].flipRate!) : "–"}
                          </td>
                        ))}
                        <td className="py-2 text-right">
                          <button
                            disabled={busy}
                            onClick={() => runUseCases([u], fullModels)}
                            className="text-xs text-muted hover:text-foreground disabled:opacity-50"
                          >
                            {run ? "Re-run" : "Run"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {runs[selected] && (
            <ItemTable uc={USE_CASES.find((u) => u.id === selected)!} run={runs[selected]} models={present} />
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({
  model,
  title,
  s,
  all,
  agreesWithHosted,
}: {
  model: ModelId;
  title: string;
  s: ModelStats;
  all: ModelStats;
  agreesWithHosted?: ReturnType<typeof agreement>;
}) {
  return (
    <Card>
      <h3 className="flex items-center gap-2 font-medium">
        <ModelDot model={model} /> {title}
      </h3>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Stat label="Accuracy" value={pct(s.accuracy, 1)} hint={`${s.answered} answers`} />
        <Stat label="Brier" value={s.brier.toFixed(3)} hint="lower is better" />
        <Stat label="ECE" value={pct(s.ece, 1)} hint="calibration gap" />
        <Stat
          label="Flip rate"
          value={s.flipRate == null ? "–" : pct(s.flipRate, 1)}
          hint={s.flipRate == null ? "not run" : `of ${s.flipChecked} choice answers`}
        />
        <Stat
          label="Median latency"
          value={`${Math.round(s.medianLatencyMs)} ms`}
          hint={model === "local" ? "on this machine" : undefined}
        />
        <Stat
          label="Per 1k decisions"
          value={usd(s.costPer1k)}
          hint={model === "challenger" ? "list-price estimate" : model === "local" ? "only electricity" : undefined}
        />
      </div>
      {agreesWithHosted && agreesWithHosted.n > 0 && (
        <p className="mt-3 text-sm">
          Same pick as hosted elephant-1 on{" "}
          <span className="font-mono">{pct(agreesWithHosted.rate, 1)}</span> of {agreesWithHosted.n} answers. Its
          probability for that pick differs by {pct(agreesWithHosted.meanGap, 1)} on average: that&apos;s what 4-bit
          quantization (and the port) changes.
        </p>
      )}
      {(all.errors > 0 || all.unsupported > 0 || all.answered > s.answered) && (
        <p className="mt-3 text-xs text-muted">
          {all.errors > 0 && <span className="text-bad">{all.errors} failed calls. </span>}
          {all.unsupported > 0 && <span>{all.unsupported} image items skipped (no image input).</span>}
          {all.answered > s.answered && all.unsupported === 0 && (
            <span>
              Including the image items only it can see: {pct(all.accuracy, 1)} over {all.answered} answers.
            </span>
          )}
        </p>
      )}
    </Card>
  );
}

function ItemTable({ uc, run, models }: { uc: UseCase; run: BenchRun; models: ModelId[] }) {
  const questions = Object.entries(uc.questions);
  return (
    <Card>
      <h3 className="font-medium">{uc.title}: every item</h3>
      <p className="mt-1 text-sm text-muted">Pick and confidence per model. Red means it disagreed with the label.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2 pr-4 font-normal">Item</th>
              {questions.map(([name]) => (
                <th key={name} className="py-2 pr-4 font-normal">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uc.items.map((item) => {
              const ir = run.items.find((r) => r.itemId === item.id);
              return (
                <tr key={item.id} className="border-t border-line align-top">
                  <td className="py-2 pr-4 font-mono text-xs">{item.id}</td>
                  {questions.map(([name, q]) => (
                    <td key={name} className="py-2 pr-4">
                      <div className="text-xs text-muted">truth: {optionLabel(q, item.labels[name])}</div>
                      {models.map((m) => {
                        const out = ir?.runs[m];
                        if (!out) return null;
                        if (!out.ok)
                          return (
                            <div key={m} className="text-xs text-muted" title={out.error}>
                              <span className={modelText[m]}>●</span> {out.unsupported ? "skipped" : "error"}
                            </div>
                          );
                        const a = out.result.answers[name];
                        if (!a) return null;
                        const right = a.pick === item.labels[name];
                        return (
                          <div key={m} className={`text-xs ${right ? "" : "text-bad"}`}>
                            <span className={modelText[m]}>●</span> {optionLabel(q, a.pick)}{" "}
                            <span className="font-mono text-muted">{pct(a.confidence)}</span>
                          </div>
                        );
                      })}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
