import { Element, ROOT_NODE } from "@craftjs/core";
import React from "react";
import { Container } from "../../../components/Container";
import { AddElement } from "../toolbox/toolboxUtils";
import generate from "../../../utils/data/nameGenerator";
import sluggit from "slug";
import { usePageNavigation } from "../../../utils/pageNavigation";
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
 * Trigger a save and wait for it to complete (pagehub:saved event).
 * Used to ensure pages/siteId exist in the DB before navigating.
 */
function saveAndWait(emitter: any, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSaved = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      window.removeEventListener("pagehub:saved", onSaved);
      reject(new Error("Timed out waiting for save"));
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

      if (!newElement?.rootNodeId) return;
      const newNodeId = newElement.rootNodeId;

      if (pickerMode && onPagePick) {
        requestAnimationFrame(() => {
          const node = query.node(newNodeId).get();
          if (node) {
            onPagePick({
              id: newNodeId,
              displayName: node.data.custom?.displayName || "Untitled Page",
              isHomePage: false,
            });
          }
        });
        return;
      }

      // Save so the new page shard + siteId exist in DB, then navigate.
      // The save serializes the tree which now includes the new page node,
      // so the SitePage record gets created. navigateToPage → fetchPage
      // needs that record to exist.
      await saveAndWait(emitter);

      const node = query.node(newNodeId).get();
      const displayName = node?.data?.custom?.displayName || "Untitled Page";
      navigateToPage(newNodeId, displayName, false);
      onPageChange?.(newNodeId);
    } catch (e) {
      console.error("Error creating page:", e);
    }
  }

  return { handleCreatePage };
}
