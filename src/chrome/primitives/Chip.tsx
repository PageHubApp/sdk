/**
 * Chip — the ONE row primitive for the editor sidebar.
 *
 * Every "label-on-the-left + control-on-the-right" row is a `<Chip>`. No
 * hand-rolled `<div flex><span/>...</div>` wrappers, no parallel
 * `ToolbarRowFrame` / `PopoverChip` / `BgWrap` shapes — those are kept as
 * one-release compat shims that delegate here.
 *
 * Two modes:
 *   - `mode="input"` (default) — bordered `h-8 input-wrapper` frame, children
 *     plug in as the inline control. Use for text inputs, selects,
 *     dropdowns, color/swatch frames, anything that fits the canonical
 *     bordered row.
 *   - `mode="popover"` — frame hosts a click-to-open trigger (leading icon +
 *     summary text) plus a session-aware clear-X. Replaces the old
 *     PopoverChip — collapses 21+ popover-row sites onto one primitive.
 *
 * Frame variants (apply to both modes):
 *   - `frame="bordered"` (default) — `input-wrapper`, `h-8`, focus-ring.
 *   - `frame="bare"` — drops border / height / focus-ring; renders just the
 *     label gutter + child slot. For controls that own their own chrome
 *     (segmented controls, multi-line textareas, etc.) — avoids double-border.
 *   - `grow` — swaps `h-8` for `min-h-8` so multi-line content (textarea)
 *     can expand without breaking the row shape.
 *
 * Extras:
 *   - `variant="swatch"` (input mode) — drops left padding so a full-bleed
 *     leading control (color swatch) hits the inner border, with overflow
 *     clipped to the rounded shape.
 *   - `variant="preview"` (popover mode) — `leading` takes the full chip
 *     body (gradient/image preview) with `previewOverlay` pill on top.
 *
 * Label gutter is internal — `RowLabel` is private to this module and
 * NEVER exported. Consumers always reach it via the `label` prop.
 */
import { useAtomState } from "@zedux/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SessionAddedAtom,
  sessionKey,
} from "../toolbar/unified-settings/sessionAddedAtom";
import { useProperty } from "../toolbar/unified-settings/propertyContext";
import { BreakpointChip } from "../toolbar/breakpoint-chip/BreakpointChip";
import { InlineClearButton } from "./InlineClearButton";
import { PAGEHUB_RTT_GLOBAL_ID } from "./layout/tooltipSurface";

// ─── Private label gutter ────────────────────────────────────────────────────

/**
 * Truncation-aware label button. ResizeObserver + scrollWidth check decides
 * whether to surface a tooltip — short labels stay tooltip-free. Click forwards
 * to `onClick` so the gutter is a proper affordance (focus / open the row's
 * primary control), not dead text.
 */
function RowLabel({
  label,
  onClick,
  width,
  adornment,
}: {
  label: string;
  onClick?: () => void;
  width?: string;
  adornment?: ReactNode;
}) {
  // Empty-string passed by old call sites must still fall back to `w-20`,
  // otherwise the gutter flex-grows and breaks alignment between rows.
  const widthClass = width || "w-20";
  const ref = useRef<HTMLButtonElement>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [label]);
  const button = (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      data-tooltip-id={truncated ? PAGEHUB_RTT_GLOBAL_ID : undefined}
      data-tooltip-content={truncated ? label : undefined}
      data-tooltip-place="top"
      className={`text-base-content hover:text-primary min-w-0 flex-1 cursor-pointer truncate text-left text-xs`}
    >
      {label}
    </button>
  );
  if (!adornment) {
    return <div className={`${widthClass} shrink-0 flex min-w-0 items-center`}>{button}</div>;
  }
  return (
    <div className={`${widthClass} group/bp-row shrink-0 flex min-w-0 items-center gap-1`}>
      {button}
      {adornment}
    </div>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface ChipCommon {
  /** Label gutter rendered LEFT of the frame. Click forwards to
   *  `onLabelClick` (input mode) or `onTriggerClick` (popover mode). */
  label?: string;
  /** When true, frame border highlights to signal an open popover/focus. */
  open?: boolean;
  /** Frame chrome: `bordered` = canonical h-8 input-wrapper; `bare` = no
   *  border / height (for controls that own their own chrome). */
  frame?: "bordered" | "bare";
  /** Replace `h-8` with `min-h-8` so vertical content (textarea) can grow. */
  grow?: boolean;
  /** Width class for the label gutter. Defaults to `w-20`. */
  labelWidth?: string;
  /** Class-typed prop key. When set + `propType !== "root" | "component"`,
   *  `Chip` renders a `BreakpointChip` indicator next to the label so callers
   *  don't hand-roll it. Replaces the old `MobileDesktopLabels` sibling. */
  propKey?: string;
  propType?: string;
  index?: any;
  propItemKey?: string | null;
}

interface ChipInputProps extends ChipCommon {
  mode?: "input";
  /** Click handler attached to the frame `<div>`. */
  onClick?: (e: React.MouseEvent) => void;
  /** Click handler for the label gutter. Defaults to `onClick` when omitted. */
  onLabelClick?: () => void;
  /** Trailing affordance(s) rendered inside the frame, after children. */
  trailing?: ReactNode;
  /** Visual variant. `swatch` = full-bleed leading control, no left padding. */
  variant?: "default" | "swatch";
  /** Escape hatch: when true, render children directly with no frame, label,
   *  or trailing chrome. Used when a parent already provides the row shape
   *  (e.g. a Chip inside a Chip, or an inline control hosted in a non-row
   *  container). Replaces the legacy `BgWrap wrap={...}` short-circuit. */
  passthrough?: boolean;
  children: ReactNode;
}

interface ChipPopoverProps extends ChipCommon {
  mode: "popover";
  onTriggerClick: () => void;
  onClear: () => void;
  triggerAriaLabel: string;
  clearAriaLabel: string;
  /** Leading icon / swatch / color preview. */
  leading?: ReactNode;
  /** Summary text rendered in the trigger button body. */
  summary?: ReactNode;
  /** `default` = leading icon + summary inline. `preview` = leading takes
   *  the full body (gradient/image swatch) with `previewOverlay` on top. */
  variant?: "default" | "preview";
  previewOverlay?: ReactNode;
  /** Extras rendered inside the frame's trailing column, BEFORE the X. */
  trailingExtras?: ReactNode;
}

export type ChipProps = ChipInputProps | ChipPopoverProps;

// ─── Frame ──────────────────────────────────────────────────────────────────

function frameClasses({
  frame,
  grow,
  open,
  variant,
  hasTrailing,
}: {
  frame: "bordered" | "bare";
  grow: boolean;
  open: boolean;
  variant: "default" | "swatch";
  hasTrailing: boolean;
}) {
  if (frame === "bare") {
    return `flex w-full min-w-0 items-center text-xs ${grow ? "min-h-8" : ""} gap-1.5`;
  }
  const variantClass =
    variant === "swatch"
      ? `gap-1.5 pl-0! overflow-hidden ${hasTrailing ? "pr-1" : "pr-0!"}`
      : "gap-1.5 px-1";
  const heightClass = grow ? "min-h-8" : "h-8";
  return `input-wrapper text-base-content flex ${heightClass} w-full min-w-0 items-center text-xs ${variantClass} ${
    open ? "border-primary ring-ring/45 ring-1" : ""
  }`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(props, ref) {
  // Passthrough escape hatch — render children unwrapped (input mode only).
  if (props.mode !== "popover" && props.passthrough) {
    return <>{props.children}</>;
  }

  // Common props
  const {
    label,
    open = false,
    frame = "bordered",
    grow = false,
    labelWidth,
  } = props;

  const isPopover = props.mode === "popover";

  // Popover mode owns its own clear bookkeeping.
  const property = useProperty();
  const [, setSessionAdded] = useAtomState(SessionAddedAtom);
  const popoverOnClear = isPopover ? props.onClear : undefined;
  const handleClear = useCallback(() => {
    if (!popoverOnClear) return;
    popoverOnClear();
    if (property) {
      setSessionAdded(prev => {
        const next = new Set(prev);
        next.add(sessionKey(property.nodeId, property.propId));
        return next;
      });
    }
  }, [popoverOnClear, property, setSessionAdded]);

  // Build frame contents per mode.
  let bodyChildren: ReactNode;
  let trailing: ReactNode;
  let onFrameClick: ((e: React.MouseEvent) => void) | undefined;
  let onLabelClick: (() => void) | undefined;
  let variant: "default" | "swatch" = "default";

  if (isPopover) {
    const p = props as ChipPopoverProps;
    onLabelClick = p.onTriggerClick;
    trailing = (
      <>
        {p.trailingExtras}
        <InlineClearButton onClick={handleClear} tooltip={p.clearAriaLabel} />
      </>
    );
    bodyChildren =
      p.variant === "preview" ? (
        <button
          ref={ref}
          type="button"
          onClick={p.onTriggerClick}
          aria-expanded={open}
          aria-label={p.triggerAriaLabel}
          className="border-base-300 relative flex h-6 min-w-0 flex-1 items-center justify-center overflow-hidden rounded border"
        >
          {p.leading}
          {p.previewOverlay}
        </button>
      ) : (
        <button
          ref={ref}
          type="button"
          onClick={p.onTriggerClick}
          aria-expanded={open}
          aria-label={p.triggerAriaLabel}
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-1 text-left"
        >
          {p.leading ? (
            <span className="text-neutral-content shrink-0" aria-hidden>
              {p.leading}
            </span>
          ) : null}
          <span className="text-base-content min-w-0 flex-1 truncate">{p.summary}</span>
        </button>
      );
  } else {
    const p = props as ChipInputProps;
    bodyChildren = p.children;
    trailing = p.trailing;
    onFrameClick = p.onClick;
    onLabelClick = p.onLabelClick ?? (p.onClick ? () => p.onClick!({} as React.MouseEvent) : undefined);
    variant = p.variant ?? "default";
  }

  const hasTrailing = trailing != null && trailing !== false;
  const frameNode = (
    <div
      onClick={onFrameClick}
      className={frameClasses({ frame, grow, open, variant, hasTrailing })}
    >
      {bodyChildren}
      {trailing}
    </div>
  );

  if (label) {
    const showBp =
      !!props.propKey &&
      props.propType !== "root" &&
      props.propType !== "component";
    const adornment = showBp ? (
      <BreakpointChip
        propKey={props.propKey!}
        propType={props.propType}
        index={props.index}
        propItemKey={props.propItemKey ?? null}
        label={label}
      />
    ) : null;
    return (
      <div className="flex min-w-0 items-center gap-0.5">
        <RowLabel
          label={label}
          onClick={onLabelClick}
          width={labelWidth}
          adornment={adornment}
        />
        {frameNode}
      </div>
    );
  }
  return frameNode;
});
