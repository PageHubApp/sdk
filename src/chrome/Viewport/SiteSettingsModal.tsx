// @ts-nocheck
import { ROOT_NODE, useEditor } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { TbCheck, TbInfoCircle, TbLoader2, TbPlus, TbTrash } from "react-icons/tb";
const HTMLCodeInput = React.lazy(() => import("../Toolbar/Inputs/advanced/HTMLCodeInput").then(m => ({ default: m.HTMLCodeInput })));
import { FloatingPanel } from "../FloatingPanel";
import { StandaloneImagePicker } from "./StandaloneImagePicker";

const INTEGRATION_PROVIDERS = {
  googleAnalytics: {
    label: "Google Analytics (GA4)",
    placeholder: "G-XXXXXXXXXX",
    field: "measurementId",
    help: "GA4 Measurement ID. Find it in Admin > Data Streams.",
  },
  googleTagManager: {
    label: "Google Tag Manager",
    placeholder: "GTM-XXXXXXX",
    field: "containerId",
    help: "GTM Container ID. Covers GA, Meta Pixel, and most tags in one shot.",
  },
  googleSearchConsole: {
    label: "Google Search Console",
    placeholder: "verification code",
    field: "verificationCode",
    help: "HTML tag verification code (just the content value, not the full meta tag).",
  },
  metaPixel: {
    label: "Meta Pixel (Facebook)",
    placeholder: "XXXXXXXXXXXXXXXX",
    field: "pixelId",
    help: "Facebook/Meta Pixel ID for conversion tracking.",
  },
};

interface SiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SiteSettingsModal = ({ isOpen, onClose }: SiteSettingsModalProps) => {
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

          // Load company settings from ROOT_NODE
          const company = props.company || {};
          setCompanyName(company.name || "");
          setCompanyTagline(company.tagline || "");
          setCompanyType(company.type || "");
          setCompanyLocation(company.location || "");
          setCompanyAddress(company.address || "");
          setCompanyPhone(company.phone || "");
          setCompanyEmail(company.email || "");
          setCompanyWebsite(company.website || "");

          // Load AI settings from ROOT_NODE
          const ai = props.ai || {};
          setAiPrompt(ai.prompt || "");
          setAiStyleTags(ai.styleTags || []);

          // Load integrations
          setIntegrations(props.integrations || {});

          // Load redirects
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
      // Wait a bit to show loading state
      await new Promise(resolve => setTimeout(resolve, 300));

      // Save everything to ROOT_NODE props
      actions.setProp(ROOT_NODE, props => {
        // Favicon and custom code
        props.ico = favicon;
        if (favicon) {
          props.icoType = "cdn";
        }
        props.header = headerCode;
        props.footer = footerCode;

        // Company settings as nested object
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

        // AI settings as nested object
        props.ai = {
          prompt: aiPrompt,
          styleTags: aiStyleTags,
        };

        // Integrations — only save providers that have values
        const cleanIntegrations = {};
        for (const [key, config] of Object.entries(integrations)) {
          const meta = INTEGRATION_PROVIDERS[key];
          if (meta && config[meta.field]) {
            cleanIntegrations[key] = { [meta.field]: config[meta.field] };
          }
        }
        props.integrations = Object.keys(cleanIntegrations).length ? cleanIntegrations : undefined;

        // Redirects — only save rules with both from and to
        const cleanRedirects = redirects.filter(r => r.from && r.to);
        props.redirects = cleanRedirects.length ? cleanRedirects : undefined;
      });

      setSavingState("saved");

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSavingState("idle");
      }, 2000);
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
          <div className="scrollbar flex-1 space-y-4 overflow-y-auto bg-background p-6 text-foreground">
            {/* Custom Code Tab */}
            {activeTab === "code" && (
              <div className="space-y-6">
                <HTMLCodeInput
                  value={headerCode}
                  onChange={setHeaderCode}
                  label="Header Code"
                  height="200px"
                  placeholder="<style>...</style>&#10;<script>...</script>"
                  helpText="Custom CSS and JavaScript injected into the &lt;head&gt; of every page"
                />

                <HTMLCodeInput
                  value={footerCode}
                  onChange={setFooterCode}
                  label="Footer Code"
                  height="200px"
                  placeholder="<script>...</script>"
                  helpText="Scripts injected before the closing &lt;/body&gt; tag"
                />
              </div>
            )}

            {/* Branding Tab */}
            {activeTab === "branding" && (
              <div className="space-y-6">
                <div className="mb-4 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Branding & Company Information
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your company details and branding assets for customization
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Favicon</label>
                  <StandaloneImagePicker
                    value={favicon}
                    onChange={setFavicon}
                    label="Upload Favicon"
                    help="Recommended: .ico, .png, or .gif. Appears in browser tabs."
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className={inputClass}
                      placeholder="Your Company"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Company Tagline
                    </label>
                    <input
                      type="text"
                      value={companyTagline}
                      onChange={e => setCompanyTagline(e.target.value)}
                      className={inputClass}
                      placeholder="Your company's tagline or slogan"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Company Type
                    </label>
                    <input
                      type="text"
                      value={companyType}
                      onChange={e => setCompanyType(e.target.value)}
                      className={inputClass}
                      placeholder="e.g., ecommerce, finance, technology"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Company Location
                    </label>
                    <input
                      type="text"
                      value={companyLocation}
                      onChange={e => setCompanyLocation(e.target.value)}
                      className={inputClass}
                      placeholder="Los Angeles, CA"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Address</label>
                  <textarea
                    value={companyAddress}
                    onChange={e => setCompanyAddress(e.target.value)}
                    rows={2}
                    className={inputClass}
                    placeholder="123 Main St, Suite 100&#10;Los Angeles, CA 90001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Phone</label>
                    <input
                      type="tel"
                      value={companyPhone}
                      onChange={e => setCompanyPhone(e.target.value)}
                      className={inputClass}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={e => setCompanyEmail(e.target.value)}
                      className={inputClass}
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Website</label>
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={e => setCompanyWebsite(e.target.value)}
                    className={inputClass}
                    placeholder="https://www.company.com"
                  />
                </div>

                <div className="mt-4 rounded-lg border border-border bg-muted p-4">
                  <div className="flex gap-3">
                    <TbInfoCircle className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Use variables throughout your site
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Add these in any text or button to automatically display values:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <code className="rounded bg-background px-2 py-1 text-xs text-foreground">
                          {"{{company.name}}"}
                        </code>
                        <code className="rounded bg-background px-2 py-1 text-xs text-foreground">
                          {"{{company.tagline}}"}
                        </code>
                        <code className="rounded bg-background px-2 py-1 text-xs text-foreground">
                          {"{{company.email}}"}
                        </code>
                        <code className="rounded bg-background px-2 py-1 text-xs text-foreground">
                          {"{{company.phone}}"}
                        </code>
                        <code className="rounded bg-background px-2 py-1 text-xs text-foreground">
                          {"{{year}}"}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div className="space-y-6">
                <div className="mb-4 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Analytics & Tracking
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Connect analytics, tracking pixels, and site verification. Just paste in your ID.
                  </p>
                </div>

                {Object.entries(INTEGRATION_PROVIDERS).map(([key, meta]) => {
                  const value = integrations[key]?.[meta.field] || "";
                  return (
                    <div key={key}>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        {meta.label}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={e => {
                          setIntegrations(prev => ({
                            ...prev,
                            [key]: { [meta.field]: e.target.value },
                          }));
                        }}
                        className={inputClass}
                        placeholder={meta.placeholder}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{meta.help}</p>
                    </div>
                  );
                })}

                <div className="mt-4 rounded-lg border border-border bg-muted p-4">
                  <div className="flex gap-3">
                    <TbInfoCircle className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Using Google Tag Manager?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        GTM can manage GA, Meta Pixel, and most other tags. If you use GTM, you
                        only need the GTM Container ID here — configure individual tags inside GTM.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Redirects Tab */}
            {activeTab === "redirects" && (
              <div className="space-y-6">
                <div className="mb-4 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    301 Redirects
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Redirect old URLs to new ones. Prevents broken links and preserves SEO juice.
                  </p>
                </div>

                {redirects.map((rule, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={rule.from}
                        onChange={e => {
                          const updated = [...redirects];
                          updated[i] = { ...updated[i], from: e.target.value };
                          setRedirects(updated);
                        }}
                        className={inputClass}
                        placeholder="/old-page"
                      />
                      <input
                        type="text"
                        value={rule.to}
                        onChange={e => {
                          const updated = [...redirects];
                          updated[i] = { ...updated[i], to: e.target.value };
                          setRedirects(updated);
                        }}
                        className={inputClass}
                        placeholder="/new-page or https://..."
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <select
                        value={rule.permanent ? "301" : "302"}
                        onChange={e => {
                          const updated = [...redirects];
                          updated[i] = { ...updated[i], permanent: e.target.value === "301" };
                          setRedirects(updated);
                        }}
                        className="rounded border border-border bg-input px-2 py-1.5 text-xs text-foreground"
                      >
                        <option value="301">301</option>
                        <option value="302">302</option>
                      </select>
                      <button
                        onClick={() => setRedirects(redirects.filter((_, j) => j !== i))}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <TbTrash className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setRedirects([...redirects, { from: "", to: "", permanent: true }])}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  <TbPlus className="size-4" />
                  Add redirect
                </button>

                {redirects.length > 0 && (
                  <div className="mt-4 rounded-lg border border-border bg-muted p-4">
                    <div className="flex gap-3">
                      <TbInfoCircle className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <strong>301</strong> = permanent redirect (search engines transfer SEO).{" "}
                          <strong>302</strong> = temporary redirect (search engines keep the original URL indexed).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Tab */}
            {activeTab === "ai" && (
              <div className="space-y-6">
                <div className="mb-4 space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">AI Content Generator</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize how AI improves your content with a custom prompt and style
                    preferences
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Custom AI Prompt
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    rows={3}
                    maxLength={200}
                    className={inputClass}
                    placeholder="Make the copy more engaging, clear, and compelling while keeping the same core message..."
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Brief instructions for how AI should improve your content
                    </p>
                    <span className="text-xs text-muted-foreground">{aiPrompt.length}/200</span>
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-foreground">
                    Style Tags
                  </label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "engaging",
                        "vibrant",
                        "professional",
                        "friendly",
                        "clear",
                        "compelling",
                        "concise",
                        "persuasive",
                        "creative",
                        "confident",
                        "trustworthy",
                        "modern",
                      ].map(tag => (
                        <label key={tag} className="flex cursor-pointer items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={aiStyleTags.includes(tag)}
                            onChange={e => {
                              if (e.target.checked) {
                                setAiStyleTags([...aiStyleTags, tag]);
                              } else {
                                setAiStyleTags(aiStyleTags.filter(t => t !== tag));
                              }
                            }}
                            className="rounded-lg border-border text-accent focus:ring-ring"
                          />
                          <span className="text-sm capitalize text-foreground">{tag}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select style preferences to guide AI content generation
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-muted p-4">
                  <div className="flex gap-3">
                    <TbInfoCircle className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Your custom prompt and selected style tags will be used by the AI wand tool
                        in the text editor to improve your content. Leave the prompt empty to use
                        default behavior.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-border bg-muted p-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={savingState !== "idle"}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium text-primary-foreground transition-all ${
                savingState === "saving"
                  ? "cursor-not-allowed bg-primary/60 opacity-60"
                  : savingState === "saved"
                    ? "bg-primary"
                    : "bg-primary hover:bg-primary/90"
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
};
