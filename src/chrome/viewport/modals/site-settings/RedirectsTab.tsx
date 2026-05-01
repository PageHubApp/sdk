import React from "react";
import { TbPlus, TbTrash } from "react-icons/tb";
import {
  SettingsFormCard,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";

interface RedirectsTabProps {
  inputClass: string;
  selectClass: string;
  redirects: { from: string; to: string; permanent: boolean }[];
  setRedirects: React.Dispatch<
    React.SetStateAction<{ from: string; to: string; permanent: boolean }[]>
  >;
}

export function RedirectsTab({
  inputClass,
  selectClass,
  redirects,
  setRedirects,
}: RedirectsTabProps) {
  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Redirects"
        description="Send old URLs to new destinations. 301 is permanent, 302 is temporary."
      />

      <SettingsFormCard title="Rules">
        <div className="flex items-center justify-between gap-2">
          <p className="text-neutral-content text-sm">
            {redirects.length === 0
              ? "No redirects yet."
              : `${redirects.length} ${redirects.length === 1 ? "rule" : "rules"}`}
          </p>
          <button
            type="button"
            onClick={() => setRedirects([...redirects, { from: "", to: "", permanent: true }])}
            className="btn btn-secondary btn-sm shrink-0 gap-1"
          >
            <TbPlus className="size-3.5" />
            Add redirect
          </button>
        </div>

        {redirects.length > 0 ? (
          <div className="space-y-2">
            <div className="text-neutral-content grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_auto] gap-2 text-xs font-medium">
              <span>From</span>
              <span>To</span>
              <span>Type</span>
              <span className="size-9" aria-hidden />
            </div>
            {redirects.map((rule, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem_auto] items-center gap-2"
              >
                <input
                  type="text"
                  value={rule.from}
                  onChange={e => {
                    const updated = [...redirects];
                    updated[i] = { ...updated[i], from: e.target.value };
                    setRedirects(updated);
                  }}
                  className={inputClass}
                  placeholder="/old-page"
                  aria-label={`Redirect from ${i + 1}`}
                />
                <input
                  type="text"
                  value={rule.to}
                  onChange={e => {
                    const updated = [...redirects];
                    updated[i] = { ...updated[i], to: e.target.value };
                    setRedirects(updated);
                  }}
                  className={inputClass}
                  placeholder="/new or https://…"
                  aria-label={`Redirect to ${i + 1}`}
                />
                <select
                  value={rule.permanent ? "301" : "302"}
                  onChange={e => {
                    const updated = [...redirects];
                    updated[i] = { ...updated[i], permanent: e.target.value === "301" };
                    setRedirects(updated);
                  }}
                  className={selectClass}
                  aria-label={`Redirect type ${i + 1}`}
                >
                  <option value="301">301</option>
                  <option value="302">302</option>
                </select>
                <button
                  type="button"
                  onClick={() => setRedirects(redirects.filter((_, j) => j !== i))}
                  className="btn btn-ghost btn-square btn-sm hover:text-error"
                  aria-label="Remove redirect"
                >
                  <TbTrash className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </SettingsFormCard>
    </div>
  );
}
