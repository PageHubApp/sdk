import React from "react";
import {
  SettingsTabIntro,
  settingsTabFillRootClass,
} from "../settings/SettingsTabChrome";

const CodeEditor = React.lazy(() =>
  import("../../toolbar/inputs/typography/CodeEditor").then(m => ({ default: m.CodeEditor }))
);

interface SchemaTabProps {
  jsonLd: string;
  setJsonLd: (v: string) => void;
}

export function SchemaTab({ jsonLd, setJsonLd }: SchemaTabProps) {
  return (
    <div className={settingsTabFillRootClass}>
      <SettingsTabIntro
        title="Schema (JSON-LD)"
        description={
          'Structured data injected as <script type="application/ld+json">. Helps search engines understand what this page is about.'
        }
      />
      <div className="min-h-0 flex-1">
        <CodeEditor
          value={jsonLd}
          onChange={setJsonLd}
          language="javascript"
          height="100%"
          placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "WebPage"\n}'}
          containerClassName="h-full"
        />
      </div>
    </div>
  );
}
