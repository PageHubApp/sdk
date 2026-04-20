import { ROOT_NODE } from "@craftjs/utils";
import { Element } from "@craftjs/core";
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

/** Deterministic page node ID from a display name (matches MCP add_page format). */
function nameToPageNodeId(name: string): string {
  return `page_${sluggit(name, "-").replace(/-/g, "_")}`;
}

/**
 * Trigger a save and wait for it to complete (pagehub:saved event).
 * Only used in standalone (non-sharding) mode.
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

  async function handleCreatePage(
    pageName: string,
    extra?: { pageSlug?: string; pageTitle?: string; pageDescription?: string }
  ) {
    try {
      setIsOpen(false);
      const finalName = deduplicateName(pageName);
      const { createPage, fetchPage } = config.callbacks;

      // ── Sharding mode: create via API, then navigate ──
      if (createPage && fetchPage) {
        const pageNodeId = nameToPageNodeId(finalName);
        const customSlug = extra?.pageSlug || "";

        await createPage({
          pageNodeId,
          displayName: finalName,
          pageSlug: customSlug,
          pageTitle: extra?.pageTitle || "",
          pageDescription: extra?.pageDescription || "",
        });

        // Revalidate page list so the new page appears in PageSelector
        window.dispatchEvent(new CustomEvent("pagehub:saved"));

        if (pickerMode && onPagePick) {
          onPagePick({ id: pageNodeId, displayName: finalName, isHomePage: false });
          return;
        }

        navigateToPage(pageNodeId, finalName, false, customSlug);
        onPageChange?.(pageNodeId);
        return;
      }

      // ── Standalone mode: tree-first (no sharding) ──
      const extraProps: Record<string, any> = {};
      if (extra?.pageSlug) extraProps.pageSlug = extra.pageSlug;
      if (extra?.pageTitle || extra?.pageDescription) {
        extraProps.seo = {
          ...(extra?.pageTitle ? { title: extra.pageTitle } : {}),
          ...(extra?.pageDescription ? { description: extra.pageDescription } : {}),
        };
      }

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
