/**
 * BackgroundImagePanel — heavy lazy chunk for the Background image chip.
 * Mirrors `PatternPanel` / `ContainerOverflowSectionPanel`: FloatingPanel +
 * focused body. The body here is `MediaManagerBody` (extracted from
 * `MediaManagerModal`) running in `popover` layout: compact folder dropdown
 * above the toolbar, no sidebar tabs.
 *
 * Owns the `useMediaManager` hook for this panel — `MediaManagerBody`
 * receives the manager via prop so the same body works inside the modal
 * shell + this slim shell with no fork.
 */
import { useEditor, useNode } from "@craftjs/core";
import { useEffect } from "react";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { getMediaById } from "@/utils/media/media";
import { MediaManagerBody } from "../media/MediaManagerBody";
import { useEditorDesignContext } from "../media/hooks/useEditorDesignContext";
import { useMediaManager } from "../media/hooks/useMediaManager";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 600;

export default function BackgroundImagePanel({ initialPosition, onClose }: PanelProps) {
  const { query } = useEditor();
  const {
    actions: { setProp },
  } = useNode();
  const designContext = useEditorDesignContext();

  const handleSelect = (selectedMediaId: string) => {
    if (!selectedMediaId) return;
    const selectedMedia = getMediaById(query, selectedMediaId);

    setProp((p: any) => {
      if (!p.background) p.background = {};
      p.background.image = selectedMediaId;
      p.background.imageType = selectedMedia?.type || "cdn";
    });

    onClose();
  };

  const manager = useMediaManager({
    isOpen: true,
    onClose,
    onSelect: handleSelect,
    selectionMode: true,
    designContext,
  });

  useEffect(() => {
    if (manager.kindFilter !== "all") {
      manager.setKindFilter("all");
    }
  }, [manager.kindFilter, manager.setKindFilter]);

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Select Image"
      storageKey="background-image-picker"
      autoSize={false}
      defaultWidth={PANEL_WIDTH}
      defaultHeight={PANEL_HEIGHT}
      minWidth={360}
      maxWidth={720}
      minHeight={420}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
    >
      <MediaManagerBody
        manager={manager}
        selectionMode
        onSelect={handleSelect}
        onClose={onClose}
        popover
      />
    </FloatingPanel>
  );
}
