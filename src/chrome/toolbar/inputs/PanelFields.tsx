/**
 * Labelled field primitives for editor FloatingPanels that edit a local draft
 * (text styles, site animations) instead of writing node props directly.
 */
import type { ReactNode } from "react";
import { ToolbarDropdown } from "@/chrome/toolbar/ToolbarDropdown";

/** Shared text / number input chrome inside draft panels (`.input` = bordered field, full width). */
export const PANEL_INPUT_CLASS = "input cursor-text px-2 py-1 text-xs outline-none";

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-neutral-content mb-1 block text-[11px] font-medium">
      {children}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** `[value, label]` pairs. */
  options: string[][];
  id: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <ToolbarDropdown value={value} onChange={onChange} placeholder={label} propKey={id}>
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>
            {lbl}
          </option>
        ))}
      </ToolbarDropdown>
    </div>
  );
}
