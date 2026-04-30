import { useEditor, useNode } from "@craftjs/core";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import React from "react";
import { useAtomValue } from "@zedux/react";
import { ViewAtom } from "../viewport/atoms";
import { changeProp, getPropFinalValue } from "../viewport/viewportExports";
import { getEditorVariableOptions } from "../../utils/editorVariableOptions";

const CodeEditor = React.lazy(() =>
  import("./inputs/typography/CodeEditor").then(m => ({ default: m.CodeEditor }))
);
import { DesignVarSelector } from "./inputs/advanced/DesignVarSelector";
import { getEffectiveViews, EditModifiersAtom } from "./Label";
import { MultiScopeAtom } from "./breakpoint-chip/atoms";
import { ToolbarDropdown } from "./ToolbarDropdown";
import { ToolbarSegmentedControl } from "./helpers/ToolbarSegmentedControl";
import { Chip } from "@/chrome/primitives/Chip";
import { toolbarInputNoAutocompleteProps } from "./toolbarInputAttrs";

const Input = React.forwardRef<unknown, any>(function ToolbarItemInput(__props, _ref) {
  const {
    props,
    propKey,
    type,
    value = "",
    changed,
    index,
    propTag = "",
    propType = "class",
    wrap = null,
    append,
    codeType = "html",
    autoFormatMountKey,
    htmlVariableCompletionOptions,
  } = __props;

  if (["toggle", "checkbox"].includes(type)) {
    const hasOption = !!props.option;
    return (
      <label
        className={`relative flex h-8 w-full cursor-pointer items-center transition-transform active:scale-[0.98] ${
          hasOption ? "flex-row justify-between gap-3" : "justify-end"
        }`}
      >
        {props.option && (
          <span
            className={`text-base-content min-w-0 text-xs font-medium ${hasOption ? "flex-1 text-left" : "mb-2 text-center"}`}
          >
            {props.option || "Enable"}
          </span>
        )}

        <div className="relative inline-flex w-fit shrink-0">
          <input
            type="checkbox"
            id={propKey ? `input-${propKey}` : undefined}
            defaultChecked={!!value}
            onChange={() => changed(value ? "" : props.on)}
            className="peer sr-only"
          />
          <div className="bg-neutral text-neutral-content after:border-base-300 after:bg-base-100 peer-checked:bg-primary peer-checked:after:border-background peer-focus:ring-ring h-4 w-8 rounded-full peer-focus:ring-2 after:absolute after:top-[2px] after:left-[2px] after:size-3 after:rounded-full after:border after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
        </div>
      </label>
    );
  }

  if (type === "number") {
    return (
      <Chip passthrough={!!wrap}>
        <div className="flex w-full items-center gap-2">
          <input
            type="number"
            id={propKey ? `input-${propKey}` : undefined}
            defaultValue={value}
            onChange={event => changed(event.target.value)}
            className="input-plain flex-1"
            aria-label={props.label || propKey || "Number input"}
            {...toolbarInputNoAutocompleteProps}
          />
          {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        </div>
      </Chip>
    );
  }

  if (["custom"].includes(type)) {
    const str = value;
    const regex = /\[([^\]]?)\]/;
    const match = regex.exec(str);

    return (
      <Chip passthrough={!!wrap}>
        <div className="flex w-full items-center gap-2">
          <input
            type="number"
            min="0"
            id={propKey ? `input-${propKey}` : undefined}
            placeholder={props.placeholder}
            defaultValue={match?.length ? match[0] : null}
            onChange={event => changed(`${propTag}-[${event.target.value}px]`)}
            className="input-plain flex-1"
            aria-label={props.label || props.placeholder || propKey || "Custom value"}
            {...toolbarInputNoAutocompleteProps}
          />
          {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        </div>
      </Chip>
    );
  }

  if (["url", "text", "email", "number"].includes(type)) {
    return (
      <Chip passthrough={!!wrap}>
        <div className="flex w-full items-center gap-2">
          <input
            type={type}
            id={propKey ? `input-${propKey}` : undefined}
            placeholder={props.placeholder}
            defaultValue={value}
            onChange={event => changed(event.target.value)}
            className="input-plain flex-1"
            aria-label={props.label || props.placeholder || propKey || `${type} input`}
            {...toolbarInputNoAutocompleteProps}
          />
          {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        </div>
      </Chip>
    );
  }

  if (type === "textarea") {
    return (
      <Chip passthrough={!!wrap} grow>
        <div className="flex w-full items-start gap-2">
          <textarea
            id={propKey ? `input-${propKey}` : undefined}
            defaultValue={value}
            onChange={event => changed(event.target.value)}
            rows={props.rows || 4}
            placeholder={props.placeholder}
            className="input-plain flex-1"
            aria-label={props.label || props.placeholder || propKey || "Text area"}
            {...toolbarInputNoAutocompleteProps}
          />
          {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        </div>
      </Chip>
    );
  }

  if (type === "slider") {
    // Find the current index in valueLabels, or use value as index, default to 0
    let currentValue = 0;
    if (props?.valueLabels) {
      const index = props.valueLabels.indexOf(value);
      currentValue = index >= 0 ? index : Number.isFinite(Number(value)) ? Number(value) : 0;
    } else {
      currentValue = Number(value) || 0;
    }

    return (
      <div className="flex h-8 w-full items-center gap-1.5">
        <input
          type="range"
          className="slider bg-neutral text-neutral-content h-2 flex-1 cursor-pointer appearance-none rounded-lg"
          min={props.min || 0}
          max={props.max || 100}
          step={props.step || 1}
          defaultValue={currentValue}
          onChange={event => {
            changed(
              props?.valueLabels ? props?.valueLabels[event.target.value] : event.target.value
            );
          }}
          aria-label={props.label || propKey || "Slider"}
          aria-valuemin={props.min || 0}
          aria-valuemax={props.max || 100}
          aria-valuenow={currentValue}
          aria-valuetext={value?.toString() || currentValue.toString()}
        />

        {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
      </div>
    );
  }

  if (type === "select") {
    const coalesce = props.valueCoalesce;
    const displayValue =
      coalesce !== undefined && (value == null || value === "") ? coalesce : value;
    const { valueCoalesce: _valueCoalesce, ...dropdownProps } = props;
    return (
      <ToolbarDropdown
        wrap={wrap}
        value={displayValue ?? ""}
        onChange={value => changed(value)}
        append={append}
        propKey={propKey}
        {...dropdownProps}
      />
    );
  }

  if (type === "radio") {
    const radioOptions = (props?.options || []).map((_: any) => {
      const tip =
        typeof _.hint === "string"
          ? _.hint
          : typeof _.label === "string"
            ? _.label
            : String(_.value ?? "");
      const optValue = String(_.value ?? "");
      // The leading clear chip ("—", value="") is content-narrow — let it
      // sit at natural width so flex-1 siblings can divide the remaining
      // track evenly. Otherwise an em-dash claims a 1/N share alongside
      // multi-character labels and visually drifts apart.
      const widthClass = optValue === "" ? "flex-none px-2" : undefined;
      return {
        value: optValue,
        label: _.label,
        tooltip: tip || "None",
        ariaLabel: tip || optValue,
        widthClass,
      };
    });
    // No `Chip` frame here — the segmented control owns its own bordered
    // surface. The label gutter is supplied by the surrounding `Wrap`.
    return (
      <ToolbarSegmentedControl
        dense
        value={value ?? ""}
        onChange={v => changed(v)}
        tooltipId={PAGEHUB_RTT_GLOBAL_ID}
        options={radioOptions}
      />
    );
  }

  if (type === "toggleNext") {
    const checked = value;
    const opt = props?.options;
    const options = [];

    options.push(!value ? opt[0] : opt.find(_ => _.value === value) || opt[0]);

    return (
      <Chip passthrough={!!wrap}>
        <div
          className={`flex items-center justify-center gap-3 ${
            !props.cols ? "flex-col" : "flex-row"
          }`}
        >
          {options?.map((_, key) => (
            <div key={key} className="flex items-center">
              <input
                id={`radio-${propKey}-${key}`}
                type="radio"
                name={propKey}
                defaultChecked={checked}
                onClick={() => {
                  // find next value..
                  const me = opt.find(_ => _.value === value);
                  const index = opt.indexOf(me);
                  const next = index < opt.length - 1 ? opt[index + 1] : opt[0];

                  changed(next.value);
                }}
                className="hidden"
                aria-label={_.value}
              />
              <label
                htmlFor={`radio-${propKey}-${key}`}
                className={`block cursor-pointer text-sm font-medium transition-[color,transform] active:scale-[0.98] ${
                  checked ? "text-base-content" : "text-neutral-content"
                }`}
              >
                {_.label}
              </label>
            </div>
          ))}
        </div>
      </Chip>
    );
  }

  if (type === "codemirror") {
    return (
      <div className="flex w-full flex-col gap-2">
        <CodeEditor
          value={value}
          onChange={val => changed(val)}
          language={codeType || "html"}
          height="auto"
          minHeight="120px"
          maxHeight="300px"
          lineNumbers={false}
          theme="auto"
          autoFormatOnMount
          autoFormatMountKey={autoFormatMountKey}
          toolbarDenseCode
          htmlVariableCompletionOptions={htmlVariableCompletionOptions}
          placeholder={props.placeholder || `Enter ${codeType} code...`}
        />
      </div>
    );
  }

  // Default text input
  return (
    <Chip passthrough={!!wrap}>
      <div className="flex w-full items-center gap-2">
        <input
          id={propKey ? `input-${propKey}` : undefined}
          type="text"
          defaultValue={value}
          onChange={event => changed(event.target.value)}
          placeholder={props.placeholder}
          className="input-plain flex-1"
          {...toolbarInputNoAutocompleteProps}
        />
      </div>
    </Chip>
  );
});

Input.displayName = "ToolbarItemInput";

export type ToolbarItemProps = {
  label?: string;
  labelPrefix?: string;
  labelSuffix?: string;
  labelHide?: boolean;
  labelIcon?: React.ReactNode;
  showDeleteIcon?: boolean;
  showVarSelector?: boolean;
  varSelectorPrefix?: string;
  full?: boolean;
  propKey?: string;
  propItem?: any;
  propTag?: string;
  propItemKey?: string;
  index?: any;
  children?: React.ReactNode;
  type?: string;
  codeType?: "html" | "css" | "javascript" | "js";
  valueLabels?: any;
  max?: number;
  min?: number;
  step?: number;
  onChange?: (value: any) => any;
  class?: string;
  on?: any;
  option?: string;
  rows?: number;
  placeholder?: string;
  options?: any;
  cols?: boolean;
  propType?: string;
  wrap?: string;
  inline?: boolean;
  inputWidth?: string;
  labelWidth?: string;
  append?: React.ReactNode;
  description?: React.ReactNode;
  /** When the stored prop is null/empty, use this for the select UI (matches runtime defaults). */
  valueCoalesce?: string | number;
  defaultValue?: string | number;
  suffix?: string;
};

export const ToolbarItem = (__props: ToolbarItemProps) => {
  const {
    full = 1,
    propKey,
    propItem,
    propType = "class",
    propItemKey,
    type,
    codeType = "html",
    onChange = null,
    index = null,
    propTag = "",
    wrap = "",
    inline = true,
    inputWidth = "",
    labelWidth = "",
    showVarSelector = false,
    varSelectorPrefix = "",
    append,
    ...props
  } = __props;

  const view = useAtomValue(ViewAtom);
  const modifiers = useAtomValue(EditModifiersAtom);
  const multiScope = useAtomValue(MultiScopeAtom);

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data?.props || {},
    id: node.id,
  }));

  const { query, actions } = useEditor();

  const htmlVariableCompletionOptionsForCodemirror = React.useMemo(() => {
    if ((codeType || "html") !== "html") return undefined;
    return getEditorVariableOptions(query);
  }, [codeType, query]);

  const classDark = modifiers.dark ?? false;

  const { value, viewValue } = getPropFinalValue(__props, view, nodeProps, classDark);

  const changed = value => {
    // For class properties, apply to all selected views
    if (propType === "class") {
      const effectiveViews = getEffectiveViews(modifiers, view, multiScope);
      effectiveViews.forEach(targetView => {
        changeProp({
          propKey,
          value,
          setProp,
          view: targetView,
          index,
          onChange,
          propType,
          propItemKey,
          query,
          actions,
          nodeId: id,
          classDark,
        });
      });
    } else {
      // For non-class properties, use single view
      changeProp({
        propKey,
        value,
        setProp,
        view,
        index,
        onChange,
        propType,
        propItemKey,
        query,
        actions,
        nodeId: id,
      });
    }
  };

  // Get the label: if value is an index, use valueLabels[index],
  // if value is a string in valueLabels array, use it directly,
  // otherwise fallback to the value itself
  let label = value;
  if (props.valueLabels) {
    const valueIndex = props.valueLabels.indexOf(value);
    if (valueIndex >= 0) {
      // Value is already in the array, use it
      label = value;
    } else if (Number.isFinite(Number(value)) && props.valueLabels[Number(value)]) {
      // Value is an index number
      label = props.valueLabels[Number(value)];
    }
  }

  return (
    <Chip
      label={props?.labelHide ? undefined : props?.label}
      propKey={propKey}
      propType={propType}
      index={index}
      propItemKey={propItemKey}
      labelWidth={labelWidth}
      passthrough={!!wrap}
      frame="bare"
    >
      <Input
        props={props}
        propKey={propKey}
        propTag={propTag}
        propType={propType}
        type={type}
        codeType={codeType}
        value={value}
        changed={changed}
        index={index}
        wrap={wrap}
        autoFormatMountKey={id}
        htmlVariableCompletionOptions={htmlVariableCompletionOptionsForCodemirror}
        append={
          <>
            {showVarSelector && (
              <DesignVarSelector
                propKey={propKey}
                propType={propType}
                viewValue={viewValue}
                prefix={varSelectorPrefix}
              />
            )}

            {append}
          </>
        }
      />
    </Chip>
  );
};
