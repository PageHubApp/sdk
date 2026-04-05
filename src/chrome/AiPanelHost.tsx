// @ts-nocheck
import React from "react";
import { useSDK } from "../context";
import { useAiEnabled } from "../utils/hooks/useAiEnabled";

/**
 * Renders the host-supplied assistant panel when AI chrome is enabled.
 * Must live inside Craft `<Editor>` so injected content can use `useEditor()`.
 */
export function AiPanelHost() {
  const { readOnly, config, emitter } = useSDK();
  const aiEnabled = useAiEnabled();
  const render = config.renderAiPanel;

  if (readOnly || !aiEnabled || typeof render !== "function") {
    return null;
  }

  return <>{render({ emitter })}</>;
}
