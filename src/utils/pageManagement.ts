/**
 * Page management utilities — isolation, counting, ref resolution, variables
 */

import { ROOT_NODE } from "@craftjs/core";
import { phStorage } from "./phStorage";

// ─── Page Count ───

export const getPageCount = (query: any) => {
  const root = query.node(ROOT_NODE).get();
  return !root
    ? []
    : root?.data?.nodes.filter((_: string) => query.node(_).get().data.props.type === "page") || [];
};

// ─── Page Isolation ───

export const isolatePage = (
  isolate: boolean,
  query: any,
  active: any,
  actions: any,
  setIsolate: (v: string) => void,
  select = true
) => {
  const root = query.node(ROOT_NODE).get();
  const _active = active ? active.valueOf() : null;

  root.data.nodes
    .map((_: string) => {
      const _props = query.node(_).get();
      if (!_props || _props?.data?.props?.type !== "page") return _;
      actions.setHidden(_, false);
      actions.setProp(_, (prop: any) => (prop.hidden = false));
      return _;
    })
    .filter((_: string) => _ !== _active)
    .forEach((_: string) => {
      const _props = query.node(_).get();
      if (!_props || _props?.data?.props?.type !== "page") return;
      actions.setHidden(_, !isolate);
      actions.setProp(_, (prop: any) => (prop.hidden = !isolate));
    });

  if (select) setTimeout(() => actions.selectNode(_active), 100);
  setIsolate(!isolate ? _active : "");
  phStorage.set("isolated", !isolate ? _active : "");
};

export const isolatePageAlt = (
  isolate: boolean,
  query: any,
  active: any,
  actions: any,
  setIsolate: (v: string) => void,
  select = true
) => {
  const root = query.node(ROOT_NODE).get();
  const _active = active ? active.valueOf() : null;

  root.data.nodes
    .map((_: string) => {
      const _props = query.node(_).get();
      if (!_props || _props?.data?.props?.type !== "page") return _;
      actions.setHidden(_, !!active);
      actions.setProp(_, (prop: any) => (prop.hidden = !!active));
      return _;
    })
    .filter((_: string) => _ === _active)
    .forEach((_: string) => {
      const _props = query.node(_).get();
      if (!_props || _props?.data?.props?.type !== "page") return;
      actions.setHidden(_, false);
      actions.setProp(_, (prop: any) => (prop.hidden = false));
    });

  if (select && _active) {
    setTimeout(() => {
      try {
        const node = query.node(_active).get();
        if (node) {
          // actions.selectNode(_active);
        }
      } catch (e) {
        console.error("Error selecting node:", e);
      }
    }, 100);
  }

  setIsolate(active);
  phStorage.set("isolated", active);
};

// ─── Page Ref Resolution ───

export const resolvePageRef = (url: string, query: any, currentPath?: string): string => {
  if (!url || typeof url !== "string" || !url.startsWith("ref:")) return url;

  try {
    const pageId = url.replace("ref:", "");
    const pageNode = query.node(pageId).get();
    if (!pageNode || pageNode.data?.props?.type !== "page") return "#";

    const isHomePage = pageNode.data?.props?.isHomePage;
    const displayName = pageNode.data?.custom?.displayName || "Untitled";

    let baseUrl = "";
    if (currentPath) {
      // asPath includes ?query and #hash — do not bake them into baseUrl or /slug appends to ?ref=...
      const pathOnly = currentPath.split(/[?#]/)[0];
      const pathParts = pathOnly.split("/").filter((p: string) => p && !p.startsWith("?"));
      if (pathParts.length >= 2 && (pathParts[0] === "build" || pathParts[0] === "view")) {
        baseUrl = `/${pathParts[0]}/${pathParts[1]}`;
      }
    }

    if (isHomePage) {
      return baseUrl || "/";
    } else {
      const pageSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      return baseUrl ? `${baseUrl}/${pageSlug}` : `/${pageSlug}`;
    }
  } catch (e) {
    console.error("Error resolving page reference:", e);
    return "#";
  }
};

// ─── Template Variables ───

export const replaceVariables = (text: string, query: any): string => {
  if (!text || typeof text !== "string") return text || "";

  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();
    try {
      if (trimmed.startsWith("company.")) {
        const field = trimmed.replace("company.", "");
        const root = query?.node(ROOT_NODE)?.get();
        if (root?.data?.props) {
          if (field === "name" && root.data.props.pageTitle) {
            return root.data.props.pageTitle;
          }
        }
      }
    } catch {
      // Silently fail
    }
    return match;
  });
};
