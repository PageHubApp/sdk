import { ROOT_NODE, useEditor } from "@craftjs/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbCode, TbPalette, TbPlug, TbPuzzle, TbRoute, TbSparkles } from "react-icons/tb";
import debounce from "lodash.debounce";
import { FloatingPanel } from "../floating/FloatingPanel";
import { BrandingTab } from "./site-settings/BrandingTab";
import { IntegrationsTab } from "./site-settings/IntegrationsTab";
import { RedirectsTab } from "./site-settings/RedirectsTab";
import { AITab } from "./site-settings/AITab";
import { CodeTab } from "./site-settings/CodeTab";
import { normalizeDesignTags } from "../../utils/normalizeDesignTags";
import { useEditorSidebarDockLeft } from "../../utils/lib";

type SiteSettingsVariable = { key: string; value: string };
type SiteSettingsIntegrationMap = Record<string, Record<string, string>>;
type SiteSettingsRedirect = { from: string; to: string; permanent: boolean };
type SiteSettingsConnectorMap = Record<string, Record<string, any>>;

interface SiteSettingsDraft {
  favicon: string;
  headerCode: string;
  footerCode: string;
  companyName: string;
  companyTagline: string;
  companyType: string;
  companyLocation: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  designNotes: string;
  designTags: string[];
  customVariables: SiteSettingsVariable[];
  integrations: SiteSettingsIntegrationMap;
  redirects: SiteSettingsRedirect[];
  connectors: SiteSettingsConnectorMap;
}

/** App-injected tab rendered inside the Site Settings modal. */
export interface SiteSettingsExtraTab {
  key: string;
  label: string;
  render: (ctx: {
    inputClass: string;
    selectClass: string;
    query: any;
    actions: any;
    draft?: Record<string, any>;
    setDraft?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    requestSave?: () => void;
    flushSave?: () => void;
  }) => React.ReactNode;
  /** Optional: called during flush to let the tab commit props to ROOT. */
  onSave?: (setProp: (cb: (props: any) => void) => void) => void;
}

interface SiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Extra tabs injected by the host app (e.g. Connectors). */
  extraTabs?: SiteSettingsExtraTab[];
}

/** Wide enough for two-column branding fields; stacks above AI Assistant (z 9999). */
const SITE_SETTINGS_DEFAULT_WIDTH = 920;
const SITE_SETTINGS_Z = 10050;

function normalizeVariables(input: unknown): SiteSettingsVariable[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item: any) => ({
      key: typeof item?.key === "string" ? item.key : "",
      value: typeof item?.value === "string" ? item.value : "",
    }))
    .filter(item => item.key || item.value);
}

function normalizeIntegrations(input: unknown): SiteSettingsIntegrationMap {
  if (!input || typeof input !== "object") return {};
  const next: SiteSettingsIntegrationMap = {};
  for (const [provider, config] of Object.entries(input as Record<string, any>)) {
    if (!config || typeof config !== "object") continue;
    const cleaned: Record<string, string> = {};
    for (const [field, value] of Object.entries(config)) {
      if (typeof value === "string") cleaned[field] = value;
    }
    if (Object.keys(cleaned).length > 0) next[provider] = cleaned;
  }
  return next;
}

function normalizeRedirects(input: unknown): SiteSettingsRedirect[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item: any) => ({
      from: typeof item?.from === "string" ? item.from : "",
      to: typeof item?.to === "string" ? item.to : "",
      permanent: item?.permanent !== false,
    }))
    .filter(item => item.from.trim() && item.to.trim());
}

function normalizeConnectors(input: unknown): SiteSettingsConnectorMap {
  if (!input || typeof input !== "object") return {};
  const next: SiteSettingsConnectorMap = {};
  for (const [provider, config] of Object.entries(input as Record<string, any>)) {
    if (!config || typeof config !== "object") continue;
    const cleaned: Record<string, any> = {};
    for (const [field, value] of Object.entries(config)) {
      if (typeof value === "string" && value.trim()) cleaned[field] = value;
      else if (typeof value === "boolean" || typeof value === "number") cleaned[field] = value;
    }
    if (Object.keys(cleaned).length > 0) next[provider] = cleaned;
  }
  return next;
}

function createDraftFromRoot(props: Record<string, any>): SiteSettingsDraft {
  const company = props.company || {};
  const designTags = Array.isArray(props.designTags)
    ? normalizeDesignTags(props.designTags.filter((t: unknown): t is string => typeof t === "string"))
    : [];

  return {
    favicon: props.ico || "",
    headerCode: props.header || "",
    footerCode: props.footer || "",
    companyName: company.name || "",
    companyTagline: company.tagline || "",
    companyType: company.type || "",
    companyLocation: company.location || "",
    companyAddress: company.address || "",
    companyPhone: company.phone || "",
    companyEmail: company.email || "",
    companyWebsite: company.website || "",
    designNotes: typeof props.designNotes === "string" ? props.designNotes : "",
    designTags,
    customVariables: normalizeVariables(props.variables),
    integrations: normalizeIntegrations(props.integrations),
    redirects: normalizeRedirects(props.redirects),
    connectors: normalizeConnectors(props.connectors),
  };
}

function getDraftSignature(draft: SiteSettingsDraft): string {
  return JSON.stringify({
    ...draft,
    designTags: normalizeDesignTags(draft.designTags),
    customVariables: draft.customVariables
      .map(variable => ({
        key: variable.key.trim(),
        value: variable.value.trim(),
      }))
      .filter(variable => variable.key || variable.value),
    integrations: normalizeIntegrations(draft.integrations),
    redirects: normalizeRedirects(draft.redirects),
    connectors: normalizeConnectors(draft.connectors),
  });
}

function applyDraftToProps(props: Record<string, any>, draft: SiteSettingsDraft) {
  props.ico = draft.favicon || undefined;
  if (draft.favicon) {
    props.icoType = "cdn";
  } else {
    delete props.icoType;
  }

  props.header = draft.headerCode;
  props.footer = draft.footerCode;

  props.company = {
    name: draft.companyName,
    tagline: draft.companyTagline,
    type: draft.companyType,
    location: draft.companyLocation,
    address: draft.companyAddress,
    phone: draft.companyPhone,
    email: draft.companyEmail,
    website: draft.companyWebsite,
  };
  props.brandingCommitted = true;

  delete props.ai;

  const notesTrim = draft.designNotes.trim();
  props.designNotes = notesTrim ? notesTrim.slice(0, 1200) : undefined;

  const tagList = normalizeDesignTags(draft.designTags);
  props.designTags = tagList.length ? tagList : undefined;

  const cleanVariables = draft.customVariables
    .map(variable => ({
      key: variable.key.trim(),
      value: variable.value.trim(),
    }))
    .filter(variable => variable.key && variable.value);
  props.variables = cleanVariables.length ? cleanVariables : undefined;

  const cleanIntegrations = normalizeIntegrations(draft.integrations);
  props.integrations = Object.keys(cleanIntegrations).length ? cleanIntegrations : undefined;

  const cleanRedirects = normalizeRedirects(draft.redirects);
  props.redirects = cleanRedirects.length ? cleanRedirects : undefined;

  const cleanConnectors = normalizeConnectors(draft.connectors);
  props.connectors = Object.keys(cleanConnectors).length ? cleanConnectors : undefined;
}

export function SiteSettingsModal({ isOpen, onClose, extraTabs = [] }: SiteSettingsModalProps) {
  const { actions, query } = useEditor();
  /** Same side as the main toolbar — dock left with left toolbar, right with right. */
  const toolbarDockedLeft = useEditorSidebarDockLeft();
  const siteSettingsDockRight = !toolbarDockedLeft;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const modalDefaultHeight = Math.max(520, Math.min(680, Math.round(viewportHeight * 0.72)));
  const modalMaxHeight = Math.max(600, Math.min(760, Math.round(viewportHeight * 0.82)));

  const [activeTab, setActiveTab] = useState<string>("branding");
  const [draft, setDraft] = useState<SiteSettingsDraft>(() => createDraftFromRoot({}));
  const draftRef = useRef(draft);
  const queryRef = useRef(query);
  const lastSavedSignatureRef = useRef<string>(getDraftSignature(draft));
  const flushNowRef = useRef<() => void>(() => {});
  const requestSaveRef = useRef<ReturnType<typeof debounce> | null>(null);

  const flushNow = useCallback(() => {
    const snapshot = draftRef.current;
    const nextSignature = getDraftSignature(snapshot);
    if (nextSignature === lastSavedSignatureRef.current) return;

    actions.setProp(ROOT_NODE, props => {
      applyDraftToProps(props, snapshot);

      for (const tab of extraTabs) {
        tab.onSave?.(cb => cb(props));
      }
    });

    lastSavedSignatureRef.current = nextSignature;
  }, [actions, extraTabs]);

  const requestSave = useMemo(() => debounce(flushNow, 350), [flushNow]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    flushNowRef.current = flushNow;
  }, [flushNow]);

  useEffect(() => {
    requestSaveRef.current = requestSave;
    return () => {
      requestSaveRef.current?.cancel();
    };
  }, [requestSave]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!isOpen) return;

    try {
      const root = queryRef.current.node(ROOT_NODE).get();
      const nextDraft = createDraftFromRoot((root?.data?.props || {}) as Record<string, any>);
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      lastSavedSignatureRef.current = getDraftSignature(nextDraft);
    } catch (e) {
      console.error("Error loading site settings:", e);
    }

    return () => {
      requestSaveRef.current?.cancel();
      flushNowRef.current();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    requestSaveRef.current?.();
  }, [draft, isOpen]);

  const handleClose = useCallback(() => {
    requestSaveRef.current?.cancel();
    flushNowRef.current();
    onClose();
  }, [onClose]);

  const updateDraftField = useCallback(
    <K extends keyof SiteSettingsDraft>(
      key: K,
      value: React.SetStateAction<SiteSettingsDraft[K]>
    ) => {
      setDraft(prev => {
        const resolvedValue =
          typeof value === "function"
            ? (value as (prevState: SiteSettingsDraft[K]) => SiteSettingsDraft[K])(prev[key])
            : value;
        const next = { ...prev, [key]: resolvedValue };
        draftRef.current = next;
        return next;
      });
    },
    []
  );

  const navBtn = (tab: string, label: string, icon: React.ReactNode) => {
    const on = activeTab === tab;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`flex w-full items-center gap-2 rounded-r-md px-3 py-2 text-left text-sm font-medium transition-colors ${
          on
            ? "border-l-2 border-primary bg-base-100 text-primary shadow-sm"
            : "border-l-2 border-transparent text-neutral-content hover:bg-base-200/80 hover:text-base-content"
        }`}
      >
        <span className="shrink-0 opacity-90 [&>svg]:size-4">{icon}</span>
        <span className="min-w-0 truncate">{label}</span>
      </button>
    );
  };

  /** Toolbar-aligned field chrome: lifted surface + visible border (not flat `bg-input`). */
  const inputClass =
    "w-full rounded-lg border border-base-300 bg-base-200 px-4 py-2 text-sm text-base-content shadow-sm placeholder:text-neutral-content transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-primary hover:bg-base-300/25 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50";
  const selectClass =
    "w-full cursor-pointer rounded-lg border border-base-300 bg-base-200 px-2 py-2 text-xs text-base-content shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50";

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={handleClose}
      title="Site Settings"
      storageKey="site-settings"
      defaultWidth={SITE_SETTINGS_DEFAULT_WIDTH}
      defaultHeight={modalDefaultHeight}
      minWidth={640}
      maxWidth={1280}
      minHeight={400}
      maxHeight={modalMaxHeight}
      dockToEdge={siteSettingsDockRight ? "right" : "left"}
      zIndex={SITE_SETTINGS_Z}
      edges={["e", "s", "se", "w", "sw"]}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
          <nav
            className="border-base-300 bg-neutral scrollbar-light flex w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r py-2 pr-1 pl-2"
            aria-label="Site settings sections"
          >
            {navBtn("branding", "Branding", <TbPalette />)}
            {navBtn("integrations", "Integrations", <TbPlug />)}
            {extraTabs.map(tab => (
              <React.Fragment key={tab.key}>{navBtn(tab.key, tab.label, <TbPuzzle />)}</React.Fragment>
            ))}
            {navBtn("redirects", "Redirects", <TbRoute />)}
            {navBtn("ai", "AI", <TbSparkles />)}
            {navBtn("code", "Custom code", <TbCode />)}
          </nav>

          <div className="scrollbar-light bg-base-100 text-base-content flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-6">
            {activeTab === "code" && (
              <CodeTab
                headerCode={draft.headerCode}
                setHeaderCode={value => updateDraftField("headerCode", value)}
                footerCode={draft.footerCode}
                setFooterCode={value => updateDraftField("footerCode", value)}
              />
            )}

            {activeTab === "branding" && (
              <BrandingTab
                inputClass={inputClass}
                favicon={draft.favicon}
                setFavicon={value => updateDraftField("favicon", value)}
                companyName={draft.companyName}
                setCompanyName={value => updateDraftField("companyName", value)}
                companyTagline={draft.companyTagline}
                setCompanyTagline={value => updateDraftField("companyTagline", value)}
                companyType={draft.companyType}
                setCompanyType={value => updateDraftField("companyType", value)}
                companyLocation={draft.companyLocation}
                setCompanyLocation={value => updateDraftField("companyLocation", value)}
                companyAddress={draft.companyAddress}
                setCompanyAddress={value => updateDraftField("companyAddress", value)}
                companyPhone={draft.companyPhone}
                setCompanyPhone={value => updateDraftField("companyPhone", value)}
                companyEmail={draft.companyEmail}
                setCompanyEmail={value => updateDraftField("companyEmail", value)}
                companyWebsite={draft.companyWebsite}
                setCompanyWebsite={value => updateDraftField("companyWebsite", value)}
                customVariables={draft.customVariables}
                setCustomVariables={value => updateDraftField("customVariables", value)}
              />
            )}

            {activeTab === "integrations" && (
              <IntegrationsTab
                inputClass={inputClass}
                integrations={draft.integrations}
                setIntegrations={value => updateDraftField("integrations", value)}
              />
            )}

            {extraTabs.map(tab =>
              activeTab === tab.key ? (
                <React.Fragment key={tab.key}>
                  {tab.render({
                    inputClass,
                    selectClass,
                    query,
                    actions,
                    draft: draft as Record<string, any>,
                    setDraft: setDraft as React.Dispatch<
                      React.SetStateAction<Record<string, any>>
                    >,
                    requestSave: () => requestSave(),
                    flushSave: flushNow,
                  })}
                </React.Fragment>
              ) : null
            )}

            {activeTab === "redirects" && (
              <RedirectsTab
                inputClass={inputClass}
                selectClass={selectClass}
                redirects={draft.redirects}
                setRedirects={value => updateDraftField("redirects", value)}
              />
            )}

            {activeTab === "ai" && (
              <AITab
                inputClass={inputClass}
                designNotes={draft.designNotes}
                setDesignNotes={value => updateDraftField("designNotes", value)}
                designTags={draft.designTags}
                setDesignTags={value => updateDraftField("designTags", value)}
              />
            )}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}
