import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Divider as UiDivider } from "@pagehub/ui";
import { motionIt } from "../utils/lib";
import { applyAnimation } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./lib";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

export interface DividerProps extends BaseSelectorProps {
  url?: string;
  showName?: string;
}

export const Divider = (incomingProps: DividerProps) => {
  let props: any = { ...incomingProps };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  useScrollToSelected(id, enabled);


  const ref = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  props = setClonedProps(props, query);

  // If in edit mode and mounted, wrap hr in a minimal container
  if (enabled && isMounted) {
    const containerProp: any = {
      ref: r => {
        ref.current = r;
        connect(drag(r));
      },
      // Copy width and alignment classes to wrapper so it has same dimensions as hr
      className: props.className || "",
      "data-bounding-box": enabled,
      "data-empty-state": false,
      "node-id": id,
    };

    // Hr inside gets minimal styling
    const hrProp: any = {
      className: "", // No classes needed, wrapper handles it
    };

    const hr = React.createElement(
      motionIt(props, UiDivider, enabled),
      applyAnimation({ ...hrProp, key: `hr-${id}` }, props, null, enabled)
    );

    return (
      <div {...containerProp}>
        {hr}
      </div>
    );
  }

  const hrProp: any = {
    className: props.className || "",
  };

  const hr = React.createElement(
    motionIt(props, UiDivider, enabled),
    applyAnimation({ ...hrProp, key: `hr-${id}` }, props, null, enabled)
  );

  // In preview mode, just connect to the hr directly
  const prop: any = {
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    className: props.className || "",
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    prop["data-empty-state"] = false;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  return React.createElement(motionIt(props, UiDivider, enabled), applyAnimation({ ...prop, key: id }, props, null, enabled));
};

Divider.craft = {
  displayName: "Divider",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
