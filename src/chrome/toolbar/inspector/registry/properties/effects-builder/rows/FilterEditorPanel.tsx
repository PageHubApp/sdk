import { TbDroplet } from "react-icons/tb";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { FilterFields } from "@/chrome/toolbar/inputs/advanced/EffectsClassInput";
import type { EditorPanelProps } from "../effectTypes";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../../../../popovers/overlayZIndex";

export default function FilterEditorPanel({ initialPosition, onClose }: EditorPanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Filter"
      icon={<TbDroplet aria-hidden />}
      storageKey="effects-builder-filter"
      minWidth={300}
      maxWidth={480}
      minHeight={260}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <FilterFields />
    </FloatingPanel>
  );
}
