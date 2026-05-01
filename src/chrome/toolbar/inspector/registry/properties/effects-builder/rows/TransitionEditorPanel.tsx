import { TbTransitionRight } from "react-icons/tb";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { TransitionFields } from "@/chrome/toolbar/inputs/advanced/EffectsClassInput";
import type { EditorPanelProps } from "../effectTypes";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../../../../popovers/overlayZIndex";

export default function TransitionEditorPanel({ initialPosition, onClose }: EditorPanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Transition"
      icon={<TbTransitionRight aria-hidden />}
      storageKey="effects-builder-transition"
      minWidth={300}
      maxWidth={460}
      minHeight={180}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <TransitionFields />
    </FloatingPanel>
  );
}
