import type { ReactNode } from "react";

export const TOOLBAR_SEGMENTED_ACTIVE = "bg-base-100 text-base-content shadow-sm";
export const TOOLBAR_SEGMENTED_INACTIVE = "text-neutral-content hover:text-base-content";

export type ToolbarSegmentedOption<T extends string = string> = {
  value: T;
  label: ReactNode;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: ToolbarSegmentedOption<T>[];
  /** Compact text (e.g. Animation engine). Default fits icon + label. */
  dense?: boolean;
  className?: string;
  "aria-label"?: string;
  /** Extra control on the same neutral track (e.g. layout display-variant chevron). */
  trailing?: ReactNode;
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
  className = "",
  "aria-label": ariaLabel,
  trailing,
}: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex w-full min-w-0 gap-1 rounded-md bg-neutral p-1 ${className}`}
    >
      {options.map(opt => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={
              dense
                ? `flex min-w-0 flex-1 items-center justify-center gap-1 rounded px-2 py-2 text-[11px] font-medium leading-tight transition-colors ${selected ? TOOLBAR_SEGMENTED_ACTIVE : TOOLBAR_SEGMENTED_INACTIVE}`
                : `flex min-w-0 flex-1 items-center justify-center gap-1 rounded px-2 py-2 text-xs font-medium leading-tight transition-colors ${selected ? TOOLBAR_SEGMENTED_ACTIVE : TOOLBAR_SEGMENTED_INACTIVE}`
            }
          >
            {opt.label}
          </button>
        );
      })}
      {trailing}
    </div>
  );
}
