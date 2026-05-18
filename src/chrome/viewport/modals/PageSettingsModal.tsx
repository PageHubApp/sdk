import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sluggit from "slug";
import {
  TbAdjustments,
  TbBrandTwitter,
  TbCode,
  TbJson,
  TbLock,
  TbPaint,
  TbPhoto,
  TbSearch,
  TbSettings,
} from "react-icons/tb";
import { useSDK } from "../../../core/context";
import { useEditorSidebarDockLeft } from "../../../utils/atoms";
import { getLoadedPages, listPageNodeIds } from "../../../utils/page/pageManagement";
import { OVERLAY_Z_MODAL } from "../../popovers/overlayZIndex";
import { AccessTab } from "./page-settings/AccessTab";
import { AdvancedTab } from "./page-settings/AdvancedTab";
import { BasicTab } from "./page-settings/BasicTab";
import { HeadCodeTab } from "./page-settings/HeadCodeTab";
import { OpenGraphTab } from "./page-settings/OpenGraphTab";
import { SchemaTab } from "./page-settings/SchemaTab";
import { SEOTab } from "./page-settings/SEOTab";
import { ThemeOverridesTab } from "./page-settings/ThemeOverridesTab";
import { TwitterCardTab } from "./page-settings/TwitterCardTab";
import {
  PAGE_SETTINGS_FIELDS,
  pageSettingsDefaults,
  readSettingsProps,
  writeSettingsProps,
} from "./page-settings/fields";
import { mergeSettingsTabs, visibleSettingsTabs } from "./settings/registry";
import { SETTINGS_INPUT_CLASS, SETTINGS_SELECT_CLASS } from "./settings/settingsControlClasses";
import { SettingsShell } from "./settings/SettingsShell";
import { type SettingsTabDefinition } from "./settings/types";
import { useSettingsController } from "./settings/useSettingsController";
import type { PageSettingsPayload } from "../../../types";

interface PageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string | null;
  extraTabs?: PageSettingsExtraTab[];
}

interface PageSettingsDraft {
  /** True when draft was loaded from a remote shard (not in CraftJS tree). */
  _remote: boolean;
  pageName: string;
  isHomePage: boolean;
  is404Page: boolean;
  [key: string]: any; // settings props from PAGE_SETTINGS_FIELDS
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

// ── Draft helpers (derived from PAGE_SETTINGS_FIELDS) ─────────────────────────

function createEmptyPageDraft(): PageSettingsDraft {
  return {
    _remote: false,
    pageName: "",
    isHomePage: false,
    is404Page: false,
    ...pageSettingsDefaults(),
  };
}

function createDraftFromProps(
  displayName: string,
  isHomePage: boolean,
  is404Page: boolean,
  source: Record<string, any>,
  allowCustom404Page: boolean,
  remote: boolean
): PageSettingsDraft {
  return {
    _remote: remote,
    pageName: displayName || "Untitled Page",
    isHomePage: !!isHomePage,
    is404Page: allowCustom404Page ? !!is404Page : false,
    ...readSettingsProps(source),
  };
}

function draftToPayload(
  snapshot: PageSettingsDraft,
  allowCustom404Page: boolean
): PageSettingsPayload {
  const props: Record<string, any> = {};
  writeSettingsProps(props, snapshot);
  return {
    displayName: snapshot.pageName,
    isHomePage: snapshot.isHomePage,
    is404Page: allowCustom404Page && snapshot.is404Page,
    props,
  };
}

function getDraftSignature(draft: PageSettingsDraft): string {
  // Exclude _remote from signature — it's metadata, not user-editable data.
  const { _remote: _, ...data } = draft;
  return JSON.stringify(data);
}

// ── Extra tabs adapter ────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export function PageSettingsModal({
  isOpen,
  onClose,
  pageId,
  extraTabs = [],
}: PageSettingsModalProps) {
  const { actions, query } = useEditor();
  const queryRef = useRef(query);
  const { config, features } = useSDK();
  const configRef = useRef(config);
  const allowCustom404Page = !!features.custom404Page;

  const toolbarDockedLeft = useEditorSidebarDockLeft();
  const dockRight = !toolbarDockedLeft;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const modalDefaultHeight = Math.max(520, Math.min(680, Math.round(viewportHeight * 0.72)));
  const modalMaxHeight = Math.max(600, Math.min(760, Math.round(viewportHeight * 0.82)));

  const [activeTab, setActiveTab] = useState<string>("basic");
  const [pageSlug, setPageSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const applySlugDefaults = useCallback((nextDraft: PageSettingsDraft) => {
    const customSlug = nextDraft.pageSlug;
    setPageSlug(customSlug || sluggit(nextDraft.pageName || "untitled-page", "-"));
    setAutoSlug(!customSlug);
    setShowDeleteConfirm(false);
  }, []);

  const builtInTabs = useMemo<
    Array<SettingsTabDefinition<PageSettingsDraft, PageSettingsTabContext>>
  >(
    () => [
      {
        key: "basic",
        label: "Basic",
        order: 100,
        icon: <TbSettings />,
        render: ctx => (
          <BasicTab
            inputClass={ctx.inputClass}
            pageName={ctx.draft.pageName}
            onPageNameChange={newName => {
              ctx.updateField("pageName", newName);
              if (autoSlug) {
                const slug = sluggit(newName || "untitled-page", "-");
                setPageSlug(slug);
                ctx.updateField("pageSlug", "");
              }
            }}
            pageSlug={pageSlug}
            onSlugChange={newSlug => {
              setPageSlug(newSlug);
              setAutoSlug(false);
              ctx.updateField("pageSlug", newSlug);
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
                actions.delete(ctx.pageId);
              } catch {
                /* not in tree */
              }
              window.dispatchEvent(
                new CustomEvent("pagehub:page-deleted", { detail: { pageId: ctx.pageId } })
              );
              onClose();
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
            inputClass={ctx.inputClass}
            pageTitle={ctx.draft.pageTitle}
            setPageTitle={value => ctx.updateField("pageTitle", value)}
            pageDescription={ctx.draft.pageDescription}
            setPageDescription={value => ctx.updateField("pageDescription", value)}
            pageKeywords={ctx.draft.pageKeywords}
            setPageKeywords={value => ctx.updateField("pageKeywords", value)}
            pageAuthor={ctx.draft.pageAuthor}
            setPageAuthor={value => ctx.updateField("pageAuthor", value)}
          />
        ),
      },
      {
        key: "open-graph",
        label: "Open Graph",
        order: 210,
        icon: <TbPhoto />,
        render: ctx => (
          <OpenGraphTab
            inputClass={ctx.inputClass}
            selectClass={ctx.selectClass}
            ogTitle={ctx.draft.ogTitle}
            setOgTitle={value => ctx.updateField("ogTitle", value)}
            ogDescription={ctx.draft.ogDescription}
            setOgDescription={value => ctx.updateField("ogDescription", value)}
            ogImage={ctx.draft.ogImage}
            setOgImage={value => ctx.updateField("ogImage", value)}
            ogType={ctx.draft.ogType}
            setOgType={value => ctx.updateField("ogType", value)}
          />
        ),
      },
      {
        key: "twitter",
        label: "Twitter / X",
        order: 220,
        icon: <TbBrandTwitter />,
        render: ctx => (
          <TwitterCardTab
            inputClass={ctx.inputClass}
            selectClass={ctx.selectClass}
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
            inputClass={ctx.inputClass}
            canonicalUrl={ctx.draft.canonicalUrl}
            setCanonicalUrl={value => ctx.updateField("canonicalUrl", value)}
            bodyClass={ctx.draft.bodyClass}
            setBodyClass={value => ctx.updateField("bodyClass", value)}
            pagePassword={ctx.draft.pagePassword}
            setPagePassword={value => ctx.updateField("pagePassword", value)}
            hideHeader={!!ctx.draft.hideHeader}
            setHideHeader={value => ctx.updateField("hideHeader", value)}
            hideFooter={!!ctx.draft.hideFooter}
            setHideFooter={value => ctx.updateField("hideFooter", value)}
            hideChrome={!!ctx.draft.hideChrome}
            setHideChrome={value => ctx.updateField("hideChrome", value)}
          />
        ),
      },
      {
        key: "head-code",
        label: "Custom code",
        order: 310,
        icon: <TbCode />,
        render: ctx => (
          <HeadCodeTab
            headCode={ctx.draft.headCode}
            setHeadCode={value => ctx.updateField("headCode", value)}
          />
        ),
      },
      {
        key: "schema",
        label: "Schema",
        order: 320,
        icon: <TbJson />,
        render: ctx => (
          <SchemaTab
            schema={Array.isArray(ctx.draft.schema) ? ctx.draft.schema : []}
            setSchema={value => ctx.updateField("schema", value)}
            inputClass={ctx.inputClass}
          />
        ),
      },
      {
        key: "theme",
        label: "Theme",
        order: 330,
        icon: <TbPaint />,
        render: ctx => (
          <ThemeOverridesTab
            inputClass={ctx.inputClass}
            themeOverrides={ctx.draft.themeOverrides}
            setThemeOverrides={value => ctx.updateField("themeOverrides", value)}
          />
        ),
      },
      {
        key: "access",
        label: "Access",
        order: 400,
        icon: <TbLock />,
        render: ctx => {
          const pageIds = listPageNodeIds(query);
          const pages = pageIds
            .filter(id => id !== ctx.pageId)
            .map(id => {
              const node = query.node(id).get();
              return { id, name: node?.data?.custom?.displayName || id };
            });
          return (
            <AccessTab
              inputClass={ctx.inputClass}
              selectClass={ctx.selectClass}
              conditionGroups={ctx.draft.conditionGroups || []}
              setConditionGroups={value => ctx.updateField("conditionGroups", value)}
              pageConditionFailAction={ctx.draft.pageConditionFailAction || ""}
              setPageConditionFailAction={value =>
                ctx.updateField("pageConditionFailAction", value)
              }
              pageConditionRedirectUrl={ctx.draft.pageConditionRedirectUrl || ""}
              setPageConditionRedirectUrl={value =>
                ctx.updateField("pageConditionRedirectUrl", value)
              }
              pageConditionFallbackPageId={ctx.draft.pageConditionFallbackPageId || ""}
              setPageConditionFallbackPageId={value =>
                ctx.updateField("pageConditionFallbackPageId", value)
              }
              pages={pages}
            />
          );
        },
      },
    ],
    [actions, autoSlug, onClose, pageSlug, showDeleteConfirm]
  );

  const injectedTabs = useMemo(() => adaptLegacyExtraTabs(extraTabs), [extraTabs]);
  const allTabs = useMemo(
    () => mergeSettingsTabs(builtInTabs, injectedTabs),
    [builtInTabs, injectedTabs]
  );

  const { draft, setDraft, updateField, loading, requestSave, flushSave } =
    useSettingsController<PageSettingsDraft>({
      isOpen,
      loadDraft: (): PageSettingsDraft | Promise<PageSettingsDraft> => {
        if (!pageId) return createEmptyPageDraft();

        // Page is in the CraftJS tree — read directly (sync)
        if (getLoadedPages().has(pageId)) {
          const node = queryRef.current.node(pageId).get();
          const props = node?.data?.props || {};
          const custom = node?.data?.custom || {};
          const nextDraft = createDraftFromProps(
            custom.displayName,
            props.isHomePage,
            props.is404Page,
            props,
            allowCustom404Page,
            false
          );
          applySlugDefaults(nextDraft);
          return nextDraft;
        }

        // Page is NOT in the tree — fetch from host via callback (async)
        const { fetchPageSettings } = configRef.current.callbacks;
        if (fetchPageSettings) {
          return fetchPageSettings(pageId).then(remote => {
            if (remote) {
              const nextDraft = createDraftFromProps(
                remote.displayName,
                remote.isHomePage,
                remote.is404Page,
                remote.props || {},
                allowCustom404Page,
                true
              );
              applySlugDefaults(nextDraft);
              return nextDraft;
            }
            return createEmptyPageDraft();
          });
        }

        return createEmptyPageDraft();
      },
      getDraftSignature,
      commitDraft: (snapshot): void | Promise<void> => {
        if (!pageId) return;

        // Remote page — save via host callback (async)
        if (snapshot._remote) {
          const { savePageSettings } = configRef.current.callbacks;
          if (savePageSettings) {
            return savePageSettings(pageId, draftToPayload(snapshot, allowCustom404Page));
          }
          return;
        }

        // In-tree page — write to CraftJS (sync)
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

          actions.setProp(pageId, p => {
            p.isHomePage = snapshot.isHomePage;
            p.is404Page = effective404;
            writeSettingsProps(p, snapshot);

            for (const tab of allTabs) {
              tab.onSave?.({
                query,
                actions,
                draft: snapshot,
                pageId,
                allowCustom404Page,
                setProp: cb => cb(p),
              });
            }
          });

          // Mirror chrome suppression in the canvas — toggle every non-page
          // ROOT sibling based on the active page's flags. Skipped when
          // viewing "all pages" (no isolation), since chrome stays visible
          // there.
          try {
            const root = query.node(ROOT_NODE).get();
            const hideChrome = !!snapshot.hideChrome;
            for (const id of root?.data?.nodes || []) {
              const child = query.node(id).get();
              const t = child?.data?.props?.type;
              if (t === "page") continue;
              if (hideChrome) actions.setHidden(id, true);
              else if (t === "header") actions.setHidden(id, !!snapshot.hideHeader);
              else if (t === "footer") actions.setHidden(id, !!snapshot.hideFooter);
              else actions.setHidden(id, false);
            }
          } catch {
            /* ignore — best-effort canvas mirror */
          }
        } catch (e) {
          console.error("Error saving page settings:", e);
        }
      },
      debounceMs: 350,
      reloadKey: pageId,
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
      zIndex={OVERLAY_Z_MODAL}
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
