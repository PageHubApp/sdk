import { useCallback, useRef } from "react";
import { useAtomState } from "@zedux/react";
import { VIEW_BREAKPOINT_SCOPE_KEYS } from "../../utils/tailwind/className";
import { ToolbarPortalDropdown } from "../inline-tools/ToolbarPortalDropdown";
import { ViewSelectionAtom, breakpointScopeHasSelection } from "./Label";

const BREAKPOINT_LABELS: Record<string, string> = {
  mobile: "xs",
  sm: "sm",
  desktop: "md",
  lg: "lg",
  xl: "xl",
  "2xl": "2xl",
};

const BREAKPOINT_PILL = {
  dot: "bg-base-content",
  pill: "bg-accent text-accent-content",
  active: "bg-accent text-accent-content ring-1 ring-accent-content/20",
};

export const TabBarBreakpointPicker = () => {
  const [viewSelection, setViewSelection] = useAtomState(ViewSelectionAtom);
  const hasSelection = breakpointScopeHasSelection(viewSelection);

  const dragState = useRef<{ active: boolean; value: boolean; last: string | null }>({
    active: false,
    value: false,
    last: null,
  });
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const startDrag = useCallback(
    (key: string) => {
      const next = !viewSelection[key];
      dragState.current = { active: true, value: next, last: key };
      setViewSelection(prev => ({ ...prev, [key]: next }));
      const stopDrag = () => {
        dragState.current = { active: false, value: false, last: null };
        window.removeEventListener("mouseup", stopDrag);
      };
      window.addEventListener("mouseup", stopDrag);
    },
    [viewSelection, setViewSelection]
  );

  const onDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.current.active) return;
      // Check which pill the pointer is over using bounding rects (never misses)
      for (const [key, el] of pillRefs.current) {
        if (key === dragState.current.last) continue;
        const r = el.getBoundingClientRect();
        if (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        ) {
          dragState.current.last = key;
          setViewSelection(prev => ({ ...prev, [key]: dragState.current.value }));
          break;
        }
      }
    },
    [setViewSelection]
  );

  return (
    <ToolbarPortalDropdown
      openOn="hover"
      align="left"
      className="border-base-300 bg-base-200 flex flex-col gap-1 rounded-lg border p-2 shadow-md"
      trigger={
        <button
          type="button"
          className="hover:bg-accent flex cursor-pointer flex-col gap-px rounded p-1 transition-[color,background-color,transform] active:scale-90"
          aria-label="Select breakpoint scope"
        >
          {(
            [
              ["mobile", "sm", "desktop"],
              ["lg", "xl", "2xl"],
            ] as const
          ).map((row, i) => (
            <div key={i} className="flex gap-px">
              {row.map(k => (
                <span
                  key={k}
                  className={`block size-[5px] rounded-[1px] transition-opacity ${BREAKPOINT_PILL.dot} ${viewSelection[k] ? "opacity-100" : "opacity-20"}`}
                />
              ))}
            </div>
          ))}
        </button>
      }
    >
      <p className="text-neutral-content px-0.5 text-[10px] font-medium tracking-widest uppercase">
        Breakpoint scope
      </p>
      <div className="flex flex-wrap gap-1" onMouseMove={onDragMove}>
        {VIEW_BREAKPOINT_SCOPE_KEYS.map(key => {
          const isOn = viewSelection[key];
          return (
            <button
              key={key}
              ref={el => {
                if (el) pillRefs.current.set(key, el);
                else pillRefs.current.delete(key);
              }}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                startDrag(key);
              }}
              aria-pressed={isOn}
              className={`cursor-pointer rounded px-2 py-0.5 text-xs font-semibold transition-[color,background-color,transform] active:scale-95 select-none ${
                isOn
                  ? BREAKPOINT_PILL.active
                  : BREAKPOINT_PILL.pill + " opacity-60 hover:opacity-100"
              }`}
            >
              {BREAKPOINT_LABELS[key]}
            </button>
          );
        })}
      </div>
      {hasSelection && (
        <button
          type="button"
          onClick={() => {
            const cleared = Object.fromEntries(VIEW_BREAKPOINT_SCOPE_KEYS.map(k => [k, false]));
            setViewSelection(prev => ({ ...prev, ...cleared }));
          }}
          className="text-neutral-content hover:text-base-content mt-0.5 cursor-pointer rounded px-1 py-0.5 text-[10px] transition-[color,transform] active:scale-90"
        >
          Clear all
        </button>
      )}
    </ToolbarPortalDropdown>
  );
};
