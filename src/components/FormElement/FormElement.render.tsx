import { useEffect, useState } from "react";
import { renderFormElementBody, type FormElementProps } from "./FormElement.body";
import { useTreeRoot, useWalkerNode } from "../../render/contexts";
import { makeWalkerCtx } from "../../render/RenderCtx";

export const FormElementRender = (incomingProps: Partial<FormElementProps>) => {
  const props: any = {
    root: {},
    className:
      "border-solid border-(length:--border) border-(--input-border-color) rounded-field bg-(--input-bg-color) text-(--input-text-color) placeholder:text-(--input-placeholder-color) focus:ring-(length:--input-focus-ring) focus:ring-(--input-focus-ring-color) focus:outline-none",
    type: "",
    placeholder: "",
    name: "",
    required: false,
    disabled: false,
    readOnly: false,
    rows: 4, cols: 50, min: "", max: "", step: "", pattern: "",
    options: [],
    ...incomingProps,
  };
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: false,
    hasChildNodes: false,
    displayName: walker?.displayName ?? "FormElement",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  ctx.isMounted = isMounted;
  return renderFormElementBody(props, ctx);
};
