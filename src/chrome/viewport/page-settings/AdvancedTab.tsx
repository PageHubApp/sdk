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
