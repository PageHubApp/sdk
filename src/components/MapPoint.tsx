// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { getClonedState } from "../utils/cloneHelper";
import React, { useEffect, useState } from "react";
import { TbMapPin } from "react-icons/tb";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

export interface MapPointProps extends BaseSelectorProps {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
}

const defaultProps: MapPointProps = {
  lat: 0,
  lng: 0,
  title: "",
  description: "",
};

export const MapPoint = (props: MapPointProps) => {
  props = {
    ...defaultProps,
    ...props,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { enabled } = useEditor(state => getClonedState(props, state));

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // MapPoint is a data-only node — renders nothing in live mode
  if (!enabled) return null;

  const prop: any = {
    ref: r => {
      connect(drag(r));
    },
    className:
      "flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
    "data-bounding-box": true,
    "data-empty-state": !props.lat && !props.lng,
  };

  applyAriaProps(prop, props);

  if (isMounted) {
    prop["node-id"] = id;
  }

  const label = props.title || `${props.lat.toFixed(4)}, ${props.lng.toFixed(4)}`;

  prop.children = (
    <>
      <TbMapPin className="shrink-0" />
      <span className="truncate">{label}</span>
    </>
  );

  return React.createElement("div", { ...prop, key: id });
};

MapPoint.craft = {
  displayName: "MapPoint",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
