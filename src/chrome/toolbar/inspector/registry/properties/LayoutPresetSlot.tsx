import { useNode } from "@craftjs/core";
import { LayoutPresetInput } from "../../../inputs/layout/LayoutPresetInput";
import { useLayoutPreset } from "../../../inputs/layout/hooks/useLayoutPreset";

const LAYOUT_HOSTS = new Set(["Container", "Data", "Header", "Footer", "Form"]);

/**
 * Registry slot wrapper around LayoutPresetInput.
 * Renders for any layout-host component (Container, Data, Header, Footer, Form),
 * regardless of whether `props.type` is set — flex/grid presets need to be
 * pickable on bare Container drops too. Wires the preset controller via
 * useLayoutPreset so the body shares state with Alignment shortcuts below.
 */
export function LayoutPresetSlot() {
  const { componentName } = useNode(node => ({
    componentName: (node.data?.name || node.data?.displayName || "") as string,
  }));
  const lp = useLayoutPreset({ propKey: "layoutPreset" });
  if (!LAYOUT_HOSTS.has(componentName)) return null;
  return <LayoutPresetInput lp={lp} sectionWrapper={false} />;
}
