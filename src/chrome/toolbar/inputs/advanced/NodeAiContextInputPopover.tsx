/**
 * NodeAiContextInputPopover — popover-mode trigger for the AI Context section.
 * Sits in the section header (single-property popover-only section per
 * `popoverModeRegistry`) so a click on the header title opens the panel.
 *
 * Empty:           small `+` icon trigger
 * Notes only:      chip with truncated note preview + clear
 * Tags only:       chip with tag preview / "{N} tags" + clear
 * Both:            chip with combined summary + clear
 * ROOT_NODE:       always shows `+` (body redirects to Site Settings)
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TbWand } from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import { SideBarAtom } from "../../../../utils/lib";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

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
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const sessionAdded = useAtomValue(SessionAddedAtom);
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);

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

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - PANEL_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  // Auto-open when the section was just added in this session.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (def && sessionAdded.has(sessionKey(id, def.id))) {
      requestAnimationFrame(() => {
        setInitialPos(computePosition());
        setOpen(true);
      });
      autoOpenedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAdded, id, def?.id]);

  // Open whenever a popover-open-request is dispatched (section title click).
  const lastRequestVersion = useRef(0);
  useEffect(() => {
    if (!def) return;
    const version = popoverRequests.get(popoverRequestKey(id, def.id)) || 0;
    if (version === 0 || version === lastRequestVersion.current) return;
    lastRequestVersion.current = version;
    requestAnimationFrame(() => {
      setInitialPos(computePosition());
      setOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverRequests, id, def?.id]);

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
        <Chip mode="popover"
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
