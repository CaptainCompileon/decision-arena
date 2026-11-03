"use client";

import { useRef, useState } from "react";
import { MODELS } from "@/lib/bench";
import { decide, stateOf, type DecideOutcome, type Settings } from "@/lib/client";
import type { ModelId } from "@/lib/types";
import { USE_CASES, getUseCase } from "@/lib/usecases";
import { Card, ModelDot, ProbBars, modelName, usd } from "./ui";

export function Playground({
  settings,
  ready,
  onNeedKeys,
}: {
  settings: Settings;
  ready: boolean;
  onNeedKeys: () => void;
}) {
  const [useCaseId, setUseCaseId] = useState(USE_CASES[0].id);
  const [itemIndex, setItemIndex] = useState(0);
  const [text, setText] = useState(USE_CASES[0].items[0].text);
  const [upload, setUpload] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Partial<Record<ModelId, DecideOutcome>>>({});
  // Created on first use: a random value during render breaks prerendering.
  const sessionId = useRef<string | null>(null);

  const uc = getUseCase(useCaseId);
  const item = uc.items[itemIndex];
  const isVision = !!item?.images?.length;
  // Ground truth applies only while the example is unedited.
  const pristine = item && text === item.text && !upload;
  const images = upload ? [upload] : item?.images;

  function pick(ucId: string, index: number) {
    const next = getUseCase(ucId);
    setUseCaseId(ucId);
    setItemIndex(index);
    setText(next.items[index].text);
    setUpload(null);
    setOutcomes({});
  }

  async function run() {
    if (!ready) return onNeedKeys();
    setBusy(true);
    setOutcomes({});
    sessionId.current ??= crypto.randomUUID();
    const session = sessionId.current;
    const state = upload ? { text, images: [upload] } : await stateOf({ text, images: item?.images });
    const request = { state, questions: uc.questions };
    await Promise.all(
      MODELS.map(async (m) => {
        const out = await decide(m, request, settings, session);
        setOutcomes((prev) => ({ ...prev, [m]: out }));
      }),
    );
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-5">
        {USE_CASES.map((u) => (
          <button
            key={u.id}
            onClick={() => pick(u.id, 0)}
            className={`rounded-lg border p-3 text-left text-sm ${
              u.id === useCaseId ? "border-foreground bg-surface" : "border-line hover:border-muted"
            }`}
          >
            <div className="font-medium">{u.title}</div>
            <div className="mt-0.5 text-xs text-muted">for {u.audience}</div>
          </button>
        ))}
      </div>

      <Card>
        <p className="text-sm text-muted">{uc.blurb}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            Example
            <select
              className="rounded-md border border-line bg-background px-2 py-1"
              value={itemIndex}
              onChange={(e) => pick(useCaseId, Number(e.target.value))}
            >
              {uc.items.map((it, i) => (
                <option key={it.id} value={i}>
                  {i + 1}. {it.id}
                </option>
              ))}
            </select>
          </label>
          {isVision && (
            <label className="cursor-pointer rounded-md border border-line px-2 py-1 hover:border-foreground">
              Upload your own screenshot
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setUpload(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          )}
        </div>

        <div className={`mt-4 grid gap-4 ${images?.length ? "md:grid-cols-[1fr_280px]" : ""}`}>
          <textarea
            className="min-h-40 w-full rounded-md border border-line bg-background p-3 font-mono text-sm outline-none focus:border-foreground"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Situation"
          />
          {images?.length ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt="Screenshot to judge" className="w-full rounded-md border border-line" />
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted">
            Questions:{" "}
            {Object.entries(uc.questions).map(([name, q]) => (
              <span key={name} className="mr-3 font-mono">
                {name} <span className="opacity-70">({q.type})</span>
              </span>
            ))}
          </div>
          <button
            onClick={run}
            disabled={busy}
            className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Deciding…" : ready ? "Decide with both" : "Add API keys"}
          </button>
        </div>
      </Card>

      {(busy || Object.keys(outcomes).length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {MODELS.map((m) => (
            <Result
              key={m}
              model={m}
              title={modelName(m, settings.challenger)}
              outcome={outcomes[m]}
              questions={uc.questions}
              labels={pristine ? item.labels : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Result({
  model,
  title,
  outcome,
  questions,
  labels,
}: {
  model: ModelId;
  title: string;
  outcome?: DecideOutcome;
  questions: ReturnType<typeof getUseCase>["questions"];
  labels?: Record<string, string>;
}) {
  return (
    <Card>
      <h3 className="flex items-center gap-2 font-medium">
        <ModelDot model={model} /> {title}
      </h3>
      {!outcome && <p className="mt-4 text-sm text-muted">Waiting…</p>}
      {outcome && !outcome.ok && (
        <p className={`mt-4 text-sm ${outcome.unsupported ? "text-muted" : "text-bad"}`}>{outcome.error}</p>
      )}
      {outcome?.ok && (
        <>
          <div className="mt-1 flex flex-wrap gap-x-4 font-mono text-xs text-muted">
            <span>{outcome.result.latencyMs} ms</span>
            <span>
              {outcome.result.usage.inputTokens} in / {outcome.result.usage.outputTokens} out tokens
            </span>
            <span>{usd(outcome.result.costUsd)}</span>
          </div>
          <div className="mt-4 space-y-5">
            {Object.entries(questions).map(([name, q]) => {
              const a = outcome.result.answers[name];
              return (
                <div key={name}>
                  <div className="mb-2 text-sm">
                    <span className="font-mono text-xs text-muted">{name}</span> {q.instructions}
                  </div>
                  {a ? <ProbBars question={q} answer={a} model={model} label={labels?.[name]} /> : null}
                </div>
              );
            })}
          </div>
          {outcome.result.reason && (
            <p className="mt-4 border-t border-line pt-3 text-sm text-muted">“{outcome.result.reason}”</p>
          )}
        </>
      )}
    </Card>
  );
}
