import { Element, ROOT_NODE } from "@craftjs/core";
import React from "react";
import { Container } from "../../../components/Container";
import { AddElement } from "../Toolbox/lib";
import { isolatePageAlt } from "utils/lib";
import generate from "../../../utils/data/nameGenerator";
import sluggit from "slug";

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
  function handleCreatePage() {
    try {
      // Determine the page name to use
      let pageName = suggestedPageName || generate().spaced;

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
          pageName = `${suggestedPageName} ${counter}`;
        }
      }

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

      setIsOpen(false);

      if (newElement?.rootNodeId) {
        const newNodeId = newElement.rootNodeId;

        // CraftJS addNodeTree is synchronous — one rAF is enough for React to flush the update
        requestAnimationFrame(() => {
          try {
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
                isolatePageAlt(isolate, query, newNodeId, actions, setIsolate, true);
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
      setIsOpen(false);
    }
  }

  return { handleCreatePage };
}
