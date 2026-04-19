/**
 * Copy a component's `props.attrs` map onto the DOM `prop` object.
 * Used by Container, Button, and FormElement to pass through data-*, role,
 * autocomplete, and similar string attributes declared on block JSON.
 *
 * Only primitive values (string/number/boolean) are propagated — objects and
 * functions are dropped to avoid accidental prop leaks.
 *
 * When `interpolate` is provided (Button passes `{{item.*}}` context into
 * chip URLs / data attributes inside repeaters), it runs on every string
 * value before assignment.
 */

// Block JSON uses HTML-style attribute names (lowercase). React needs camelCase
// for a handful of DOM props — normalize them here so authors can keep writing
// `autocomplete: "off"` without React console warnings.
const REACT_ATTR_ALIASES: Record<string, string> = {
  autocomplete: "autoComplete",
  autocapitalize: "autoCapitalize",
  autocorrect: "autoCorrect",
  autofocus: "autoFocus",
  autoplay: "autoPlay",
  autosave: "autoSave",
  readonly: "readOnly",
  tabindex: "tabIndex",
  maxlength: "maxLength",
  minlength: "minLength",
  spellcheck: "spellCheck",
  crossorigin: "crossOrigin",
  contenteditable: "contentEditable",
  inputmode: "inputMode",
  enterkeyhint: "enterKeyHint",
  formaction: "formAction",
  formenctype: "formEncType",
  formmethod: "formMethod",
  formnovalidate: "formNoValidate",
  formtarget: "formTarget",
  novalidate: "noValidate",
  referrerpolicy: "referrerPolicy",
};

export function applyAttrs(
  prop: Record<string, any>,
  attrs: unknown,
  interpolate?: (value: string) => string
): void {
  if (!attrs || typeof attrs !== "object") return;
  for (const [k, v] of Object.entries(attrs as Record<string, unknown>)) {
    const key = REACT_ATTR_ALIASES[k] ?? k;
    if (typeof v === "string") {
      prop[key] = interpolate ? interpolate(v) : v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      prop[key] = v;
    }
  }
}
