import { toHTML as containerToHTML } from "../Container/Container.toHTML";
import type { ToHTMLFn } from "../../utils/staticHtml";

const HONEYPOT_HTML =
  '<div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;opacity:0;height:0;overflow:hidden"><input type="text" name="_ph_hp" autocomplete="off" tabindex="-1"/></div>';

/**
 * Stamp submission-routing metadata so the static-publish vanilla runtime can
 * POST to the right endpoint with the right body shape. Mirrors the dispatch
 * matrix in `submitFormProduction.ts`. Fields are kept to the union of every
 * submissionType — the runtime ignores keys that don't apply to the chosen
 * type.
 */
function buildFormMetaAttrs(props: Record<string, any>): Record<string, string> {
  const meta: Record<string, any> = {
    submissionType: props.submissionType || "email",
  };
  if (props.formName) meta.formName = props.formName;
  if (props.action) meta.action = props.action;
  if (props.method) meta.method = props.method;
  if (props.mailto) meta.mailto = props.mailto;
  if (props.webhookEnabled && props.webhookUrl) meta.webhookUrl = props.webhookUrl;
  if (props.collectionSlug) meta.collectionSlug = props.collectionSlug;
  if (props.collectionFieldMap) meta.collectionFieldMap = props.collectionFieldMap;
  if (props.collectionSkipEmail) meta.collectionSkipEmail = !!props.collectionSkipEmail;
  if (props.agentId) meta.agentId = props.agentId;
  if (props.conversion) meta.conversion = props.conversion;
  if (props.successAction) meta.successAction = props.successAction;
  if (props.successUrl) meta.successUrl = props.successUrl;
  return { "data-ph-form": JSON.stringify(meta) };
}

function escapeQuotedAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export const toHTML: ToHTMLFn = (props, children, ctx) => {
  // Splice the form-meta data attribute into the rendered form opening tag.
  // Container.toHTML doesn't know about Form-specific props, so we tag the
  // generated HTML post-hoc — cheap and avoids extending the Container API.
  const html = containerToHTML({ ...props, type: "form" }, HONEYPOT_HTML + children, ctx);
  const meta = buildFormMetaAttrs(props);
  const formId = ctx?.renderingNodeId ?? "";
  const idAttr = formId ? ` data-ph-form-id="${escapeQuotedAttr(formId)}"` : "";
  const attrStr = ` data-ph-form="${escapeQuotedAttr(meta["data-ph-form"]!)}"${idAttr}`;
  return html.replace(/^(\s*<form\b)/i, "$1" + attrStr);
};
