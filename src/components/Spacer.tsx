import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Spacer as UiSpacer } from "@pagehub/ui";
import { motionIt } from "../utils/lib";
import { applyAnimation } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./lib";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

export interface SpacerProps extends BaseSelectorProps {
  height?: string;
  width?: string;
  showName?: string;
}

export const Spacer = (incomingProps: SpacerProps) => {
  let props: any = { root: {}, className: "bg-transparent", ...incomingProps };

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

  // If in edit mode and mounted, wrap div in a container with inline tools
  if (enabled && isMounted) {
    const containerProp: any = {
      ref: r => {
        ref.current = r;
        connect(drag(r));
      },
      className: props.className || "",
      style: {
        minHeight: "20px", // Minimum height so it's always visible
        border: "1px dashed #ccc", // Dashed border to show it's a spacer
        borderRadius: "4px",
      },
      "data-bounding-box": enabled,
      "data-empty-state": false,
      "node-id": id,
    };

    const spacerDiv = React.createElement(
      motionIt(props, UiSpacer, enabled),
      applyAnimation(
        {
          key: `spacer-${id}`,
          style: { minHeight: "20px" },
        },
        props,
        null,
        enabled
      )
    );

    return (
      <div {...containerProp}>
        {spacerDiv}
      </div>
    );
  }

  // In preview mode, just render the spacer div
  const spacerProp: any = {
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    className: props.className || "",
    style: {
      minHeight: "20px",
    },
  };

  applyAriaProps(spacerProp, props);

  if (enabled) {
    spacerProp["data-bounding-box"] = enabled;
    spacerProp["data-empty-state"] = false;
    spacerProp["node-id"] = id;
  }

  return React.createElement(
    motionIt(props, UiSpacer, enabled),
    applyAnimation({ ...spacerProp, key: id }, props, null, enabled)
  );
};

Spacer.craft = {
  displayName: "Spacer",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};

