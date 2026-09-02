import {
  ariaAttrs,
  attrsPassthrough,
  escapeHTML,
  handlerAttrs,
  interpolate,
  stateAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  const t = props.type === "textarea" ? "textarea" : props.type === "select" ? "select" : "input";

  // SSR-seeded default for `stateBinding.key`. Without a request-query
  // surface in the walker we only emit a defaultValue when the binding
  // carries one explicitly; the runtime fills the live value post-hydration.
  let seededDefault: string | undefined;
  const sb = props.stateBinding;
  if (sb && typeof sb === "object" && typeof sb.key === "string") {
    if (typeof sb.defaultValue === "string" && sb.defaultValue) {
      seededDefault = sb.defaultValue;
    }
  }

  const attrs: Record<string, any> = {
    class: cls || undefined,
    type: t === "input" ? props.type || "text" : undefined,
    name: props.name || undefined,
    placeholder: props.placeholder ? interpolate(props.placeholder, ctx) : undefined,
    value: t === "input" && seededDefault !== undefined ? seededDefault : undefined,
    required: props.required || undefined,
    disabled: props.disabled || undefined,
    // The placeholder is deliberately NOT in this chain: it holds an example
    // value ("you@example.com"), so screen readers announce a sample address
    // where the field's purpose belongs. An explicit `label`, an `aria-label`
    // via `attrs`/`ariaAttrs`, or the field `name` all describe the purpose.
    "aria-label": interpolate(
      props.label || props.name || `${props.type || "text"} input`,
      ctx
    ),
    ...ariaAttrs(props),
    ...handlerAttrs(props),
    ...stateAttrs(props, ctx),
    ...attrsPassthrough(props, ctx),
  };
  if (t === "textarea" && props.rows) attrs.rows = String(props.rows);

  let inner = "";
  if (t === "select" && props.options?.length) {
    inner = props.options
      .map(
        (o: any) =>
          `<option value="${o.value}"${o.disabled ? " disabled" : ""}${seededDefault !== undefined && String(o.value) === seededDefault ? " selected" : ""}>${escapeHTML(o.label)}</option>`
      )
      .join("");
  } else if (t === "textarea" && seededDefault !== undefined) {
    inner = escapeHTML(seededDefault);
  }

  const input = tag(t, attrs, inner);

  if (props.label) {
    const label = `<label class="block text-sm font-medium mb-1">${escapeHTML(interpolate(props.label, ctx))}${props.required ? ' <span aria-hidden="true">*</span>' : ""}</label>`;
    return tag("div", { style: "width: 100%" }, label + input);
  }
  return input;
};
