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
} from "react-icons/tb";
import useSWR from "swr";
import { SettingsAtom } from "../../../utils/atoms";
import { IsolateAtom } from "../../../utils/atoms";
import { hasPageIsolation, isolatePageInTree } from "../../../utils/page/pageManagement";
import { setKnownPages, usePageNavigation } from "../../../utils/page/pageNavigation";
import { EditorListPicker } from "./EditorListPicker";
import { sdkLog } from "../../../utils/logger";

import { resolvePageSlug } from "../../../utils/page/pageSlug";

/** URL route for a page — the canonical page slug (see `resolvePageSlug`). */
function pageRoute(page: Page, isHomePage: boolean): string {
  if (isHomePage) return "/";
  return `/${resolvePageSlug(page, page.id)}`;
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
  /** Show the current page's name in the trigger (with `inlineTrigger`), not only its icon or slug. */
  showName?: boolean;
  /**
   * Address-bar look, for a host that draws the field (`className` on the
   * wrapper): the trigger reads `host` + the page's path, like a browser's
   * address bar, and `previewHref(path)` adds an open-page link inside it.
   */
  address?: { host: string; previewHref?: (path: string) => string | null };
}

const ADDRESS_TRIGGER_CLASS =
  "hover:text-base-content flex h-8 min-w-0 flex-1 items-center gap-1 rounded-full text-left text-sm transition-colors";
const ADDRESS_LINK_CLASS =
  "text-base-content/50 hover:bg-base-content/10 hover:text-base-content inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors";

export function PageSelector({
  onPageChange,
  className = "",
  inlineTrigger = false,
  pickerMode = false,
  onPagePick,
  selectedPageId,
  buttonClassName,
  showHashIcon = true,
  showName = false,
  address,
}: PageSelectorProps) {
  const { query, actions } = useEditor();
  const settings = useAtomValue(SettingsAtom) as { _id?: string; draftId?: string } | null;
  const { siteId: navSiteId, navigateToPage } = usePageNavigation();
  const siteId = settings?._id || navSiteId || null;

  // Page list from database via SWR
  const { data: pageData } = useSWR(
    siteId ? `/api/v1/sites/${siteId}/pages` : null,
    (url: string) => fetch(url).then(r => r.json())
  );
  const swrPages: Page[] = (pageData?.pages || []).map((p: any) => ({
    id: p.nodeId,
    displayName: p.displayName || "Untitled Page",
    isHomePage: !!p.isHomePage,
    pageSlug: p.pageSlug || "",
  }));

  // The nav store resolves URLs to pages whose shard isn't loaded from this list.
  const listedPages = pageData?.pages;
  useEffect(() => {
    if (!siteId || !Array.isArray(listedPages)) return;
    setKnownPages(
      siteId,
      listedPages.map((p: any) => ({
        id: p.nodeId,
        slug: resolvePageSlug({ pageSlug: p.pageSlug, displayName: p.displayName }, p.nodeId),
        isHomePage: !!p.isHomePage,
      }))
    );
  }, [siteId, listedPages]);

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
      sdkLog.error("Error selecting page:", e);
      setIsOpen(false);
    }
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
    ? pageRoute(currentPage, !!isCurrentHomePage)
    : null;
  const displayRoute = pickerMode ? null : currentPageRoute;

  // Filter pages based on search query and reverse order
  const filteredPages = pages.filter(page =>
    page.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get live URL for current page
  // Host app should configure sitePreviewUrl in config for external preview links
  const liveUrl = currentPage
    ? pageRoute(currentPage, !!isCurrentHomePage).slice(1) // strip leading "/"
    : null;
  const addressPreview =
    address?.previewHref && currentPageRoute ? address.previewHref(currentPageRoute) : null;

  return (
    <EditorListPicker
      className={`${className} flex items-center ${address ? "gap-1" : "gap-2"}`.trim()}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={
            buttonClassName ||
            (address
              ? ADDRESS_TRIGGER_CLASS
              : inlineTrigger
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
          {address && !pickerMode ? (
            <span className="min-w-0 flex-1 truncate">
              <span className="text-base-content/45">{address.host}</span>
              {/* Like a browser: the home page is the bare host. */}
              {currentPageRoute && currentPageRoute !== "/" ? (
                <span className="text-base-content">{currentPageRoute}</span>
              ) : null}
            </span>
          ) : pickerMode && !currentPage ? (
            <span className="truncate text-xs">{displayText}</span>
          ) : (
            <>
              {isCurrentHomePage ? (
                <TbHome className="size-4 shrink-0" aria-hidden />
              ) : (
                <TbFileText className="size-4 shrink-0" aria-hidden />
              )}
              {showName && currentPage ? (
                <span className="max-w-[10rem] truncate">{currentPage.displayName}</span>
              ) : !isCurrentHomePage && currentPageRoute ? (
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
        address ? (
          addressPreview ? (
            <a
              className={ADDRESS_LINK_CLASS}
              href={addressPreview}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open page in a new tab"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Open page in a new tab"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              <TbExternalLink className="size-3.5" />
            </a>
          ) : undefined
        ) : !pickerMode && liveUrl ? (
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
      showSearch={pages.length >= 8}
      title="Pages"
    >
      {filteredPages.length > 0 ? (
        filteredPages.map(page => {
          const isPageHomePage = page.isHomePage || page.id === homePageId;
          const route = pageRoute(page, isPageHomePage);
          const isSelected = pickerMode ? selectedPageId === page.id : isolate === page.id;

          return (
            <div
              key={page.id}
              className={`group flex w-full items-center gap-2 border-l-2 px-3 py-2 transition-colors ${
                isSelected
                  ? "border-primary bg-base-200 text-base-content font-medium"
                  : "hover:border-base-300 hover:bg-base-200/60 text-base-content/80 hover:text-base-content border-transparent"
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
                    <TbFileText
                      className="text-base-content size-4 shrink-0 opacity-80"
                      aria-hidden
                    />
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
                    <TbFileText
                      className="text-base-content size-4 shrink-0 opacity-80"
                      aria-hidden
                    />
                  )}
                  <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                    <span className="text-base-content truncate text-sm">{page.displayName}</span>
                    <span className="text-neutral-content truncate text-xs">{route}</span>
                  </div>
                </button>
              )}
            </div>
          );
        })
      ) : searchQuery ? (
        <div className="text-neutral-content px-3 py-4 text-center text-sm">No pages found</div>
      ) : null}
    </EditorListPicker>
  );
}
