import { ROOT_NODE, useEditor } from "@craftjs/core";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  TbChevronDown,
  TbExternalLink,
  TbExternalLinkOff,
  TbPlus,
  TbSettings,
} from "react-icons/tb";
import useSWR from "swr";
import { useAtomState, useAtomValue } from "@zedux/react";
import { SettingsAtom } from "../../utils/atoms";
import { IsolateAtom, isolatePageAlt } from "../../utils/lib";
import { PageSettingsModal } from "./PageSettingsModal";
import { UnsavedChangesAtom } from "./atoms";
import { useSDK } from "../../core/context";
import { usePageCreation } from "./page-selector/usePageCreation";
import { usePageNavigation } from "../../utils/pageNavigation";

import sluggit from "slug";

interface Page {
  id: string;
  displayName: string;
  isHomePage?: boolean;
}

interface PageSelectorProps {
  onPageChange?: (pageId: string) => void;
  className?: string;
  // Picker mode: just select a page without navigation/isolation
  pickerMode?: boolean;
  onPagePick?: (page: { id: string; displayName: string; isHomePage: boolean }) => void;
  selectedPageId?: string;
  buttonClassName?: string;
  suggestedPageName?: string;
  showHashIcon?: boolean;
}

export function PageSelector({
  onPageChange,
  className = "",
  pickerMode = false,
  onPagePick,
  selectedPageId,
  buttonClassName,
  suggestedPageName,
  showHashIcon = true,
}: PageSelectorProps) {
  const { query, actions } = useEditor();
  const settings = useAtomValue(SettingsAtom) as { _id?: string; draftId?: string } | null;
  const { siteId: navSiteId, navigateToPage } = usePageNavigation();
  const siteId = settings?._id || navSiteId || null;

  // Page list from database via SWR
  const { data: pageData, mutate: mutatePages } = useSWR(
    siteId ? `/api/v1/sites/${siteId}/pages` : null,
    (url: string) => fetch(url).then(r => r.json()),
  );
  const swrPages: Page[] = (pageData?.pages || []).map((p: any) => ({
    id: p.nodeId,
    displayName: p.displayName || "Untitled Page",
    isHomePage: !!p.isHomePage,
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
              ? { id: _, displayName: n.data.custom?.displayName || "Untitled Page" }
              : null;
          } catch { return null; }
        })
        .filter(Boolean) as Page[];
    } catch { return []; }
  })();

  // Merge: SWR pages + any CraftJS pages not yet in SWR (newly created, unsaved)
  const swrIds = new Set(swrPages.map(p => p.id));
  const pages = swrPages.length > 0
    ? [...swrPages, ...craftPages.filter(p => !swrIds.has(p.id))]
    : craftPages;

  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsPageId, setSettingsPageId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [unsavedChangesRaw, setUnsavedChanged] = useAtomState(UnsavedChangesAtom);
  const unsavedChanges = unsavedChangesRaw as unknown as string | null;
  const { emitter, config } = useSDK();
  const pageSettingsExtraTabs = config.editorChromeSlots?.pageSettingsExtraTabs || [];

  // Home page ID from SWR data
  const homePageId = (pageData?.pages || []).find((p: any) => p.isHomePage)?.nodeId || pages[0]?.id;

  // If the isolated page was deleted, fall back to home page
  useEffect(() => {
    if (isolate && pages.length > 0) {
      const pageExists = pages.some(p => p.id === isolate);
      if (!pageExists && homePageId) {
        isolatePageAlt(isolate, query, homePageId, actions, setIsolate, true);
      }
    }
  }, [pages, isolate, query, actions, setIsolate, homePageId]);

  // Revalidate page list after saves (picks up new/deleted pages)
  useEffect(() => {
    const handler = () => mutatePages();
    window.addEventListener("pagehub:saved", handler);
    return () => window.removeEventListener("pagehub:saved", handler);
  }, [mutatePages]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

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
          onPagePick({ id: pageId, displayName: page.displayName, isHomePage: pageId === homePageId });
        }
        setIsOpen(false);
        return;
      }

      // Navigate via the store — handles isolation + URL pushState
      const page = pages.find(p => p.id === pageId);
      const isHomePage = pageId === homePageId;
      navigateToPage(pageId, page?.displayName || "Untitled Page", isHomePage);

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
    suggestedPageName,
    pickerMode,
    onPagePick,
    onPageChange,
  });

  // Home page fallback — used when no page is isolated
  const homePage = (homePageId ? pages.find(p => p.id === homePageId) : null) ?? pages[0] ?? null;

  // Current page: explicit isolation > home page fallback (never "all pages")
  const currentPage = pickerMode
    ? ((selectedPageId ? pages.find(p => p.id === selectedPageId) : null) ?? null)
    : ((isolate ? pages.find(p => p.id === isolate) : null) ?? homePage);

  const displayText = pickerMode
    ? currentPage
      ? currentPage.displayName
      : "Select a page"
    : currentPage
      ? currentPage.displayName
      : "No Pages";

  // Check if current page is home page
  const currentNode = currentPage ? query.node(currentPage.id).get() : null;
  const isCurrentHomePage = currentNode?.data?.props?.isHomePage;

  const displayRoute = pickerMode
    ? null // Don't show route in picker mode
    : currentPage
      ? isCurrentHomePage
        ? "/"
        : `/${sluggit(currentPage.displayName, "-")}`
      : null;

  // Filter pages based on search query and reverse order
  const filteredPages = pages.filter(page =>
    page.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get live URL for current page
  // Host app should configure sitePreviewUrl in config for external preview links
  const baseUrl = "";
  const pageSlug = currentPage && !isCurrentHomePage ? sluggit(currentPage.displayName, "-") : "";
  const liveUrl = currentPage ? `${baseUrl}${pageSlug}` : null;

  return (
    <div className={`relative ${className} flex items-center gap-2`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClassName || "ph-menu-trigger py-1.5 text-sm"}
        aria-label="Page selector"
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          {/* PageHub Logo */}
          <div className="shrink-0">
            <Image src="/logo.svg" alt="PageHub" width={16} height={16} className="opacity-70" />
          </div>

          {/* URL Bar Layout */}
          <div className="flex flex-1 items-center gap-1 overflow-hidden">
            {/* Path */}
            {displayRoute && (
              <span className="text-neutral-content truncate font-mono text-xs">
                {displayRoute}
              </span>
            )}

            {/* Page name — right-aligned, monospace */}
            {displayText && (
              <span className="text-neutral-content/60 ml-auto shrink-0 font-mono text-[10px]">
                {displayText}
              </span>
            )}
          </div>
        </div>
        <TbChevronDown className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {!pickerMode && liveUrl && (
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
      )}

      {isOpen && (
        <div className="ph-panel absolute inset-x-0 top-full z-50 mt-1 flex max-h-[500px] min-w-[220px] flex-col overflow-hidden">
          {/* Search Header - Fixed */}
          <div className="border-base-300 border-b p-3">
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-transparent"
              autoFocus
            />
          </div>

          {/* Scrollable Content */}
          <div className="scrollbar bg-base-100 text-base-content flex-1 overflow-y-auto">
            {/* Page List */}
            {filteredPages.length > 0 ? (
              filteredPages.map(page => {
                const isPageHomePage = page.isHomePage || page.id === homePageId;
                const pageRoute = isPageHomePage ? "/" : `/${sluggit(page.displayName, "-")}`;
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
                        onClick={() => handlePageSelect(page.id)}
                        className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                      >
                        <Image
                          src="/logo.svg"
                          alt="PageHub"
                          width={16}
                          height={16}
                          className="opacity-70"
                        />
                        <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                          <span className="text-base-content truncate text-sm">
                            {page.displayName}
                          </span>
                          {isPageHomePage && (
                            <span className="text-neutral-content truncate text-xs">(Home)</span>
                          )}
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePageSelect(page.id)}
                        className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                      >
                        <Image
                          src="/logo.svg"
                          alt="PageHub"
                          width={16}
                          height={16}
                          className="opacity-70"
                        />
                        <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                          <span className="text-base-content truncate text-sm">
                            {page.displayName}
                          </span>
                          <span className="text-neutral-content truncate text-xs">{pageRoute}</span>
                        </div>
                      </button>
                    )}
                    {!pickerMode && (
                      <button
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
                    )}
                  </div>
                );
              })
            ) : searchQuery ? (
              <div className="text-neutral-content px-3 py-4 text-center text-sm">
                No pages found
              </div>
            ) : null}
          </div>

          {/* Footer - Fixed */}
          <div className="border-base-300 border-t">
            <button
              onClick={handleCreatePage}
              className="text-primary hover:bg-neutral hover:text-primary flex w-full items-center gap-2 px-3 py-2 transition-colors"
            >
              <TbPlus />
              <span className="text-sm font-medium">Create New Page</span>
            </button>
          </div>
        </div>
      )}

      {/* Page Settings Modal - Only in navigation mode */}
      {!pickerMode && (
        <PageSettingsModal
          isOpen={settingsPageId !== null}
          onClose={() => setSettingsPageId(null)}
          pageId={settingsPageId}
          extraTabs={pageSettingsExtraTabs}
        />
      )}
    </div>
  );
}
