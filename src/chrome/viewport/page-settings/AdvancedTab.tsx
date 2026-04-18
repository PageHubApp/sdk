import React, { useState } from "react";
import { ToolbarDashedButton } from "../../toolbar/helpers/ToolbarDashedButton";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import { settingsMultilineInputClass } from "../settings/settingsControlClasses";

interface ThemeOverride {
  varName: string;
  value: string;
}

interface AdvancedTabProps {
  inputClass: string;
  canonicalUrl: string;
  setCanonicalUrl: (v: string) => void;
  headCode: string;
  setHeadCode: (v: string) => void;
  bodyClass: string;
  setBodyClass: (v: string) => void;
  jsonLd: string;
  setJsonLd: (v: string) => void;
  pagePassword: string;
  setPagePassword: (v: string) => void;
  themeOverrides: ThemeOverride[];
  setThemeOverrides: (v: ThemeOverride[]) => void;
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
  headCode,
  setHeadCode,
  bodyClass,
  setBodyClass,
  jsonLd,
  setJsonLd,
  pagePassword,
  setPagePassword,
  themeOverrides,
  setThemeOverrides,
}: AdvancedTabProps) {
  const [rawPassword, setRawPassword] = useState("");
  const multiline = settingsMultilineInputClass(inputClass);

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

  const addOverride = () => {
    setThemeOverrides([...themeOverrides, { varName: "", value: "" }]);
  };

  const updateOverride = (index: number, field: "varName" | "value", val: string) => {
    const next = [...themeOverrides];
    next[index] = { ...next[index], [field]: val };
    setThemeOverrides(next);
  };

  const removeOverride = (index: number) => {
    setThemeOverrides(themeOverrides.filter((_, i) => i !== index));
  };

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Advanced"
        description="Canonical URL, per-page head snippets, body class, JSON-LD, optional password hash, and CSS variable overrides."
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

      <SettingsFormCard title="Head and structured data">
        <SettingsFormField
          label="Custom head code"
          htmlFor="head-code"
          hint="HTML injected into <head> for this page only."
        >
          <textarea
            id="head-code"
            value={headCode}
            onChange={e => setHeadCode(e.target.value)}
            className={`${multiline} ${mono}`}
            rows={6}
            placeholder={'<script>…</script>\n<link rel="stylesheet" href="…">'}
          />
        </SettingsFormField>

        <SettingsFormField
          label="JSON-LD"
          htmlFor="json-ld"
          hint={
            <>
              Injected as{" "}
              <code className="bg-base-300/60 rounded px-1 py-0.5 text-[11px]">
                &lt;script type=&quot;application/ld+json&quot;&gt;
              </code>
              .
            </>
          }
        >
          <textarea
            id="json-ld"
            value={jsonLd}
            onChange={e => setJsonLd(e.target.value)}
            className={`${multiline} ${mono}`}
            rows={8}
            placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage"\n}'}
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

      <SettingsFormCard title="Theme overrides">
        <p className="text-neutral-content text-sm">
          Override design tokens for this page only. Use CSS variable names without the leading{" "}
          <code className="font-mono text-xs">--</code>.
        </p>
        <div className="space-y-2">
          {themeOverrides.map((override, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-content font-mono text-xs">--</span>
              <input
                type="text"
                value={override.varName}
                onChange={e => updateOverride(i, "varName", e.target.value)}
                className={`${inputClass} w-32 shrink-0 ${mono} py-2`}
                placeholder="var-name"
              />
              <input
                type="text"
                value={override.value}
                onChange={e => updateOverride(i, "value", e.target.value)}
                className={`${inputClass} min-w-0 flex-1 ${mono} py-2`}
                placeholder="#fff or 1rem"
              />
              <button
                type="button"
                onClick={() => removeOverride(i)}
                className="text-neutral-content hover:bg-error/15 hover:text-error shrink-0 rounded-lg px-2 py-1 text-sm"
                aria-label="Remove override"
              >
                ×
              </button>
            </div>
          ))}
          <ToolbarDashedButton onClick={addOverride}>Add override</ToolbarDashedButton>
        </div>
      </SettingsFormCard>
    </div>
  );
}
