import { ROOT_NODE, useEditor } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { TbCheck, TbLoader2 } from "react-icons/tb";
import { FloatingPanel } from "../FloatingPanel";
import { BrandingTab } from "./SiteSettings/BrandingTab";
import { IntegrationsTab, INTEGRATION_PROVIDERS } from "./SiteSettings/IntegrationsTab";
import { RedirectsTab } from "./SiteSettings/RedirectsTab";
import { AITab } from "./SiteSettings/AITab";
import { CodeTab } from "./SiteSettings/CodeTab";
import { normalizeDesignTags } from "../../utils/normalizeDesignTags";

interface SiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SiteSettingsModal({ isOpen, onClose }: SiteSettingsModalProps) {
  const { actions, query } = useEditor();

  // UI State
  const [activeTab, setActiveTab] = useState<"branding" | "code" | "ai" | "integrations" | "redirects">("branding");
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");

  // Site Settings
  const [favicon, setFavicon] = useState("");
  const [headerCode, setHeaderCode] = useState("");
  const [footerCode, setFooterCode] = useState("");

  // Branding / Company Settings
  const [companyName, setCompanyName] = useState("");
  const [companyTagline, setCompanyTagline] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [companyLocation, setCompanyLocation] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");

  // Site AI tone (ROOT.props.designNotes / designTags only)
  const [designNotes, setDesignNotes] = useState("");
  const [designTags, setDesignTags] = useState<string[]>([]);

  // Custom Variables
  const [customVariables, setCustomVariables] = useState<{ key: string; value: string }[]>([]);

  // Integrations
  const [integrations, setIntegrations] = useState<Record<string, Record<string, string>>>({});

  // Redirects
  const [redirects, setRedirects] = useState<{ from: string; to: string; permanent: boolean }[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const root = query.node(ROOT_NODE).get();
        if (root) {
          const props = root.data.props;

          setFavicon(props.ico || "");
          setHeaderCode(props.header || "");
          setFooterCode(props.footer || "");

          const company = props.company || {};
          setCompanyName(company.name || "");
          setCompanyTagline(company.tagline || "");
          setCompanyType(company.type || "");
          setCompanyLocation(company.location || "");
          setCompanyAddress(company.address || "");
          setCompanyPhone(company.phone || "");
          setCompanyEmail(company.email || "");
          setCompanyWebsite(company.website || "");

          setDesignNotes(typeof props.designNotes === "string" ? props.designNotes : "");
          const dt = Array.isArray(props.designTags) ? props.designTags : [];
          setDesignTags(
            normalizeDesignTags(dt.filter((t: unknown): t is string => typeof t === "string")),
          );

          setCustomVariables(props.variables || []);
          setIntegrations(props.integrations || {});
          setRedirects(props.redirects || []);
        }
      } catch (e) {
        console.error("Error loading site settings:", e);
      }
    }
  }, [isOpen, query]);

  const handleSave = async () => {
    setSavingState("saving");

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      actions.setProp(ROOT_NODE, props => {
        props.ico = favicon;
        if (favicon) {
          props.icoType = "cdn";
        }
        props.header = headerCode;
        props.footer = footerCode;

        props.company = {
          name: companyName,
          tagline: companyTagline,
          type: companyType,
          location: companyLocation,
          address: companyAddress,
          phone: companyPhone,
          email: companyEmail,
          website: companyWebsite,
        };
        props.brandingCommitted = true;

        delete props.ai;

        const notesTrim = designNotes.trim();
        props.designNotes = notesTrim ? notesTrim.slice(0, 1200) : undefined;
        const tagList = normalizeDesignTags(designTags);
        props.designTags = tagList.length ? tagList : undefined;

        const cleanVariables = customVariables.filter(v => v.key.trim() && v.value.trim());
        props.variables = cleanVariables.length ? cleanVariables : undefined;

        const cleanIntegrations: Record<string, Record<string, string>> = {};
        for (const [key, config] of Object.entries(integrations)) {
          const meta = INTEGRATION_PROVIDERS[key as keyof typeof INTEGRATION_PROVIDERS];
          if (meta && config[meta.field]) {
            cleanIntegrations[key] = { [meta.field]: config[meta.field] };
          }
        }
        props.integrations = Object.keys(cleanIntegrations).length ? cleanIntegrations : undefined;

        const cleanRedirects = redirects.filter(r => r.from && r.to);
        props.redirects = cleanRedirects.length ? cleanRedirects : undefined;
      });

      setSavingState("saved");
      setTimeout(() => { setSavingState("idle"); }, 2000);
    } catch (e) {
      setSavingState("idle");
      console.error("Error saving site settings:", e);
    }
  };

  const tabClass = (tab: string) =>
    `flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors ${
      activeTab === tab
        ? "border-b-2 border-primary bg-base-100 text-primary"
        : "text-neutral-content hover:text-base-content"
    }`;

  /** Toolbar-aligned field chrome: lifted surface + visible border (not flat `bg-input`). */
  const inputClass =
    "w-full rounded-lg border border-base-300 bg-base-200 px-4 py-2 text-sm text-base-content shadow-sm placeholder:text-neutral-content transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-primary hover:bg-base-300/25 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50";
  const selectClass =
    "w-full cursor-pointer rounded-lg border border-base-300 bg-base-200 px-2 py-2 text-xs text-base-content shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50";

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Site Settings"
      backdrop
      storageKey="site-settings"
      defaultWidth={600}
      defaultHeight={Math.round(typeof window !== "undefined" ? window.innerHeight - 80 : 700)}
      minWidth={400}
      maxWidth={900}
      minHeight={400}
      edges={["e", "s", "se", "w", "sw"]}
    >
          {/* Tabs */}
          <div className="flex border-b border-base-300 bg-neutral">
            <button onClick={() => setActiveTab("branding")} className={tabClass("branding")}>
              Branding
            </button>
            <button onClick={() => setActiveTab("integrations")} className={tabClass("integrations")}>
              Integrations
            </button>
            <button onClick={() => setActiveTab("redirects")} className={tabClass("redirects")}>
              Redirects
            </button>
            <button onClick={() => setActiveTab("ai")} className={tabClass("ai")}>
              AI
            </button>
            <button onClick={() => setActiveTab("code")} className={tabClass("code")}>
              Code
            </button>
          </div>

          {/* Content */}
          <div className="scrollbar-light flex-1 space-y-4 overflow-y-auto bg-base-100 p-6 text-base-content">
            {activeTab === "code" && (
              <CodeTab
                headerCode={headerCode} setHeaderCode={setHeaderCode}
                footerCode={footerCode} setFooterCode={setFooterCode}
              />
            )}

            {activeTab === "branding" && (
              <BrandingTab
                inputClass={inputClass}
                favicon={favicon} setFavicon={setFavicon}
                companyName={companyName} setCompanyName={setCompanyName}
                companyTagline={companyTagline} setCompanyTagline={setCompanyTagline}
                companyType={companyType} setCompanyType={setCompanyType}
                companyLocation={companyLocation} setCompanyLocation={setCompanyLocation}
                companyAddress={companyAddress} setCompanyAddress={setCompanyAddress}
                companyPhone={companyPhone} setCompanyPhone={setCompanyPhone}
                companyEmail={companyEmail} setCompanyEmail={setCompanyEmail}
                companyWebsite={companyWebsite} setCompanyWebsite={setCompanyWebsite}
                customVariables={customVariables} setCustomVariables={setCustomVariables}
              />
            )}

            {activeTab === "integrations" && (
              <IntegrationsTab
                inputClass={inputClass}
                integrations={integrations} setIntegrations={setIntegrations}
              />
            )}

            {activeTab === "redirects" && (
              <RedirectsTab
                inputClass={inputClass}
                selectClass={selectClass}
                redirects={redirects} setRedirects={setRedirects}
              />
            )}

            {activeTab === "ai" && (
              <AITab
                inputClass={inputClass}
                designNotes={designNotes}
                setDesignNotes={setDesignNotes}
                designTags={designTags}
                setDesignTags={setDesignTags}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-base-300 bg-neutral p-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={savingState !== "idle"}
              className={`btn btn-primary flex flex-1 items-center justify-center gap-2 ${
                savingState === "saving" ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              {savingState === "saving" ? (
                <>
                  <TbLoader2 className="animate-spin" />
                  Saving...
                </>
              ) : savingState === "saved" ? (
                <>
                  <TbCheck />
                  Saved
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
    </FloatingPanel>
  );
}
