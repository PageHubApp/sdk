import React from "react";
import { TbInfoCircle, TbPlus, TbTrash } from "react-icons/tb";
import {
  SettingsCallout,
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
        description="Send old URLs to new destinations. Helps visitors and search engines when paths change."
      />

      <SettingsFormCard title="Rules">
        {redirects.map((rule, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1 space-y-2">
              <input
                type="text"
                value={rule.from}
                onChange={e => {
                  const updated = [...redirects];
                  updated[i] = { ...updated[i], from: e.target.value };
                  setRedirects(updated);
                }}
                className={inputClass}
                placeholder="From path, e.g. /old-page"
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
                placeholder="To path or https://…"
                aria-label={`Redirect to ${i + 1}`}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch sm:pt-0.5">
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
                className="border-base-300 bg-base-200 text-neutral-content hover:border-error hover:bg-error/10 hover:text-error flex size-10 items-center justify-center rounded-lg border shadow-sm transition-colors"
                aria-label="Remove redirect"
              >
                <TbTrash className="size-4" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setRedirects([...redirects, { from: "", to: "", permanent: true }])}
          className="border-base-300 text-neutral-content hover:border-primary hover:text-base-content flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors"
        >
          <TbPlus className="size-4" />
          Add redirect
        </button>
      </SettingsFormCard>

      {redirects.length > 0 ? (
        <SettingsCallout icon={<TbInfoCircle />} title="301 vs 302">
          <p>
            <strong className="text-base-content">301</strong> is permanent — search engines
            transfer ranking signals to the new URL.{" "}
            <strong className="text-base-content">302</strong> is temporary — the original URL may
            stay indexed.
          </p>
        </SettingsCallout>
      ) : null}
    </div>
  );
}
