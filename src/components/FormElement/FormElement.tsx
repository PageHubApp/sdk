import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import type { RenderCtx } from "../../render/RenderCtx";

import { renderFormElementBody, inputTypes, type FormElementProps } from "./FormElement.body";
export { renderFormElementBody, inputTypes, type FormElementProps };

export const OnlyFormElement = ({ children, ...props }: any) => {
  const {
    connectors: { connect },
  }: any = useNode();
  return (
    <div ref={connect} className="mt-5 w-full" {...props}>
      {children}
    </div>
  );
};

OnlyFormElement.craft = {
  rules: {
    canMoveIn: (nodes: any) => nodes.every((node: any) => node.data?.name === "FormElement"),
  },
};

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
    rows: 4, cols: 50, min: "", max: "", step: "", pattern: "",
    options: [],
    ...incomingProps,
  };
  const { query, enabled } = useEditor(state => getClonedState(props, state));
  props = setClonedProps(props, query);
  const {
    connectors: { connect, drag },
    id,
  } = useNode();
  const { rootProps, pageMedia, pageIndex } = React.useMemo(
    () => extractRootDataFromQuery(query),
    [query]
  );
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive: false, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name: "FormElement",
    connect, drag, setProp: () => {},
    rootProps, pageMedia, pageIndex, query,
  };
  return renderFormElementBody(props, ctx);
};

FormElement.craft = {
  name: "FormElement",
  displayName: "Form Item",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
