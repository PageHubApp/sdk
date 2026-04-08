import React from "react";
import { TbInfoCircle } from "react-icons/tb";
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
