import type { ToHTMLFn } from "../utils/staticHtml";
import { buildAttrs, escapeHTML, staticClasses } from "../utils/staticHtml";
import type { PageHubComponentDef, ResolvedComponentDef } from "./types";

/** "MyRating" → "My Rating" */
export function humanize(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Normalize boolean rules to functions, with per-node permissions override layer. */
export function normalizeRules(
  rules: PageHubComponentDef["rules"],
  canvas: boolean
): ResolvedComponentDef["rules"] {
  const r = rules || {};

  // Static rules (original component definitions)
  const staticCanDrag =
    typeof r.canDrag === "function"
      ? r.canDrag
      : typeof r.canDrag === "boolean"
        ? () => r.canDrag as boolean
        : () => true;

  const staticCanDelete =
    typeof r.canDelete === "function"
      ? r.canDelete
      : typeof r.canDelete === "boolean"
        ? () => r.canDelete as boolean
        : () => true;

  const staticCanMoveIn =
    typeof r.canMoveIn === "function" ? r.canMoveIn : canvas ? () => true : () => false;

  const staticCanMoveOut =
    r.canMoveOut != null
      ? typeof r.canMoveOut === "function"
        ? r.canMoveOut
        : () => r.canMoveOut as boolean
      : undefined;

  // Wrap with per-node permissions check (custom.permissions overrides static rules)
  return {
    canDrag: (node?: any, helpers?: any) => {
      const perms = node?.data?.custom?.permissions;
      if (perms?.canDrag != null) return perms.canDrag;
      return staticCanDrag(node, helpers);
    },
    canDelete: (node?: any) => {
      const perms = node?.data?.custom?.permissions;
      if (perms?.canDelete != null) return perms.canDelete;
      return staticCanDelete(node);
    },
    canMoveIn: (nodes: any[], into?: any) => {
      const perms = into?.data?.custom?.permissions;
      if (perms?.canMoveIn === false) return false;
      return staticCanMoveIn(nodes, into);
    },
    ...(staticCanMoveOut != null
      ? {
          canMoveOut: (node?: any) => {
            const perms = node?.data?.custom?.permissions;
            if (perms?.canMoveOut != null) return perms.canMoveOut;
            return staticCanMoveOut(node);
          },
        }
      : {}),
  };
}

/** Build a fallback toHTML when the consumer doesn't provide one */
export function buildFallbackToHTML(canvas: boolean): ToHTMLFn {
  if (canvas) {
    return (props, childrenHTML, ctx) => {
      const cls = staticClasses(props, ctx);
      return childrenHTML
        ? `<div${buildAttrs({ class: cls || undefined })}>${childrenHTML}</div>`
        : `<div${buildAttrs({ class: cls || undefined })}></div>`;
    };
  }
  return (props, _children, ctx) => {
    const cls = staticClasses(props, ctx);
    const text = props.text || props.label || props.title || props.content || "";
    const escaped = typeof text === "string" ? escapeHTML(text) : "";
    return `<div${buildAttrs({ class: cls || undefined })}>${escaped}</div>`;
  };
}
