import { Element, ROOT_NODE } from "@craftjs/core";
import React from "react";
import { Container } from "../../../components/Container";
import { AddElement } from "../toolbox/toolboxUtils";
import generate from "../../../utils/data/nameGenerator";
import sluggit from "slug";
import { usePageNavigation, getSiteId } from "../../../utils/pageNavigation";
import { markPageLoaded } from "../../../utils/pageManagement";
import { useSDK } from "../../../core/context";

interface UsePageCreationOptions {
  pages: Array<{ id: string; displayName: string }>;
  actions: any;
  query: any;
  isolate: any;
  setIsolate: any;
  setIsOpen: (v: boolean) => void;
  suggestedPageName?: string;
  pickerMode: boolean;
  onPagePick?: (page: { id: string; displayName: string; isHomePage: boolean }) => void;
  onPageChange?: (pageId: string) => void;
}

/**
 * Wait for a site ID to appear (first save must complete before we can navigate).
 * Emits a save, then listens for `pagehub:saved` which means the host pushed
 * the site ID via `setSiteId()`.
 */
function waitForSiteId(emitter: any, timeoutMs = 15000): Promise<void> {
  // Already have a site ID? No wait needed.
  if (getSiteId()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const onSaved = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      window.removeEventListener("pagehub:saved", onSaved);
      // Last-chance check
      if (getSiteId()) resolve();
      else reject(new Error("Timed out waiting for first save"));
    }, timeoutMs);
    window.addEventListener("pagehub:saved", onSaved, { once: true });
    emitter.emit("save", { isDraft: true });
  });
}

export function usePageCreation({
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
}: UsePageCreationOptions) {
  const { navigateToPage } = usePageNavigation();
  const { emitter } = useSDK();

  function resolvePageName(): string {
    let pageName = suggestedPageName || generate().spaced;

    if (suggestedPageName) {
      const baseSlug = sluggit(suggestedPageName, "-");
      const existingSlugs = pages.map(page => sluggit(page.displayName, "-"));

      if (existingSlugs.includes(baseSlug)) {
        let counter = 2;
        let uniqueSlug = `${baseSlug}-${counter}`;
        while (existingSlugs.includes(uniqueSlug)) {
          counter++;
          uniqueSlug = `${baseSlug}-${counter}`;
        }
        pageName = `${suggestedPageName} ${counter}`;
      }
    }

    return pageName;
  }

  async function handleCreatePage() {
    try {
      setIsOpen(false);
      const pageName = resolvePageName();

      // If no site ID yet (fresh /build), trigger save and wait for it
      if (!getSiteId()) {
        await waitForSiteId(emitter);
      }

      // Create the page node in CraftJS
      const newPage = React.createElement(Element, {
        canvas: true,
        is: Container,
        type: "page",
        isHomePage: false,
        canDelete: true,
        canEditName: true,
        className: "mx-auto flex flex-col items-center w-full h-full gap-8 py-6 px-3",
        custom: { displayName: pageName },
      } as any);

      const newElement = AddElement({
        element: newPage,
        actions,
        query,
        addTo: ROOT_NODE,
      });

      if (newElement?.rootNodeId) {
        const newNodeId = newElement.rootNodeId;
        markPageLoaded(newNodeId);

        // CraftJS addNodeTree is synchronous — one rAF is enough for React to flush
        requestAnimationFrame(() => {
          try {
            const node = query.node(newNodeId).get();
            if (node) {
              const displayName = node.data.custom?.displayName || "Untitled Page";
              if (pickerMode && onPagePick) {
                onPagePick({
                  id: newNodeId,
                  displayName,
                  isHomePage: false,
                });
              } else {
                // Navigate via the store — handles isolation + URL
                navigateToPage(newNodeId, displayName, false);
                onPageChange?.(newNodeId);
              }
            }
          } catch (e) {
            console.error("Error selecting new page:", e);
          }
        });
      }
    } catch (e) {
      console.error("Error creating page:", e);
    }
  }

  return { handleCreatePage };
}
