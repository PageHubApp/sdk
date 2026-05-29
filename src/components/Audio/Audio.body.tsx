/**
 * Pure render body for Audio. NO `@craftjs/core` imports — both the Craft
 * assembler (`Audio.tsx`) and the walker entry (`Audio.render.tsx`) call
 * this with their own `RenderCtx`. Editor-only branches gate on `ctx.enabled`.
 */
import React from "react";
import { TbMusic } from "../_emptyHintIcons";
import { EditorEmptyLeafHint } from "../../chrome/primitives/EditorEmptyLeafHint";
import { Box } from "@pagehub/ui";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import type { RenderCtx } from "../../render/RenderCtx";
import { BaseSelectorProps, applyAriaProps } from "../selectors";

export interface AudioProps extends BaseSelectorProps {
  src?: string;
  title?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
}

export function renderAudioBody(props: AudioProps, ctx: RenderCtx) {
  const audioUrl = props.src;
  const autoPlay = props.autoPlay;

  const prop: any = {
    ref: (r: any) => {
      ctx.connect(ctx.drag(r));
    },
    className: "",
    role: "region",
    "aria-label": props.title || audioUrl ? `Audio: ${props.title || audioUrl}` : "Audio player",
    children: audioUrl ? (
      <audio
        className={props.className || ""}
        src={audioUrl}
        controls={props.controls}
        autoPlay={autoPlay && !ctx.enabled}
        loop={props.loop}
        preload="metadata"
        style={{ width: "100%" }}
      >
        Your browser does not support the audio element.
      </audio>
    ) : ctx.enabled && !/\bbg-/.test(props.className || "") ? (
      <EditorEmptyLeafHint
        selected={ctx.isActive}
        icon={<TbMusic aria-hidden />}
        idleLabel="Empty audio"
        selectedLabel="Drop here or right-click"
      />
    ) : null,
  };

  applyAriaProps(prop, props);

  if (ctx.enabled) {
    prop["data-bounding-box"] = ctx.enabled;
    prop["data-empty-state"] = !audioUrl;
    if (ctx.isMounted) prop["node-id"] = ctx.id;
    prop.onClick = (e: any) => e.preventDefault();
  }

  return React.createElement(
    motionIt(props, Box, ctx.enabled),
    applyAnimation({ ...prop, key: ctx.id }, props, null, ctx.enabled)
  );
}
