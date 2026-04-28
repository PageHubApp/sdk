import React, { useState } from "react";
import { TbCheck, TbCopy, TbPlus, TbTrash } from "react-icons/tb";
import {
  SettingsFormCard,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../primitives/layout/tooltipSurface";

interface VariablesTabProps {
  inputClass: string;
  customVariables: { key: string; value: string }[];
  setCustomVariables: (v: { key: string; value: string }[]) => void;
}

const BUILT_IN_TOKENS = [
  "company.name",
  "company.tagline",
  "company.email",
  "company.phone",
  "company.location",
  "company.website",
  "year",
];

export function VariablesTab({
  inputClass,
  customVariables,
  setCustomVariables,
}: VariablesTabProps) {
  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Variables"
        description="Define reusable snippets that you can paste into any text or button label across the site."
      />

      <SettingsFormCard title="Custom variables">
        <div className="flex items-center justify-between gap-2">
          <p className="text-neutral-content text-sm">
            Define{" "}
            <code className="bg-base-300/60 rounded px-1 py-0.5 font-mono text-xs">
              {"{{variables.key}}"}
            </code>{" "}
            for reusable snippets in text.
          </p>
          <button
            type="button"
            onClick={() => setCustomVariables([...customVariables, { key: "", value: "" }])}
            className="btn btn-secondary btn-sm shrink-0 gap-1"
          >
            <TbPlus className="size-3.5" />
            Add variable
          </button>
        </div>

        {customVariables.length === 0 ? (
          <p className="text-neutral-content text-sm">No custom variables yet.</p>
        ) : null}

        {customVariables.length > 0 ? (
          <div className="space-y-2">
            <div className="text-neutral-content grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2 text-xs font-medium">
              <span>Key</span>
              <span>Value</span>
              <span className="size-9" aria-hidden />
            </div>
            {customVariables.map((variable, index) => (
              <div
                key={index}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] items-center gap-2"
              >
                <label className="input flex items-center">
                  <span className="text-neutral-content shrink-0 font-mono text-xs">
                    variables.
                  </span>
                  <input
                    type="text"
                    value={variable.key}
                    onChange={e => {
                      const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                      const updated = [...customVariables];
                      updated[index] = { ...updated[index], key: sanitized };
                      setCustomVariables(updated);
                    }}
                    className="grow"
                    placeholder="myField"
                    aria-label="Variable key"
                  />
                </label>
                <input
                  type="text"
                  value={variable.value}
                  onChange={e => {
                    const updated = [...customVariables];
                    updated[index] = { ...updated[index], value: e.target.value };
                    setCustomVariables(updated);
                  }}
                  className={inputClass}
                  placeholder="Value to display"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = customVariables.filter((_, i) => i !== index);
                    setCustomVariables(updated);
                  }}
                  className="btn btn-ghost btn-square btn-sm hover:text-error"
                  aria-label="Remove variable"
                >
                  <TbTrash className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </SettingsFormCard>

      <SettingsFormCard title="Available tokens">
        <p className="text-neutral-content text-sm">
          Click any token to copy it. Paste into a text or button label.
        </p>
        <div className="flex flex-wrap gap-2">
          {BUILT_IN_TOKENS.map(token => (
            <CopyTokenChip key={token} token={`{{${token}}}`} />
          ))}
          {customVariables
            .filter(v => v.key.trim())
            .map(v => (
              <CopyTokenChip
                key={v.key}
                token={`{{variables.${v.key}}}`}
                accent
              />
            ))}
        </div>
      </SettingsFormCard>
    </div>
  );
}

function CopyTokenChip({ token, accent = false }: { token: string; accent?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const base = accent
    ? "bg-primary/10 text-primary hover:bg-primary/20"
    : "bg-base-200 text-base-content hover:bg-base-300";

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={copied ? "Copied" : "Click to copy"}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs transition-colors ${base}`}
    >
      {copied ? (
        <TbCheck className="text-success size-3 shrink-0" />
      ) : (
        <TbCopy className="size-3 shrink-0" />
      )}
      <span className="min-w-0 truncate">{token}</span>
    </button>
  );
}
