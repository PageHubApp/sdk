/**
 * Craft → HTML-first source emitters for `Form` and `FormElement`
 * (see docs/strategy/html-first-converter.md). The source twins of
 * `Form/Form.toHTML.ts` and `FormElement/FormElement.toHTML.ts`.
 *
 * A PageHub-handled Form (inbox / email / collection / webhook submission)
 * becomes the native `{% form %}` tag — the standalone engine's host owns the
 * endpoint, honeypot and submit runtime, so none of the `data-ph-form*` meta the
 * static walker stamps is emitted here. A `custom`/`iframe` form posts to its own
 * `action`, so it stays a plain `<form action method>`.
 *
 * `FormElement` becomes the real `<input>` / `<select>` / `<textarea>` with its
 * `name` / `type` / validation attrs. Values are kept VERBATIM — a `{{ item.* }}`
 * token in a `name`/`placeholder`/option is already the format's binding form and
 * passes straight through to Liquid (never interpolated, matching the Container /
 * Text / Image emitters in `toSource.ts`).
 */
import type { ToSourceFn } from "./toSource";
import { escapeHTML } from "../../utils/staticHtml";
import { formAutocomplete } from "../../utils/formAutocomplete";
import { formConstraintAttrs } from "../../utils/formConstraints";

// ── Tiny element emitter (matches toSource.ts's `el`: 1:1 element, no wrapper,
//    non-self-closing void tags) but also supports boolean attrs (`required`). ──
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

type AttrVal = string | number | boolean | null | undefined;

function attrsStr(attrs: Record<string, AttrVal>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (v === true) parts.push(k);
    else parts.push(`${k}="${String(v).replace(/"/g, "&quot;")}"`);
  }
  return parts.length ? " " + parts.join(" ") : "";
}

function el(tagName: string, attrs: Record<string, AttrVal>, inner = ""): string {
  const open = `<${tagName}${attrsStr(attrs)}>`;
  return VOID.has(tagName) ? open : `${open}${inner}</${tagName}>`;
}

/** The element's class string, verbatim (all breakpoints) — same rule as `toSource.ts`. */
function classString(props: Record<string, any>): string | undefined {
  const c = props.className;
  const s = typeof c === "string" ? c : Array.isArray(c) ? c.join(" ") : "";
  return s.trim() || undefined;
}

// ── Form ─────────────────────────────────────────────────────────────────────

/** A display name → a slug usable as the `{% form %}` first argument / inbox key. */
function slugify(raw: unknown): string {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The `{% form %}` first argument: the collection slug, else the inbox name slugified. */
function formSlug(props: Record<string, any>): string {
  if (props.submissionType === "collection") {
    return props.collectionSlug || slugify(props.formName) || "form";
  }
  return slugify(props.formName) || "contact";
}

/** Single-quote a Liquid string argument, escaping embedded single quotes. */
function q(s: string): string {
  return `'${String(s).replace(/'/g, "\\'")}'`;
}

/** `collectionFieldMap` ({ fieldKey: "inputName" }) → the `map:` arg string `'a=b,c=d'`. */
function fieldMapArg(map: unknown): string | null {
  if (!map || typeof map !== "object") return null;
  const parts = Object.entries(map as Record<string, unknown>)
    .filter(([k, v]) => k && v != null && v !== "")
    .map(([k, v]) => `${k}=${v}`);
  return parts.length ? parts.join(",") : null;
}

/**
 * Form → `{% form '<slug>' [, map:…, notify: false, to:…, webhook:…, redirect:…, class:…, id:…] %}`
 * … children … `{% endform %}`. A `custom`/`iframe` submission stays a plain `<form action method>`.
 */
export const formSource: ToSourceFn = (props, children) => {
  const type = props.submissionType || "email";
  const cls = classString(props);
  const id = props.id || undefined;

  // External-action forms are not PageHub-handled — keep them native `<form>`.
  if (type === "custom" || type === "iframe") {
    return el(
      "form",
      {
        class: cls,
        id,
        action: props.action || undefined,
        method: props.method || "POST",
        target: type === "iframe" ? "iframe" : undefined,
      },
      children
    );
  }

  const args: string[] = [];
  if (type === "collection") {
    const map = fieldMapArg(props.collectionFieldMap);
    if (map) args.push(`map: ${q(map)}`);
    if (props.collectionSkipEmail) args.push("notify: false");
  }
  if (props.mailto) args.push(`to: ${q(String(props.mailto))}`);
  if (props.webhookUrl) args.push(`webhook: ${q(String(props.webhookUrl))}`);
  if (props.successUrl) args.push(`redirect: ${q(String(props.successUrl))}`);
  if (cls) args.push(`class: "${cls.replace(/"/g, "&quot;")}"`);
  if (id) args.push(`id: "${String(id).replace(/"/g, "&quot;")}"`);

  const open = `{% form ${q(formSlug(props))}${args.length ? ", " + args.join(", ") : ""} %}`;
  return `${open}${children}{% endform %}`;
};

// ── FormElement ────────────────────────────────────────────────────────────────

/**
 * FormElement → the real control: `<input type name …>` / `<select>…<option>…` /
 * `<textarea>`, carrying class / id / name / placeholder / validation. When a
 * `label` prop is set it wraps the control in a `<label>` + `<div>` exactly like
 * the `toHTML` emitter so a `<label for>` points at the field.
 */
export const formElementSource: ToSourceFn = (props, _children, ctx) => {
  const t = props.type === "textarea" ? "textarea" : props.type === "select" ? "select" : "input";

  // Same id scheme as the React/static body: author-set id wins, else a derived
  // `ph-input-<nodeId>`. Skipped inside a repeater (one node renders many rows).
  const inputId =
    props.attrs?.id ??
    (ctx?.renderingNodeId && !ctx?.currentItem ? `ph-input-${ctx.renderingNodeId}` : undefined);

  const isTick = props.type === "checkbox" || props.type === "radio";
  const fieldDefault =
    props.defaultValue != null && props.defaultValue !== "" ? String(props.defaultValue) : undefined;

  const attrs: Record<string, AttrVal> = {
    id: inputId,
    class: classString(props),
    type: t === "input" ? props.type || "text" : undefined,
    name: props.name || undefined,
    placeholder: props.placeholder || undefined,
    value: t === "input" && fieldDefault !== undefined ? fieldDefault : undefined,
    checked: isTick && props.defaultChecked ? true : undefined,
    required: props.required || undefined,
    disabled: props.disabled || undefined,
    autocomplete: formAutocomplete(props),
    ...formConstraintAttrs(props),
    // The field's purpose, not its placeholder (which holds an example value).
    "aria-label": props.label || props.name || `${props.type || "text"} input`,
  };
  if (t === "textarea" && props.rows) attrs.rows = String(props.rows);

  // Author pass-through attrs win, verbatim (no `{{ item.* }}` interpolation).
  const extra = props.attrs;
  if (extra && typeof extra === "object") {
    for (const [k, v] of Object.entries(extra as Record<string, unknown>)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") attrs[k] = v;
    }
  }

  let inner = "";
  if (t === "select" && Array.isArray(props.options) && props.options.length) {
    inner = props.options
      .map((o: any) => {
        const selected = fieldDefault !== undefined && String(o.value) === fieldDefault;
        return el(
          "option",
          { value: String(o.value ?? ""), disabled: o.disabled || undefined, selected: selected || undefined },
          escapeHTML(String(o.label ?? ""))
        );
      })
      .join("");
  } else if (t === "textarea" && fieldDefault !== undefined) {
    inner = escapeHTML(fieldDefault);
  }

  const control = el(t, attrs, inner);

  if (props.label) {
    const forAttr = inputId ? ` for="${escapeHTML(String(inputId))}"` : "";
    const label = `<label${forAttr} class="block text-sm font-medium mb-1">${escapeHTML(String(props.label))}${props.required ? ' <span aria-hidden="true">*</span>' : ""}</label>`;
    return `<div style="width: 100%">${label}${control}</div>`;
  }
  return control;
};
