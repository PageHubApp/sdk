import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useEffect, useState } from "react";
import {
  TbChevronDown,
  TbExternalLink,
  TbExternalLinkOff,
  TbFileText,
  TbHome,
  TbPlus,
  TbSettings,
} from "react-icons/tb";
import useSWR from "swr";
import { useSDK } from "../../core/context";
import { SettingsAtom } from "../../utils/atoms";
import { hasPageIsolation, IsolateAtom, isolatePageInTree } from "../../utils/lib";
import { usePageNavigation } from "../../utils/pageNavigation";
import { EditorSidebarPrimaryCta } from "../primitives/EditorSidebarPrimaryCta";
import { EditorListPicker } from "./EditorListPicker";
import { PageSettingsModal } from "./PageSettingsModal";
import { UnsavedChangesAtom } from "./atoms";
import { usePageCreation } from "./page-selector/usePageCreation";

import sluggit from "slug";

/** Derive the URL route for a page. Uses custom pageSlug when set, otherwise slugifies displayName. */
function pageRoute(displayName: string, isHomePage: boolean, pageSlug?: string): string {
  if (isHomePage) return "/";
  return `/${pageSlug || sluggit(displayName, "-")}`;
}

/** Collapse nested routes so only the final segment shows. `/foo/bar` -> `.../bar`, `/about` -> `/about`, `/` -> `/`. */
function finalSlugSegment(route: string): string {
  if (route === "/" || !route) return "/";
  const parts = route.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts.length <= 1) return `/${parts[0] ?? ""}`;
  return `.../${parts[parts.length - 1]}`;
}

interface Page {
  id: string;
  displayName: string;
  isHomePage?: boolean;
  pageSlug?: string;
}

interface PageSelectorProps {
  onPageChange?: (pageId: string) => void;
  className?: string;
  /** Render as a compact inline trigger (for breadcrumb row embedding) rather than a full-width row control. */
  inlineTrigger?: boolean;
  // Picker mode: just select a page without navigation/isolation
  pickerMode?: boolean;
  onPagePick?: (page: { id: string; displayName: string; isHomePage: boolean }) => void;
  selectedPageId?: string;
  buttonClassName?: string;
  showHashIcon?: boolean;
}

export function PageSelector({
  onPageChange,
  className = "",
  inlineTrigger = false,
  pickerMode = false,
  onPagePick,
  selectedPageId,
  buttonClassName,
  showHashIcon = true,
}: PageSelectorProps) {
  const { query, actions } = useEditor();
  const settings = useAtomValue(SettingsAtom) as { _id?: string; draftId?: string } | null;
  const { siteId: navSiteId, navigateToPage } = usePageNavigation();
  const siteId = settings?._id || navSiteId || null;

  // Page list from database via SWR
  const { data: pageData, mutate: mutatePages } = useSWR(
    siteId ? `/api/v1/sites/${siteId}/pages` : null,
    (url: string) => fetch(url).then(r => r.json())
  );
  const swrPages: Page[] = (pageData?.pages || []).map((p: any) => ({
    id: p.nodeId,
    displayName: p.displayName || "Untitled Page",
    isHomePage: !!p.isHomePage,
    pageSlug: p.pageSlug || "",
  }));

  // Pages from CraftJS tree (source of truth for newly created pages not yet saved)
  const craftPages: Page[] = (() => {
    try {
      const root = query.node(ROOT_NODE).get();
      if (!root?.data?.nodes) return [];
      return root.data.nodes
        .map((_: string) => {
          try {
            const n = query.node(_).get();
            return n?.data?.props?.type === "page"
              ? {
                  id: _,
                  displayName: n.data.custom?.displayName || "Untitled Page",
                  pageSlug: n.data.props?.pageSlug || "",
                }
              : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Page[];
    } catch {
      return [];
    }
  })();

  // Merge: SWR pages + any CraftJS pages not yet in SWR (newly created, unsaved)
  const swrIds = new Set(swrPages.map(p => p.id));
  // Use SWR data if the fetch has completed (pageData exists), otherwise fall back to CraftJS tree
  const pages = pageData?.pages
    ? [...swrPages, ...craftPages.filter(p => !swrIds.has(p.id))]
    : craftPages;

  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsPageId, setSettingsPageId] = useState<string | null>(null);
  const [unsavedChangesRaw, setUnsavedChanged] = useAtomState(UnsavedChangesAtom);
  const unsavedChanges = unsavedChangesRaw as unknown as string | null;
  const { emitter, config } = useSDK();
  const pageSettingsExtraTabs = config.editorChromeSlots?.pageSettingsExtraTabs || [];

  // Home page ID from SWR data
  const homePageId = (pageData?.pages || []).find((p: any) => p.isHomePage)?.nodeId || pages[0]?.id;

  // If the isolated page was deleted, fall back to home page
  useEffect(() => {
    if (hasPageIsolation(isolate) && pages.length > 0) {
      const pageExists = pages.some(p => p.id === isolate);
      if (!pageExists && homePageId) {
        isolatePageInTree(query, actions, homePageId, setIsolate);
      }
    }
  }, [pages, isolate, query, actions, setIsolate, homePageId]);

  // Revalidate page list after saves (picks up new/deleted pages)
  useEffect(() => {
    const handler = () => mutatePages();
    window.addEventListener("pagehub:saved", handler);
    return () => window.removeEventListener("pagehub:saved", handler);
  }, [mutatePages]);

  // Listen for custom event to open page settings
  useEffect(() => {
    const handleOpenPageSettings = (event: CustomEvent) => {
      const { pageId } = event.detail;
      if (pageId) {
        setSettingsPageId(pageId);
      }
    };

    window.addEventListener("openPageSettings", handleOpenPageSettings as EventListener);
    return () => {
      window.removeEventListener("openPageSettings", handleOpenPageSettings as EventListener);
    };
  }, []);

  const handlePageSelect = (pageId: string) => {
    try {
      if (pickerMode && onPagePick) {
        const page = pages.find(p => p.id === pageId);
        if (page) {
          onPagePick({
            id: pageId,
            displayName: page.displayName,
            isHomePage: pageId === homePageId,
          });
        }
        setIsOpen(false);
        return;
      }

      // Navigate via the store — handles isolation + URL pushState
      const page = pages.find(p => p.id === pageId);
      const isHomePage = pageId === homePageId;
      navigateToPage(pageId, page?.displayName || "Untitled Page", isHomePage, page?.pageSlug);

      setIsOpen(false);
      onPageChange?.(pageId);
    } catch (e) {
      console.error("Error selecting page:", e);
      setIsOpen(false);
    }
  };

  const { handleCreatePage } = usePageCreation({
    pages,
    actions,
    query,
    isolate,
    setIsolate,
    setIsOpen,
    pickerMode,
    onPagePick,
    onPageChange,
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageDescription, setNewPageDescription] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [autoTitle, setAutoTitle] = useState(true);

  const resetCreateDialog = () => {
    setNewPageName("");
    setNewPageSlug("");
    setNewPageTitle("");
    setNewPageDescription("");
    setAutoSlug(true);
    setAutoTitle(true);
    setShowCreateDialog(false);
  };

  const handleCreateSubmit = () => {
    const name = newPageName.trim();
    if (!name) return;
    const slug = newPageSlug.trim();
    handleCreatePage(name, {
      pageSlug: autoSlug ? "" : slug,
      pageTitle: newPageTitle.trim(),
      pageDescription: newPageDescription.trim(),
    });
    resetCreateDialog();
  };

  // Home page fallback — used when no page is isolated
  const homePage = (homePageId ? pages.find(p => p.id === homePageId) : null) ?? pages[0] ?? null;

  // Current page: explicit isolation > home page fallback (never "all pages")
  const currentPage = pickerMode
    ? ((selectedPageId ? pages.find(p => p.id === selectedPageId) : null) ?? null)
    : ((hasPageIsolation(isolate) ? pages.find(p => p.id === isolate) : null) ?? homePage);

  const displayText = pickerMode
    ? currentPage
      ? currentPage.displayName
      : "Select a page"
    : currentPage
      ? currentPage.displayName
      : "No Pages";

  // Check if current page is home page — use page data, not CraftJS tree
  const isCurrentHomePage = currentPage?.isHomePage || currentPage?.id === homePageId;

  const currentPageRoute = currentPage
    ? pageRoute(currentPage.displayName, !!isCurrentHomePage, currentPage.pageSlug)
    : null;
  const displayRoute = pickerMode ? null : currentPageRoute;

  // Filter pages based on search query and reverse order
  const filteredPages = pages.filter(page =>
    page.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get live URL for current page
  // Host app should configure sitePreviewUrl in config for external preview links
  const liveUrl = currentPage
    ? pageRoute(currentPage.displayName, !!isCurrentHomePage, currentPage.pageSlug).slice(1) // strip leading "/"
    : null;

  return (
    <>
      <EditorListPicker
        className={`${className} flex items-center gap-2`.trim()}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        onDismiss={resetCreateDialog}
        trigger={
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={
              buttonClassName ||
              (inlineTrigger
                ? "hover:bg-base-200/80 text-neutral-content hover:text-base-content inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md py-1.5 pr-1.5 pl-0 text-xs font-medium transition-[color,background-color,transform] active:scale-95"
                : "ph-menu-trigger py-1.5 text-sm")
            }
            aria-label="Page selector"
            aria-expanded={isOpen}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={
              pickerMode && !currentPage
                ? "Select a page"
                : currentPage
                  ? `${currentPage.displayName} — ${currentPageRoute}`
                  : "Select a page"
            }
            data-tooltip-place="bottom"
            data-tooltip-offset={10}
          >
            {pickerMode && !currentPage ? (
              <span className="truncate text-xs">{displayText}</span>
            ) : (
              <>
                {isCurrentHomePage ? (
                  <TbHome className="size-4 shrink-0" aria-hidden />
                ) : (
                  <TbFileText className="size-4 shrink-0" aria-hidden />
                )}
                {!isCurrentHomePage && currentPageRoute ? (
                  <span className="max-w-[120px] truncate font-mono text-xs">
                    {finalSlugSegment(currentPageRoute)}
                  </span>
                ) : null}
              </>
            )}
            <TbChevronDown
              className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
        }
        afterTrigger={
          !pickerMode && liveUrl ? (
            <a
              className="text-neutral-content hover:text-base-content shrink-0 p-0 text-xs transition-colors"
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Open page in a new tab"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              {settings?.draftId ? <TbExternalLink /> : <TbExternalLinkOff />}
            </a>
          ) : undefined
        }
        searchPlaceholder="Search pages..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        footer={
          pickerMode ? null : showCreateDialog ? (
            <div className="flex flex-col gap-3 p-3">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label className="text-neutral-content mb-1 block text-[10px] font-medium uppercase">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="About Us"
                    value={newPageName}
                    onChange={e => {
                      setNewPageName(e.target.value);
                      if (autoSlug) setNewPageSlug(sluggit(e.target.value || "", "-"));
                      if (autoTitle) setNewPageTitle(e.target.value);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleCreateSubmit();
                      if (e.key === "Escape") resetCreateDialog();
                    }}
                    className="input-transparent"
                    autoFocus
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label className="text-neutral-content mb-1 block text-[10px] font-medium uppercase">
                    URL
                  </label>
                  <div className="border-base-300 flex items-center gap-0.5 rounded-lg border px-2 py-1.5">
                    <span className="text-neutral-content/50 text-xs">/</span>
                    <input
                      type="text"
                      value={newPageSlug}
                      placeholder="page-url"
                      onChange={e => {
                        setNewPageSlug(e.target.value.replace(/\s+/g, "-").toLowerCase());
                        setAutoSlug(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleCreateSubmit();
                        if (e.key === "Escape") resetCreateDialog();
                      }}
                      className="text-base-content min-w-0 flex-1 border-none bg-transparent p-0 text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-neutral-content mb-1 block text-[10px] font-medium uppercase">
                  Page Title
                </label>
                <input
                  type="text"
                  placeholder="SEO title (optional)"
                  value={newPageTitle}
                  onChange={e => {
                    setNewPageTitle(e.target.value);
                    setAutoTitle(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleCreateSubmit();
                    if (e.key === "Escape") resetCreateDialog();
                  }}
                  className="input-transparent"
                />
              </div>
              <div>
                <label className="text-neutral-content mb-1 block text-[10px] font-medium uppercase">
                  Description
                </label>
                <textarea
                  placeholder="Brief page description (optional)"
                  value={newPageDescription}
                  onChange={e => setNewPageDescription(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Escape") resetCreateDialog();
                  }}
                  rows={2}
                  className="input-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={resetCreateDialog}
                  className="text-neutral-content hover:text-base-content text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  disabled={!newPageName.trim()}
                  className="btn btn-primary btn-xs px-3 disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            <EditorSidebarPrimaryCta
              variant="ghost"
              onClick={() => setShowCreateDialog(true)}
              leading={<TbPlus className="size-3.5" />}
            >
              New Page
            </EditorSidebarPrimaryCta>
          )
        }
      >
        {filteredPages.length > 0 ? (
          filteredPages.map(page => {
            const isPageHomePage = page.isHomePage || page.id === homePageId;
            const route = pageRoute(page.displayName, isPageHomePage, page.pageSlug);
            const isSelected = pickerMode ? selectedPageId === page.id : isolate === page.id;

            return (
              <div
                key={page.id}
                className={`group hover:bg-neutral flex w-full items-center gap-2 px-3 py-2 transition-colors ${
                  isSelected ? "bg-accent text-accent-content font-medium" : ""
                }`}
              >
                {pickerMode ? (
                  <button
                    type="button"
                    onClick={() => handlePageSelect(page.id)}
                    className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                  >
                    {isPageHomePage ? (
                      <TbHome className="text-base-content size-4 shrink-0" aria-hidden />
                    ) : (
                      <TbFileText className="text-base-content size-4 shrink-0 opacity-80" aria-hidden />
                    )}
                    <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                      <span className="text-base-content truncate text-sm">{page.displayName}</span>
                      {isPageHomePage ? (
                        <span className="text-neutral-content truncate text-xs">(Home)</span>
                      ) : null}
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePageSelect(page.id)}
                    className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                  >
                    {isPageHomePage ? (
                      <TbHome className="text-base-content size-4 shrink-0" aria-hidden />
                    ) : (
                      <TbFileText className="text-base-content size-4 shrink-0 opacity-80" aria-hidden />
                    )}
                    <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                      <span className="text-base-content truncate text-sm">{page.displayName}</span>
                      <span className="text-neutral-content truncate text-xs">{route}</span>
                    </div>
                  </button>
                )}
                {!pickerMode ? (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setSettingsPageId(page.id);
                      setIsOpen(false);
                    }}
                    className="text-neutral-content hover:text-base-content shrink-0 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Page settings"
                  >
                    <TbSettings size={16} />
                  </button>
                ) : null}
              </div>
            );
          })
        ) : searchQuery ? (
          <div className="text-neutral-content px-3 py-4 text-center text-sm">No pages found</div>
        ) : null}
      </EditorListPicker>

      {!pickerMode ? (
        <PageSettingsModal
          isOpen={settingsPageId !== null}
          onClose={() => setSettingsPageId(null)}
          pageId={settingsPageId}
          extraTabs={pageSettingsExtraTabs}
        />
      ) : null}
    </>
  );
}
