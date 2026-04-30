import { TbPlus } from "react-icons/tb";
import { Chip } from "./Chip";

/**
 * Empty-state row for a single-thing-or-list property: `<label> [+ Add...]`.
 *
 * Same shape as `IconInput` empty state — labeled row with a dashed-bordered
 * `+` chip on the right. Click the chip to add the first item; once at least
 * one exists, the host component takes over and renders its own editor body.
 *
 * Used for in-section empty states where a chunky `ToolbarDashedButton` would
 * read as too heavy (Action / Handlers inside an auto-list-group detail panel).
 */
export const LabeledAddChip = ({
  label,
  ariaLabel,
  cta = "Add...",
  onClick,
}: {
  label: string;
  /** Falls back to `Add ${label}` when omitted. */
  ariaLabel?: string;
  cta?: string;
  onClick: () => void;
}) => (
  <Chip label={label}>
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? `Add ${label.toLowerCase()}`}
      className="flex h-full min-w-0 flex-1 items-center gap-1.5 truncate px-1 text-left"
    >
      <span
        className="border-base-300 text-neutral-content/60 flex size-4 shrink-0 items-center justify-center rounded-sm border border-dashed"
        aria-hidden
      >
        <TbPlus className="size-3" />
      </span>
      <span className="text-neutral-content flex-1 truncate">{cta}</span>
    </button>
  </Chip>
);
