/**
 * BorderSidesPicker — visual box-model picker replacing the four
 * Border Top/Bottom/Left/Right toggle rows. Click an edge of the
 * square to toggle that side's `border-{t|b|l|r}` class. Click the
 * center to toggle all four sides at once.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useMemo } from "react";
import { ViewAtom } from "../../../viewport/atoms";

type SideId = "top" | "bottom" | "left" | "right";

interface SideDef {
  id: SideId;
  propKey: string;
  /** Tailwind class set when the side is active */
  on: string;
  /** Tooltip / aria label */
  label: string;
}

const SIDES: SideDef[] = [
  { id: "top", propKey: "borderTop", on: "border-t", label: "Top" },
  { id: "bottom", propKey: "borderBottom", on: "border-b", label: "Bottom" },
  { id: "left", propKey: "borderLeft", on: "border-l", label: "Left" },
  { id: "right", propKey: "borderRight", on: "border-r", label: "Right" },
];

/** Breakpoint prefix to use when writing a class for the given canvas view. */
function prefixForView(view: string): string {
  if (view === "mobile") return "";
  if (view === "desktop") return "md:";
  return `${view}:`;
}

/** All possible prefixed variants of a class we should detect as "this side is on". */
function possibleVariants(on: string, view: string): string[] {
  if (view === "desktop") return [`md:${on}`, on]; // desktop reads from md: or falls back to unprefixed
  return [`${prefixForView(view)}${on}`];
}

export function BorderSidesPicker() {
  const view = useAtomValue(ViewAtom);
  const {
    actions: { setProp },
    classNameStr,
  } = useNode(node => ({
    classNameStr: typeof node.data?.props?.className === "string" ? node.data.props.className : "",
  }));

  const sideActive = useMemo(() => {
    const map: Record<SideId, boolean> = { top: false, bottom: false, left: false, right: false };
    if (!classNameStr) return map;
    const tokens = classNameStr.split(/\s+/).filter(Boolean);
    for (const side of SIDES) {
      const variants = possibleVariants(side.on, view);
      if (tokens.some(t => variants.includes(t))) map[side.id] = true;
    }
    return map;
  }, [classNameStr, view]);

  const allActive = SIDES.every(s => sideActive[s.id]);
  const anyActive = SIDES.some(s => sideActive[s.id]);

  /** Write one side: remove any existing variants of this side's class, then add the one for current view (if turning on). */
  const writeSide = (side: SideDef, nextOn: boolean) => {
    const target = `${prefixForView(view)}${side.on}`;
    setProp((p: any) => {
      const tokens = (typeof p.className === "string" ? p.className : "")
        .split(/\s+/)
        .filter(Boolean);
      // Remove all prefixed + unprefixed variants of this side from every breakpoint so we
      // don't end up with duplicates across views when toggling.
      const allPrefixes = ["", "sm:", "md:", "lg:", "xl:", "2xl:"];
      const forbidden = new Set(allPrefixes.map(pre => `${pre}${side.on}`));
      const cleaned = tokens.filter(t => !forbidden.has(t));
      if (nextOn) cleaned.push(target);
      p.className = cleaned.join(" ");
    });
  };

  const toggleSide = (side: SideDef) => writeSide(side, !sideActive[side.id]);

  const toggleAll = () => {
    const turnOff = anyActive;
    setProp((p: any) => {
      const tokens = (typeof p.className === "string" ? p.className : "")
        .split(/\s+/)
        .filter(Boolean);
      const allPrefixes = ["", "sm:", "md:", "lg:", "xl:", "2xl:"];
      const forbidden = new Set<string>();
      for (const side of SIDES) for (const pre of allPrefixes) forbidden.add(`${pre}${side.on}`);
      const cleaned = tokens.filter(t => !forbidden.has(t));
      if (!turnOff) {
        for (const side of SIDES) cleaned.push(`${prefixForView(view)}${side.on}`);
      }
      p.className = cleaned.join(" ");
    });
  };

  const edgeBase =
    "absolute cursor-pointer rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const edgeOn = "bg-primary";
  const edgeOff = "bg-base-300 hover:bg-base-content/30";

  return (
    <div className="flex w-full justify-center py-2">
      <div className="relative size-24" aria-label="Border sides">
        {/* Top */}
        <button
          type="button"
          aria-label={`Toggle top border (${sideActive.top ? "on" : "off"})`}
          aria-pressed={sideActive.top}
          onClick={() => toggleSide(SIDES[0])}
          className={`${edgeBase} top-0 left-3 right-3 h-1.5 ${sideActive.top ? edgeOn : edgeOff}`}
        />
        {/* Bottom */}
        <button
          type="button"
          aria-label={`Toggle bottom border (${sideActive.bottom ? "on" : "off"})`}
          aria-pressed={sideActive.bottom}
          onClick={() => toggleSide(SIDES[1])}
          className={`${edgeBase} bottom-0 left-3 right-3 h-1.5 ${sideActive.bottom ? edgeOn : edgeOff}`}
        />
        {/* Left */}
        <button
          type="button"
          aria-label={`Toggle left border (${sideActive.left ? "on" : "off"})`}
          aria-pressed={sideActive.left}
          onClick={() => toggleSide(SIDES[2])}
          className={`${edgeBase} top-3 bottom-3 left-0 w-1.5 ${sideActive.left ? edgeOn : edgeOff}`}
        />
        {/* Right */}
        <button
          type="button"
          aria-label={`Toggle right border (${sideActive.right ? "on" : "off"})`}
          aria-pressed={sideActive.right}
          onClick={() => toggleSide(SIDES[3])}
          className={`${edgeBase} top-3 bottom-3 right-0 w-1.5 ${sideActive.right ? edgeOn : edgeOff}`}
        />

        {/* Center — toggle all */}
        <button
          type="button"
          aria-label={allActive ? "Clear all sides" : "Set all sides"}
          aria-pressed={allActive}
          onClick={toggleAll}
          className={`absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-md text-[10px] font-medium uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            allActive
              ? "bg-primary text-primary-content"
              : anyActive
                ? "bg-base-300 text-base-content hover:bg-base-content/20"
                : "bg-base-200 text-neutral-content hover:bg-base-300"
          }`}
        >
          {allActive ? "All" : anyActive ? "Mix" : "—"}
        </button>
      </div>
    </div>
  );
}
