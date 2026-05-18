/** Form — Component definition via defineComponent(). */
import React from "react";
import { TbForms } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { Form } from "./Form";
import { toHTML as containerToHTML } from "../Container/Container.craft";
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
  return { "data-ph-form": JSON.stringify(meta) };
}

const toHTML: ToHTMLFn = (props, children, ctx) => {
  // Splice the form-meta data attribute into the rendered form opening tag.
  // Container.toHTML doesn't know about Form-specific props, so we tag the
  // generated HTML post-hoc — cheap and avoids extending the Container API.
  const html = containerToHTML({ ...props, type: "form" }, HONEYPOT_HTML + children, ctx);
  const meta = buildFormMetaAttrs(props);
  const attrStr = ` data-ph-form="${escapeQuotedAttr(meta["data-ph-form"]!)}"`;
  return html.replace(/^(\s*<form\b)/i, "$1" + attrStr);
};

function escapeQuotedAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

const FormMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/FormMainTab").then(mod => ({
    default: mod.FormMainTab,
  }))
);

export const FormDef = defineComponent(
  {
    name: "Form",
    component: Form,
    icon: TbForms,
    category: "Forms",
    canvas: true,
    settings: FormMainTab,
    toHTML,
    disable: ["font", "opacity", "cursor", "hoverClick", "animations"],
    craftProps: {
      className: "flex flex-col items-center gap-container",
    },
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: nodes =>
        nodes.every(node => node.data?.type !== "Form" && node.data?.props?.type !== "form"),
    },
    tools: [],
  },
  { __internal: true }
);
