import React from "react";
import { TbInfoCircle, TbPlus, TbTrash } from "react-icons/tb";

interface RedirectsTabProps {
  inputClass: string;
  redirects: { from: string; to: string; permanent: boolean }[];
  setRedirects: React.Dispatch<React.SetStateAction<{ from: string; to: string; permanent: boolean }[]>>;
}

export function RedirectsTab({ inputClass, redirects, setRedirects }: RedirectsTabProps) {
  return (
    <div className="space-y-6">
      <div className="mb-4 space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          301 Redirects
        </h3>
        <p className="text-sm text-muted-foreground">
          Redirect old URLs to new ones. Prevents broken links and preserves SEO juice.
        </p>
      </div>

      {redirects.map((rule, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1 space-y-2">
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
              placeholder="/new-page or https://..."
            />
          </div>
          <div className="flex flex-col items-center gap-1 pt-1">
            <select
              value={rule.permanent ? "301" : "302"}
              onChange={e => {
                const updated = [...redirects];
                updated[i] = { ...updated[i], permanent: e.target.value === "301" };
                setRedirects(updated);
              }}
              className="rounded border border-border bg-input px-2 py-1.5 text-xs text-foreground"
            >
              <option value="301">301</option>
              <option value="302">302</option>
            </select>
            <button
              onClick={() => setRedirects(redirects.filter((_, j) => j !== i))}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <TbTrash className="size-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={() => setRedirects([...redirects, { from: "", to: "", permanent: true }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <TbPlus className="size-4" />
        Add redirect
      </button>

      {redirects.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted p-4">
          <div className="flex gap-3">
            <TbInfoCircle className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <strong>301</strong> = permanent redirect (search engines transfer SEO).{" "}
                <strong>302</strong> = temporary redirect (search engines keep the original URL indexed).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
