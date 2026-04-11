import { ROOT_NODE, useEditor } from "@craftjs/core";
import { Tooltip } from "components/layout/Tooltip";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import {
  TbChevronDown,
  TbExternalLink,
  TbExternalLinkOff,
  TbPlus,
  TbSettings,
} from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { SettingsAtom } from "utils/atoms";
import { IsolateAtom, isolatePageAlt } from "utils/lib";
import { PageSettingsModal } from "./PageSettingsModal";
import { UnsavedChangesAtom } from "./atoms";
import { useSDK } from "../../context";
import { usePageCreation } from "./PageSelector/usePageCreation";

import sluggit from "slug";

interface Page {
  id: string;
  displayName: string;
  custom?: {
    displayName?: string;
  };
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
  const { query, actions, pages } = useEditor((state, query) => {
    try {
      const root = query.node(ROOT_NODE).get();

      if (!root || !root.data || !root.data.nodes) {
        return { pages: [] };
      }

      const pageList = root.data.nodes
        .map(_ => {
          try {
            const _props = query.node(_).get();

            return _props?.data?.props?.type === "page"
              ? {
                  id: _,
                  displayName: _props.data.custom?.displayName || "Untitled Page",
                  custom: _props.data.custom,
                }
              : null;
          } catch (e) {
            // Node may have been removed
            return null;
          }
        })
        .filter(_ => _) as Page[];

      return { pages: pageList };
    } catch (e) {
      console.error("Error fetching pages:", e);
      return { pages: [] };
    }
  });

  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsPageId, setSettingsPageId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const settings = useAtomValue(SettingsAtom) as { draftId?: string } | null;
  const [unsavedChangesRaw, setUnsavedChanged] = useAtomState(UnsavedChangesAtom);
  const unsavedChanges = unsavedChangesRaw as unknown as string | null;
  const { emitter } = useSDK();

  // If the isolated page was deleted, fall back to home page
  useEffect(() => {
    if (isolate && pages.length > 0) {
      const pageExists = pages.some(p => p.id === isolate);
      if (!pageExists) {
        const homeId =
          pages.find(p => {
            try { return query.node(p.id).get()?.data?.props?.isHomePage; } catch { return false; }
          })?.id ?? pages[0]?.id;
        if (homeId) isolatePageAlt(isolate, query, homeId, actions, setIsolate, true);
      }
    }
  }, [pages, isolate, query, actions, setIsolate]);

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

  const handlePageSelect = async (pageId: string) => {
    try {
      if (pickerMode && onPagePick) {
        // Picker mode: just return the page data
        const page = pages.find(p => p.id === pageId);
        if (page) {
          const node = query.node(pageId).get();
          const isHomePage = node?.data?.props?.isHomePage || false;
          onPagePick({ id: pageId, displayName: page.displayName, isHomePage });
        }
        setIsOpen(false);
        return;
      }

      // Save current changes before switching pages
      if (typeof unsavedChanges === "string" && unsavedChanges.length > 0) {
        emitter.emit("save", { isDraft: true });
        setUnsavedChanged(null);
      }

      // Navigation mode: isolate specific page
      isolatePageAlt(isolate, query, pageId, actions, setIsolate, true);
      setIsOpen(false);
      onPageChange?.(pageId);
    } catch (e) {
      console.error("Error selecting page:", e);
      setIsOpen(false);
    }
  };

  const getPageUrl = (pageId: string): string => {
    try {
      const currentPath = router?.asPath?.split("?")[0] || "/";
      const pathParts = currentPath.split("/").filter(p => p);
      const baseUrl = pathParts.length > 1 ? `/${pathParts[0]}/${pathParts[1]}` : `/${pathParts[0] || ""}`;

      // Check if this page is marked as home page
      const node = query.node(pageId).get();
      const isHomePage = node?.data?.props?.isHomePage;

      if (isHomePage) {
        return baseUrl || "/";
      }

      const page = pages.find(p => p.id === pageId);
      if (page) {
        const pageSlug = sluggit(page.displayName, "-");
        return `${baseUrl}/${pageSlug}`;
      }
    } catch (e) {
      // ignore
    }
    return "#";
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
  const homePage =
    pages.find(p => {
      try { return query.node(p.id).get()?.data?.props?.isHomePage; } catch { return false; }
    }) ?? pages[0] ?? null;

  // Current page: explicit isolation > home page fallback (never "all pages")
  const currentPage = pickerMode
    ? (selectedPageId ? pages.find(p => p.id === selectedPageId) : null) ?? null
    : (isolate ? pages.find(p => p.id === isolate) : null) ?? homePage;

  const displayText = pickerMode
    ? currentPage ? currentPage.displayName : "Select a page"
    : currentPage ? currentPage.displayName : "No Pages";

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
  const baseUrl = settings?.draftId ? `https://${settings.draftId}.pagehub.dev/` : "";
  const pageSlug = currentPage && !isCurrentHomePage ? sluggit(currentPage.displayName, "-") : "";
  const liveUrl = currentPage ? `${baseUrl}${pageSlug}` : null;

  return (
    <div className={`relative ${className} flex items-center gap-2`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          buttonClassName ||
          "ph-menu-trigger py-1.5 text-sm"
        }
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
              <span className="truncate font-mono text-xs text-neutral-content">
                {displayRoute}
              </span>
            )}

            {/* Page name — right-aligned, monospace */}
            {displayText && (
              <span className="ml-auto shrink-0 font-mono text-[10px] text-neutral-content/60">
                {displayText}
              </span>
            )}
          </div>
        </div>
        <TbChevronDown className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {!pickerMode && liveUrl && (
        <Tooltip content="Open page in a new tab" arrow={false} placement="bottom">
          <a
            className="shrink-0 p-0 text-xs text-neutral-content transition-colors hover:text-base-content"
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {settings?.draftId ? <TbExternalLink /> : <TbExternalLinkOff />}
          </a>
        </Tooltip>
      )}

      {isOpen && (
        <div className="ph-panel absolute inset-x-0 top-full z-50 mt-1 flex max-h-[500px] min-w-[220px] flex-col overflow-hidden">
          {/* Search Header - Fixed */}
          <div className="border-b border-base-300 p-3">
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
          <div className="scrollbar flex-1 overflow-y-auto bg-base-100 text-base-content">
            {/* Page List */}
            {filteredPages.length > 0 ? (
              filteredPages.map(page => {
                const pageNode = query.node(page.id).get();
                const isPageHomePage = pageNode?.data?.props?.isHomePage;
                const pageRoute = isPageHomePage ? "/" : `/${sluggit(page.displayName, "-")}`;
                const isSelected = pickerMode ? selectedPageId === page.id : isolate === page.id;

                return (
                  <div
                    key={page.id}
                    className={`group flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-neutral ${
                      isSelected ? "bg-accent font-medium text-accent-content" : ""
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
                          <span className="truncate text-sm text-base-content">
                            {page.displayName}
                          </span>
                          {isPageHomePage && (
                            <span className="truncate text-xs text-neutral-content">(Home)</span>
                          )}
                        </div>
                      </button>
                    ) : (
                      <Link
                        href={getPageUrl(page.id)}
                        shallow
                        onClick={e => {
                          e.preventDefault();
                          handlePageSelect(page.id);
                        }}
                        className="flex flex-1 items-center gap-2 overflow-hidden"
                      >
                        <Image
                          src="/logo.svg"
                          alt="PageHub"
                          width={16}
                          height={16}
                          className="opacity-70"
                        />
                        <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                          <span className="truncate text-sm text-base-content">
                            {page.displayName}
                          </span>
                          <span className="truncate text-xs text-neutral-content">
                            {pageRoute}
                          </span>
                        </div>
                      </Link>
                    )}
                    {!pickerMode && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSettingsPageId(page.id);
                          setIsOpen(false);
                        }}
                        className="shrink-0 p-1 text-neutral-content opacity-0 transition-opacity hover:text-base-content group-hover:opacity-100"
                        aria-label="Page settings"
                      >
                        <TbSettings size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : searchQuery ? (
              <div className="px-3 py-4 text-center text-sm text-neutral-content">
                No pages found
              </div>
            ) : null}
          </div>

          {/* Footer - Fixed */}
          <div className="border-t border-base-300">
            <button
              onClick={handleCreatePage}
              className="flex w-full items-center gap-2 px-3 py-2 text-primary transition-colors hover:bg-neutral hover:text-primary"
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
        />
      )}
    </div>
  );
}
