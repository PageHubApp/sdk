import React from "react";
import { useAtomValue } from "@zedux/react";
import { TbPin, TbPinned } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { SettingsSearchAtom } from "../registry/atoms";
import type { SectionId } from "../registry/propertyDefs";
import { useInspectorPin } from "./InspectorPinContext";

export function SectionPinButton({
  sectionId,
}: {
  sectionId: SectionId;
}) {
  const search = useAtomValue(SettingsSearchAtom);
  const { isPinned, togglePin } = useInspectorPin();

  if (search.length > 0) return null;

  const pinned = isPinned(sectionId);

  return (
    <button
      type="button"
      className="text-sidebar-foreground/70 hover:text-sidebar-foreground inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded p-0 leading-none opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        togglePin(sectionId);
      }}
      onKeyDown={e => e.stopPropagation()}
      aria-label={pinned ? "Unpin from sidebar" : "Pin to sidebar"}
      aria-pressed={pinned}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={pinned ? "Unpin from sidebar" : "Pin to sidebar"}
      data-tooltip-place="left"
      data-tooltip-offset={8}
    >
      {pinned ? <TbPinned className="size-3" /> : <TbPin className="size-3" />}
    </button>
  );
}
