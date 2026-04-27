/**
 * BundleRowPanel — heavy panel module for BundleRow. Lazy-loaded so editing
 * FloatingPanel / PropertyRenderer doesn't ripple through every BundleRow
 * mounted in the toolbar import graph.
 */
import type { ReactNode } from "react";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { PropertyRenderer } from "../../unified-settings/PropertyRenderer";
import type { PropertyDef } from "../../unified-settings/registry/propertyDefs";

interface PanelProps {
  title: string;
  icon?: ReactNode;
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  properties: PropertyDef[];
}

export default function BundleRowPanel({
  title,
  icon,
  storageKey,
  defaultWidth,
  defaultHeight,
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
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={260}
      maxWidth={480}
      minHeight={120}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={1100}
      scrollable
    >
      {properties.map(child => (
        <PropertyRenderer key={child.id} def={child} />
      ))}
    </FloatingPanel>
  );
}
