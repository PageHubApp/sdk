import { forwardRef } from "react";
import { TbSearch, TbX } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "./layout/tooltipSurface";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  clearTooltip?: string;
  /** `slim` is shorter (h-7) with smaller text (text-xs) for dense toolbars. Default matches `input-transparent`. */
  size?: "default" | "slim";
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Passed through as `<input>` attributes — useful for `autoComplete`/`spellCheck`. */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

const SIZE_STYLES = {
  default: {
    input: "input-transparent",
    inputPadL: "pl-8",
    inputPadR: "pr-3",
    inputPadRWithClear: "pr-8",
    icon: "left-2.5 size-3.5",
    clear: "right-2 size-5",
    clearIcon: "size-3.5",
  },
  slim: {
    input:
      "border-base-300 placeholder:text-neutral-content focus-visible:ring-ring flex h-7 w-full rounded-md border bg-transparent text-xs transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    inputPadL: "pl-7",
    inputPadR: "pr-2",
    inputPadRWithClear: "pr-7",
    icon: "left-2 size-3",
    clear: "right-1.5 size-4",
    clearIcon: "size-3",
  },
} as const;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "Search...",
      className = "",
      clearTooltip = "Clear",
      size = "default",
      autoFocus,
      onKeyDown,
      inputProps,
    },
    ref
  ) => {
    const hasValue = value.length > 0;
    const s = SIZE_STYLES[size];
    return (
      <div className={`relative flex-1 ${className}`}>
        <TbSearch
          className={`text-neutral-content pointer-events-none absolute top-1/2 -translate-y-1/2 ${s.icon}`}
          aria-hidden
        />
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          className={`${s.input} ${s.inputPadL} ${hasValue ? s.inputPadRWithClear : s.inputPadR}`}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          {...inputProps}
        />
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange("")}
            className={`text-neutral-content hover:text-base-content focus-visible:ring-ring absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded focus-visible:ring-1 focus-visible:outline-none ${s.clear}`}
            aria-label={clearTooltip}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={clearTooltip}
          >
            <TbX className={s.clearIcon} aria-hidden />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
