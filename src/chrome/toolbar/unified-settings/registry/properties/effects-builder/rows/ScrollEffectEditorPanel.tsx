/**
 * Lazy editor panel for the "Scroll Effect" effect row. Hosts the existing
 * `ContainerScrollEffectSection` (Container-only — gate already applied at
 * the picker level).
 */
import { TbChevronsDown } from "react-icons/tb";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { ContainerScrollEffectSection } from "@/chrome/toolbar/unified-settings/mainTabs/ContainerScrollEffectSection";
import type { EditorPanelProps } from "../effectTypes";

export default function ScrollEffectEditorPanel({ initialPosition, onClose }: EditorPanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Scroll Effect"
      icon={<TbChevronsDown aria-hidden />}
      storageKey="effects-builder-scroll"
      minWidth={300}
      maxWidth={480}
      minHeight={260}
      initialPosition={initialPosition}
      zIndex={1100}
      scrollable
    >
      <ContainerScrollEffectSection />
    </FloatingPanel>
  );
}
