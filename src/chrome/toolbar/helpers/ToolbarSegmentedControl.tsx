import type { ReactNode } from "react";

export const TOOLBAR_SEGMENTED_ACTIVE = "bg-base-100 text-base-content shadow-sm";
export const TOOLBAR_SEGMENTED_INACTIVE = "text-neutral-content hover:text-base-content";

export type ToolbarSegmentedOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  /** Optional per-option tooltip text (rendered through the global RTT surface). */
  tooltip?: string;
  ariaLabel?: string;
  /** Override the default option width sizing — e.g. `"flex-none w-7"` on a
   *  narrow clear/none chip so the surrounding `flex-1` siblings divide the
   *  remaining track evenly. When omitted, falls back to the control-level
   *  default (`flex-1` in fill mode, content-width in compact mode). */
  widthClass?: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: ToolbarSegmentedOption<T>[];
  /** Compact text (e.g. Animation engine). Default fits icon + label. */
  dense?: boolean;
  /** Tight track that sizes by content instead of stretching to `w-full`.
   *  Use for inline togglers in flex rows (ShorthandInput mode toggle). */
  compact?: boolean;
  /** Extra classes appended to every option button (e.g. `w-7` for icon-only). */
  optionClassName?: string;
  className?: string;
  "aria-label"?: string;
  /** Extra control on the same neutral track (e.g. layout display-variant chevron). */
  trailing?: ReactNode;
  /** Tooltip surface id forwarded to per-option `data-tooltip-id` when an option provides `tooltip`. */
  tooltipId?: string;
};

/**
 * Pill / segmented control: light neutral track, active segment is base-100 + shadow.
 * Used for Animation engine toggle, Import/Export, etc.
 */
export function ToolbarSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  dense = false,
  compact = false,
  optionClassName = "",
  className = "",
  "aria-label": ariaLabel,
  trailing,
  tooltipId,
}: Props<T>) {
  const trackClass = compact
    ? "bg-neutral inline-flex shrink-0 gap-1 rounded-md p-1"
    : "bg-neutral flex w-full min-w-0 gap-1 rounded-md p-1";
  const defaultOptionWidthClass = compact ? "" : "min-w-0 flex-1";
  return (
    <div role="tablist" aria-label={ariaLabel} className={`${trackClass} ${className}`}>
      {options.map(opt => {
        const selected = value === opt.value;
        const baseSize = dense
          ? "rounded h-6 px-2 text-[11px] leading-tight font-medium"
          : "rounded h-6 px-2 text-xs leading-tight font-medium";
        const widthClass = opt.widthClass ?? defaultOptionWidthClass;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={opt.ariaLabel}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            data-tooltip-id={opt.tooltip ? tooltipId : undefined}
            data-tooltip-content={opt.tooltip}
            className={`${widthClass} flex items-center justify-center gap-1 transition-colors ${baseSize} ${selected ? TOOLBAR_SEGMENTED_ACTIVE : TOOLBAR_SEGMENTED_INACTIVE} ${optionClassName}`}
          >
            {opt.label}
          </button>
        );
      })}
      {trailing}
    </div>
  );
}
