/**
 * HTML nesting lint — flags structurally invalid parent/child pairs that
 * browsers reject and React throws hydration errors over.
 *
 * Examples:
 *   - <div> directly inside <tbody> (must be <tr>)
 *   - <li> outside <ul>/<ol>
 *   - <td> outside <tr>
 *   - block element inside <p>
 *   - <a> or <button> nested inside another <a>/<button>
 *
 * Tag resolution mirrors `pickContainerTag` for Container/Data/Background and
 * uses sensible defaults for the rest. Unknown components fall back to "div"
 * (won't trigger any rule on their own).
 */
import type { LintIssue } from "./responsiveLint";

const CONTAINER_TAG_TYPES = new Set([
  "section",
  "header",
  "footer",
  "nav",
  "aside",
  "main",
  "form",
  "details",
  "summary",
  "label",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
]);

export function effectiveTag(node: any): string | null {
  if (!node) return null;
  const name: string = node?.data?.name || "";
  const props = node?.data?.props ?? {};
  switch (name) {
    case "Container":
    case "Data":
    case "Background": {
      const t = props.type;
      if (t === "page") return "article";
      if (typeof t === "string" && CONTAINER_TAG_TYPES.has(t)) return t;
      return "div";
    }
    case "Text":
      return (typeof props.tagName === "string" && props.tagName) || "p";
    case "Button":
      return "button";
    case "Link":
      return "a";
    case "Image":
      return "img";
    case "Audio":
      return "audio";
    case "Video":
      return "video";
    case "Form":
      return "form";
    case "Icon":
      return "svg";
    case "Header":
      return "header";
    case "Footer":
      return "footer";
    case "FormElement": {
      const t = props.type;
      if (t === "textarea") return "textarea";
      if (t === "select") return "select";
      return "input";
    }
    default:
      return "div";
  }
}

// Parent tag → set of tags allowed as DIRECT children. Anything else flags.
const ALLOWED_CHILDREN: Record<string, Set<string>> = {
  tbody: new Set(["tr"]),
  thead: new Set(["tr"]),
  tfoot: new Set(["tr"]),
  tr: new Set(["td", "th"]),
  table: new Set([
    "caption",
    "colgroup",
    "col",
    "thead",
    "tbody",
    "tfoot",
    "tr",
  ]),
  ul: new Set(["li"]),
  ol: new Set(["li"]),
  select: new Set(["option", "optgroup"]),
  optgroup: new Set(["option"]),
  dl: new Set(["dt", "dd", "div"]),
};

// Tags that must have a specific parent. Flags when that parent is missing.
const REQUIRED_PARENT: Record<string, Set<string>> = {
  li: new Set(["ul", "ol", "menu"]),
  td: new Set(["tr"]),
  th: new Set(["tr"]),
  tr: new Set(["thead", "tbody", "tfoot", "table"]),
  thead: new Set(["table"]),
  tbody: new Set(["table"]),
  tfoot: new Set(["table"]),
};

// Block-level descendants that <p> can't contain.
const P_FORBIDDEN_CHILDREN = new Set([
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "table",
  "section",
  "article",
  "aside",
  "nav",
  "header",
  "footer",
  "form",
  "figure",
  "blockquote",
  "hr",
  "pre",
  "address",
  "details",
]);

const A_FORBIDDEN_CHILDREN = new Set(["a", "button"]);
const BUTTON_FORBIDDEN_CHILDREN = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
]);

export function ruleInvalidHtmlNesting(
  node: any,
  parent: any
): LintIssue | null {
  const childTag = effectiveTag(node);
  if (!childTag) return null;

  // Required-parent rules fire even when parent is missing/unknown.
  const required = REQUIRED_PARENT[childTag];
  if (required) {
    const parentTag = effectiveTag(parent);
    if (!parentTag || !required.has(parentTag)) {
      const expected = Array.from(required)
        .map(t => `<${t}>`)
        .join(" / ");
      return {
        rule: "invalid-html-nesting",
        severity: "error",
        title: `<${childTag}> needs ${expected} parent`,
        message: parentTag
          ? `<${childTag}> sits directly inside <${parentTag}>; browsers will reparent it and React will throw a hydration error.`
          : `<${childTag}> has no valid parent in this position.`,
        tip: `Wrap with the correct parent element (set the parent Container's type to ${expected}).`,
      };
    }
  }

  if (!parent) return null;
  const parentTag = effectiveTag(parent);
  if (!parentTag) return null;

  const allowed = ALLOWED_CHILDREN[parentTag];
  if (allowed && !allowed.has(childTag)) {
    return {
      rule: "invalid-html-nesting",
      severity: "error",
      title: `<${childTag}> can't be a child of <${parentTag}>`,
      message: `Browsers reject this nesting and React will throw a hydration error.`,
      tip: parentTag === "tbody" || parentTag === "thead" || parentTag === "tfoot"
        ? `Wrap rows in <tr> Containers (set type: "tr"), then put <td>/<th> Containers inside.`
        : parentTag === "ul" || parentTag === "ol"
          ? `Set this child Container's type to "li".`
          : `Use one of: ${Array.from(allowed).map(t => `<${t}>`).join(", ")}.`,
    };
  }

  if (parentTag === "p" && P_FORBIDDEN_CHILDREN.has(childTag)) {
    return {
      rule: "invalid-html-nesting",
      severity: "error",
      title: `<${childTag}> can't be a child of <p>`,
      message: `<p> only allows inline content; the browser will auto-close the <p> before this element.`,
      tip: `Change the Text node's tagName to "div", or move this element outside the <p>.`,
    };
  }

  if (parentTag === "a" && A_FORBIDDEN_CHILDREN.has(childTag)) {
    return {
      rule: "invalid-html-nesting",
      severity: "error",
      title: `<${childTag}> can't be nested in <a>`,
      message: `Interactive elements can't nest inside an anchor.`,
    };
  }

  if (parentTag === "button" && BUTTON_FORBIDDEN_CHILDREN.has(childTag)) {
    return {
      rule: "invalid-html-nesting",
      severity: "error",
      title: `<${childTag}> can't be nested in <button>`,
      message: `Interactive elements can't nest inside a button.`,
    };
  }

  return null;
}
