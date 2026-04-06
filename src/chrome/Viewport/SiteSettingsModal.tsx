import { ROOT_NODE, useEditor } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { TbCheck, TbLoader2 } from "react-icons/tb";
import { FloatingPanel } from "../FloatingPanel";
import { BrandingTab } from "./SiteSettings/BrandingTab";
import { IntegrationsTab, INTEGRATION_PROVIDERS } from "./SiteSettings/IntegrationsTab";
import { RedirectsTab } from "./SiteSettings/RedirectsTab";
import { AITab } from "./SiteSettings/AITab";
import { CodeTab } from "./SiteSettings/CodeTab";

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

  // AI Settings
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyleTags, setAiStyleTags] = useState<string[]>([]);

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

          const ai = props.ai || {};
          setAiPrompt(ai.prompt || "");
          setAiStyleTags(ai.styleTags || []);

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

        props.ai = {
          prompt: aiPrompt,
          styleTags: aiStyleTags,
        };

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
        ? "border-b-2 border-primary bg-background text-primary"
        : "text-muted-foreground hover:text-foreground"
    }`;

  const inputClass = "w-full rounded-lg border border-border bg-input px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

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
          <div className="flex border-b border-border bg-muted">
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
          <div className="scrollbar-light flex-1 space-y-4 overflow-y-auto bg-background p-6 text-foreground">
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
                redirects={redirects} setRedirects={setRedirects}
              />
            )}

            {activeTab === "ai" && (
              <AITab
                inputClass={inputClass}
                aiPrompt={aiPrompt} setAiPrompt={setAiPrompt}
                aiStyleTags={aiStyleTags} setAiStyleTags={setAiStyleTags}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-border bg-muted p-4">
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
