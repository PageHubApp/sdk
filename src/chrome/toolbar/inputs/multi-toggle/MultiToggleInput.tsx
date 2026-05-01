/**
 * MultiToggleInput — row of independent icon toggles, each owning its own
 * Tailwind class + propKey (font-bold/fontWeight, italic/fontStyle,
 * underline+line-through/textDecoration). Leading "None" clears every toggle
 * at the active view.
 */
import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { TbBan } from "react-icons/tb";
import { changeProp, getPropFinalValue } from "../../../viewport/state/viewportExports";
import { ViewAtom } from "../../../viewport/state/atoms";
import { ViewSelectionAtom } from "../../Label";
import { editorCanvasViewToClassPrefixKey } from "@/utils/tailwind/className";
import { Chip } from "@/chrome/primitives/Chip";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";
import {
  TOOLBAR_SEGMENTED_ACTIVE,
  TOOLBAR_SEGMENTED_INACTIVE,
} from "../../primitives/ToolbarSegmentedControl";
import type { PropertyDef } from "../../inspector/registry/propertyDefs";

interface Props {
  def: PropertyDef;
}

export const MultiToggleInput = ({ def }: Props) => {
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classWriteView = editorCanvasViewToClassPrefixKey(view);
  const { actions, query } = useEditor();
  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data?.props || {},
    id: node.id,
  }));

  if (def.input.type !== "multi-toggle") return null;
  const { toggles } = def.input;

  const className = nodeProps.className || "";
  const activeStates = toggles.map(t => {
    const { value } = getPropFinalValue(
      { propKey: t.propKey, propType: "class" },
      view,
      { className },
      classDark
    );
    return value === t.className;
  });

  const writeToggle = (idx: number, nextValue: string) => {
    changeProp({
      propKey: toggles[idx].propKey,
      propType: "class",
      value: nextValue,
      setProp,
      query,
      actions,
      nodeId: id,
      view: classWriteView,
      classDark,
    });
  };

  const clearAll = () => {
    for (let i = 0; i < toggles.length; i++) writeToggle(i, "");
  };

  const anyActive = activeStates.some(Boolean);

  return (
    <Chip frame="bare" label={def.label} propKey={def.id} propType="class">
      <div role="group" className="bg-neutral flex w-full min-w-0 gap-1 rounded-md p-1">
        <button
          type="button"
          onClick={clearAll}
          disabled={!anyActive}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="None"
          className={`flex h-6 min-w-0 flex-1 items-center justify-center rounded text-[11px] leading-tight font-medium transition-colors ${
            anyActive ? TOOLBAR_SEGMENTED_INACTIVE : TOOLBAR_SEGMENTED_ACTIVE
          }`}
          aria-label="Clear all"
          aria-pressed={!anyActive}
        >
          <TbBan className="size-3.5" aria-hidden />
        </button>
        {toggles.map((t, idx) => {
          const active = activeStates[idx];
          return (
            <button
              key={t.propKey + t.className}
              type="button"
              onClick={() => writeToggle(idx, active ? "" : t.className)}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={t.tooltip}
              aria-label={t.tooltip}
              aria-pressed={active}
              className={`flex h-6 min-w-0 flex-1 items-center justify-center rounded text-[11px] leading-tight font-medium transition-colors ${
                active ? TOOLBAR_SEGMENTED_ACTIVE : TOOLBAR_SEGMENTED_INACTIVE
              }`}
            >
              {t.icon}
            </button>
          );
        })}
      </div>
    </Chip>
  );
};
