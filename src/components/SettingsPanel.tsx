"use client";

import { useState } from "react";
import type { Settings } from "@/lib/client";
import { CHALLENGER_PROVIDERS } from "@/lib/providers";
import type { ChallengerProviderId, LocalBackend } from "@/lib/types";

export type ServerKeys = { elephant: boolean; challenger: boolean };

const input =
  "w-full rounded-md border border-line bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground";

export function SettingsPanel({
  settings,
  serverKeys,
  local,
  onSave,
  onClose,
}: {
  settings: Settings;
  serverKeys: ServerKeys;
  local: LocalBackend | null;
  onSave: (s: Settings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(settings);
  const provider = CHALLENGER_PROVIDERS[draft.challenger.provider];

  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-label="API keys"
        className="w-full max-w-lg space-y-5 rounded-xl border border-line bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-semibold">Bring your own keys</h2>
          <p className="mt-1 text-sm text-muted">
            Keys stay in this browser and go to the provider through this app&apos;s proxy, one request
            at a time. They are never stored on the server.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Baseten API key (elephant-1)</span>
          <input
            className={input}
            type="password"
            autoComplete="off"
            placeholder={serverKeys.elephant ? "Using the key from .env.local" : "Paste key"}
            value={draft.basetenKey}
            onChange={(e) => setDraft({ ...draft, basetenKey: e.target.value })}
          />
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Challenger</legend>
          <div className="grid grid-cols-2 gap-3">
            <select
              className={input}
              value={draft.challenger.provider}
              onChange={(e) => {
                const id = e.target.value as ChallengerProviderId;
                setDraft({ ...draft, challenger: { provider: id, model: CHALLENGER_PROVIDERS[id].defaultModel } });
              }}
            >
              {Object.entries(CHALLENGER_PROVIDERS).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              className={input}
              aria-label="Model ID"
              value={draft.challenger.model}
              onChange={(e) => setDraft({ ...draft, challenger: { ...draft.challenger, model: e.target.value } })}
            />
          </div>
          <input
            className={input}
            type="password"
            autoComplete="off"
            aria-label="Challenger API key"
            placeholder={serverKeys.challenger ? "Using the key from .env.local" : `Paste key (${provider.keyHint})`}
            value={draft.challengerKey}
            onChange={(e) => setDraft({ ...draft, challengerKey: e.target.value })}
          />
        </fieldset>

        <div className="space-y-1">
          <div className="text-sm font-medium">Self-hosted elephant-1</div>
          <p className="text-sm text-muted">
            {local ? (
              <span className="text-good">
                Found {local.label}
                {local.images ? ", with image input" : ", text only"}. No key needed.
              </span>
            ) : (
              <>
                Not running. On an Apple silicon Mac, run <code className="font-mono">npm run mlx</code>; for an
                NVIDIA GPU, see the README&apos;s llama.cpp section. A deployed copy can&apos;t reach either.
              </>
            )}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button className="rounded-md px-4 py-2 text-sm text-muted hover:text-foreground" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
