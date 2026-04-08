import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbMusic } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";

import { Box } from "@pagehub/ui";
import { motionIt } from "../utils/lib";
import { applyAnimation } from "../utils/tailwind/tailwind";

import { BaseSelectorProps, applyAriaProps } from "./selectors";


export interface AudioProps extends BaseSelectorProps {
  audioUrl?: string;
  title?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
}

export const Audio = (incomingProps: AudioProps) => {
  let props: AudioProps = { controls: true, autoplay: false, loop: false, canDelete: true, canEditName: true, ...incomingProps };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { name } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
  }));

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  const { audioUrl } = props;

  props = setClonedProps(props, query);

  const ref = useRef();
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
        autoPlay={props.autoplay && !enabled}
        loop={props.loop}
        preload="metadata"
        style={{ width: "100%" }}
      >
        Your browser does not support the audio element.
      </audio>
    ) : enabled ? (
      <div className="flex size-full min-h-[50px] items-center justify-center rounded-lg border border-dashed border-base-300 text-3xl">
        <TbMusic aria-label="Audio icon" />
      </div>
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

  return React.createElement(motionIt(props, Box, enabled), applyAnimation({ ...prop, key: id }, props, null, enabled));
};

Audio.craft = {
  displayName: "Audio",
};
