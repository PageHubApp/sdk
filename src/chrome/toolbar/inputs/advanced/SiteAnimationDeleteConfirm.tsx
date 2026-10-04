/**
 * Inline delete confirmation for the site animation editor footer. Inline
 * (not a portal dialog) so clicks stay inside the host FloatingPanel.
 */
interface Props {
  label: string;
  usageCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SiteAnimationDeleteConfirm({ label, usageCount, onCancel, onConfirm }: Props) {
  const usage =
    usageCount === 0
      ? "No elements use it."
      : `${usageCount} ${usageCount === 1 ? "element uses" : "elements use"} it and will stop animating.`;
  return (
    <div
      role="alertdialog"
      aria-labelledby="site-animation-delete-title"
      className="border-error/40 bg-error/5 mt-auto flex flex-col gap-2 rounded-lg border p-2.5"
    >
      <p id="site-animation-delete-title" className="text-xs font-semibold">
        Delete “{label}”?
      </p>
      <p className="text-neutral-content text-[11px] leading-snug">
        {usage} You can bring it back with Undo.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-base-content hover:bg-base-200 rounded-md px-3 py-1 text-xs font-medium transition-colors"
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="bg-error text-error-content rounded-md px-3 py-1 text-xs font-semibold"
        >
          Delete animation
        </button>
      </div>
    </div>
  );
}
