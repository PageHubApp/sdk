import React from "react";
import { StandaloneImagePicker } from "../StandaloneImagePicker";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import { settingsMultilineInputClass } from "../settings/settingsControlClasses";

interface BrandingTabProps {
  inputClass: string;
  favicon: string;
  setFavicon: (v: string) => void;
  companyName: string;
  setCompanyName: (v: string) => void;
  companyTagline: string;
  setCompanyTagline: (v: string) => void;
  companyType: string;
  setCompanyType: (v: string) => void;
}

export function BrandingTab({
  inputClass,
  favicon,
  setFavicon,
  companyName,
  setCompanyName,
  companyTagline,
  setCompanyTagline,
  companyType,
  setCompanyType,
}: BrandingTabProps) {
  const multiline = settingsMultilineInputClass(inputClass);

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Branding"
        description="Company details, contact info, and favicon used across your site."
      />

      <SettingsFormCard title="Identity">
        <SettingsFormField label="Favicon">
          <StandaloneImagePicker
            value={favicon}
            onChange={setFavicon}
            label="Upload favicon"
            help="Recommended: .ico, .png, or .gif. Shown in browser tabs."
          />
        </SettingsFormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsFormField
            label="Company name"
            htmlFor="company-name"
            variable="company.name"
          >
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className={inputClass}
              placeholder="Your company"
            />
          </SettingsFormField>
          <SettingsFormField
            label="Company type"
            htmlFor="company-type"
            variable="company.type"
          >
            <input
              id="company-type"
              type="text"
              value={companyType}
              onChange={e => setCompanyType(e.target.value)}
              className={inputClass}
              placeholder="e.g. ecommerce, finance, technology"
            />
          </SettingsFormField>
        </div>

        <SettingsFormField
          label="Company tagline"
          htmlFor="company-tagline"
          variable="company.tagline"
          hint="Short line or a few sentences. Flows into headings and footers."
        >
          <textarea
            id="company-tagline"
            value={companyTagline}
            onChange={e => setCompanyTagline(e.target.value)}
            rows={4}
            maxLength={800}
            className={multiline}
            placeholder="Your tagline or slogan"
          />
        </SettingsFormField>
      </SettingsFormCard>

    </div>
  );
}
