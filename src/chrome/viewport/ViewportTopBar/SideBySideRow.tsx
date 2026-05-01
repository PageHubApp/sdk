import { useAtomState } from "@zedux/react";
import type { ViewMode as CanvasViewMode } from "../../../core/store";
import { SideBySideAtom } from "../state/atoms";

const CHOICES: { id: CanvasViewMode; label: string }[] = [
  { id: "mobile", label: "Mobile" },
  { id: "sm", label: "SM" },
  { id: "md", label: "MD" },
  { id: "lg", label: "LG" },
  { id: "xl", label: "XL" },
  { id: "2xl", label: "2XL" },
];

/**
 * Side-by-side mirror toggle. Lives inside the canvas-width dropdown.
 * Capped at 2 frames — the secondary is always read-only and the choice of
 * which bp it shows is independent of the primary canvas view.
 */
export function SideBySideRow() {
  const [sbs, setSbs] = useAtomState(SideBySideAtom);
  return (
    <div className="border-base-300 mt-2 flex flex-col gap-1.5 border-t pt-2">
      <label className="flex cursor-pointer items-center gap-2 text-[11px]">
        <input
          type="checkbox"
          checked={sbs.enabled}
          onChange={e => setSbs(prev => ({ ...prev, enabled: e.target.checked }))}
          className="size-3.5 cursor-pointer"
        />
        <span className="font-semibold">Side-by-side mirror</span>
        <span className="text-neutral-content text-[10px]">read-only</span>
      </label>
      {sbs.enabled && (
        <div className="grid grid-cols-6 gap-1 pl-5">
          {CHOICES.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSbs(prev => ({ ...prev, secondaryView: c.id }))}
              aria-pressed={sbs.secondaryView === c.id}
              className={`rounded-md border px-1 py-1 font-mono text-[10px] font-bold transition ${
                sbs.secondaryView === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-base-300 hover:bg-base-200 text-base-content"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
