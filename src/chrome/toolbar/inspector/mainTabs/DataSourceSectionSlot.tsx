import { useNode } from "@craftjs/core";
import { SlotRenderer } from "../../../../registry";

/**
 * Renders the host data source panel via the `node/data-source-section`
 * slot. Used from Container main tab and Advanced properties — same UI as
 * the app's DataSourceSection.
 */
export function DataSourceSectionSlot() {
  const { id } = useNode();
  return <SlotRenderer id="node/data-source-section" ctx={{ nodeId: id }} />;
}
