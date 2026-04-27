/**
 * NodeAiContextPanel — heavy lazy chunk: FloatingPanel hosting the existing
 * NodeAiContextSection body unchanged.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { NodeAiContextSection } from "../../unified-settings/mainTabs/NodeAiContextSection";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function NodeAiContextPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="AI Context"
      storageKey="node-ai-context"
      minWidth={340}
      maxWidth={560}
      minHeight={360}
      initialPosition={initialPosition}
      zIndex={1100}
      scrollable
    >
      <NodeAiContextSection />
    </FloatingPanel>
  );
}
