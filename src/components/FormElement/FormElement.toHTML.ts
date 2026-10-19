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
import { formAutocomplete } from "../../utils/formAutocomplete";
import { formConstraintAttrs } from "../../utils/formConstraints";

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  const t = props.type === "textarea" ? "textarea" : props.type === "select" ? "select" : "input";

  // Initial value, as the React body resolves it: the state binding's default,
  // else the field's own `defaultValue` (a quantity input's "1"). A bound
  // field's live state value is filled by the runtime post-hydration.
  // `name` and the state key interpolate against the item like the React body,
  // so a repeater of facet checkboxes writes `url:facet.<facetKey>`.
  const rawSb = props.stateBinding;
  const bound = !!rawSb && typeof rawSb === "object" && typeof rawSb.key === "string";
  const sb = bound ? { ...rawSb, key: interpolate(rawSb.key, ctx) } : rawSb;
  const fieldDefault =
    props.defaultValue != null && props.defaultValue !== "" ? String(props.defaultValue) : undefined;
  const isTick = props.type === "checkbox" || props.type === "radio";
  const stateSeed =
    fieldDefault ??
    (bound && sb.mode === "checked" && isTick && props.defaultChecked
      ? String(props.attrs?.value ?? "on")
      : undefined);
  const seededDefault: string | undefined =
    (bound && typeof sb.defaultValue === "string" && sb.defaultValue) || fieldDefault;

  // Same id scheme as the React body, so a <label for> can point at the field.
  // Skipped inside repeaters, where one node renders many times.
  const inputId =
    props.attrs?.id ??
    (ctx.renderingNodeId && !ctx.currentItem ? `ph-input-${ctx.renderingNodeId}` : undefined);

  const attrs: Record<string, any> = {
    id: inputId,
    class: cls || undefined,
    type: t === "input" ? props.type || "text" : undefined,
    name: props.name ? interpolate(props.name, ctx) : undefined,
    placeholder: props.placeholder ? interpolate(props.placeholder, ctx) : undefined,
    value: t === "input" && seededDefault !== undefined ? seededDefault : undefined,
    checked: isTick && props.defaultChecked ? true : undefined,
    required: props.required || undefined,
    disabled: props.disabled || undefined,
    autocomplete: formAutocomplete(props),
    ...formConstraintAttrs(props),
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
    // React seeds a bound field's empty state from `defaultValue` too
    // (a pre-ticked checked-mode box seeds its submitted value).
    ...stateAttrs(
      bound
        ? { ...props, stateBinding: !sb.defaultValue && stateSeed ? { ...sb, defaultValue: stateSeed } : sb }
        : props,
      ctx
    ),
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
    const forAttr = inputId ? ` for="${escapeHTML(String(inputId))}"` : "";
    const label = `<label${forAttr} class="block text-sm font-medium mb-1">${escapeHTML(interpolate(props.label, ctx))}${props.required ? ' <span aria-hidden="true">*</span>' : ""}</label>`;
    return tag("div", { style: "width: 100%" }, label + input);
  }
  return input;
};
