import React from "react";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import { settingsModalSelectClass } from "../settings/settingsControlClasses";

interface TwitterCardTabProps {
  inputClass: string;
  selectClass: string;
  twitterCard: string;
  setTwitterCard: (v: string) => void;
  twitterSite: string;
  setTwitterSite: (v: string) => void;
  twitterCreator: string;
  setTwitterCreator: (v: string) => void;
}

export function TwitterCardTab({
  inputClass,
  selectClass,
  twitterCard,
  setTwitterCard,
  twitterSite,
  setTwitterSite,
  twitterCreator,
  setTwitterCreator,
}: TwitterCardTabProps) {
  const selectField = settingsModalSelectClass(selectClass);

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Twitter / X card"
        description="Override how this page previews on Twitter / X. Falls back to Open Graph when these are empty."
      />

      <SettingsFormCard title="Card">
        <SettingsFormField label="Card type" htmlFor="twitter-card">
          <select
            id="twitter-card"
            value={twitterCard}
            onChange={e => setTwitterCard(e.target.value)}
            className={selectField}
          >
            <option value="summary_large_image">Summary, large image</option>
            <option value="summary">Summary</option>
          </select>
        </SettingsFormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsFormField
            label="Site"
            htmlFor="twitter-site"
            hint="The site's @ handle."
          >
            <input
              id="twitter-site"
              type="text"
              value={twitterSite}
              onChange={e => setTwitterSite(e.target.value)}
              className={inputClass}
              placeholder="@yourusername"
            />
          </SettingsFormField>
          <SettingsFormField
            label="Creator"
            htmlFor="twitter-creator"
            hint="The author's @ handle."
          >
            <input
              id="twitter-creator"
              type="text"
              value={twitterCreator}
              onChange={e => setTwitterCreator(e.target.value)}
              className={inputClass}
              placeholder="@authorusername"
            />
          </SettingsFormField>
        </div>
      </SettingsFormCard>
    </div>
  );
}
