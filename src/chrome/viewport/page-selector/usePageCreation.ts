import { Element, ROOT_NODE } from "@craftjs/core";
import React from "react";
import { Container } from "../../../components/Container";
import { AddElement } from "../toolbox/toolboxUtils";
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
  pickerMode,
  onPagePick,
  onPageChange,
}: UsePageCreationOptions) {
  const { navigateToPage } = usePageNavigation();
  const { emitter, config } = useSDK();

  /** Ensure the name doesn't collide with existing page slugs. */
  function deduplicateName(name: string): string {
    const baseSlug = sluggit(name, "-");
    const existingSlugs = pages.map(page => sluggit(page.displayName, "-"));

    if (!existingSlugs.includes(baseSlug)) return name;

    let counter = 2;
    while (existingSlugs.includes(`${baseSlug}-${counter}`)) counter++;
    return `${name} ${counter}`;
  }

  async function handleCreatePage(pageName: string, extra?: { pageSlug?: string; pageTitle?: string; pageDescription?: string }) {
    try {
      setIsOpen(false);
      const finalName = deduplicateName(pageName);

      // Create the page node in CraftJS
      const extraProps: Record<string, string> = {};
      if (extra?.pageSlug) extraProps.pageSlug = extra.pageSlug;
      if (extra?.pageTitle) extraProps.pageTitle = extra.pageTitle;
      if (extra?.pageDescription) extraProps.pageDescription = extra.pageDescription;

      const newPage = React.createElement(Element, {
        canvas: true,
        is: Container,
        type: "page",
        isHomePage: false,
        canDelete: true,
        canEditName: true,
        className: "bg-base-100 text-base-content flex flex-col w-full flex-1 min-h-0",
        custom: { displayName: finalName },
        ...extraProps,
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
      const customSlug = node?.data?.props?.pageSlug || "";
      navigateToPage(newNodeId, displayName, false, customSlug);
      onPageChange?.(newNodeId);
    } catch (e) {
      console.error("Error creating page:", e);
    }
  }

  return { handleCreatePage };
}
