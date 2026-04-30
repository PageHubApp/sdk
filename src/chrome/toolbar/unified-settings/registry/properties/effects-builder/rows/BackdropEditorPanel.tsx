import { TbWand } from "react-icons/tb";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { BackdropFields } from "@/chrome/toolbar/inputs/advanced/EffectsClassInput";
import type { EditorPanelProps } from "../effectTypes";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../../../../overlays/overlayZIndex";

export default function BackdropEditorPanel({ initialPosition, onClose }: EditorPanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Backdrop Filter"
      icon={<TbWand aria-hidden />}
      storageKey="effects-builder-backdrop"
      minWidth={300}
      maxWidth={480}
      minHeight={300}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <BackdropFields />
    </FloatingPanel>
  );
}
