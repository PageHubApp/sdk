// Host wiring. Drop this into any React app (Next.js, Vite, etc.).
// In Next.js, load with `next/dynamic({ ssr: false })` — the editor uses
// browser APIs.

import React from "react";
import { PageHubEditor } from "@pagehub/sdk";
import "@pagehub/sdk/editor.css";

import { PricingCardDef } from "./PricingCardDef";

// Ship the SAME `components` array to the viewer + static renderer, otherwise
// custom nodes will render via the generic fallback (or break entirely).
const customComponents = [PricingCardDef];

export default function Builder() {
  return (
    <PageHubEditor
      components={customComponents}
      callbacks={{
        onLoad: async () => {
          // Return your saved page payload (or null for a blank canvas).
          const res = await fetch("/api/pages/home");
          return res.ok ? await res.json() : null;
        },
        onSave: async (pageData) => {
          const res = await fetch("/api/pages/home", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(pageData),
          });
          if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, status: res.status };
          const data = await res.json().catch(() => ({}));
          return { ok: true, pageId: data.pageId ?? "home", updatedAt: data.updatedAt ?? new Date().toISOString() };
        },
      }}
    />
  );
}

// --- Viewer / static-renderer wiring (uses the same array) ----------------
//
// import { PageHubViewer } from "@pagehub/sdk/viewer";
// <PageHubViewer content={savedContent} components={customComponents} />;
//
// import { renderToHTML } from "@pagehub/sdk/static-renderer";
// const { html } = renderToHTML(savedContent, { components: customComponents });
