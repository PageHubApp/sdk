import React from "react";
import { TbInfoCircle, TbPlus, TbTrash } from "react-icons/tb";
import { StandaloneImagePicker } from "../StandaloneImagePicker";

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
  favicon, setFavicon,
  companyName, setCompanyName,
  companyTagline, setCompanyTagline,
  companyType, setCompanyType,
  companyLocation, setCompanyLocation,
  companyAddress, setCompanyAddress,
  companyPhone, setCompanyPhone,
  companyEmail, setCompanyEmail,
  companyWebsite, setCompanyWebsite,
  customVariables, setCustomVariables,
}: BrandingTabProps) {
  return (
    <div className="space-y-6">
      <div className="mb-4 space-y-2">
        <h3 className="text-lg font-semibold text-base-content">
          Branding & Company Information
        </h3>
        <p className="text-sm text-neutral-content">
          Your company details and branding assets for customization
        </p>
      </div>

      <div>
        <p className="toolbar-label mb-2 block font-medium">Favicon</p>
        <StandaloneImagePicker
          value={favicon}
          onChange={setFavicon}
          label="Upload Favicon"
          help="Recommended: .ico, .png, or .gif. Appears in browser tabs."
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="company-name" className="toolbar-label mb-2 block font-medium">
            Company Name
          </label>
          <input
            id="company-name"
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className={inputClass}
            placeholder="Your Company"
          />
        </div>

        <div>
          <label htmlFor="company-tagline" className="toolbar-label mb-2 block font-medium">
            Company Tagline
          </label>
          <input
            id="company-tagline"
            type="text"
            value={companyTagline}
            onChange={e => setCompanyTagline(e.target.value)}
            className={inputClass}
            placeholder="Your company's tagline or slogan"
          />
        </div>

        <div>
          <label htmlFor="company-type" className="toolbar-label mb-2 block font-medium">
            Company Type
          </label>
          <input
            id="company-type"
            type="text"
            value={companyType}
            onChange={e => setCompanyType(e.target.value)}
            className={inputClass}
            placeholder="e.g., ecommerce, finance, technology"
          />
        </div>

        <div>
          <label htmlFor="company-location" className="toolbar-label mb-2 block font-medium">
            Company Location
          </label>
          <input
            id="company-location"
            type="text"
            value={companyLocation}
            onChange={e => setCompanyLocation(e.target.value)}
            className={inputClass}
            placeholder="Los Angeles, CA"
          />
        </div>
      </div>
      <div>
        <label htmlFor="company-address" className="toolbar-label mb-2 block font-medium">Address</label>
        <textarea
          id="company-address"
          value={companyAddress}
          onChange={e => setCompanyAddress(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="123 Main St, Suite 100&#10;Los Angeles, CA 90001"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="company-phone" className="toolbar-label mb-2 block font-medium">Phone</label>
          <input
            id="company-phone"
            type="tel"
            value={companyPhone}
            onChange={e => setCompanyPhone(e.target.value)}
            className={inputClass}
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label htmlFor="company-email" className="toolbar-label mb-2 block font-medium">Email</label>
          <input
            id="company-email"
            type="email"
            value={companyEmail}
            onChange={e => setCompanyEmail(e.target.value)}
            className={inputClass}
            placeholder="contact@company.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="company-website" className="toolbar-label mb-2 block font-medium">Website</label>
        <input
          id="company-website"
          type="url"
          value={companyWebsite}
          onChange={e => setCompanyWebsite(e.target.value)}
          className={inputClass}
          placeholder="https://www.company.com"
        />
      </div>

      {/* Custom Variables */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="toolbar-label font-medium">Custom Variables</label>
          <button
            type="button"
            onClick={() => setCustomVariables([...customVariables, { key: "", value: "" }])}
            className="flex items-center gap-1 rounded-md bg-base-300 px-2.5 py-1 text-xs font-medium text-base-content transition-colors hover:bg-base-200"
          >
            <TbPlus className="size-3.5" />
            Add Variable
          </button>
        </div>
        {customVariables.length === 0 && (
          <p className="text-sm text-neutral-content">
            No custom variables yet. Add one to use <code className="rounded bg-base-300 px-1 py-0.5 text-xs">{"{{variables.yourKey}}"}</code> in any text.
          </p>
        )}
        {customVariables.map((variable, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1">
              {index === 0 && (
                <label className="mb-1 block text-xs text-neutral-content">Key</label>
              )}
              <div className="flex min-h-10 w-full overflow-hidden rounded-lg border border-base-300 bg-base-200 shadow-sm transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/50">
                <span className="flex shrink-0 items-center border-r border-base-300 bg-neutral/50 px-2.5 text-xs text-neutral-content">
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
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-base-content outline-none placeholder:text-neutral-content focus:ring-0"
                  placeholder="myField"
                  aria-label="Variable key"
                />
              </div>
            </div>
            <div className="flex-[2]">
              {index === 0 && (
                <label className="mb-1 block text-xs text-neutral-content">Value</label>
              )}
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
            <div>
              {index === 0 && (
                <label className="mb-1 block text-xs text-neutral-content">&nbsp;</label>
              )}
              <button
                type="button"
                onClick={() => {
                  const updated = customVariables.filter((_, i) => i !== index);
                  setCustomVariables(updated);
                }}
                className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-200 text-neutral-content shadow-sm transition-colors hover:border-error hover:bg-error/10 hover:text-error"
                aria-label="Remove variable"
              >
                <TbTrash className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-base-300 bg-neutral p-4">
        <div className="flex gap-3">
          <TbInfoCircle className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-2">
            <p className="toolbar-label font-medium">
              Use variables throughout your site
            </p>
            <p className="text-sm text-neutral-content">
              Add these in any text or button to automatically display values:
            </p>
            <div className="flex flex-wrap gap-2">
              <code className="rounded bg-base-100 px-2 py-1 text-xs text-base-content">
                {"{{company.name}}"}
              </code>
              <code className="rounded bg-base-100 px-2 py-1 text-xs text-base-content">
                {"{{company.tagline}}"}
              </code>
              <code className="rounded bg-base-100 px-2 py-1 text-xs text-base-content">
                {"{{company.email}}"}
              </code>
              <code className="rounded bg-base-100 px-2 py-1 text-xs text-base-content">
                {"{{company.phone}}"}
              </code>
              <code className="rounded bg-base-100 px-2 py-1 text-xs text-base-content">
                {"{{year}}"}
              </code>
              {customVariables.filter(v => v.key.trim()).map(v => (
                <code key={v.key} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                  {`{{variables.${v.key}}}`}
                </code>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
