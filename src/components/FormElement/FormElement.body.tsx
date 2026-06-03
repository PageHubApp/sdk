/** Pure body for FormElement. NO `@craftjs/core`. */
/* eslint-disable react-hooks/rules-of-hooks -- render*Body fns are invoked once from a wrapper component; hook order is preserved. Renamed to use* would change exported public-ish API across the SDK. */
import React, { useEffect, useState } from "react";
import { applyAttrs } from "../../utils/applyAttrs";
import { motionIt } from "../../utils/motion";
import { useItemContext } from "../../utils/itemContext";
import { replaceVariables } from "../../utils/design/variables";
import { useRuntimeVarsVersion } from "../../utils/design/RuntimeVarsContext";
import type { RenderCtx } from "../../render/react/RenderCtx";
import { useAnchors, resolveAnchors } from "../../utils/anchors/anchorContext";
import { setState, useStateValue } from "../../utils/state/stateRegistry";
import { addCustomHandlers } from "../../utils/actions/customHandlers";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { BaseSelectorProps, applyAriaProps } from "../selectors";

export const inputTypes = [
  "text",
  "textarea",
  "email",
  "password",
  "url",
  "tel",
  "date",
  "datetime-local",
  "radio",
  "checkbox",
  "select",
  "reset",
  "hidden",
  "color",
  "file",
  "month",
  "number",
  "range",
  "search",
  "time",
  "week",
];

// OnlyFormElement is editor-only — defined in FormElement.tsx

export interface FormElementProps extends BaseSelectorProps {
  text?: string;
  tagName?: string;
  activeTab?: number;
  type?: string;
  placeholder?: string;
  name?: string;
  label?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  cols?: number;
  min?: string;
  max?: string;
  step?: string;
  pattern?: string;
  autoComplete?: string;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  invalid?: boolean;
  /**
   * Two-way bind this input's value to a state-registry key. The single
   * primitive that replaces every `data-storefront-input` scrape — authors
   * set `stateBinding: { key: "url:q" }` on a search input and the URL
   * bridge picks it up automatically.
   *
   * - `key`            — registry key (anchor tokens supported)
   * - `defaultValue`   — written if state is unset on mount
   * - `debounceMs`     — coalesce rapid input events (default 0; 300 for search)
   * - `mode`           — `"value"` (default) | `"checked"` (checkbox / radio)
   *
   * Behavior:
   *   On mount: if state has a value, the input renders it. Otherwise
   *   `defaultValue` writes through.
   *   On change: writes the new value to state (debounced).
   *   On external state writes: re-syncs the input value (e.g. URL bridge
   *   updating from popstate).
   */
  stateBinding?: {
    key: string;
    defaultValue?: string;
    debounceMs?: number;
    mode?: "value" | "checked";
  };
}
export function renderFormElementBody(props: any, ctx: RenderCtx) {
  const itemContext = useItemContext();
  const anchors = useAnchors();
  useRuntimeVarsVersion();
  const interp = (v: string | undefined) =>
    v ? replaceVariables(v, ctx.rootProps, itemContext, anchors) : v;

  // Resolve state binding — anchor tokens get expanded against the nearest
  // <AnchorProvider> (e.g. an agent chat or PDP wrapper) so per-instance
  // forms don't collide. `boundKey` is the canonical registry key.
  const stateBinding = props.stateBinding as FormElementProps["stateBinding"] | undefined;
  const boundKey = stateBinding?.key
    ? resolveAnchors(stateBinding.key, anchors) || stateBinding.key
    : undefined;
  // Subscribe so external writes (URL bridge popstate, set-state actions
  // elsewhere on the page) flow back into the input.
  const externalValue = useStateValue(boundKey);

  const inputId = `ph-input-${ctx.id}`;

  // ── State binding plumbing ─────────────────────────────────────────────
  // Strategy: keep the input uncontrolled (browser autocomplete, form
  // submit, defaultValue all keep working) but sync imperatively when state
  // changes from outside.
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(
    null
  );
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror external state writes onto the live DOM input (popstate, sibling
  // set-state actions, etc.). Skip when the input is currently focused so a
  // typing user isn't yanked mid-keystroke.
  React.useEffect(() => {
    if (ctx.enabled || !boundKey) return;
    const el = inputRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const v = externalValue ?? "";
    if (stateBinding?.mode === "checked") {
      const target = el as HTMLInputElement;
      const want = v === target.value || v === "on";
      if (target.checked !== want) target.checked = want;
    } else {
      if (el.value !== v) (el as HTMLInputElement).value = v;
    }
  }, [ctx.enabled, boundKey, externalValue, stateBinding?.mode]);

  React.useEffect(() => {
    if (ctx.enabled || !boundKey) return;
    const current = externalValue;
    const fallback = stateBinding?.defaultValue ?? props.defaultValue;
    if ((current == null || current === "") && fallback) {
      setState(
        boundKey,
        { kind: "value", value: String(fallback), source: "load" },
        "form-element"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.enabled, boundKey]);

  // Imperative onChange writer — debounced for text inputs, immediate for
  // selects/checkboxes/radios.
  const writeValueToState = React.useCallback(
    (value: string) => {
      if (!boundKey) return;
      const ms = stateBinding?.debounceMs ?? 0;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const fire = () =>
        setState(boundKey, { kind: "value", value, source: "runtime" }, "form-element");
      if (ms > 0) debounceRef.current = setTimeout(fire, ms);
      else fire();
    },
    [boundKey, stateBinding?.debounceMs]
  );

  // Build props based on input type - only include relevant attributes
  const prop: any = {
    ref: (r: any) => {
      inputRef.current = r;
      ctx.connect(ctx.drag(r));
    },
    id: inputId,
    className: props.className || "",
    type: props.type,
    defaultValue:
      (boundKey && !ctx.enabled && externalValue != null && externalValue !== ""
        ? externalValue
        : null) ??
      props.defaultValue ??
      "",
    "aria-label": props.label || props.placeholder || props.name || `${props.type || "text"} input`,
  };

  if (boundKey && !ctx.enabled) {
    const isCheckedMode = stateBinding?.mode === "checked";
    prop.onChange = (e: React.ChangeEvent<any>) => {
      const target = e.target as HTMLInputElement;
      if (isCheckedMode) {
        writeValueToState(target.checked ? target.value || "on" : "");
      } else {
        writeValueToState(target.value);
      }
    };
    if (isCheckedMode && externalValue && externalValue !== "") {
      // Initial checked state from registry (e.g. ?facet.color=red,blue → red checkbox is checked).
      prop.defaultChecked = externalValue === (props as any).attrs?.value || externalValue === "on";
    }
  }

  applyAriaProps(prop, props);

  // Add common text attributes if they have values
  if (props.placeholder) prop.placeholder = props.placeholder;
  // Interpolate `name` against itemContext so facet dropdowns can write
  // `name="facet.{{item.facetKey}}"` inside a repeater. Outside a repeater,
  // interpolation is a no-op.
  if (props.name) prop.name = interp(props.name);
  if (props.disabled) prop.disabled = props.disabled;
  if (props.readOnly) prop.readOnly = props.readOnly;

  // Textarea-specific attributes
  if (props.type === "textarea") {
    if (props.rows) prop.rows = props.rows;
    if (props.cols) prop.cols = props.cols;
  }

  // Number/range/date input attributes
  const numericTypes = ["number", "range", "date", "datetime-local", "time", "month", "week"];
  if (numericTypes.includes(props.type)) {
    if (props.min) prop.min = props.min;
    if (props.max) prop.max = props.max;
    if (props.step) prop.step = props.step;
  }

  // Pattern attribute for text-based inputs
  const patternTypes = ["text", "search", "url", "tel", "email", "password"];
  if (patternTypes.includes(props.type) && props.pattern) {
    prop.pattern = props.pattern;
  }

  // Autocomplete attribute for accessibility (WCAG 1.3.5)
  if (props.autoComplete) {
    prop.autoComplete = props.autoComplete;
  } else {
    // Infer autocomplete from name/type when not explicitly set
    const nameLC = (props.name || "").toLowerCase();
    const autoMap: Record<string, string> = {
      email: "email",
      name: "name",
      "full-name": "name",
      fullname: "name",
      "first-name": "given-name",
      firstname: "given-name",
      "given-name": "given-name",
      "last-name": "family-name",
      lastname: "family-name",
      "family-name": "family-name",
      phone: "tel",
      tel: "tel",
      telephone: "tel",
      address: "street-address",
      street: "street-address",
      city: "address-level2",
      state: "address-level1",
      zip: "postal-code",
      zipcode: "postal-code",
      "postal-code": "postal-code",
      country: "country-name",
      company: "organization",
      organization: "organization",
      org: "organization",
    };
    const inferred =
      autoMap[nameLC] ||
      (props.type === "email"
        ? "email"
        : props.type === "tel"
          ? "tel"
          : props.type === "url"
            ? "url"
            : null);
    if (inferred) prop.autoComplete = inferred;
  }

  // Accessibility attributes
  if (props.type === "email") prop["aria-describedby"] = `${inputId}-desc`;
  if (props.type === "tel") prop["aria-describedby"] = `${inputId}-desc`;
  if (props.type === "url") prop["aria-describedby"] = `${inputId}-desc`;

  // Pass through plain string attrs (data-*, etc.). Interpolate against
  // itemContext so a repeater of facet options can carry e.g.
  // `value="{{item.value}}"` for the submitted value when a checkbox is
  // checked. Storefront wiring no longer needs `data-storefront-input` —
  // use `stateBinding: { key: "url:facet.<facetKey>", mode: "checked" }`
  // instead so the FormElement ↔ state ↔ URL bridge flow handles it.
  applyAttrs(prop, props.attrs, v =>
    typeof v === "string" ? replaceVariables(v, ctx.rootProps, itemContext) : v
  );

  // Safety net: if a block passed `value` via attrs, treat it as the initial
  // value. A bare `value` with no `onChange` makes React warn (read-only) and
  // conflicts with `defaultValue`. Validator migrates this at save time; this
  // guards already-saved blocks that still carry it.
  //
  // Checkbox/radio are exempt: on those inputs `value` is the SUBMITTED string
  // when checked (static metadata), not the input's state — React accepts it
  // without onChange. Stripping it would make a facet checkbox submit "on".
  const valueIsInputState = prop.type !== "checkbox" && prop.type !== "radio";
  if (valueIsInputState && prop.value !== undefined && prop.onChange === undefined) {
    if (prop.defaultValue === "" || prop.defaultValue == null) {
      prop.defaultValue = prop.value;
    }
    delete prop.value;
  }

  // Required attribute
  if (props.required) {
    prop["aria-required"] = "true";
    prop["required"] = true;
  }

  // Invalid state support
  if (props.invalid) {
    prop["aria-invalid"] = "true";
  }

  prop["data-border"] = /\bborder(-[^\s])?/.test(props.className || "");

  addCustomHandlers(prop, props.handlers, ctx.enabled, (props as any).handlerOptions);

  if (ctx.enabled) {
    prop["data-bounding-box"] = ctx.enabled;
    if (ctx.isMounted) prop["node-id"] = ctx.id;
  }

  const tagName =
    prop.type === "textarea" ? "textarea" : prop.type === "select" ? "select" : "input";

  // In edit mode, render a fake div instead of a real input.
  // Real inputs steal clicks (focus, autocomplete, submit) from the editor.
  // A div with the same classes looks identical but is just a dumb box.
  if (ctx.enabled && ctx.isMounted) {
    // Remove input-specific attributes that don't apply to divs
    const {
      type: _t,
      defaultValue: _dv,
      autoComplete: _ac,
      placeholder: _ph,
      name: _n,
      disabled: _dis,
      readOnly: _ro,
      required: _req,
      "aria-required": _ar,
      "aria-describedby": _ad,
      "aria-invalid": _ai,
      "aria-label": _al,
      pattern: _pat,
      min: _min,
      max: _max,
      step: _step,
      rows: _rows,
      cols: _cols,
      ...divProp
    } = prop;

    // Show placeholder text as content, styled like a real placeholder
    const placeholderContent = props.placeholder || props.name || props.type || "Input";

    const content = (
      <>
        {props.label && (
          <label className="mb-1 block text-sm font-medium">
            {props.label}
            {props.required && <span aria-hidden="true"> *</span>}
          </label>
        )}
        <span className={(props.className || "").match(/\bplaceholder:([^\s]+)/)?.[1] || ""}>
          {placeholderContent}
        </span>
      </>
    );

    divProp.children = content;

    const final = applyAnimation({ ...divProp, key: `${ctx.id}` }, props, null, ctx.enabled);
    return React.createElement(motionIt(props, "div", ctx.enabled), final);
  }

  // Render the resolved control directly. `prop` already carries id, name,
  // autoComplete, aria-*, defaultValue, and state-binding onChange.
  const fieldProps: any = applyAnimation(
    { ...prop, key: `${ctx.id}-${tagName}` },
    props,
    null,
    ctx.enabled
  );
  if (tagName === "input") {
    fieldProps.type = props.type;
  } else {
    delete fieldProps.type; // textarea / select take no `type` attribute
    if (tagName === "textarea") {
      if (props.rows) fieldProps.rows = props.rows;
      if (props.cols) fieldProps.cols = props.cols;
    }
  }
  const formElement =
    tagName === "select"
      ? React.createElement(
          motionIt(props, "select", ctx.enabled),
          fieldProps,
          (props.options || []).map(
            (opt: { value: string; label: string; disabled?: boolean }) =>
              React.createElement(
                "option",
                { key: opt.value, value: opt.value, disabled: opt.disabled },
                opt.label
              )
          )
        )
      : React.createElement(motionIt(props, tagName, ctx.enabled), fieldProps);

  if (props.label) {
    return (
      <div style={{ width: "100%" }}>
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
          {props.label}
          {props.required && <span aria-hidden="true"> *</span>}
        </label>
        {formElement}
      </div>
    );
  }
  return formElement;
}
