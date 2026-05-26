/**
 * NodeAiContextInputPopover — popover-mode trigger for the AI Context section.
 * Sits in the section header (single-property popover-only section per
 * `popoverModeRegistry`) so a click on the header title opens the panel.
 *
 * Empty:           small `+` icon trigger
 * Notes only:      chip with truncated note preview + clear
 * Tags only:       chip with tag preview / "{N} tags" + clear
 * Both:            chip with combined summary + clear
 * ROOT_NODE:       always shows `+` (body redirects users to the site's settings)
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useNode } from "@craftjs/core";
import { lazy, Suspense, useState } from "react";
import { TbWand } from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import { usePopoverAutoOpen } from "../../inspector/hooks/usePopoverAutoOpen";
import { usePopoverPosition } from "../../inspector/hooks/usePopoverPosition";
import type { PropertyInputProps } from "../../inspector/registry/propertyDefs";

const NodeAiContextPanel = lazy(() => import("./NodeAiContextPanel"));

// Hint width for chip-anchored initial position only — panel is auto-sized.
const PANEL_WIDTH = 380;
const NOTE_PREVIEW_MAX = 32;

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function summarize(notes: string, tags: string[]): string {
  const hasNotes = notes.trim().length > 0;
  const hasTags = tags.length > 0;
  if (hasNotes && hasTags) {
    return `${truncate(notes, 20)} · ${tags.length} tag${tags.length === 1 ? "" : "s"}`;
  }
  if (hasNotes) return truncate(notes, NOTE_PREVIEW_MAX);
  if (hasTags) {
    if (tags.length <= 2) return tags.join(", ");
    return `${tags.length} tags`;
  }
  return "";
}

export default function NodeAiContextInputPopover({ def }: PropertyInputProps) {
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const {
    actions: { setProp },
    id,
    notes,
    tags,
  } = useNode(node => {
    const design = (node.data?.props?.design || {}) as { notes?: unknown; tags?: unknown };
    return {
      id: node.id,
      notes: typeof design.notes === "string" ? design.notes : "",
      tags: Array.isArray(design.tags)
        ? (design.tags.filter((t: unknown): t is string => typeof t === "string") as string[])
        : [],
    };
  });

  const isRoot = id === ROOT_NODE;
  const isEmpty = isRoot || (!notes.trim() && tags.length === 0);
  const summary = summarize(notes, tags);

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  usePopoverAutoOpen({ nodeId: id, defId: def?.id, onOpen: openPanel });

  const clearAiContext = () => {
    setProp((p: any) => {
      if (!p.design) return;
      delete p.design.notes;
      delete p.design.tags;
      if (Object.keys(p.design).length === 0) delete p.design;
    });
  };

  return (
    <>
      {isEmpty ? (
        // Popover-only section: section title click opens the panel via the
        // open-request atom. No visible `+`, just an invisible anchor so
        // computePosition() can place the panel at the section's right edge.
        <span ref={triggerRef as any} aria-hidden className="block size-0" />
      ) : (
        <Chip
          mode="popover"
          ref={triggerRef}
          open={open}
          onTriggerClick={() => (open ? setOpen(false) : openPanel())}
          onClear={() => {
            if (open) setOpen(false);
            clearAiContext();
          }}
          triggerAriaLabel="Edit AI context"
          clearAriaLabel="Clear AI context"
          leading={<TbWand className="size-3.5" aria-hidden />}
          summary={summary}
        />
      )}
      {open && (
        <Suspense fallback={null}>
          <NodeAiContextPanel initialPosition={initialPos} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
