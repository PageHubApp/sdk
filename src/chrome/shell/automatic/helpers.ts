/**
 * Shared predicates + builders for Automatic detectors / executors.
 */

import React from "react";
import { Element } from "@craftjs/core";
import { Container } from "../../../components/Container/Container";
import type { MorphContext } from "./automaticIntent";
import { CONTENT_CLASSNAME } from "./constants";

/** Exact whitespace-separated token match — avoids `btn-` substring false hits inside larger classes. */
export function classNameContains(cls: string, token: string): boolean {
  if (!cls || !token) return false;
  return cls.split(/\s+/).includes(token);
}

export function hasAnyClass(cls: string, tokens: string[]): boolean {
  if (!cls) return false;
  const set = new Set(cls.split(/\s+/));
  return tokens.some(t => set.has(t));
}

export function countSiblingsOfName(siblings: any[], name: string): number {
  return siblings.filter(s => s?.data?.name === name).length;
}

/** Build the prebuilt Content child tree used by morphToSection (and anything else that needs one). */
export function buildContentChildTree(query: any) {
  return query
    .parseReactElement(
      React.createElement(Element, {
        canvas: true,
        is: Container,
        canDelete: true,
        canEditName: true,
        className: CONTENT_CLASSNAME,
        custom: { displayName: "Content" },
      })
    )
    .toNodeTree();
}

/** Hydrate a node's siblings from the parent's children array. Excludes the dropped node itself. */
export function resolveSiblings(query: any, parent: any, excludeNodeId: string): any[] {
  const ids: string[] = parent?.data?.nodes || [];
  const out: any[] = [];
  for (const id of ids) {
    if (id === excludeNodeId) continue;
    const n = query.node(id).get();
    if (n) out.push(n);
  }
  return out;
}

/** Build the shared MorphContext once — reused by every detector. */
export function buildMorphContext(
  query: any,
  nodeId: string,
  parentId: string
): MorphContext | null {
  const node = query.node(nodeId).get();
  if (!node) return null;

  const parent = query.node(parentId).get();
  if (!parent) return null;

  const grandparentId = parent.data?.parent;
  const grandparent = grandparentId ? query.node(grandparentId).get() : null;

  const siblings = resolveSiblings(query, parent, nodeId);

  return {
    nodeId,
    parentId,
    node,
    parent,
    parentType: parent.data?.props?.type,
    parentClassName: (parent.data?.props?.className as string) || "",
    grandparent,
    grandparentType: grandparent?.data?.props?.type,
    siblings,
    siblingCount: siblings.length,
    isEmptyParent: siblings.length === 0,
    query,
  };
}
