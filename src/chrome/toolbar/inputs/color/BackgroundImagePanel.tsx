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
import { ConfirmDialog } from "@/chrome/primitives/layout/ConfirmDialog";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { getMediaById, registerMediaWithBackground } from "@/utils/media/media";
import { ImageCropModal } from "../../dialogs/ImageCropModal";
import { MediaManagerBody } from "../media/MediaManagerBody";
import { MediaPreviewModal } from "../media/components/MediaPreviewModal";
import { useMediaManager } from "../media/hooks/useMediaManager";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 600;

export default function BackgroundImagePanel({ initialPosition, onClose }: PanelProps) {
  const { query, actions } = useEditor();
  const {
    actions: { setProp },
    id: componentId,
  } = useNode(node => ({ id: node.id }));

  const handleSelect = (selectedMediaId: string) => {
    if (!selectedMediaId) return;
    const selectedMedia = getMediaById(query, selectedMediaId);

    setProp((p: any) => {
      if (!p.background) p.background = {};
      p.background.image = selectedMediaId;
      p.background.imageType = selectedMedia?.type || "cdn";
    });

    registerMediaWithBackground(
      query,
      actions,
      selectedMediaId,
      selectedMedia?.type || "cdn",
      componentId
    );

    onClose();
  };

  const manager = useMediaManager({
    isOpen: true,
    onClose,
    onSelect: handleSelect,
    selectionMode: true,
  });

  useEffect(() => {
    if (manager.kindFilter !== "all") {
      manager.setKindFilter("all");
    }
  }, [manager.kindFilter, manager.setKindFilter]);

  return (
    <>
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

      <MediaPreviewModal
        previewMedia={manager.previewMedia}
        filteredMedia={manager.filteredMedia}
        onClose={() => manager.setPreviewMedia(null)}
        onPrevious={manager.handlePreviewPrevious}
        onNext={manager.handlePreviewNext}
      />

      <ImageCropModal
        key="image-crop-modal"
        isOpen={manager.cropMedia !== null}
        onClose={() => manager.setCropMedia(null)}
        media={manager.cropMedia}
        onSave={manager.handleSaveCroppedImage}
        settings={manager.settings}
      />

      <ConfirmDialog
        key="delete-confirm-dialog"
        isOpen={manager.deleteConfirm.isOpen}
        onClose={() => manager.setDeleteConfirm({ isOpen: false, mediaIds: [] })}
        onConfirm={manager.confirmDelete}
        title="Delete Media"
        message={
          manager.deleteConfirm.mediaIds.length > 1
            ? `Are you sure you want to delete ${manager.deleteConfirm.mediaIds.length} media items? This action cannot be undone.`
            : "Are you sure you want to delete this media item? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
