import React from "react";
import { TbInfoCircle, TbPlus, TbTrash } from "react-icons/tb";
import { StandaloneImagePicker } from "../StandaloneImagePicker";
import {
  SettingsCallout,
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
  companyLocation: string;
  setCompanyLocation: (v: string) => void;
  companyAddress: string;
  setCompanyAddress: (v: string) => void;
  companyPhone: string;
  setCompanyPhone: (v: string) => void;
  companyEmail: string;
  setCompanyEmail: (v: string) => void;
  companyWebsite: string;
  setCompanyWebsite: (v: string) => void;
  customVariables: { key: string; value: string }[];
  setCustomVariables: (v: { key: string; value: string }[]) => void;
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
  companyLocation,
  setCompanyLocation,
  companyAddress,
  setCompanyAddress,
  companyPhone,
  setCompanyPhone,
  companyEmail,
  setCompanyEmail,
  companyWebsite,
  setCompanyWebsite,
  customVariables,
  setCustomVariables,
}: BrandingTabProps) {
  const multiline = settingsMultilineInputClass(inputClass);

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Branding"
        description="Company details and favicon power {{company.*}} placeholders across your site."
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
          <SettingsFormField label="Company name" htmlFor="company-name">
            <input
              id="company-name"
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className={inputClass}
              placeholder="Your company"
            />
          </SettingsFormField>
          <SettingsFormField label="Company type" htmlFor="company-type">
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
          hint="Short line or a few sentences. Flows into headings, footers, and {{company.tagline}}."
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

      <SettingsFormCard title="Location and contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsFormField label="Location" htmlFor="company-location">
            <input
              id="company-location"
              type="text"
              value={companyLocation}
              onChange={e => setCompanyLocation(e.target.value)}
              className={inputClass}
              placeholder="Los Angeles, CA"
            />
          </SettingsFormField>
          <SettingsFormField label="Website" htmlFor="company-website">
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

        <SettingsFormField label="Address" htmlFor="company-address">
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
          <SettingsFormField label="Phone" htmlFor="company-phone">
            <input
              id="company-phone"
              type="tel"
              value={companyPhone}
              onChange={e => setCompanyPhone(e.target.value)}
              className={inputClass}
              placeholder="(555) 123-4567"
            />
          </SettingsFormField>
          <SettingsFormField label="Email" htmlFor="company-email">
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

      <SettingsFormCard title="Custom variables">
        <div className="flex items-center justify-between gap-2">
          <p className="text-neutral-content text-sm">
            Define{" "}
            <code className="bg-base-300/80 rounded px-1 py-0.5 font-mono text-xs">
              {"{{variables.key}}"}
            </code>{" "}
            for reusable snippets in text.
          </p>
          <button
            type="button"
            onClick={() => setCustomVariables([...customVariables, { key: "", value: "" }])}
            className="btn btn-secondary btn-sm shrink-0 gap-1"
          >
            <TbPlus className="size-3.5" />
            Add variable
          </button>
        </div>

        {customVariables.length === 0 ? (
          <p className="text-neutral-content text-sm">No custom variables yet.</p>
        ) : null}

        {customVariables.map((variable, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {index === 0 ? (
                <span className="text-neutral-content mb-1 block text-xs font-medium">Key</span>
              ) : null}
              <div className="border-base-300 bg-base-200 focus-within:border-primary focus-within:ring-ring/50 flex min-h-10 w-full overflow-hidden rounded-lg border shadow-sm transition-[border-color,box-shadow] focus-within:ring-2">
                <span className="border-base-300 bg-base-300/40 text-neutral-content flex shrink-0 items-center border-r px-2.5 text-xs">
                  variables.
                </span>
                <input
                  type="text"
                  value={variable.key}
                  onChange={e => {
                    const sanitized = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                    const updated = [...customVariables];
                    updated[index] = { ...updated[index], key: sanitized };
                    setCustomVariables(updated);
                  }}
                  className="text-base-content placeholder:text-neutral-content min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm outline-none focus:ring-0"
                  placeholder="myField"
                  aria-label="Variable key"
                />
              </div>
            </div>
            <div className="min-w-0 flex-[2]">
              {index === 0 ? (
                <span className="text-neutral-content mb-1 block text-xs font-medium">Value</span>
              ) : null}
              <input
                type="text"
                value={variable.value}
                onChange={e => {
                  const updated = [...customVariables];
                  updated[index] = { ...updated[index], value: e.target.value };
                  setCustomVariables(updated);
                }}
                className={inputClass}
                placeholder="Value to display"
              />
            </div>
            <div className="shrink-0">
              {index === 0 ? (
                <span className="text-neutral-content mb-1 block text-xs font-medium">&nbsp;</span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const updated = customVariables.filter((_, i) => i !== index);
                  setCustomVariables(updated);
                }}
                className="border-base-300 bg-base-200 text-neutral-content hover:border-error hover:bg-error/10 hover:text-error flex size-10 items-center justify-center rounded-lg border shadow-sm transition-colors"
                aria-label="Remove variable"
              >
                <TbTrash className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </SettingsFormCard>

      <SettingsCallout icon={<TbInfoCircle />} title="Variables in copy">
        <p className="mb-2">Paste into any text or button label:</p>
        <div className="flex flex-wrap gap-2">
          <code className="bg-base-100 text-base-content rounded px-2 py-1 font-mono text-xs">
            {"{{company.name}}"}
          </code>
          <code className="bg-base-100 text-base-content rounded px-2 py-1 font-mono text-xs">
            {"{{company.tagline}}"}
          </code>
          <code className="bg-base-100 text-base-content rounded px-2 py-1 font-mono text-xs">
            {"{{company.email}}"}
          </code>
          <code className="bg-base-100 text-base-content rounded px-2 py-1 font-mono text-xs">
            {"{{company.phone}}"}
          </code>
          <code className="bg-base-100 text-base-content rounded px-2 py-1 font-mono text-xs">
            {"{{year}}"}
          </code>
          {customVariables
            .filter(v => v.key.trim())
            .map(v => (
              <code
                key={v.key}
                className="bg-primary/15 text-primary rounded px-2 py-1 font-mono text-xs"
              >
                {`{{variables.${v.key}}}`}
              </code>
            ))}
        </div>
      </SettingsCallout>
    </div>
  );
}
