/**
 * Unified link family — `link` plus the legacy types (`link-url`, `link-page`,
 * `scroll-to`, `email`, `phone`) which still appear in in-flight data. All
 * normalize to `{ type: "link", href }` via the shim below before rendering
 * the `<LinkInput>`.
 */
import type { LinkAction, NodeAction } from "@/utils/action";
import { LinkInput } from "../LinkInput";

type LegacyLinkAction = Extract<
  NodeAction,
  { type: "link-url" | "link-page" | "scroll-to" | "email" | "phone" }
>;

function normalizeLegacy(action: LegacyLinkAction): LinkAction {
  const target =
    (action.type === "link-url" || action.type === "link-page") && action.target
      ? { target: action.target }
      : {};
  let href = "";
  switch (action.type) {
    case "link-url":
      href = action.url;
      break;
    case "link-page":
      href = action.pageId ? `ref:${action.pageId}${action.path ?? ""}` : "";
      break;
    case "scroll-to":
      href = action.anchor ? `#${action.anchor}` : "";
      break;
    case "email": {
      if (action.email) {
        const params: Record<string, string> = {};
        if (action.subject) params.subject = action.subject;
        if (action.body) params.body = action.body;
        const qs = Object.keys(params).length
          ? `?${new URLSearchParams(params).toString()}`
          : "";
        href = `mailto:${action.email}${qs}`;
      }
      break;
    }
    case "phone":
      href = action.phone ? `tel:${action.phone}` : "";
      break;
  }
  return { type: "link", href, ...target };
}

export function LinkSubForm({
  action,
  replace,
}: {
  action: NodeAction;
  replace: (next: NodeAction) => void;
}) {
  if (action.type === "link") {
    return <LinkInput action={action} onChange={replace} />;
  }
  const normalized = normalizeLegacy(action as LegacyLinkAction);
  return <LinkInput action={normalized} onChange={replace} />;
}
