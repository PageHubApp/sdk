import { useEditor } from "@craftjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sluggit from "slug";
import { useSDK } from "../../../../core/context";
import { useEditorSidebarDockLeft } from "../../../../utils/atoms";
import { OVERLAY_Z_MODAL } from "../../../popovers/overlayZIndex";
import { mergeSettingsTabs, visibleSettingsTabs } from "../settings/registry";
import { SETTINGS_INPUT_CLASS, SETTINGS_SELECT_CLASS } from "../settings/settingsControlClasses";
import { SettingsShell } from "../settings/SettingsShell";
import { adaptExtraTabs } from "./extraTabs";
import { useBuiltInTabs } from "./useBuiltInTabs";
import { usePageSettingsPersistence } from "./usePageSettingsPersistence";
import type { PageSettingsDraft, PageSettingsModalProps } from "./types";

export type { PageSettingsExtraTab } from "./types";

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

  const builtInTabs = useBuiltInTabs({
    actions,
    query,
    autoSlug,
    pageSlug,
    setPageSlug,
    setAutoSlug,
    showDeleteConfirm,
    setShowDeleteConfirm,
    onClose,
  });

  const injectedTabs = useMemo(() => adaptExtraTabs(extraTabs), [extraTabs]);
  const allTabs = useMemo(
    () => mergeSettingsTabs(builtInTabs, injectedTabs),
    [builtInTabs, injectedTabs]
  );

  const { draft, setDraft, updateField, loading, requestSave, flushSave } =
    usePageSettingsPersistence({
      isOpen,
      pageId,
      allowCustom404Page,
      query,
      actions,
      queryRef,
      configRef,
      allTabs,
      applySlugDefaults,
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
