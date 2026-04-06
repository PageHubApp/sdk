import { useEditor, useNode } from "@craftjs/core";
import { REACT_TOOLTIP_SURFACE_CLASS } from "components/layout/tooltipSurface";
import React from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { useAtomValue } from "@zedux/react";
import { ViewAtom } from "../Viewport/atoms";
import { changeProp, getPropFinalValue } from "../Viewport/lib";

const CodeEditor = React.lazy(() => import("./Inputs/typography/CodeEditor").then(m => ({ default: m.CodeEditor })));
import { DesignVarSelector } from "./Inputs/advanced/DesignVarSelector";
import { getEffectiveViews, ViewSelectionAtom } from "./Label";
import { ToolbarDropdown } from "./ToolbarDropdown";
import { BgWrap, Wrap } from "./ToolbarStyle";

const Input = (__props, ref) => {
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
  } = __props;

  if (["toggle", "checkbox"].includes(type)) {
    return (
      <label className="relative flex cursor-pointer flex-col items-center transition-transform active:scale-[0.98]">
        {props.option && (
          <div className="mb-2 text-center text-xs font-medium text-foreground">
            {props.option || "Enable"}
          </div>
        )}

        <div className="relative inline-flex w-fit">
          <input
            type="checkbox"
            id={propKey ? `input-${propKey}` : undefined}
            defaultChecked={!!value}
            onChange={() => changed(value ? "" : props.on)}
            className="peer sr-only"
          />
          <div className="h-4 w-8 rounded-full bg-muted text-muted-foreground after:absolute after:left-[2px] after:top-[2px] after:size-3 after:rounded-full after:border after:border-border after:bg-background after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-background peer-focus:ring-2 peer-focus:ring-ring"></div>
        </div>
      </label>
    );
  }

  if (type === "number") {
    return (
      <BgWrap wrap={wrap}>
        <div className="flex w-full items-center gap-2">
          <input
            type="number"
            id={propKey ? `input-${propKey}` : undefined}
            defaultValue={value}
            onChange={event => changed(event.target.value)}
            className="input-plain flex-1"
            aria-label={props.label || propKey || "Number input"}
          />
          {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        </div>
      </BgWrap>
    );
  }

  if (["custom"].includes(type)) {
    const str = value;
    const regex = /\[([^\]]?)\]/;
    const match = regex.exec(str);

    return (
      <BgWrap wrap={wrap}>
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
          />
          {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        </div>
      </BgWrap>
    );
  }

  if (["url", "text", "email", "number"].includes(type)) {
    return (
      <BgWrap wrap={wrap}>
        <div className="flex w-full items-center gap-2">
          <input
            type={type}
            id={propKey ? `input-${propKey}` : undefined}
            placeholder={props.placeholder}
            defaultValue={value}
            onChange={event => changed(event.target.value)}
            className="input-plain flex-1"
            aria-label={props.label || props.placeholder || propKey || `${type} input`}
          />
          {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        </div>
      </BgWrap>
    );
  }

  if (type === "textarea") {
    return (
      <BgWrap wrap={wrap}>
        <div className="flex w-full items-start gap-2">
          <textarea
            id={propKey ? `input-${propKey}` : undefined}
            defaultValue={value}
            onChange={event => changed(event.target.value)}
            rows={props.rows || 4}
            placeholder={props.placeholder}
            className="input-plain flex-1"
            aria-label={props.label || props.placeholder || propKey || "Text area"}
          />
          {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        </div>
      </BgWrap>
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
      <div className="flex h-5 w-full items-center gap-2">
        <input
          type="range"
          className="slider h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-muted text-muted-foreground"
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
    return (
      <ToolbarDropdown
        wrap={wrap}
        value={value || ""}
        onChange={value => changed(value)}
        append={append}
        propKey={propKey}
        {...props}
      />
    );
  }

  if (type === "radio") {
    return (
      <BgWrap wrap={wrap}>
        <div
          className={`flex w-full items-center justify-center p-0.5 ${
            !props.cols ? "flex-col" : "flex-row flex-wrap"
          }`}
        >
          {props?.options?.map((_, key) => {
            const checked = value === _.value;
            return (
              <div key={key} className="flex items-center">
                <input
                  id={`radio-${propKey}-${key}`}
                  type="radio"
                  name={propKey}
                  defaultChecked={checked}
                  onClick={() => changed(_.value)}
                  className="hidden"
                  aria-label={_.value || _.label}
                />
                <label
                  htmlFor={`radio-${propKey}-${key}`}
                  className={`block cursor-pointer rounded px-1 py-0.5 text-[11px] font-medium transition-colors hover:bg-muted hover:text-foreground ${
                    checked
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground"
                  }`}

                  data-tooltip-id={`radio-${propKey}-${key}-tip`}
                  data-tooltip-content={_.value || "None"}
                  data-tooltip-place="bottom"
                >
                  {_.label}
                </label>
                <ReactTooltip
                  id={`radio-${propKey}-${key}-tip`}
                  variant="light"
                  classNameArrow="hidden"
                  className={REACT_TOOLTIP_SURFACE_CLASS}
                />
              </div>
            );
          })}
        </div>
      </BgWrap>
    );
  }

  if (type === "toggleNext") {
    const checked = value;
    const opt = props?.options;
    const options = [];

    options.push(!value ? opt[0] : opt.find(_ => _.value === value) || opt[0]);

    return (
      <BgWrap wrap={wrap}>
        <div
          className={`flex items-center justify-center gap-3 p-1 ${
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
                className={`block cursor-pointer rounded-lg px-2 py-1 text-sm font-medium transition-[color,transform] active:scale-[0.98] ${
                  checked
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {_.label}
              </label>
            </div>
          ))}
        </div>
      </BgWrap>
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
          placeholder={props.placeholder || `Enter ${codeType} code...`}
        />
      </div>
    );
  }

  // Default text input
  return (
    <BgWrap wrap={wrap}>
      <div className="flex w-full items-center gap-2">
        <input
          id={propKey ? `input-${propKey}` : undefined}
          type="text"
          defaultValue={value}
          onChange={event => changed(event.target.value)}
          placeholder={props.placeholder}
          className="input-plain flex-1"
        />
      </div>
    </BgWrap>
  );
};

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
  description?: string;
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
  const viewSelection = useAtomValue(ViewSelectionAtom);

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data.props || {},
    id: node.id,
  }));

  const { query, actions } = useEditor();

  const classDark = viewSelection.dark ?? false;

  const { value, viewValue } = getPropFinalValue(__props, view, nodeProps, classDark);

  const changed = value => {
    // For class properties, apply to all selected views
    if (propType === "class") {
      const effectiveViews = getEffectiveViews(viewSelection, view);
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
    <Wrap
      props={props}
      lab={label}
      viewValue={viewValue}
      propType={propType}
      propKey={propKey}
      index={index}
      propItemKey={propItemKey}
      wrap={wrap}
      inline={inline}
      inputWidth={inputWidth}
      labelWidth={labelWidth}
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
    </Wrap>
  );
};
