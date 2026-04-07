import React, { useState } from "react";

interface ThemeOverride {
  varName: string;
  value: string;
}

interface AdvancedTabProps {
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
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function AdvancedTab({
  canonicalUrl, setCanonicalUrl,
  headCode, setHeadCode,
  bodyClass, setBodyClass,
  jsonLd, setJsonLd,
  pagePassword, setPagePassword,
  themeOverrides, setThemeOverrides,
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
    <div className="space-y-6">
      <div>
        <label htmlFor="canonical-url" className="toolbar-label mb-2 block font-medium">
          Canonical URL
        </label>
        <input
          id="canonical-url"
          type="text"
          value={canonicalUrl}
          onChange={e => setCanonicalUrl(e.target.value)}
          className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Leave empty for auto-generated"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Specify a canonical URL to prevent duplicate content issues
        </p>
      </div>

      <div>
        <label htmlFor="body-class" className="toolbar-label mb-2 block font-medium">
          Body Class
        </label>
        <input
          id="body-class"
          type="text"
          value={bodyClass}
          onChange={e => setBodyClass(e.target.value)}
          className="w-full rounded-lg border border-border px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g. dark overflow-hidden"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Custom CSS classes added to the body tag for this page
        </p>
      </div>

      <div>
        <label htmlFor="head-code" className="toolbar-label mb-2 block font-medium">
          Custom Head Code
        </label>
        <textarea
          id="head-code"
          value={headCode}
          onChange={e => setHeadCode(e.target.value)}
          className="w-full rounded-lg border border-border px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          rows={6}
          placeholder={'<script>...</script>\n<link rel="stylesheet" href="...">\n<meta name="..." content="...">'}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Custom HTML injected into the &lt;head&gt; for this page only. Use for page-specific scripts, styles, or meta tags.
        </p>
      </div>

      <div>
        <label htmlFor="json-ld" className="toolbar-label mb-2 block font-medium">
          JSON-LD Structured Data
        </label>
        <textarea
          id="json-ld"
          value={jsonLd}
          onChange={e => setJsonLd(e.target.value)}
          className="w-full rounded-lg border border-border px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          rows={8}
          placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "My Page"\n}'}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          JSON-LD schema for this page. Helps search engines understand your content. Will be injected as{" "}
          <code className="rounded bg-muted px-1 text-[11px]">&lt;script type="application/ld+json"&gt;</code>.
        </p>
      </div>

      <div>
        <label className="toolbar-label mb-2 block font-medium">
          Password Protection
        </label>
        {pagePassword ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate rounded-lg border border-border bg-muted px-4 py-2 font-mono text-xs text-muted-foreground">
              Protected (SHA-256)
            </span>
            <button
              type="button"
              onClick={handlePasswordClear}
              className="btn btn-secondary text-xs"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={rawPassword}
              onChange={e => setRawPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePasswordSet()}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter page password"
            />
            <button
              type="button"
              onClick={handlePasswordSet}
              className="btn btn-primary text-xs"
              disabled={!rawPassword.trim()}
            >
              Set
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Password is stored as a SHA-256 hash — the raw password is never saved.
        </p>
      </div>

      <div>
        <label className="toolbar-label mb-2 block font-medium">
          Theme Overrides
        </label>
        <p className="mb-3 text-xs text-muted-foreground">
          Override design system CSS variables for this page only.
        </p>
        <div className="space-y-2">
          {themeOverrides.map((override, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">--</span>
              <input
                type="text"
                value={override.varName}
                onChange={e => updateOverride(i, "varName", e.target.value)}
                className="w-32 rounded border border-border px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="var-name"
              />
              <input
                type="text"
                value={override.value}
                onChange={e => updateOverride(i, "value", e.target.value)}
                className="flex-1 rounded border border-border px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="#fff or 1rem"
              />
              <button
                type="button"
                onClick={() => removeOverride(i)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOverride}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            + Add Override
          </button>
        </div>
      </div>
    </div>
  );
}
