// @ts-nocheck
import { useNode } from "@craftjs/core";
import { useSDK } from "../context";
import { useAiEnabled } from "../utils/hooks/useAiEnabled";

/** Renders `editorChromeSlots.renderSettingsAiButton` when AI features are on. */
export function SettingsAiSlot() {
  const { id } = useNode();
  const { config } = useSDK();
  const ai = useAiEnabled();
  const render = config.editorChromeSlots?.renderSettingsAiButton;
  if (!ai || !render) return null;
  return <>{render({ nodeId: id })}</>;
}
