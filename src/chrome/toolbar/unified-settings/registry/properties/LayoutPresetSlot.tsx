import { useNode } from "@craftjs/core";
import { LayoutPresetInput } from "../../../inputs/layout/LayoutPresetInput";
import { useLayoutPreset } from "../../../inputs/layout/hooks/useLayoutPreset";

/**
 * Registry slot wrapper around LayoutPresetInput.
 * Renders only on container-typed nodes. Wires the preset controller via
 * useLayoutPreset so the body shares state with Alignment shortcuts below.
 */
export function LayoutPresetSlot() {
  const hasContainerType = useNode(node => node.data?.props?.type != null) as unknown as boolean;
  const lp = useLayoutPreset({ propKey: "layoutPreset" });
  if (!hasContainerType) return null;
  return <LayoutPresetInput lp={lp} sectionWrapper={false} />;
}
