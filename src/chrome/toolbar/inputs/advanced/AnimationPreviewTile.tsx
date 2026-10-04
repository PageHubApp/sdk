/**
 * Preview stage for an animation. Renders a tile through `applyAnimation` —
 * the same path the viewer uses — with scroll-triggered animations forced
 * into view. Click the tile to replay.
 */
import React, { useState } from "react";
import { TbPlayerPlay } from "react-icons/tb";
import { motionIt } from "@/utils/motion";
import { applyAnimation } from "../../../../utils/tailwind/tailwind";

interface Props {
  /** Node-shaped props; `props.root.animation` picks the animation. */
  props: Record<string, any>;
  /** Changing this remounts the tile, replaying the animation. */
  replayKey?: string;
}

export function AnimationPreviewTile({ props, replayKey = "" }: Props) {
  // Bumped on each click so the animation replays after duration / easing tweaks.
  const [playCount, setPlayCount] = useState(0);
  const animation = props.root?.animation || "";

  let tile: React.ReactNode;
  if (animation) {
    const animProps = applyAnimation({}, props as any);
    if (animProps.className?.includes("ph-anim-scroll")) {
      animProps.className =
        animProps.className.replace("ph-anim-scroll", "").trim() + " ph-in-view";
      delete animProps.ref;
    }
    tile = React.createElement(
      motionIt(props, "div"),
      { ...animProps, key: `${animation}-${replayKey}-${playCount}` },
      <button
        type="button"
        onClick={() => setPlayCount(n => n + 1)}
        className="border-base-300 bg-base-100 text-base-content hover:border-primary group flex size-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border shadow-sm transition-colors"
        aria-label="Replay animation"
      >
        <TbPlayerPlay
          className="text-neutral-content group-hover:text-primary size-4 transition-colors"
          aria-hidden
        />
        <span className="text-[10px] font-medium tracking-wide uppercase">Replay</span>
      </button>
    );
  } else {
    tile = (
      <div className="text-neutral-content flex flex-col items-center gap-1.5 text-xs">
        <div className="border-base-300 bg-base-100 size-16 rounded-lg border border-dashed" />
        <span>Pick an animation to preview</span>
      </div>
    );
  }

  return (
    <div className="border-base-300 bg-base-200/40 mb-3 flex h-32 items-center justify-center overflow-hidden rounded-xl border">
      {tile}
    </div>
  );
}
