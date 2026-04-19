import { useNode } from "@craftjs/core";
import { useSDK } from "../../../../core/context";

/**
 * Renders the host app data source panel (editorChromeSlots.renderDataSourceSection).
 * Used from Container main tab and Advanced properties — same UI as app DataSourceSection.
 */
export function DataSourceSectionSlot() {
  const { id } = useNode();
  const { config } = useSDK();
  const render = config.editorChromeSlots?.renderDataSourceSection;
  if (!render) return null;
  return <>{render({ nodeId: id })}</>;
}
