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
 *
 * A host-registered picker (`registerMediaPicker`) replaces the panel.
 */
import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useState } from "react";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { getMediaById } from "@/utils/media/media";
import { getMediaPicker } from "@/utils/media/registry";
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
    current,
  } = useNode(node => ({ current: node.data.props?.background?.image as string | undefined }));
  const [Picker] = useState(getMediaPicker);

  // A picker hands back the entry itself: a file uploaded a moment ago may not
  // be mirrored onto the tree yet, so its type comes from the entry.
  const handleSelect = (selectedMediaId: string, type?: string) => {
    if (!selectedMediaId) return;
    const selectedMedia = getMediaById(query, selectedMediaId);

    setProp((p: any) => {
      if (!p.background) p.background = {};
      p.background.image = selectedMediaId;
      p.background.imageType = type || selectedMedia?.type || "cdn";
    });

    onClose();
  };

  if (Picker) {
    return (
      <Picker
        isOpen
        onClose={onClose}
        mode="pick"
        kind="image"
        selectedId={current ?? null}
        onPick={item => handleSelect(item.id, item.type)}
      />
    );
  }
  return (
    <SdkBackgroundImagePanel
      initialPosition={initialPosition}
      onClose={onClose}
      onSelect={handleSelect}
    />
  );
}

function SdkBackgroundImagePanel({
  initialPosition,
  onClose,
  onSelect: handleSelect,
}: PanelProps & { onSelect: (mediaId: string) => void }) {
  const designContext = useEditorDesignContext();
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
