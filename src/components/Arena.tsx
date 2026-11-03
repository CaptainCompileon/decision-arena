"use client";

import { useEffect, useState } from "react";
import type { BenchRun } from "@/lib/bench";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "@/lib/client";
import { Benchmark } from "./Benchmark";
import { Cascade } from "./Cascade";
import { Playground } from "./Playground";
import { SettingsPanel, type ServerKeys } from "./SettingsPanel";
import { ModelDot, modelName } from "./ui";

const TABS = ["Playground", "Benchmark", "Cascade"] as const;
type Tab = (typeof TABS)[number];

const RUNS_KEY = "decision-arena:runs";
export type RunSource = "none" | "local" | "snapshot";

export function Arena() {
  const [tab, setTab] = useState<Tab>("Playground");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [serverKeys, setServerKeys] = useState<ServerKeys>({ elephant: false, challenger: false });
  const [showSettings, setShowSettings] = useState(false);
  const [runs, setRuns] = useState<Record<string, BenchRun>>({});
  const [runSource, setRunSource] = useState<RunSource>("none");

  useEffect(() => {
    // Browser-only state is read after mount so server and client HTML match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setServerKeys(c.serverKeys))
      .catch(() => {});

    let local: Record<string, BenchRun> | null = null;
    try {
      const raw = localStorage.getItem(RUNS_KEY);
      if (raw) local = JSON.parse(raw);
    } catch {}
    if (local && Object.keys(local).length) {
      setRuns(local);
      setRunSource("local");
    } else {
      // No runs of your own yet: show the published snapshot, if there is one.
      fetch("/results/latest.json")
        .then((r) => (r.ok ? r.json() : null))
        .then((snap) => {
          if (snap?.runs) {
            setRuns(snap.runs);
            setRunSource("snapshot");
          }
        })
        .catch(() => {});
    }
  }, []);

  function updateRun(run: BenchRun) {
    setRuns((prev) => {
      const base = runSource === "snapshot" ? {} : prev;
      const next = { ...base, [run.useCaseId]: run };
      try {
        localStorage.setItem(RUNS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setRunSource("local");
  }

  function clearRuns() {
    try {
      localStorage.removeItem(RUNS_KEY);
    } catch {}
    setRuns({});
    setRunSource("none");
  }

  const hasElephantKey = !!settings.basetenKey || serverKeys.elephant;
  const hasChallengerKey = !!settings.challengerKey || serverKeys.challenger;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Decision Arena</h1>
          <p className="mt-1 text-muted">
            A 9B <em>decision</em> model that answers in calibrated probabilities, against a general chat
            model asked to do the same. Five everyday decisions, scored on accuracy, calibration,
            stability and cost.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="flex items-center gap-2">
              <ModelDot model="elephant" /> {modelName("elephant", settings.challenger)}
            </span>
            <span className="flex items-center gap-2">
              <ModelDot model="challenger" /> {modelName("challenger", settings.challenger)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm hover:border-foreground"
        >
          <KeyLight on={hasElephantKey} /> <KeyLight on={hasChallengerKey} /> API keys
        </button>
      </header>

      <nav className="mt-8 flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t ? "border-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="mt-6">
        {tab === "Playground" && (
          <Playground settings={settings} onNeedKeys={() => setShowSettings(true)} ready={hasElephantKey} />
        )}
        {tab === "Benchmark" && (
          <Benchmark
            settings={settings}
            runs={runs}
            runSource={runSource}
            ready={hasElephantKey && hasChallengerKey}
            onNeedKeys={() => setShowSettings(true)}
            onRun={updateRun}
            onClear={clearRuns}
          />
        )}
        {tab === "Cascade" && <Cascade runs={runs} challenger={settings.challenger} />}
      </main>

      <footer className="mt-16 border-t border-line pt-4 text-xs text-muted">
        Benchmark items are small, hand-labelled and partly ambiguous on purpose. Treat the numbers
        as a demo of the method, not a leaderboard. Challenger cost is estimated from list prices.
      </footer>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          serverKeys={serverKeys}
          onSave={(s) => {
            setSettings(s);
            saveSettings(s);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function KeyLight({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block size-2 rounded-full ${on ? "bg-good" : "bg-line"}`}
      title={on ? "Key set" : "No key"}
    />
  );
}
