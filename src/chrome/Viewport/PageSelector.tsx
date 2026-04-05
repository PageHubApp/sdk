// @ts-nocheck
import { Element, ROOT_NODE, useEditor } from "@craftjs/core";
import { Tooltip } from "components/layout/Tooltip";
import { Container } from "../../components/Container";
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
import { SessionTokenAtom, SettingsAtom } from "utils/atoms";
import { IsolateAtom, isolatePageAlt } from "utils/lib";
import { PageSettingsModal } from "./PageSettingsModal";
import { AddElement } from "./Toolbox/lib";
import { UnsavedChangesAtom } from "./atoms";
import { SaveToServer } from "./lib";

import generate from "../../utils/data/nameGenerator";
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

export const PageSelector: React.FC<PageSelectorProps> = ({
  onPageChange,
  className = "",
  pickerMode = false,
  onPagePick,
  selectedPageId,
  buttonClassName,
  suggestedPageName,
  showHashIcon = true,
}) => {
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
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [settings, setSettings] = useAtomState(SettingsAtom);
  const [unsavedChanges, setUnsavedChanged] = useAtomState(UnsavedChangesAtom);
  const sessionToken = useAtomValue(SessionTokenAtom);

  // Check if the isolated page still exists, if not, show all pages
  useEffect(() => {
    if (isolate && pages.length > 0) {
      const pageExists = pages.some(p => p.id === isolate);
      if (!pageExists) {
        // The isolated page was deleted, show all pages
        //  isolatePageAlt(true, query, null, actions, setIsolate, false);
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

  const handlePageSelect = async (pageId: string | null) => {
    try {
      if (pickerMode && pageId && onPagePick) {
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
      if (unsavedChanges && Object.keys(unsavedChanges).length > 0) {
        console.log("💾 Saving changes before page switch...");
        setIsSaving(true);
        try {
          await SaveToServer(
            unsavedChanges,
            true, // Save as draft
            settings,
            setSettings,
            sessionToken
          );
          setUnsavedChanged(null); // Clear unsaved changes
        } catch (e) {
          console.error("❌ Failed to save changes before page switch:", e);
          // Continue with page switch even if save fails
        } finally {
          setIsSaving(false);
        }
      }

      // Navigation mode: isolate and navigate
      if (pageId === null) {
        // Show all pages
        isolatePageAlt(true, query, null, actions, setIsolate, false);
      } else {
        // Isolate specific page
        isolatePageAlt(isolate, query, pageId, actions, setIsolate, true);
      }
      setIsOpen(false);
      onPageChange?.(pageId);
    } catch (e) {
      console.error("Error selecting page:", e);
      setIsOpen(false);
    }
  };

  const getPageUrl = (pageId: string | null): string => {
    try {
      const currentPath = router?.asPath?.split("?")[0] || "/";
      const pathParts = currentPath.split("/").filter(p => p);
      const baseUrl = pathParts.length > 1 ? `/${pathParts[0]}/${pathParts[1]}` : `/${pathParts[0] || ""}`;

      if (pageId === null) {
        return baseUrl || "/";
      }

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

  const handleCreatePage = () => {
    try {
      console.log("🚀 Starting page creation...");
      console.log("📊 Current pages before creation:", pages.length);

      // Determine the page name to use
      let pageName = suggestedPageName || generate().spaced;
      console.log("📝 Generated page name:", pageName);

      // Check if a page with this slug already exists
      if (suggestedPageName) {
        const baseSlug = sluggit(suggestedPageName, "-");
        const existingSlugs = pages.map(page => {
          const displayName = page.displayName;
          return sluggit(displayName, "-");
        });

        // If slug exists, append a number
        if (existingSlugs.includes(baseSlug)) {
          let counter = 2;
          let uniqueSlug = `${baseSlug}-${counter}`;
          while (existingSlugs.includes(uniqueSlug)) {
            counter++;
            uniqueSlug = `${baseSlug}-${counter}`;
          }
          // Convert slug back to display name format
          pageName = `${suggestedPageName} ${counter}`;
        }
      }

      console.log("📝 Final page name:", pageName);

      const newPage = (
        <Element
          canvas
          is={Container}
          type="page"
          isHomePage={false}
          canDelete={true}
          canEditName={true}
          className="mx-auto flex flex-col items-center w-full h-full gap-8 py-6 px-3"
          custom={{ displayName: pageName }}
        />
      );

      console.log("🔧 Calling AddElement...");
      const newElement = AddElement({
        element: newPage,
        actions,
        query,
        addTo: ROOT_NODE,
      });

      console.log("✅ AddElement result:", newElement);

      setIsOpen(false);

      // Wait for the node to be fully created before selecting it
      if (newElement?.rootNodeId) {
        console.log("🎯 New page created with ID:", newElement.rootNodeId);
        const newNodeId = newElement.rootNodeId;

        // Check pages count after creation
        setTimeout(() => {
          console.log("📊 Pages count after creation:", pages.length);
          console.log(
            "📋 All pages:",
            pages.map(p => ({ id: p.id, name: p.displayName }))
          );
        }, 100);

        setTimeout(() => {
          try {
            // Verify the node exists before trying to isolate
            const node = query.node(newNodeId).get();
            if (node) {
              const displayName = node.data.custom?.displayName;

              if (pickerMode && onPagePick) {
                onPagePick({
                  id: newNodeId,
                  displayName: displayName || "Untitled Page",
                  isHomePage: false,
                });
              } else {
                // Navigation mode: navigate and isolate
                console.log("🧭 Navigation mode - navigating to page");
                if (displayName) {
                  const pageSlug = sluggit(displayName, "-");
                  const currentPath = router.asPath.split("?")[0];
                  const pathParts = currentPath.split("/").filter(p => p);
                  const baseUrl =
                    pathParts.length > 1 ? `/${pathParts[0]}/${pathParts[1]}` : `/${pathParts[0]}`;

                  // New pages always get a slug (they're not the first page)
                  const newUrl = `${baseUrl}/${pageSlug}`;
                  console.log("🔗 Would navigate to:", newUrl);

                  // Don't navigate immediately - let user manually navigate
                  // router.push(newUrl, undefined, { shallow: true });
                }

                isolatePageAlt(isolate, query, newNodeId, actions, setIsolate, true);
                onPageChange?.(newNodeId);
              }
            } else {
              console.error("❌ Node not found after creation");
            }
          } catch (e) {
            console.error("❌ Error selecting new page:", e);
          }
        }, 300);

        // Check again after longer delay to see if page disappears
        setTimeout(() => {
          console.log("📊 Pages count after 1 second:", pages.length);
          console.log(
            "📋 All pages after 1 second:",
            pages.map(p => ({ id: p.id, name: p.displayName }))
          );
        }, 1000);
      } else {
        console.error("❌ No rootNodeId returned from AddElement");
      }
    } catch (e) {
      console.error("❌ Error creating page:", e);
      setIsOpen(false);
    }
  };

  // Get current page info
  const currentPage = pickerMode
    ? selectedPageId
      ? pages.find(p => p.id === selectedPageId)
      : null
    : isolate
      ? pages.find(p => p.id === isolate)
      : null;

  const displayText = pickerMode
    ? currentPage
      ? currentPage.displayName
      : "Select a page"
    : currentPage
      ? currentPage.displayName
      : pages.length > 0
        ? "All Pages"
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
  const baseUrl = settings?.draftId ? `https://${settings.draftId}.pagehub.dev/` : "";
  const pageSlug = currentPage && !isCurrentHomePage ? sluggit(currentPage.displayName, "-") : "";
  const liveUrl = currentPage ? `${baseUrl}${pageSlug}` : null;

  return (
    <div className={`relative ${className} flex items-center gap-2`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSaving}
        className={
          buttonClassName ||
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
            {displayRoute && !isSaving && (
              <span className="truncate font-mono text-xs text-muted-foreground">
                {displayRoute}
              </span>
            )}

            {/* Page Name in Parentheses */}
            {!isSaving && (
              <span className="text-xxs ml-auto hidden truncate font-medium text-muted-foreground">
                {displayText}
              </span>
            )}

            {/* Loading State */}
            {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
          </div>
        </div>
        <TbChevronDown className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {!pickerMode && liveUrl && (
        <Tooltip content="Open page in a new tab" arrow={false} placement="bottom">
          <a
            className="shrink-0 p-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {settings?.draftId ? <TbExternalLink /> : <TbExternalLinkOff />}
          </a>
        </Tooltip>
      )}

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 flex max-h-[500px] min-w-[220px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl">
          {/* Search Header - Fixed */}
          <div className="border-b border-border p-3">
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
          <div className="scrollbar flex-1 overflow-y-auto bg-popover text-popover-foreground">
            {/* All Pages Option - Only in navigation mode */}
            {!pickerMode && (
              <>
                <Link
                  href={getPageUrl(null)}
                  shallow
                  onClick={e => {
                    e.preventDefault();
                    handlePageSelect(null);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-muted ${
                    !isolate ? "bg-muted font-medium" : ""
                  }`}
                >
                  <Image
                    src="/logo.svg"
                    alt="PageHub"
                    width={16}
                    height={16}
                    className="opacity-70"
                  />
                  <span className="text-sm text-foreground">All Pages</span>
                </Link>

                {/* Divider */}
                {filteredPages.length > 0 && <div className="my-1 border-t border-border" />}
              </>
            )}

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
                    className={`group flex w-full items-center gap-2 px-3 py-2 transition-colors hover:bg-muted ${
                      isSelected ? "bg-accent font-medium text-accent-foreground" : ""
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
                          <span className="truncate text-sm text-foreground">
                            {page.displayName}
                          </span>
                          {isPageHomePage && (
                            <span className="truncate text-xs text-muted-foreground">(Home)</span>
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
                          <span className="truncate text-sm text-foreground">
                            {page.displayName}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
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
                        className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        aria-label="Page settings"
                      >
                        <TbSettings size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : searchQuery ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No pages found
              </div>
            ) : null}
          </div>

          {/* Footer - Fixed */}
          <div className="border-t border-border">
            <button
              onClick={handleCreatePage}
              className="flex w-full items-center gap-2 px-3 py-2 text-primary transition-colors hover:bg-muted hover:text-primary"
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
};
