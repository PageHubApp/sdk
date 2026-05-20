import { Element } from "@craftjs/core";
import React from "react";
import type { BlockItem } from "../utils/useCategoryBlocks";
import { PH_PENDING_BLOCK_MODIFIERS_KEY } from "../utils/modifierUtils";

const PREVIEW_PLACEHOLDER_IMAGE_SRC =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect width="800" height="600" fill="%23e5e7eb"/%3E%3C/svg%3E';

export type BuildCraftTreeToolboxOptions = {
  mode: "toolbox";
  resolver: any;
  /** React / Craft node key segment (include `preview-` prefix when `isPreview`). */
  uniqueKey: string;
  isPreview?: boolean;
  /** Root library insert only — omit on recursive calls. */
  pendingBlockModifiers?: BlockItem["modifiers"];
};

export type BuildCraftTreePreviewOptions = {
  mode: "preview";
  resolver: any;
  uniqueKey: string;
  isRoot: boolean;
};

export type BuildCraftTreeFromStructureOptions =
  | BuildCraftTreeToolboxOptions
  | BuildCraftTreePreviewOptions;

/**
 * Shared JSON `structure` tree → Craft `<Element>` tree.
 *
 * - **toolbox:** library drag / insert; optional `pendingBlockModifiers` on root only;
 *   optional `isPreview` compacts padding on all nodes.
 * - **preview:** blocks panel thumbnails; Image placeholder + max height; root vertical padding compact.
 */
export function buildCraftTreeFromStructure(
  structure: any,
  options: BuildCraftTreeFromStructureOptions
): React.ReactElement | null {
  if (!structure || !structure.type || !structure.props) return null;

  const Component = options.resolver?.[structure.type];
  if (!Component) return null;

  let working = structure;

  if (options.mode === "preview") {
    if (structure.type === "Image") {
      const isEmpty =
        !structure.props.videoId &&
        // `content` is the legacy alias for `src` — still read here so block
        // JSON authored before the rename is treated as non-empty.
        !structure.props.src &&
        !structure.props.content;
      if (isEmpty) {
        working = {
          ...structure,
          props: {
            ...structure.props,
            src: PREVIEW_PLACEHOLDER_IMAGE_SRC,
          },
        };
      }
      working = {
        ...working,
        props: {
          ...working.props,
          className: `${working.props.className || ""} max-h-32`.trim(),
        },
      };
    }
  }

  const childNodes = working.children;
  const children =
    Array.isArray(childNodes) && childNodes.length > 0
      ? childNodes
          .map((child: any, index: number) => {
            const childKey = `${options.uniqueKey}-${index}`;
            if (options.mode === "toolbox") {
              return buildCraftTreeFromStructure(child, {
                mode: "toolbox",
                resolver: options.resolver,
                uniqueKey: childKey,
                isPreview: options.isPreview,
              });
            }
            return buildCraftTreeFromStructure(child, {
              mode: "preview",
              resolver: options.resolver,
              uniqueKey: childKey,
              isRoot: false,
            });
          })
          .filter(Boolean)
      : [];

  if (options.mode === "toolbox") {
    const isPreview = options.isPreview ?? false;
    const props = isPreview
      ? {
          ...working.props,
          className:
            working.props.className?.replace?.(/py-\d+/g, "py-2").replace?.(/p-\d+/g, "p-2") ||
            undefined,
        }
      : working.props;

    const { custom: propsCustom, ...elementSpreadProps } = props as Record<string, any>;
    const pending = options.pendingBlockModifiers;
    const hasPending =
      pending &&
      typeof pending === "object" &&
      Object.keys(pending as object).length > 0 &&
      !isPreview;

    const mergedCustom =
      hasPending || (propsCustom && typeof propsCustom === "object")
        ? {
            ...(typeof propsCustom === "object" && propsCustom ? propsCustom : {}),
            ...(hasPending ? { [PH_PENDING_BLOCK_MODIFIERS_KEY]: pending } : {}),
          }
        : undefined;

    const elementArgs: Record<string, any> = {
      key: options.uniqueKey,
      canvas: true,
      is: Component,
      ...elementSpreadProps,
    };
    if (mergedCustom && Object.keys(mergedCustom).length > 0) {
      elementArgs.custom = mergedCustom;
    }

    return React.createElement(Element, elementArgs, ...children);
  }

  let cleanedClassName = typeof working.props.className === "string" ? working.props.className : "";
  if (cleanedClassName && options.isRoot) {
    cleanedClassName = cleanedClassName
      .replace(/py-\d+/g, "py-2")
      .replace(/pt-\d+/g, "")
      .replace(/pb-\d+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  const propsWithDefaults = {
    ...working.props,
    canDelete: true,
    ...(options.isRoot && cleanedClassName ? { className: cleanedClassName } : {}),
  };

  return (
    <Element key={options.uniqueKey} canvas is={Component} {...propsWithDefaults}>
      {children}
    </Element>
  );
}
