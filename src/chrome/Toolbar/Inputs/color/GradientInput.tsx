import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { TailwindStyles } from "utils/tailwind";
import { changeProp } from "../../../Viewport/lib";
import { ViewAtom } from "../../../Viewport/atoms";
import { editorCanvasViewToClassPrefixKey } from "../../../../utils/tailwind/className";
import { ViewSelectionAtom } from "../../Label";
import { ColorInput } from "./ColorInput";
import { useCallback, useMemo } from "react";

const DIRECTIONS = TailwindStyles.gradients as string[];

const DIRECTION_ARROWS: Record<string, string> = {
  "bg-linear-to-tl": "↖",
  "bg-linear-to-t": "↑",
  "bg-linear-to-tr": "↗",
  "bg-linear-to-r": "→",
  "bg-linear-to-br": "↘",
  "bg-linear-to-b": "↓",
  "bg-linear-to-bl": "↙",
  "bg-linear-to-l": "←",
};

const DIR_TO_CSS: Record<string, string> = {
  "bg-linear-to-t": "to top",
  "bg-linear-to-tr": "to top right",
  "bg-linear-to-r": "to right",
  "bg-linear-to-br": "to bottom right",
  "bg-linear-to-b": "to bottom",
  "bg-linear-to-bl": "to bottom left",
  "bg-linear-to-l": "to left",
  "bg-linear-to-tl": "to top left",
};

const ROW_ORDER = [
  "bg-linear-to-tl", "bg-linear-to-t", "bg-linear-to-tr", "bg-linear-to-r",
  "bg-linear-to-br", "bg-linear-to-b", "bg-linear-to-bl", "bg-linear-to-l",
];

const parseDirection = (cn: string) =>
  cn.match(/\bbg-linear-to-(?:t|tr|r|br|b|bl|l|tl)\b/)?.[0] || "";

const parseStop = (cn: string, prefix: string) =>
  cn.match(new RegExp(`\\b${prefix}-\\[([^\\]]+)\\]`))?.[1] || "";

const parsePosition = (cn: string, prefix: string): number | null => {
  const match = cn.match(new RegExp(`\\b${prefix}-(\\d+)%`));
  return match ? parseInt(match[1]) : null;
};

const replacePosition = (cn: string, prefix: string, value: number | null): string => {
  const cleaned = cn.replace(new RegExp(`\\s*\\b${prefix}-\\d+%`, "g"), "");
  if (value === null) return cleaned.trim();
  return `${cleaned.trim()} ${prefix}-${value}%`;
};

export const GradientInput = () => {
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const { actions, query } = useEditor();
  const {
    actions: { setProp },
    props,
    id,
  } = useNode(node => ({ props: node.data.props, id: node.id }));

  const className = props?.className || "";
  const direction = useMemo(() => parseDirection(className), [className]);
  const hasGradient = !!direction;
  const fromColor = useMemo(() => parseStop(className, "from"), [className]);
  const toColor = useMemo(() => parseStop(className, "to"), [className]);
  const viaColor = useMemo(() => parseStop(className, "via"), [className]);
  const fromPos = useMemo(() => parsePosition(className, "from"), [className]);
  const viaPos = useMemo(() => parsePosition(className, "via"), [className]);
  const toPos = useMemo(() => parsePosition(className, "to"), [className]);

  const classWriteView = editorCanvasViewToClassPrefixKey(view);

  const setDirection = (dir: string) => {
    changeProp({
      propKey: "backgroundGradient",
      propType: "class",
      value: dir,
      setProp, query, actions, nodeId: id,
      view: classWriteView, classDark,
    });
  };

  const setPosition = useCallback((prefix: string, value: number | null) => {
    setProp((p: any) => {
      p.className = replacePosition(p.className || "", prefix, value);
    }, 500);
  }, [setProp]);

  const previewBg = useMemo(() => {
    if (!hasGradient) return null;
    const dir = DIR_TO_CSS[direction] || "to bottom";
    const from = fromColor || "transparent";
    const to = toColor || "transparent";
    const via = viaColor;
    const fromStop = `${from}${fromPos != null ? ` ${fromPos}%` : ""}`;
    const toStop = `${to}${toPos != null ? ` ${toPos}%` : ""}`;
    const viaStop = via ? `${via}${viaPos != null ? ` ${viaPos}%` : ""}` : null;
    const stops = viaStop ? `${fromStop}, ${viaStop}, ${toStop}` : `${fromStop}, ${toStop}`;
    return `linear-gradient(${dir}, ${stops})`;
  }, [hasGradient, direction, fromColor, toColor, viaColor, fromPos, viaPos, toPos]);

  return (
    <div className="flex flex-col gap-2">
      {/* Direction row — always visible, consistent layout */}
      <div className="flex items-center gap-px rounded-md border border-base-300 overflow-hidden">
        {ROW_ORDER.map(dir => (
          <button
            key={dir}
            type="button"
            onClick={() => setDirection(direction === dir ? "" : dir)}
            title={dir.replace("bg-linear-to-", "to ").toUpperCase()}
            className={`flex flex-1 items-center justify-center py-1.5 text-xs transition-colors ${
              direction === dir
                ? "bg-primary text-primary-content"
                : "bg-neutral/30 text-neutral-content hover:bg-neutral"
            }`}
          >
            {DIRECTION_ARROWS[dir]}
          </button>
        ))}
      </div>

      {/* Preview bar */}
      {hasGradient && (
        <div
          className="h-5 w-full rounded border border-base-300 transition-all"
          style={{ background: previewBg || undefined }}
        />
      )}

      {/* Color stops with position sliders */}
      {hasGradient && (
        <div className="flex flex-col gap-2">
          <StopRow label="From" propKey="backgroundGradientFrom" prefix="from" position={fromPos} onPosition={(v) => setPosition("from", v)} />
          <StopRow label="Via" propKey="backgroundGradientVia" prefix="via" position={viaPos} onPosition={(v) => setPosition("via", v)} />
          <StopRow label="To" propKey="backgroundGradientTo" prefix="to" position={toPos} onPosition={(v) => setPosition("to", v)} />

          <button
            type="button"
            onClick={() => setDirection("")}
            className="self-end text-[10px] text-neutral-content hover:text-error transition-colors"
          >
            Remove gradient
          </button>
        </div>
      )}
    </div>
  );
};

const StopRow = ({
  label, propKey, prefix, position, onPosition,
}: {
  label: string;
  propKey: string;
  prefix: string;
  position: number | null;
  onPosition: (v: number | null) => void;
}) => (
  <div className="flex flex-col gap-0.5">
    <ColorInput propKey={propKey} label={label} prefix={prefix} propType="class" />
    <div className="flex items-center gap-1.5 pl-[52px]">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={position ?? (prefix === "from" ? 0 : prefix === "to" ? 100 : 50)}
        onChange={(e) => onPosition(parseInt(e.target.value))}
        className="slider h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-neutral"
      />
      <span className="w-7 text-right text-[10px] text-neutral-content tabular-nums">
        {position != null ? `${position}%` : "—"}
      </span>
      {position != null && (
        <button type="button" onClick={() => onPosition(null)} className="text-[10px] text-neutral-content hover:text-error">×</button>
      )}
    </div>
  </div>
);
