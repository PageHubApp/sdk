/**
 * Detects the current node's layout mode (block / flex-row / flex-col / grid).
 * Reads `display` + `flexDirection` from the className across the active view.
 * Used by AlignmentSlots so each slot can self-hide when its mode doesn't apply.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useMemo } from "react";
import { getPropFinalValue } from "../../../../viewport/state/viewportExports";
import { ViewAtom } from "../../../../viewport/state/atoms";
import { EditModifiersAtom } from "../../../Label";

export type LayoutMode = "block" | "flex-row" | "flex-col" | "grid";

export function useLayoutMode(): LayoutMode {
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(EditModifiersAtom).dark ?? false;
  const { classNameStr, currentLayoutMode } = useNode((node: any) => ({
    classNameStr: (node.data?.props?.className as string) || "",
    currentLayoutMode: node.data?.props?.root?.layoutMode as LayoutMode | undefined,
  }));

  const nodePropsForRead = useMemo(() => ({ className: classNameStr }), [classNameStr]);
  const currentDisplay = String(
    getPropFinalValue({ propKey: "display", propType: "class" }, view, nodePropsForRead, classDark)
      .value ?? ""
  );
  const currentFlexDirection = String(
    getPropFinalValue(
      { propKey: "flexDirection", propType: "class" },
      view,
      nodePropsForRead,
      classDark
    ).value ?? ""
  );

  if (currentDisplay.includes("grid")) return "grid";
  if (currentDisplay.includes("flex")) {
    if (currentFlexDirection.includes("flex-col")) return "flex-col";
    return "flex-row";
  }
  if (currentDisplay.includes("block")) return "block";
  if (currentLayoutMode) return currentLayoutMode;
  return "block";
}
