/**
 * Shared trigger for every Effects row.
 *
 * One file backs all 6 popover-mode property defs registered in `effects.ts`.
 * The component reads `def.id` to look up the matching `EffectType` and:
 *   - renders nothing while empty + not pending (so empty rows don't clutter
 *     the body — only ACTIVE effects show as chips)
 *   - renders a `Chip` (icon + summary + clear) when active or pending
 *   - lazy-mounts the per-effect editor panel on chip click
 *   - listens to `PopoverOpenRequestAtom` so AccordionAddMenu's `+` picker
 *     can dispatch open-requests (the standard pattern)
 *   - listens to `SessionAddedAtom` for the legacy add → auto-open path
 *
 * Follows the popover-mode contract documented in
 * `docs/sdk/editor-popover-pattern.md` §3.
 */
import { useNode } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import { Suspense, useEffect, useRef, useState } from "react";
import { Chip } from "@/chrome/primitives/Chip";
import { SideBarAtom } from "@/utils/lib";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../../popoverOpenRequestAtom";
import { SessionAddedAtom, sessionKey } from "../../../sessionAddedAtom";
import type { PropertyInputProps } from "../../propertyDefs";
import { getEffectType, type EffectId, type EffectNodeView } from "./effectTypes";

const PANEL_WIDTH = 360;

export default function EffectRowInputPopover({ def }: PropertyInputProps) {
  const type = getEffectType(def.id as EffectId);
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);

  const [sessionAdded, setSessionAdded] = useAtomState(SessionAddedAtom);
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);

  const {
    actions: { setProp },
    id,
    className,
    componentProps,
    craftName,
  } = useNode((node: any) => ({
    id: node.id,
    className: typeof node.data?.props?.className === "string" ? node.data.props.className : "",
    componentProps: node.data?.props || {},
    craftName: (node.data?.name || node.data?.displayName || "") as string,
  }));

  const view: EffectNodeView = { className, props: componentProps, craftName };

  const isActive = type ? type.isActive(view) : false;
  const sessionPending = sessionAdded.has(sessionKey(id, def.id));
  const requestVersion = popoverRequests.get(popoverRequestKey(id, def.id)) || 0;

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - PANEL_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  // Auto-open from legacy SessionAdded path. Only fires once per mount.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (sessionPending) {
      autoOpenedRef.current = true;
      requestAnimationFrame(() => {
        setInitialPos(computePosition());
        setOpen(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPending]);

  // Open whenever a popover-open-request is dispatched for this row.
  const lastRequestVersion = useRef(0);
  useEffect(() => {
    if (requestVersion === 0 || requestVersion === lastRequestVersion.current) return;
    lastRequestVersion.current = requestVersion;
    requestAnimationFrame(() => {
      setInitialPos(computePosition());
      setOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestVersion]);

  if (!type) return null;

  // Render nothing in the body when the effect isn't active AND the user
  // hasn't just added it (sessionAdded) AND there's no pending open request.
  // This is what stops empty effect rows from cluttering the section body.
  const visible = isActive || sessionPending || requestVersion > 0;
  if (!visible) return null;

  const Icon = type.Icon;

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  const handleClear = () => {
    if (open) setOpen(false);
    type.clear(setProp);
    // Drop the session-added marker so the trigger doesn't keep rendering an
    // empty chip after the user clears it. Otherwise: clear → isActive=false
    // but sessionPending=true → trigger keeps showing.
    if (sessionAdded.has(sessionKey(id, def.id))) {
      const next = new Set(sessionAdded);
      next.delete(sessionKey(id, def.id));
      setSessionAdded(next);
    }
  };

  const Editor = type.EditorPanel;
  const summary = type.summary(view);
  // Match Pattern / Gradient row shape: label OUTSIDE the chip, chip body
  // shows the value summary (or "Add..." when empty + just session-added).
  const chipSummary = summary || "Add...";

  return (
    <>
      <Chip mode="popover"
        ref={triggerRef}
        label={type.label}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={handleClear}
        triggerAriaLabel={isActive ? `Edit ${type.label}` : `Add ${type.label}`}
        clearAriaLabel={`Remove ${type.label}`}
        leading={<Icon className="size-3.5" aria-hidden />}
        summary={chipSummary}
      />
      {open && (
        <Suspense fallback={null}>
          <Editor onClose={() => setOpen(false)} initialPosition={initialPos} />
        </Suspense>
      )}
    </>
  );
}
