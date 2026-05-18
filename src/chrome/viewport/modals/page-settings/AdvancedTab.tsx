import React, { useState } from "react";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";

interface AdvancedTabProps {
  inputClass: string;
  canonicalUrl: string;
  setCanonicalUrl: (v: string) => void;
  bodyClass: string;
  setBodyClass: (v: string) => void;
  pagePassword: string;
  setPagePassword: (v: string) => void;
  hideHeader: boolean;
  setHideHeader: (v: boolean) => void;
  hideFooter: boolean;
  setHideFooter: (v: boolean) => void;
  hideChrome: boolean;
  setHideChrome: (v: boolean) => void;
}

/** SHA-256 hash via Web Crypto API — runs in browser only */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const mono = "font-mono text-xs";

export function AdvancedTab({
  inputClass,
  canonicalUrl,
  setCanonicalUrl,
  bodyClass,
  setBodyClass,
  pagePassword,
  setPagePassword,
  hideHeader,
  setHideHeader,
  hideFooter,
  setHideFooter,
  hideChrome,
  setHideChrome,
}: AdvancedTabProps) {
  const [rawPassword, setRawPassword] = useState("");

  const handlePasswordSet = async () => {
    if (!rawPassword.trim()) {
      setPagePassword("");
      return;
    }
    const hashed = await hashPassword(rawPassword.trim());
    setPagePassword(hashed);
    setRawPassword("");
  };

  const handlePasswordClear = () => {
    setPagePassword("");
    setRawPassword("");
  };

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Advanced"
        description="Canonical URL, body class, and password protection. Custom head code, JSON-LD schema, and theme overrides each have their own tab."
      />

      <SettingsFormCard title="URLs and body">
        <SettingsFormField
          label="Canonical URL"
          htmlFor="canonical-url"
          hint="Leave empty to use the auto-generated canonical for this page."
        >
          <input
            id="canonical-url"
            type="text"
            value={canonicalUrl}
            onChange={e => setCanonicalUrl(e.target.value)}
            className={inputClass}
            placeholder="https://…"
          />
        </SettingsFormField>

        <SettingsFormField
          label="Body class"
          htmlFor="body-class"
          hint="Extra classes on the body element for this page only."
        >
          <input
            id="body-class"
            type="text"
            value={bodyClass}
            onChange={e => setBodyClass(e.target.value)}
            className={`${inputClass} ${mono}`}
            placeholder="e.g. dark overflow-hidden"
          />
        </SettingsFormField>
      </SettingsFormCard>

      <SettingsFormCard title="Site chrome">
        <p className="text-neutral-content text-sm">
          Hide the global header, footer, or all chrome on this page only. Use for ad landing pages
          or conversion-focused funnels. <strong>Hide all chrome</strong> also suppresses sticky
          CTAs, floating buttons, and mobile drawers — the right switch for Google Ads pages.
        </p>
        <div className="border-base-300 bg-base-200/20 flex items-center justify-between gap-3 rounded-xl border p-4">
          <div>
            <p className="text-base-content text-sm font-semibold">Hide all chrome</p>
            <p className="text-neutral-content mt-1 text-xs">
              Strip header, footer, and every other ROOT-level sibling. Supersedes hide header /
              hide footer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHideChrome(!hideChrome)}
            className={`focus:ring-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
              hideChrome ? "bg-primary" : "bg-base-300"
            }`}
            aria-pressed={hideChrome}
          >
            <span
              className={`bg-base-100 inline-block size-4 rounded-full transition-transform ${
                hideChrome ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-base-300 bg-base-200/20 flex items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <p className="text-base-content text-sm font-semibold">Hide header</p>
              <p className="text-neutral-content mt-1 text-xs">
                Suppress the site header on this page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHideHeader(!hideHeader)}
              className={`focus:ring-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                hideHeader ? "bg-primary" : "bg-base-300"
              }`}
              aria-pressed={hideHeader}
            >
              <span
                className={`bg-base-100 inline-block size-4 rounded-full transition-transform ${
                  hideHeader ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="border-base-300 bg-base-200/20 flex items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <p className="text-base-content text-sm font-semibold">Hide footer</p>
              <p className="text-neutral-content mt-1 text-xs">
                Suppress the site footer on this page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHideFooter(!hideFooter)}
              className={`focus:ring-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                hideFooter ? "bg-primary" : "bg-base-300"
              }`}
              aria-pressed={hideFooter}
            >
              <span
                className={`bg-base-100 inline-block size-4 rounded-full transition-transform ${
                  hideFooter ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </SettingsFormCard>

      <SettingsFormCard title="Password protection">
        {pagePassword ? (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`${inputClass} text-neutral-content flex-1 truncate ${mono} py-2 text-xs`}
            >
              Protected (SHA-256)
            </span>
            <button type="button" onClick={handlePasswordClear} className="btn btn-ghost btn-sm">
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <SettingsFormField label="Set password" htmlFor="page-password-inline">
                <input
                  id="page-password-inline"
                  type="password"
                  value={rawPassword}
                  onChange={e => setRawPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && void handlePasswordSet()}
                  className={inputClass}
                  placeholder="Page password"
                />
              </SettingsFormField>
            </div>
            <button
              type="button"
              onClick={() => void handlePasswordSet()}
              className="btn btn-primary btn-sm shrink-0"
              disabled={!rawPassword.trim()}
            >
              Set
            </button>
          </div>
        )}
        <p className="text-neutral-content text-xs">
          Only a SHA-256 hash is stored — not the raw password.
        </p>
      </SettingsFormCard>
    </div>
  );
}
