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
  router: any;
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
  router,
}: UsePageCreationOptions) {
  function handleCreatePage() {
    try {
      console.log("Starting page creation...");
      console.log("Current pages before creation:", pages.length);

      // Determine the page name to use
      let pageName = suggestedPageName || generate().spaced;
      console.log("Generated page name:", pageName);

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

      console.log("Final page name:", pageName);

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

      console.log("Calling AddElement...");
      const newElement = AddElement({
        element: newPage,
        actions,
        query,
        addTo: ROOT_NODE,
      });

      console.log("AddElement result:", newElement);

      setIsOpen(false);

      // Wait for the node to be fully created before selecting it
      if (newElement?.rootNodeId) {
        console.log("New page created with ID:", newElement.rootNodeId);
        const newNodeId = newElement.rootNodeId;

        // Check pages count after creation
        setTimeout(() => {
          console.log("Pages count after creation:", pages.length);
          console.log(
            "All pages:",
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
                console.log("Navigation mode - navigating to page");
                if (displayName) {
                  const pageSlug = sluggit(displayName, "-");
                  const currentPath = router.asPath.split("?")[0];
                  const pathParts = currentPath.split("/").filter((p: string) => p);
                  const baseUrl =
                    pathParts.length > 1 ? `/${pathParts[0]}/${pathParts[1]}` : `/${pathParts[0]}`;

                  const newUrl = `${baseUrl}/${pageSlug}`;
                  console.log("Would navigate to:", newUrl);
                }

                isolatePageAlt(isolate, query, newNodeId, actions, setIsolate, true);
                onPageChange?.(newNodeId);
              }
            } else {
              console.error("Node not found after creation");
            }
          } catch (e) {
            console.error("Error selecting new page:", e);
          }
        }, 300);

        // Check again after longer delay to see if page disappears
        setTimeout(() => {
          console.log("Pages count after 1 second:", pages.length);
          console.log(
            "All pages after 1 second:",
            pages.map(p => ({ id: p.id, name: p.displayName }))
          );
        }, 1000);
      } else {
        console.error("No rootNodeId returned from AddElement");
      }
    } catch (e) {
      console.error("Error creating page:", e);
      setIsOpen(false);
    }
  }

  return { handleCreatePage };
}
