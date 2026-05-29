import React from "react";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import { SETTINGS_TEXTAREA_CLASS } from "../settings/settingsControlClasses";

interface SEOTabProps {
  inputClass: string;
  pageTitle: string;
  setPageTitle: (v: string) => void;
  pageDescription: string;
  setPageDescription: (v: string) => void;
  pageKeywords: string;
  setPageKeywords: (v: string) => void;
  pageAuthor: string;
  setPageAuthor: (v: string) => void;
}

export function SEOTab({
  inputClass,
  pageTitle,
  setPageTitle,
  pageDescription,
  setPageDescription,
  pageKeywords,
  setPageKeywords,
  pageAuthor,
  setPageAuthor,
}: SEOTabProps) {
  const multiline = SETTINGS_TEXTAREA_CLASS;

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="SEO"
        description="Defaults for search engines. Open Graph and Twitter cards live in their own tabs and override these when set."
      />

      <SettingsFormCard title="Search">
        <SettingsFormField
          label="Meta title"
          htmlFor="meta-title"
          hint="Roughly 50–60 characters works well in results."
        >
          <textarea
            id="meta-title"
            value={pageTitle}
            onChange={e => setPageTitle(e.target.value)}
            rows={2}
            className={multiline}
            placeholder="Page title"
          />
        </SettingsFormField>

        <SettingsFormField
          label="Meta description"
          htmlFor="meta-description"
          hint="Roughly 150–160 characters for snippets."
        >
          <textarea
            id="meta-description"
            value={pageDescription}
            onChange={e => setPageDescription(e.target.value)}
            rows={3}
            className={multiline}
            placeholder="Meta description"
          />
        </SettingsFormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsFormField label="Keywords" htmlFor="page-keywords">
            <input
              id="page-keywords"
              type="text"
              value={pageKeywords}
              onChange={e => setPageKeywords(e.target.value)}
              className={inputClass}
              placeholder="keyword1, keyword2"
            />
          </SettingsFormField>
          <SettingsFormField label="Author" htmlFor="page-author">
            <input
              id="page-author"
              type="text"
              value={pageAuthor}
              onChange={e => setPageAuthor(e.target.value)}
              className={inputClass}
              placeholder="Author name"
            />
          </SettingsFormField>
        </div>
      </SettingsFormCard>
    </div>
  );
}
