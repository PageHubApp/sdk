/**
 * Prop read/write system — className-first architecture.
 * changeProp is the single entry point for all toolbar prop changes.
 */

import { twMerge } from "tailwind-merge";
import { filterClassName, filterInlineStyle } from "../../../core/cssAllowlist";
import {
  buildVariantPrefix,
  getClassForView,
  removeClassForView,
} from "../../../utils/tailwind/className";

// ─── Types ───

export interface PropType {
  value: any;
  onChange?: any;
  propKey: string;
  setProp: any;
  view?: string;
  index?: any;
  propType?: string;
  propItemKey?: string;
  query?: any;
  actions?: any;
  nodeId?: string;
  classDark?: boolean;
}

// ─── Read helpers ───

const getPropValue = (
  { propKey, propItemKey, index }: { propKey: string; propItemKey?: string; index?: any },
  _props: any = {}
) => {
  const value = _props ? { ..._props } : {};

  if (!propItemKey && !index && index !== 0) {
    if (propKey.includes(".")) {
      const keys = propKey.split(".");
      let current = value;
      for (const key of keys) {
        if (current === undefined || current === null) return null;
        current = current[key];
      }
      return current || null;
    }
    return value[propKey] || null;
  }

  if (propItemKey && (index || index >= 0)) {
    value[propKey] = value[propKey] ? { ...value[propKey] } : {};
    value[propKey][index] = value[propKey][index] ? { ...value[propKey][index] } : {};
    return value[propKey][index][propItemKey] || null;
  }

  value[index] = value[index] ? { ...value[index] } : {};
  return value[index][propKey] || null;
};

export const getProp = (params: any, view: string, nodeProps: any, classDark = false) => {
  if (params.propType === "root") return getPropValue(params, nodeProps.root);
  if (params.propType === "component") return getPropValue(params, nodeProps);

  const classView =
    params.index === "hover" && params.propType !== "root" && params.propType !== "component"
      ? "hover"
      : view;
  return (
    getClassForView(nodeProps.className || "", params.propKey, classView, { classDark }) || null
  );
};

/**
 * Full-width canvas uses ViewAtom `desktop` while class writes may target any breakpoint
 * (`getEffectiveViews` / scope toggles → `sm:` … `2xl:`). Reads must scan every layer or
 * toolbar controls show empty even though the class is on the node.
 */
const DESKTOP_CANVAS_CLASS_READ_ORDER = ["mobile", "md", "sm", "lg", "xl", "2xl"] as const;

export const getPropFinalValue = (
  __props: any,
  view: string,
  nodeProps: any,
  classDark = false
) => {
  if (__props.propType === "class" && view === "desktop") {
    const sequence: [string, boolean][] = [];
    for (const v of DESKTOP_CANVAS_CLASS_READ_ORDER) {
      if (classDark) {
        sequence.push([v, true], [v, false]);
      } else {
        sequence.push([v, false]);
      }
    }
    for (const [v, d] of sequence) {
      const val = getProp(__props, v as string, nodeProps, d as boolean);
      if (val != null && val !== "") return { value: val, viewValue: v };
    }
    return { value: null, viewValue: "mobile" };
  }

  let value = getProp(__props, view, nodeProps, classDark);
  let viewValue = view;

  if (classDark && (value == null || value === "")) {
    value = getProp(__props, view, nodeProps, false);
  }

  if (!value) {
    if (view === "desktop" || view === "mobile") {
      const theView = view === "desktop" ? "mobile" : "desktop";
      value = getProp(__props, theView, nodeProps, classDark);
      if (classDark && (value == null || value === ""))
        value = getProp(__props, theView, nodeProps, false);
      viewValue = theView;
    } else if (["sm", "md", "lg", "xl", "2xl"].includes(view)) {
      value = getProp(__props, "mobile", nodeProps, classDark);
      if (classDark && (value == null || value === ""))
        value = getProp(__props, "mobile", nodeProps, false);
      viewValue = "mobile";
    }
  }
  return { value, viewValue };
};

// ─── Write helpers ───

const setNestedProp = (obj: any, path: string, value: any) => {
  const keys = path.split(".");
  const lastKey = keys.pop()!;
  let current = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== "object") current[key] = {};
    current = current[key];
  }
  current[lastKey] = value;
};

export const setPropOnView = (
  {
    propKey,
    value,
    setProp,
    view,
    index = null,
    propItemKey = null,
    onChange = null,
    classDark = false,
  }: PropType,
  delay = 2000
) => {
  try {
    if (!setProp) return;

    setProp((props: any) => {
      if (view !== "component" && view !== "root") {
        const prefix = buildVariantPrefix(view!, classDark);
        if (!value || value === "") {
          props.className = removeClassForView(props.className || "", propKey, view!, {
            classDark,
          });
        } else {
          props.className = twMerge(props.className || "", prefix ? `${prefix}${value}` : value);
        }
        return;
      }

      const setting =
        view === "component" ? (props = props || {}) : (props[view!] = props[view!] || {});

      if (index >= 0 && propItemKey) {
        setting[propKey] = setting[propKey] || {};
        setting[propKey][index] = setting[propKey][index] || {};
        setting[propKey][index][propItemKey] = value;
        return;
      }

      if (index || index > 0) {
        setting[index] = setting[index] || {};
        setting[index][propKey] = value;
        return;
      }

      if (propKey.includes(".")) setNestedProp(setting, propKey, value);
      else setting[propKey] = value;
    }, 0);

    if (onChange) onChange(value);
  } catch (e: any) {
    if (!e.message?.includes("data")) console.error(e);
  }
};

// ─── Main entry point ───

export const changeProp = (props: PropType, delay = 2000) => {
  const view =
    props.propType === "root"
      ? "root"
      : props.propType === "component"
        ? "component"
        : props.index === "hover"
          ? "hover"
          : props.view;

  const classDark = props.classDark ?? false;

  // Apply host-configured CSS allowlist at the single write chokepoint.
  // Strings only — chip-driven inputs that pass arrays/objects are uneffected.
  // Programmatic writes that bypass changeProp (CraftJS setProp direct, node
  // creation from blocks/templates) are intentionally not filtered.
  let filtered: any = props.value;
  if (typeof filtered === "string") {
    if (props.propKey === "className") filtered = filterClassName(filtered);
    else if (props.propKey === "style") filtered = filterInlineStyle(filtered);
  }

  setPropOnView({ ...props, value: filtered, view, classDark }, delay);
};
