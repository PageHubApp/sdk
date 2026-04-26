/**
 * PropertyRenderer — renders a single property control based on its PropertyDef.
 *
 * Dispatches on `def.input.type` to the appropriate existing input primitive
 * (ToolbarItem, UniversalInput, ColorInput, TailwindInput, or a custom component).
 */
import React from "react";
import { TailwindStyles } from "@/utils/tailwind";
import { ToolbarItem } from "../ToolbarItem";
import { TailwindInput } from "../inputs/advanced/TailwindInput";
import { ColorInput } from "../inputs/color/ColorInput";
import { UniversalInput } from "../inputs/universal-input";
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { usePropertyHasValue } from "./usePropertyHasValue";
import { SessionAddedAtom, sessionKey } from "./sessionAddedAtom";
import { resolveCustomInput } from "./customInputs";
import { ShorthandInput } from "../inputs/shorthand/ShorthandInput";
import type { PropertyDef, PropertyInputProps } from "./registry/propertyDefs";

interface Props {
  def: PropertyDef;
  index?: string;
}

/**
 * Visibility-gated wrapper. Pinned props always render. Non-pinned render only
 * when they have a value, were just session-added, or are in `toolbarOrder`.
 */
export function PropertyRow({ def, index }: Props) {
  const hasValue = usePropertyHasValue(def);
  const { id, toolbarOrder } = useNode((node: any) => ({
    toolbarOrder: Array.isArray(node.data?.props?.toolbarOrder)
      ? (node.data.props.toolbarOrder as string[])
      : [],
  }));
  const sessionAdded = useAtomValue(SessionAddedAtom);
  // Pinned props always render. Everything else hides until it has a value,
  // was just added in this session, or is in toolbarOrder.
  if (def.pinned) return <PropertyRenderer def={def} index={index} />;
  const wasJustAdded = sessionAdded.has(sessionKey(id, def.id));
  const isPersistedAdd = toolbarOrder.includes(def.id);
  if (!hasValue && !wasJustAdded && !isPersistedAdd) return null;
  return <PropertyRenderer def={def} index={index} />;
}

export function PropertyRenderer({ def, index: indexOverride = "" }: Props) {
  const propKey = def.propKey || def.id;
  const propType = def.propType || "class";
  const index = def.index || indexOverride;

  switch (def.input.type) {
    case "tailwind-select": {
      const { tailwindKey, showVarSelector, varSelectorPrefix, propTag } = def.input;
      const values = (TailwindStyles as unknown as Record<string, string[]>)[tailwindKey];
      if (!values) return null;

      // If propTag is set, use TailwindInput (which handles prefix stripping)
      if (propTag) {
        return (
          <TailwindInput propKey={propKey} label={def.label} prop={tailwindKey} type="select" />
        );
      }

      return (
        <ToolbarItem
          propKey={propKey}
          propType={propType}
          type="select"
          label={def.label}
          max={values.length - 1}
          min={0}
          valueLabels={values}
          showVarSelector={showVarSelector}
          varSelectorPrefix={varSelectorPrefix}
          index={index}
          inline={def.inline}
        />
      );
    }

    case "tailwind-radio": {
      const { tailwindKey, options, cols } = def.input;
      const resolvedOptions =
        options ||
        (TailwindStyles as unknown as Record<string, string[]>)[tailwindKey]?.map(v => ({
          label: v.replace(/^[^-]+-/, ""),
          value: v,
        })) ||
        [];

      return (
        <ToolbarItem
          propKey={propKey}
          propType={propType}
          type="radio"
          label={def.label}
          options={[{ label: "\u2014", value: "" }, ...resolvedOptions]}
          cols={cols}
          inline={def.inline !== false}
          index={index}
        />
      );
    }

    case "universal": {
      const { propTag, allowedTypes, showVarSelector, labelWidth, tailwindKey, tailwindOptions } =
        def.input;
      return (
        <UniversalInput
          propKey={propKey}
          propType={propType}
          propTag={propTag}
          label={def.label}
          allowedTypes={allowedTypes}
          showVarSelector={showVarSelector}
          labelWidth={labelWidth}
          tailwindKey={tailwindKey}
          tailwindOptions={tailwindOptions}
          index={index}
          inline={def.inline}
        />
      );
    }

    case "color": {
      const { prefix } = def.input;
      return (
        <ColorInput
          propKey={propKey}
          label={def.label}
          prefix={prefix}
          propType={propType}
          index={index}
          inline={def.inline !== false}
        />
      );
    }

    case "checkbox": {
      const { on, off } = def.input;
      return (
        <ToolbarItem
          propKey={propKey}
          propType={propType}
          type="checkbox"
          label={def.label}
          on={on}
          option={off || ""}
          labelHide
          index={index}
          inline={def.inline}
          inputWidth="w-fit"
        />
      );
    }

    case "text": {
      return (
        <ToolbarItem
          propKey={propKey}
          propType={propType}
          type="text"
          label={def.label}
          placeholder={def.input.placeholder}
          labelHide
          index={index}
          inline={def.inline}
        />
      );
    }

    case "select": {
      return (
        <ToolbarItem
          propKey={propKey}
          propType={propType}
          type="select"
          label={def.label}
          index={index}
          inline={def.inline}
        >
          {def.input.options.map(opt => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </ToolbarItem>
      );
    }

    case "custom": {
      const Component = resolveCustomInput(def.input.component);
      return <Component def={def} index={index} />;
    }

    case "shorthand": {
      const { type: _t, ...config } = def.input;
      return <ShorthandInput def={def} index={index} config={config} />;
    }

    default:
      return null;
  }
}
