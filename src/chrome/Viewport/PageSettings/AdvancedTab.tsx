import React from "react";

interface AdvancedTabProps {
  canonicalUrl: string;
  setCanonicalUrl: (v: string) => void;
}

export function AdvancedTab({ canonicalUrl, setCanonicalUrl }: AdvancedTabProps) {
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
    </div>
  );
}
