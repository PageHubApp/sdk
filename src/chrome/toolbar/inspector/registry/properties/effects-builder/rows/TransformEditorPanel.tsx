import { TbStack } from "react-icons/tb";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { TransformFields } from "@/chrome/toolbar/inputs/advanced/EffectsClassInput";
import type { EditorPanelProps } from "../effectTypes";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../../../../overlays/overlayZIndex";

export default function TransformEditorPanel({ initialPosition, onClose }: EditorPanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Transform"
      icon={<TbStack aria-hidden />}
      storageKey="effects-builder-transform"
      minWidth={300}
      maxWidth={480}
      minHeight={300}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <TransformFields />
    </FloatingPanel>
  );
}
