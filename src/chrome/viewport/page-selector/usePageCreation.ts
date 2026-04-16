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
    let settled = false;
    const onSaved = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
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
  const { emitter, config } = useSDK();

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
        className: "bg-base-100 text-base-content flex flex-col w-full flex-1 min-h-0",
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

      // Save so the SitePage shard exists in DB before navigating or picking.
      // Standalone mode (no fetchPage) skips — all pages live in the tree.
      if (config.callbacks.fetchPage) {
        try {
          await saveAndWait(emitter);
        } catch (saveErr) {
          console.warn("[PageHub] Save before page navigation failed:", saveErr);
        }
      }

      if (pickerMode && onPagePick) {
        const node = query.node(newNodeId).get();
        onPagePick({
          id: newNodeId,
          displayName: node?.data?.custom?.displayName || "Untitled Page",
          isHomePage: false,
        });
        return;
      }

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
