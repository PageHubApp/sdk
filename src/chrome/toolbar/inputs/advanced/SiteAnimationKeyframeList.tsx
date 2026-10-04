/**
 * Keyframe editor for a site animation draft: one card per stop (position %
 * + property rows). Color properties get a palette shortcut that writes
 * `var(--<token>)`, so keyframes follow the theme.
 */
import { TbPlus, TbX } from "react-icons/tb";
import { ToolbarDropdown } from "@/chrome/toolbar/ToolbarDropdown";
import { ToolbarIconButton } from "@/chrome/primitives/ToolbarIconButton";
import {
  SITE_ANIMATION_MAX_KEYFRAMES,
  SITE_ANIMATION_MIN_KEYFRAMES,
  SITE_ANIMATION_PROPERTIES,
} from "@/utils/animations/siteAnimations";
import { PANEL_INPUT_CLASS } from "../PanelFields";
import { draftId, draftRow, type DraftRow, type DraftStop } from "./siteAnimationDraft";
import { useDesignVarOptions } from "./useDesignVarOptions";

const COLOR_PROPERTIES = new Set(["color", "background-color", "border-color"]);

const ADD_BUTTON_CLASS =
  "text-neutral-content hover:bg-base-200 hover:text-base-content flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

/** Position for a new stop: middle of the widest gap between existing stops. */
function nextStopPosition(stops: DraftStop[]): number {
  const ats = [...new Set(stops.map(s => s.at))].sort((a, b) => a - b);
  let best = 50;
  let widest = -1;
  for (let i = 1; i < ats.length; i++) {
    const gap = ats[i] - ats[i - 1];
    if (gap > widest) {
      widest = gap;
      best = Math.round(ats[i - 1] + gap / 2);
    }
  }
  return best;
}

interface Props {
  stops: DraftStop[];
  onChange: (stops: DraftStop[]) => void;
}

export function SiteAnimationKeyframeList({ stops, onChange }: Props) {
  const { filteredVars } = useDesignVarOptions("bg", "");
  const palette = filteredVars.filter(v => v.category === "palette");

  const updateStop = (id: number, patch: Partial<DraftStop>) =>
    onChange(stops.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const updateRow = (stop: DraftStop, rowId: number, patch: Partial<DraftRow>) =>
    updateStop(stop.id, { rows: stop.rows.map(r => (r.id === rowId ? { ...r, ...patch } : r)) });

  const addStop = () => {
    const template = stops[0]?.rows ?? [draftRow()];
    onChange([
      ...stops,
      { id: draftId(), at: nextStopPosition(stops), rows: template.map(r => draftRow(r.prop, r.value)) },
    ]);
  };

  return (
    <div className="flex flex-col gap-2">
      {stops.map((stop, index) => {
        const used = new Set(stop.rows.map(r => r.prop));
        const free = SITE_ANIMATION_PROPERTIES.filter(p => !used.has(p));
        return (
          <div key={stop.id} className="border-base-300/60 rounded-lg border p-2">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[11px] font-semibold whitespace-nowrap">Stop {index + 1}</span>
              <div className="w-16">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Number.isFinite(stop.at) ? stop.at : ""}
                  onChange={e => updateStop(stop.id, { at: e.target.valueAsNumber })}
                  aria-label={`Stop ${index + 1} position, percent of the animation`}
                  className={PANEL_INPUT_CLASS}
                />
              </div>
              <span className="text-neutral-content text-[11px]">%</span>
              <div className="ml-auto">
                {stops.length > SITE_ANIMATION_MIN_KEYFRAMES && (
                  <ToolbarIconButton
                    variant="subtle"
                    ariaLabel={`Remove stop ${index + 1}`}
                    tooltip="Remove stop"
                    onClick={() => onChange(stops.filter(s => s.id !== stop.id))}
                  >
                    <TbX className="size-3.5" aria-hidden />
                  </ToolbarIconButton>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {stop.rows.map(row => (
                <div key={row.id} className="flex items-center gap-1">
                  <div className="w-32 shrink-0">
                    <ToolbarDropdown
                      value={row.prop}
                      onChange={(prop: string) => updateRow(stop, row.id, { prop })}
                      placeholder="Property"
                    >
                      {[row.prop, ...free].map(p => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </ToolbarDropdown>
                  </div>
                  <input
                    type="text"
                    value={row.value}
                    onChange={e => updateRow(stop, row.id, { value: e.target.value })}
                    placeholder="Value"
                    aria-label={`${row.prop} value at stop ${index + 1}`}
                    className={`${PANEL_INPUT_CLASS} min-w-0 flex-1`}
                  />
                  {COLOR_PROPERTIES.has(row.prop) && palette.length > 0 && (
                    <div className="w-24 shrink-0">
                      <ToolbarDropdown
                        value={row.value}
                        onChange={(value: string) => updateRow(stop, row.id, { value })}
                        placeholder="Palette"
                      >
                        {palette.map(v => (
                          <option key={v.varName} value={`var(${v.varName})`}>
                            {v.name}
                          </option>
                        ))}
                      </ToolbarDropdown>
                    </div>
                  )}
                  <ToolbarIconButton
                    variant="subtle"
                    ariaLabel={`Remove ${row.prop} from stop ${index + 1}`}
                    tooltip="Remove property"
                    disabled={stop.rows.length <= 1}
                    onClick={() =>
                      updateStop(stop.id, { rows: stop.rows.filter(r => r.id !== row.id) })
                    }
                  >
                    <TbX className="size-3.5" aria-hidden />
                  </ToolbarIconButton>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={free.length === 0}
              onClick={() => updateStop(stop.id, { rows: [...stop.rows, draftRow(free[0])] })}
              className={`${ADD_BUTTON_CLASS} mt-1`}
            >
              <TbPlus className="size-3" aria-hidden />
              Add property
            </button>
          </div>
        );
      })}

      <button
        type="button"
        disabled={stops.length >= SITE_ANIMATION_MAX_KEYFRAMES}
        onClick={addStop}
        className={`${ADD_BUTTON_CLASS} self-start`}
      >
        <TbPlus className="size-3" aria-hidden />
        Add stop
      </button>
    </div>
  );
}
