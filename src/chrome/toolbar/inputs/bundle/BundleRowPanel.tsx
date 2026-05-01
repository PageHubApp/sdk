/**
 * BundleRowPanel — heavy panel module for BundleRow. Lazy-loaded so editing
 * FloatingPanel / PropertyRenderer doesn't ripple through every BundleRow
 * mounted in the toolbar import graph.
 */
import type { ReactNode } from "react";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { PropertyRenderer } from "../../inspector/PropertyRenderer";
import type { PropertyDef } from "../../inspector/registry/propertyDefs";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";

interface PanelProps {
  title: string;
  icon?: ReactNode;
  storageKey: string;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  properties: PropertyDef[];
}

export default function BundleRowPanel({
  title,
  icon,
  storageKey,
  initialPosition,
  onClose,
  properties,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title={title}
      icon={icon}
      storageKey={storageKey}
      minWidth={260}
      maxWidth={480}
      minHeight={120}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      {properties.map(child => (
        <PropertyRenderer key={child.id} def={child} />
      ))}
    </FloatingPanel>
  );
}
