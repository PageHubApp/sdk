import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbCode, TbPalette, TbPlug, TbPuzzle, TbRoute, TbSparkles } from "react-icons/tb";
import { normalizeDesignTags } from "../../utils/normalizeDesignTags";
import { useEditorSidebarDockLeft } from "../../utils/lib";
import { AITab } from "./site-settings/AITab";
import { BrandingTab } from "./site-settings/BrandingTab";
import { CodeTab } from "./site-settings/CodeTab";
import { IntegrationsTab } from "./site-settings/IntegrationsTab";
import { RedirectsTab } from "./site-settings/RedirectsTab";
import { mergeSettingsTabs, visibleSettingsTabs } from "./settings/registry";
import { SETTINGS_INPUT_CLASS, SETTINGS_SELECT_CLASS } from "./settings/settingsControlClasses";
import { SettingsShell } from "./settings/SettingsShell";
import { type SettingsTabDefinition } from "./settings/types";
import { useSettingsController } from "./settings/useSettingsController";

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

/** Backward compatible host tab contract (v1). */
export interface SiteSettingsExtraTab {
  key: string;
  label: string;
  order?: number;
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
  onSave?: (setProp: (cb: (props: any) => void) => void) => void;
}

interface SiteSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  extraTabs?: SiteSettingsExtraTab[];
}

interface SiteSettingsTabContext {
  setProp?: (cb: (props: any) => void) => void;
}

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
  const design = props.design || {};
  const seo = props.seo || {};
  const inject = props.inject || {};
  const favicon = seo.favicon || {};
  const designTags = Array.isArray(design.tags)
    ? normalizeDesignTags(
        design.tags.filter((t: unknown): t is string => typeof t === "string")
      )
    : [];

  return {
    favicon: favicon.href || "",
    headerCode: inject.head || "",
    footerCode: inject.footer || "",
    companyName: company.name || "",
    companyTagline: company.tagline || "",
    companyType: company.type || "",
    companyLocation: company.location || "",
    companyAddress: company.address || "",
    companyPhone: company.phone || "",
    companyEmail: company.email || "",
    companyWebsite: company.website || "",
    designNotes: typeof design.notes === "string" ? design.notes : "",
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
  // Favicon lives at seo.favicon.{href, type, content}. Keep existing seo.* fields (title/description/etc) intact.
  const seo: Record<string, any> = { ...(props.seo || {}) };
  const existingFavicon = seo.favicon || {};
  if (draft.favicon) {
    seo.favicon = { ...existingFavicon, href: draft.favicon, type: "cdn" };
  } else {
    const nextFavicon = { ...existingFavicon };
    delete nextFavicon.href;
    delete nextFavicon.type;
    if (Object.keys(nextFavicon).length) seo.favicon = nextFavicon;
    else delete seo.favicon;
  }
  props.seo = Object.keys(seo).length ? seo : undefined;

  // HTML head/body injection now lives under inject.{head, footer}.
  const inject: Record<string, any> = {};
  if (draft.headerCode) inject.head = draft.headerCode;
  if (draft.footerCode) inject.footer = draft.footerCode;
  props.inject = Object.keys(inject).length ? inject : undefined;

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

  const design: Record<string, any> = {};
  const notesTrim = draft.designNotes.trim();
  if (notesTrim) design.notes = notesTrim.slice(0, 1200);
  const tagList = normalizeDesignTags(draft.designTags);
  if (tagList.length) design.tags = tagList;
  props.design = Object.keys(design).length ? design : undefined;

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

function adaptLegacyExtraTabs(
  extraTabs: SiteSettingsExtraTab[]
): Array<SettingsTabDefinition<SiteSettingsDraft, SiteSettingsTabContext>> {
  return extraTabs.map(tab => ({
    key: tab.key,
    label: tab.label,
    order: Number.isFinite(tab.order) ? tab.order : 300,
    icon: <TbPuzzle />,
    render: ctx =>
      tab.render({
        inputClass: ctx.inputClass,
        selectClass: ctx.selectClass,
        query: ctx.query,
        actions: ctx.actions,
        draft: ctx.draft as Record<string, any>,
        setDraft: ctx.setDraft as React.Dispatch<React.SetStateAction<Record<string, any>>>,
        requestSave: ctx.requestSave,
        flushSave: ctx.flushSave,
      }),
    onSave: ctx => {
      if (!ctx.setProp || !tab.onSave) return;
      tab.onSave(ctx.setProp);
    },
  }));
}

export function SiteSettingsModal({ isOpen, onClose, extraTabs = [] }: SiteSettingsModalProps) {
  const { actions, query } = useEditor();
  const queryRef = useRef(query);

  const toolbarDockedLeft = useEditorSidebarDockLeft();
  const siteSettingsDockRight = !toolbarDockedLeft;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const modalDefaultHeight = Math.max(520, Math.min(680, Math.round(viewportHeight * 0.72)));
  const modalMaxHeight = Math.max(600, Math.min(760, Math.round(viewportHeight * 0.82)));

  const [activeTab, setActiveTab] = useState<string>("branding");

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const builtInTabs = useMemo<
    Array<SettingsTabDefinition<SiteSettingsDraft, SiteSettingsTabContext>>
  >(
    () => [
      {
        key: "branding",
        label: "Branding",
        order: 100,
        icon: <TbPalette />,
        render: ctx => (
          <BrandingTab
            inputClass={ctx.inputClass}
            favicon={ctx.draft.favicon}
            setFavicon={value => ctx.updateField("favicon", value)}
            companyName={ctx.draft.companyName}
            setCompanyName={value => ctx.updateField("companyName", value)}
            companyTagline={ctx.draft.companyTagline}
            setCompanyTagline={value => ctx.updateField("companyTagline", value)}
            companyType={ctx.draft.companyType}
            setCompanyType={value => ctx.updateField("companyType", value)}
            companyLocation={ctx.draft.companyLocation}
            setCompanyLocation={value => ctx.updateField("companyLocation", value)}
            companyAddress={ctx.draft.companyAddress}
            setCompanyAddress={value => ctx.updateField("companyAddress", value)}
            companyPhone={ctx.draft.companyPhone}
            setCompanyPhone={value => ctx.updateField("companyPhone", value)}
            companyEmail={ctx.draft.companyEmail}
            setCompanyEmail={value => ctx.updateField("companyEmail", value)}
            companyWebsite={ctx.draft.companyWebsite}
            setCompanyWebsite={value => ctx.updateField("companyWebsite", value)}
            customVariables={ctx.draft.customVariables}
            setCustomVariables={value => ctx.updateField("customVariables", value)}
          />
        ),
      },
      {
        key: "integrations",
        label: "Integrations",
        order: 200,
        icon: <TbPlug />,
        render: ctx => (
          <IntegrationsTab
            inputClass={ctx.inputClass}
            integrations={ctx.draft.integrations}
            setIntegrations={value => ctx.updateField("integrations", value)}
          />
        ),
      },
      {
        key: "redirects",
        label: "Redirects",
        order: 400,
        icon: <TbRoute />,
        render: ctx => (
          <RedirectsTab
            inputClass={ctx.inputClass}
            selectClass={ctx.selectClass}
            redirects={ctx.draft.redirects}
            setRedirects={value => ctx.updateField("redirects", value)}
          />
        ),
      },
      {
        key: "ai",
        label: "AI",
        order: 500,
        icon: <TbSparkles />,
        render: ctx => (
          <AITab
            inputClass={ctx.inputClass}
            designNotes={ctx.draft.designNotes}
            setDesignNotes={value => ctx.updateField("designNotes", value)}
            designTags={ctx.draft.designTags}
            setDesignTags={value => ctx.updateField("designTags", value)}
          />
        ),
      },
      {
        key: "code",
        label: "Custom code",
        order: 600,
        icon: <TbCode />,
        render: ctx => (
          <CodeTab
            headerCode={ctx.draft.headerCode}
            setHeaderCode={value => ctx.updateField("headerCode", value)}
            footerCode={ctx.draft.footerCode}
            setFooterCode={value => ctx.updateField("footerCode", value)}
          />
        ),
      },
    ],
    []
  );

  const injectedTabs = useMemo(() => adaptLegacyExtraTabs(extraTabs), [extraTabs]);
  const allTabs = useMemo(
    () => mergeSettingsTabs(builtInTabs, injectedTabs),
    [builtInTabs, injectedTabs]
  );

  const { draft, setDraft, updateField, loading, requestSave, flushSave } =
    useSettingsController<SiteSettingsDraft>({
      isOpen,
      loadDraft: () => {
        try {
          const root = queryRef.current.node(ROOT_NODE).get();
          return createDraftFromRoot((root?.data?.props || {}) as Record<string, any>);
        } catch (e) {
          console.error("Error loading site settings:", e);
          return createDraftFromRoot({});
        }
      },
      getDraftSignature: getDraftSignature,
      commitDraft: snapshot => {
        actions.setProp(ROOT_NODE, props => {
          applyDraftToProps(props, snapshot);
          for (const tab of allTabs) {
            tab.onSave?.({
              query,
              actions,
              draft: snapshot,
              setProp: cb => cb(props),
            });
          }
        });
      },
      debounceMs: 350,
      reloadKey: isOpen,
    });

  const inputClass = SETTINGS_INPUT_CLASS;
  const selectClass = SETTINGS_SELECT_CLASS;

  const tabRenderCtx = useMemo(
    () => ({
      inputClass,
      selectClass,
      query,
      actions,
      draft,
      setDraft,
      updateField,
      requestSave,
      flushSave,
    }),
    [actions, draft, flushSave, query, requestSave, selectClass, setDraft, updateField]
  );

  const tabs = useMemo(() => visibleSettingsTabs(allTabs, tabRenderCtx), [allTabs, tabRenderCtx]);
  const activeDef = tabs.find(tab => tab.key === activeTab) ?? tabs[0];

  const handleClose = useCallback(() => {
    flushSave();
    onClose();
  }, [flushSave, onClose]);

  if (!isOpen) return null;

  return (
    <SettingsShell
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
      tabs={tabs.map(tab => ({ key: tab.key, label: tab.label, icon: tab.icon }))}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : activeDef ? (
        activeDef.render(tabRenderCtx)
      ) : null}
    </SettingsShell>
  );
}
