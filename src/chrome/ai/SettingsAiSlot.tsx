import { useNode } from "@craftjs/core";
import { useSDK } from "../../core/context";
import { useAiEnabled } from "../../utils/hooks/useAiEnabled";

/** Renders `editorChromeSlots.renderSettingsAiButton` when AI features are on. */
export function SettingsAiSlot() {
  const { id, displayName, resolvedType } = useNode(node => ({
    id: node.id,
    displayName:
      (node.data.custom?.displayName as string | undefined) ||
      (node.data.displayName as string | undefined) ||
      String(node.data.name || "Element"),
    resolvedType: (node.data.type as { resolvedName?: string } | undefined)?.resolvedName,
  }));
  const { config } = useSDK();
  const ai = useAiEnabled();
  const render = config.editorChromeSlots?.renderSettingsAiButton;
  if (!ai || !render) return null;
  return <>{render({ nodeId: id, displayName, resolvedType })}</>;
}
