import React from "react";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import { settingsMultilineInputClass } from "../settings/settingsControlClasses";

interface ContactTabProps {
  inputClass: string;
  companyLocation: string;
  setCompanyLocation: (v: string) => void;
  companyWebsite: string;
  setCompanyWebsite: (v: string) => void;
  companyAddress: string;
  setCompanyAddress: (v: string) => void;
  companyPhone: string;
  setCompanyPhone: (v: string) => void;
  companyEmail: string;
  setCompanyEmail: (v: string) => void;
}

export function ContactTab({
  inputClass,
  companyLocation,
  setCompanyLocation,
  companyWebsite,
  setCompanyWebsite,
  companyAddress,
  setCompanyAddress,
  companyPhone,
  setCompanyPhone,
  companyEmail,
  setCompanyEmail,
}: ContactTabProps) {
  const multiline = settingsMultilineInputClass(inputClass);

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Contact"
        description="Address, phone, and email used in footers, contact sections, and {{company.*}} placeholders."
      />

      <SettingsFormCard title="Location and contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsFormField
            label="Location"
            htmlFor="company-location"
            variable="company.location"
          >
            <input
              id="company-location"
              type="text"
              value={companyLocation}
              onChange={e => setCompanyLocation(e.target.value)}
              className={inputClass}
              placeholder="Los Angeles, CA"
            />
          </SettingsFormField>
          <SettingsFormField
            label="Website"
            htmlFor="company-website"
            variable="company.website"
          >
            <input
              id="company-website"
              type="url"
              value={companyWebsite}
              onChange={e => setCompanyWebsite(e.target.value)}
              className={inputClass}
              placeholder="https://www.company.com"
            />
          </SettingsFormField>
        </div>

        <SettingsFormField
          label="Address"
          htmlFor="company-address"
          variable="company.address"
        >
          <textarea
            id="company-address"
            value={companyAddress}
            onChange={e => setCompanyAddress(e.target.value)}
            rows={3}
            className={multiline}
            placeholder={"123 Main St, Suite 100\nLos Angeles, CA 90001"}
          />
        </SettingsFormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsFormField label="Phone" htmlFor="company-phone" variable="company.phone">
            <input
              id="company-phone"
              type="tel"
              value={companyPhone}
              onChange={e => setCompanyPhone(e.target.value)}
              className={inputClass}
              placeholder="(555) 123-4567"
            />
          </SettingsFormField>
          <SettingsFormField label="Email" htmlFor="company-email" variable="company.email">
            <input
              id="company-email"
              type="email"
              value={companyEmail}
              onChange={e => setCompanyEmail(e.target.value)}
              className={inputClass}
              placeholder="contact@company.com"
            />
          </SettingsFormField>
        </div>
      </SettingsFormCard>
    </div>
  );
}
