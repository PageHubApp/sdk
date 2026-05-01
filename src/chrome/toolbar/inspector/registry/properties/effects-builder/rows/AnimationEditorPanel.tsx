/**
 * Lazy editor panel for the "Animation" effect row. Wraps the existing
 * `AnimationsInput` body inside a `FloatingPanel`. Loaded the first time the
 * user opens the row's chip.
 */
import { TbBolt } from "react-icons/tb";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { AnimationsInput } from "@/chrome/toolbar/inputs/advanced/AnimationsInput";
import type { EditorPanelProps } from "../effectTypes";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../../../../overlays/overlayZIndex";

export default function AnimationEditorPanel({ initialPosition, onClose }: EditorPanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Animation"
      icon={<TbBolt aria-hidden />}
      storageKey="effects-builder-animation"
      minWidth={320}
      maxWidth={520}
      minHeight={300}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <AnimationsInput />
    </FloatingPanel>
  );
}
