import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbMusic } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";

import { Box } from "@pagehub/ui";
import { motionIt } from "../utils/lib";
import { applyAnimation } from "../utils/tailwind/tailwind";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

export interface AudioProps extends BaseSelectorProps {
  src?: string;
  /** @deprecated Use `src` instead. */
  audioUrl?: string;
  title?: string;
  controls?: boolean;
  autoPlay?: boolean;
  /** @deprecated Use `autoPlay` instead. */
  autoplay?: boolean;
  loop?: boolean;
}

export const Audio = (incomingProps: AudioProps) => {
  let props: AudioProps = {
    controls: true,
    autoPlay: false,
    loop: false,
    canDelete: true,
    canEditName: true,
    ...incomingProps,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { name } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
  }));

  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));

  const audioUrl = props.src ?? props.audioUrl;
  const autoPlay = props.autoPlay ?? props.autoplay;

  props = setClonedProps(props, query);

  const ref = useRef<HTMLElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const prop: any = {
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    className: "",
    role: "region",
    "aria-label": props.title || audioUrl ? `Audio: ${props.title || audioUrl}` : "Audio player",
    children: audioUrl ? (
      <audio
        className={props.className || ""}
        src={audioUrl}
        controls={props.controls}
        autoPlay={autoPlay && !enabled}
        loop={props.loop}
        preload="metadata"
        style={{ width: "100%" }}
      >
        Your browser does not support the audio element.
      </audio>
    ) : enabled ? (
      <EditorEmptyLeafHint
        selected={isActive}
        icon={<TbMusic aria-hidden />}
        idleLabel="Empty audio"
        selectedLabel="Drop here or right-click"
      />
    ) : null,
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    prop["data-empty-state"] = !audioUrl;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
    prop.onClick = e => e.preventDefault();
  }

  return React.createElement(
    motionIt(props, Box, enabled),
    applyAnimation({ ...prop, key: id }, props, null, enabled)
  );
};

Audio.craft = {
  displayName: "Audio",
};
