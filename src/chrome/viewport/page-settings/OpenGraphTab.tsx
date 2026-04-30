import React from "react";
import { StandaloneImagePicker } from "../StandaloneImagePicker";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import {
  settingsModalSelectClass,
  settingsMultilineInputClass,
} from "../settings/settingsControlClasses";

interface OpenGraphTabProps {
  inputClass: string;
  selectClass: string;
  ogTitle: string;
  setOgTitle: (v: string) => void;
  ogDescription: string;
  setOgDescription: (v: string) => void;
  ogImage: string;
  setOgImage: (v: string) => void;
  ogType: string;
  setOgType: (v: string) => void;
}

export function OpenGraphTab({
  inputClass,
  selectClass,
  ogTitle,
  setOgTitle,
  ogDescription,
  setOgDescription,
  ogImage,
  setOgImage,
  ogType,
  setOgType,
}: OpenGraphTabProps) {
  const multiline = settingsMultilineInputClass(inputClass);
  const selectField = settingsModalSelectClass(selectClass);

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Open Graph"
        description="How this page previews when shared on Facebook, LinkedIn, Slack, iMessage, and most social platforms."
      />

      <SettingsFormCard title="Share preview">
        <SettingsFormField
          label="Title"
          htmlFor="og-title"
          hint="Leave empty to reuse the SEO meta title."
        >
          <input
            id="og-title"
            type="text"
            value={ogTitle}
            onChange={e => setOgTitle(e.target.value)}
            className={inputClass}
            placeholder="Social title"
          />
        </SettingsFormField>

        <SettingsFormField
          label="Description"
          htmlFor="og-description"
          hint="Leave empty to reuse the SEO meta description."
        >
          <textarea
            id="og-description"
            value={ogDescription}
            onChange={e => setOgDescription(e.target.value)}
            rows={2}
            className={multiline}
            placeholder="Social description"
          />
        </SettingsFormField>

        <SettingsFormField label="Image" hint="Recommended 1200×630px (1.91:1 ratio).">
          <StandaloneImagePicker value={ogImage} onChange={setOgImage} label="Upload OG image" />
        </SettingsFormField>

        <SettingsFormField label="Type" htmlFor="og-type">
          <select
            id="og-type"
            value={ogType}
            onChange={e => setOgType(e.target.value)}
            className={selectField}
          >
            <option value="website">Website</option>
            <option value="article">Article</option>
            <option value="product">Product</option>
            <option value="profile">Profile</option>
          </select>
        </SettingsFormField>
      </SettingsFormCard>
    </div>
  );
}
