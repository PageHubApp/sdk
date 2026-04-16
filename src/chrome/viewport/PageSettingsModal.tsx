import { ROOT_NODE, useEditor } from "@craftjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sluggit from "slug";
import { TbAdjustments, TbSearch, TbSettings } from "react-icons/tb";
import { useSDK } from "../../core/context";
import { useEditorSidebarDockLeft } from "../../utils/lib";
import { AdvancedTab } from "./page-settings/AdvancedTab";
import { BasicTab } from "./page-settings/BasicTab";
import { SEOTab } from "./page-settings/SEOTab";
import { mergeSettingsTabs, visibleSettingsTabs } from "./settings/registry";
import { SettingsShell } from "./settings/SettingsShell";
import { type SettingsTabDefinition } from "./settings/types";
import { useSettingsController } from "./settings/useSettingsController";

interface PageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string | null;
  extraTabs?: PageSettingsExtraTab[];
}

interface PageSettingsDraft {
  pageName: string;
  isHomePage: boolean;
  is404Page: boolean;
  pageTitle: string;
  pageDescription: string;
  pageKeywords: string;
  pageAuthor: string;
  pageImage: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  twitterSite: string;
  twitterCreator: string;
  canonicalUrl: string;
  headCode: string;
  bodyClass: string;
  jsonLd: string;
  pagePassword: string;
  themeOverrides: Array<{ varName: string; value: string }>;
}

interface PageSettingsTabContext {
  pageId: string | null;
  allowCustom404Page: boolean;
  setProp?: (cb: (props: any) => void) => void;
}

export interface PageSettingsExtraTab {
  key: string;
  label: string;
  order?: number;
  render: (ctx: {
    inputClass: string;
    selectClass: string;
    query: any;
    actions: any;
    pageId: string | null;
    allowCustom404Page: boolean;
    draft?: Record<string, any>;
    setDraft?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    updateField?: (key: string, value: any) => void;
    requestSave?: () => void;
    flushSave?: () => void;
  }) => React.ReactNode;
  onSave?: (ctx: {
    pageId: string | null;
    setProp?: (cb: (props: any) => void) => void;
    draft?: Record<string, any>;
    query: any;
    actions: any;
  }) => void;
}

function createEmptyPageDraft(): PageSettingsDraft {
  return {
    pageName: "",
    isHomePage: false,
    is404Page: false,
    pageTitle: "",
    pageDescription: "",
    pageKeywords: "",
    pageAuthor: "",
    pageImage: "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterSite: "",
    twitterCreator: "",
    canonicalUrl: "",
    headCode: "",
    bodyClass: "",
    jsonLd: "",
    pagePassword: "",
    themeOverrides: [],
  };
}

function createDraftFromPageNode(node: any, allowCustom404Page: boolean): PageSettingsDraft {
  const props = node?.data?.props || {};
  const custom = node?.data?.custom || {};
  return {
    pageName: custom?.displayName || "Untitled Page",
    isHomePage: !!props.isHomePage,
    is404Page: allowCustom404Page ? !!props.is404Page : false,
    pageTitle: props.pageTitle || "",
    pageDescription: props.pageDescription || "",
    pageKeywords: props.pageKeywords || "",
    pageAuthor: props.pageAuthor || "",
    pageImage: props.pageImage || "",
    ogTitle: props.ogTitle || "",
    ogDescription: props.ogDescription || "",
    ogImage: props.ogImage || "",
    ogType: props.ogType || "website",
    twitterCard: props.twitterCard || "summary_large_image",
    twitterSite: props.twitterSite || "",
    twitterCreator: props.twitterCreator || "",
    canonicalUrl: props.canonicalUrl || "",
    headCode: props.headCode || "",
    bodyClass: props.bodyClass || "",
    jsonLd: props.jsonLd || "",
    pagePassword: props.pagePassword || "",
    themeOverrides: props.themeOverrides || [],
  };
}

function getDraftSignature(draft: PageSettingsDraft): string {
  return JSON.stringify(draft);
}

function adaptLegacyExtraTabs(
  extraTabs: PageSettingsExtraTab[]
): Array<SettingsTabDefinition<PageSettingsDraft, PageSettingsTabContext>> {
  return extraTabs.map(tab => ({
    key: tab.key,
    label: tab.label,
    order: Number.isFinite(tab.order) ? tab.order : 350,
    render: ctx =>
      tab.render({
        inputClass: ctx.inputClass,
        selectClass: ctx.selectClass,
        query: ctx.query,
        actions: ctx.actions,
        pageId: ctx.pageId,
        allowCustom404Page: ctx.allowCustom404Page,
        draft: ctx.draft as Record<string, any>,
        setDraft: ctx.setDraft as React.Dispatch<React.SetStateAction<Record<string, any>>>,
        updateField: (key, value) => ctx.updateField(key as keyof PageSettingsDraft, value as any),
        requestSave: ctx.requestSave,
        flushSave: ctx.flushSave,
      }),
    onSave: ctx =>
      tab.onSave?.({
        pageId: ctx.pageId,
        setProp: ctx.setProp,
        draft: ctx.draft as Record<string, any>,
        query: ctx.query,
        actions: ctx.actions,
      }),
  }));
}

export function PageSettingsModal({
  isOpen,
  onClose,
  pageId,
  extraTabs = [],
}: PageSettingsModalProps) {
  const { actions, query } = useEditor();
  const queryRef = useRef(query);
  const { features } = useSDK();
  const allowCustom404Page = !!features.custom404Page;

  const toolbarDockedLeft = useEditorSidebarDockLeft();
  const dockRight = !toolbarDockedLeft;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const modalDefaultHeight = Math.max(520, Math.min(680, Math.round(viewportHeight * 0.72)));
  const modalMaxHeight = Math.max(600, Math.min(760, Math.round(viewportHeight * 0.82)));

  const [activeTab, setActiveTab] = useState<string>("basic");
  const [pageSlug, setPageSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [ogExpanded, setOgExpanded] = useState(false);
  const [twitterExpanded, setTwitterExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const builtInTabs = useMemo<Array<SettingsTabDefinition<PageSettingsDraft, PageSettingsTabContext>>>(
    () => [
      {
        key: "basic",
        label: "Basic",
        order: 100,
        icon: <TbSettings />,
        render: ctx => (
          <BasicTab
            pageName={ctx.draft.pageName}
            onPageNameChange={newName => {
              ctx.updateField("pageName", newName);
              if (autoSlug) {
                setPageSlug(sluggit(newName || "untitled-page", "-"));
              }
            }}
            pageSlug={pageSlug}
            onSlugChange={newSlug => {
              setPageSlug(newSlug);
              setAutoSlug(false);
            }}
            isHomePage={ctx.draft.isHomePage}
            setIsHomePage={value => ctx.updateField("isHomePage", value)}
            is404Page={ctx.draft.is404Page}
            setIs404Page={value => ctx.updateField("is404Page", value)}
            allowCustom404Page={ctx.allowCustom404Page}
            pageImage={ctx.draft.pageImage}
            setPageImage={value => ctx.updateField("pageImage", value)}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            onDeletePage={() => {
              if (!ctx.pageId) return;
              try {
                // Delete from CraftJS tree if present
                try { actions.delete(ctx.pageId); } catch { /* not in tree */ }
                // Notify host app to delete the SitePage record from DB
                window.dispatchEvent(new CustomEvent("pagehub:page-deleted", { detail: { pageId: ctx.pageId } }));
                onClose();
              } catch (e) {
                console.error("Error deleting page:", e);
              }
            }}
          />
        ),
      },
      {
        key: "seo",
        label: "SEO",
        order: 200,
        icon: <TbSearch />,
        render: ctx => (
          <SEOTab
            pageTitle={ctx.draft.pageTitle}
            setPageTitle={value => ctx.updateField("pageTitle", value)}
            pageDescription={ctx.draft.pageDescription}
            setPageDescription={value => ctx.updateField("pageDescription", value)}
            pageKeywords={ctx.draft.pageKeywords}
            setPageKeywords={value => ctx.updateField("pageKeywords", value)}
            pageAuthor={ctx.draft.pageAuthor}
            setPageAuthor={value => ctx.updateField("pageAuthor", value)}
            ogExpanded={ogExpanded}
            setOgExpanded={setOgExpanded}
            ogTitle={ctx.draft.ogTitle}
            setOgTitle={value => ctx.updateField("ogTitle", value)}
            ogDescription={ctx.draft.ogDescription}
            setOgDescription={value => ctx.updateField("ogDescription", value)}
            ogImage={ctx.draft.ogImage}
            setOgImage={value => ctx.updateField("ogImage", value)}
            ogType={ctx.draft.ogType}
            setOgType={value => ctx.updateField("ogType", value)}
            twitterExpanded={twitterExpanded}
            setTwitterExpanded={setTwitterExpanded}
            twitterCard={ctx.draft.twitterCard}
            setTwitterCard={value => ctx.updateField("twitterCard", value)}
            twitterSite={ctx.draft.twitterSite}
            setTwitterSite={value => ctx.updateField("twitterSite", value)}
            twitterCreator={ctx.draft.twitterCreator}
            setTwitterCreator={value => ctx.updateField("twitterCreator", value)}
          />
        ),
      },
      {
        key: "advanced",
        label: "Advanced",
        order: 300,
        icon: <TbAdjustments />,
        render: ctx => (
          <AdvancedTab
            canonicalUrl={ctx.draft.canonicalUrl}
            setCanonicalUrl={value => ctx.updateField("canonicalUrl", value)}
            headCode={ctx.draft.headCode}
            setHeadCode={value => ctx.updateField("headCode", value)}
            bodyClass={ctx.draft.bodyClass}
            setBodyClass={value => ctx.updateField("bodyClass", value)}
            jsonLd={ctx.draft.jsonLd}
            setJsonLd={value => ctx.updateField("jsonLd", value)}
            pagePassword={ctx.draft.pagePassword}
            setPagePassword={value => ctx.updateField("pagePassword", value)}
            themeOverrides={ctx.draft.themeOverrides}
            setThemeOverrides={value => ctx.updateField("themeOverrides", value)}
          />
        ),
      },
    ],
    [actions, autoSlug, ogExpanded, onClose, pageSlug, showDeleteConfirm, twitterExpanded]
  );

  const injectedTabs = useMemo(() => adaptLegacyExtraTabs(extraTabs), [extraTabs]);
  const allTabs = useMemo(() => mergeSettingsTabs(builtInTabs, injectedTabs), [builtInTabs, injectedTabs]);

  const { draft, setDraft, updateField, requestSave, flushSave } =
    useSettingsController<PageSettingsDraft>({
      isOpen,
      loadDraft: () => {
        if (!pageId) return createEmptyPageDraft();
        try {
          const node = queryRef.current.node(pageId).get();
          const nextDraft = createDraftFromPageNode(node, allowCustom404Page);
          setPageSlug(sluggit(nextDraft.pageName || "untitled-page", "-"));
          setAutoSlug(true);
          setShowDeleteConfirm(false);
          return nextDraft;
        } catch (e) {
          console.error("Error loading page settings:", e);
          return createEmptyPageDraft();
        }
      },
      getDraftSignature,
      commitDraft: snapshot => {
        if (!pageId) return;
        try {
          const effective404 = allowCustom404Page && snapshot.is404Page;

          if (effective404) {
            const root = query.node(ROOT_NODE).get();
            for (const id of root?.data?.nodes || []) {
              if (id === pageId) continue;
              const child = query.node(id).get();
              if (child?.data?.props?.type === "page" && child?.data?.props?.is404Page) {
                actions.setProp(id, p => {
                  p.is404Page = false;
                });
              }
            }
          }

          actions.setCustom(pageId, custom => {
            custom.displayName = snapshot.pageName;
          });

          actions.setProp(pageId, props => {
            props.isHomePage = snapshot.isHomePage;
            props.is404Page = effective404;
            props.pageTitle = snapshot.pageTitle;
            props.pageDescription = snapshot.pageDescription;
            props.pageKeywords = snapshot.pageKeywords;
            props.pageAuthor = snapshot.pageAuthor;
            props.pageImage = snapshot.pageImage;
            props.ogTitle = snapshot.ogTitle;
            props.ogDescription = snapshot.ogDescription;
            props.ogImage = snapshot.ogImage;
            props.ogType = snapshot.ogType;
            props.twitterCard = snapshot.twitterCard;
            props.twitterSite = snapshot.twitterSite;
            props.twitterCreator = snapshot.twitterCreator;
            props.canonicalUrl = snapshot.canonicalUrl;
            props.headCode = snapshot.headCode;
            props.bodyClass = snapshot.bodyClass;
            props.jsonLd = snapshot.jsonLd;
            props.pagePassword = snapshot.pagePassword;
            props.themeOverrides = snapshot.themeOverrides;

            for (const tab of allTabs) {
              tab.onSave?.({
                query,
                actions,
                draft: snapshot,
                pageId,
                allowCustom404Page,
                setProp: cb => cb(props),
              });
            }
          });
        } catch (e) {
          console.error("Error saving page settings:", e);
        }
      },
      debounceMs: 350,
      reloadKey: pageId,
    });

  const inputClass =
    "w-full rounded-lg border border-base-300 bg-base-200 px-4 py-2 text-sm text-base-content shadow-sm placeholder:text-neutral-content transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-primary hover:bg-base-300/25 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50";
  const selectClass =
    "w-full cursor-pointer rounded-lg border border-base-300 bg-base-200 px-2 py-2 text-xs text-base-content shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50";

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
      pageId,
      allowCustom404Page,
    }),
    [
      actions,
      allowCustom404Page,
      draft,
      flushSave,
      pageId,
      query,
      requestSave,
      setDraft,
      updateField,
    ]
  );

  const tabs = useMemo(() => visibleSettingsTabs(allTabs, tabRenderCtx), [allTabs, tabRenderCtx]);
  const activeDef = tabs.find(tab => tab.key === activeTab) ?? tabs[0];

  useEffect(() => {
    if (!isOpen) return;
    setOgExpanded(false);
    setTwitterExpanded(false);
  }, [isOpen, pageId]);

  const handleClose = useCallback(() => {
    flushSave();
    onClose();
  }, [flushSave, onClose]);

  if (!isOpen || !pageId) return null;

  return (
    <SettingsShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Page Settings"
      storageKey="page-settings"
      defaultWidth={920}
      defaultHeight={modalDefaultHeight}
      minWidth={640}
      maxWidth={1280}
      minHeight={400}
      maxHeight={modalMaxHeight}
      dockToEdge={dockRight ? "right" : "left"}
      zIndex={10040}
      tabs={tabs.map(tab => ({ key: tab.key, label: tab.label, icon: tab.icon }))}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {activeDef ? activeDef.render(tabRenderCtx) : null}
    </SettingsShell>
  );
}
