import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { applyAttrs } from "../utils/applyAttrs";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { motionIt } from "../utils/lib";
import { FormField } from "@pagehub/ui";
import { useItemContext } from "../utils/itemContext";
import { replaceVariables } from "../utils/design/variables";
import { useRuntimeVarsVersion } from "../utils/design/RuntimeVarsContext";

import { addCustomHandlers } from "../utils/clickControls";
import { applyAnimation } from "../utils/tailwind/tailwind";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

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

export const OnlyFormElement = ({ children, ...props }) => {
  const {
    connectors: { connect, drag },
    id,
  }: any = useNode();
  return (
    <div ref={connect} className="mt-5 w-full" {...props}>
      {children}
    </div>
  );
};

OnlyFormElement.craft = {
  rules: {
    canMoveIn: nodes => nodes.every(node => node.data?.name === "FormElement"),
  },
};

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
  /** @deprecated Use `autoComplete` instead. */
  autocomplete?: string;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  invalid?: boolean;
}

export const FormElement = (incomingProps: Partial<FormElementProps>) => {
  let props: any = {
    root: {},
    className:
      "border-solid border-(length:--border) border-(--input-border-color) rounded-field bg-(--input-bg-color) text-(--input-text-color) placeholder:text-(--input-placeholder-color) focus:ring-(length:--input-focus-ring) focus:ring-(--input-focus-ring-color) focus:outline-none",
    canDelete: true,
    type: "",
    placeholder: "",
    name: "",
    required: false,
    disabled: false,
    readOnly: false,
    rows: 4,
    cols: 50,
    min: "",
    max: "",
    step: "",
    pattern: "",
    options: [],
    ...incomingProps,
  };

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  props = setClonedProps(props, query);

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  // Repeater context — lets block authors write `name="facet.{{item.facetKey}}"`
  // and `attrs: { value: "{{item.value}}" }` on facet dropdown checkboxes.
  const itemContext = useItemContext();
  useRuntimeVarsVersion();
  const interp = (v: string | undefined) =>
    v ? replaceVariables(v, query, itemContext) : v;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate a stable input ID for label association (WCAG 1.3.1)
  const inputId = `ph-input-${id}`;

  // For checkbox/radio, prefillFromUrl reads the CSV list at the matching URL
  // param and checks this input iff our `value` is one of the entries. Lets
  // facet dropdown checkboxes reflect `?facet.color=red,blue` on page load.
  const resolvedName =
    props.name && itemContext ? replaceVariables(props.name, query, itemContext) : props.name;
  const resolvedValue =
    props.attrs && typeof (props.attrs as any).value === "string" && itemContext
      ? replaceVariables((props.attrs as any).value, query, itemContext)
      : (props.attrs as any)?.value;
  const prefillChecked =
    !enabled &&
    props.prefillFromUrl &&
    (props.type === "checkbox" || props.type === "radio") &&
    resolvedName &&
    typeof resolvedValue === "string" &&
    typeof window !== "undefined" &&
    (new URLSearchParams(window.location.search).get(resolvedName) || "")
      .split(",")
      .map(s => s.trim())
      .includes(resolvedValue);

  // Build props based on input type - only include relevant attributes
  const prop: any = {
    ref: r => connect(drag(r)),
    id: inputId,
    className: props.className || "",
    type: props.type,
    defaultValue:
      (!enabled &&
      props.prefillFromUrl &&
      props.name &&
      typeof window !== "undefined" &&
      props.type !== "checkbox" &&
      props.type !== "radio"
        ? new URLSearchParams(window.location.search).get(props.name)
        : null) ?? props.defaultValue ?? "",
    "aria-label": props.label || props.placeholder || props.name || `${props.type || "text"} input`,
  };

  if (prefillChecked) prop.defaultChecked = true;

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
  const autoCompleteValue = props.autoComplete ?? props.autocomplete;
  if (autoCompleteValue) {
    prop.autoComplete = autoCompleteValue;
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

  // Pass through plain string attrs (data-*, etc.) so app hooks can wire DOM
  // contracts. Interpolate against itemContext so a repeater of facet options
  // can carry `value="{{item.value}}"` and `data-storefront-input="facet.{{item.facetKey}}"`.
  applyAttrs(prop, props.attrs, v => (typeof v === "string" ? replaceVariables(v, query, itemContext) : v));

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

  addCustomHandlers(prop, props.handlers, enabled);

  if (enabled) {
    // if (!text) prop["children"] = <BsInputCursorText />;
    prop["data-bounding-box"] = enabled;
    // prop["data-empty-state"] = !text;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  const tagName =
    prop.type === "textarea" ? "textarea" : prop.type === "select" ? "select" : "input";

  // In edit mode, render a fake div instead of a real input.
  // Real inputs steal clicks (focus, autocomplete, submit) from the editor.
  // A div with the same classes looks identical but is just a dumb box.
  if (enabled && isMounted) {
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

    const final = applyAnimation({ ...divProp, key: `${id}` }, props, null, enabled);
    return React.createElement(motionIt(props, "div", enabled), final);
  }

  // Create the form element via @pagehub/ui FormField.
  // FormField handles input/textarea/select based on type prop.
  // Don't pass `label` — the SDK wraps with its own label below to avoid double labels.
  const formFieldProps = {
    ...prop,
    key: `${id}-${tagName}`,
    type: props.type,
    options: props.options,
    rows: props.type === "textarea" ? props.rows : undefined,
    cols: props.type === "textarea" ? props.cols : undefined,
  };

  const formElement = React.createElement(
    motionIt(props, FormField, enabled),
    applyAnimation(formFieldProps, props, null, enabled)
  );

  // Wrap with label for accessibility (WCAG 1.3.1, 3.3.2)
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
};

FormElement.craft = {
  displayName: "Form Item",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
