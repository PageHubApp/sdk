import { ConfirmDialog } from "@/chrome/primitives/layout/ConfirmDialog";
import { SettingsShell } from "@/chrome/viewport/settings/SettingsShell";
import { useEditorSidebarDockLeft } from "@/utils/lib";
import { useEffect, useMemo } from "react";
import { TbFolder } from "react-icons/tb";
import { ImageCropModal } from "../../dialogs/ImageCropModal";
import { MediaManagerBody } from "./MediaManagerBody";
import { MediaPreviewModal } from "./components/MediaPreviewModal";
import { useMediaManager } from "./hooks/useMediaManager";
import { type MediaKind } from "./utils/media-helpers";
import { OVERLAY_Z_MEDIA_MANAGER } from "@/chrome/overlays/overlayZIndex";

interface MediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mediaId: string) => void;
  selectionMode?: boolean;
  /** Restrict the picker to a single media kind (e.g. only videos for a Video
   *  component picker). User can still flip the "All" tab to widen. */
  kindFilter?: MediaKind;
}

const MEDIA_MANAGER_DEFAULT_WIDTH = 1080;
const MEDIA_MANAGER_Z = OVERLAY_Z_MEDIA_MANAGER;

export function MediaManagerModal({
  isOpen,
  onClose,
  onSelect,
  selectionMode = false,
  kindFilter,
}: MediaManagerModalProps) {
  const manager = useMediaManager({ isOpen, onClose, onSelect, selectionMode });

  const toolbarDockedLeft = useEditorSidebarDockLeft();
  const dockEdge: "left" | "right" = toolbarDockedLeft ? "left" : "right";
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const defaultHeight = Math.max(560, Math.min(760, Math.round(viewportHeight * 0.78)));
  const maxHeight = Math.max(640, Math.min(860, Math.round(viewportHeight * 0.9)));

  useEffect(() => {
    if (!isOpen) return;
    const nextKind = kindFilter ?? "all";
    if (manager.kindFilter !== nextKind) {
      manager.setKindFilter(nextKind);
    }
  }, [isOpen, kindFilter, manager.kindFilter, manager.setKindFilter]);

  const folderTabs = useMemo(
    () => [
      {
        key: "folder:all",
        label: `All (${manager.folderCounts.all})`,
        icon: <TbFolder />,
      },
      {
        key: "folder:unfiled",
        label: `Unfiled (${manager.folderCounts.unfiled})`,
        icon: <TbFolder />,
      },
      ...manager.folders.map(folder => ({
        key: `folder:${folder.id}`,
        label: `${folder.name} (${manager.folderCounts.byId.get(folder.id) || 0})`,
        icon: <TbFolder />,
      })),
    ],
    [
      manager.folderCounts.all,
      manager.folderCounts.byId,
      manager.folderCounts.unfiled,
      manager.folders,
    ]
  );

  const activeFolderTab =
    manager.folderFilter === "all"
      ? "folder:all"
      : manager.folderFilter === "unfiled"
        ? "folder:unfiled"
        : `folder:${manager.folderFilter}`;

  return (
    <>
      <SettingsShell
        isOpen={isOpen}
        onClose={onClose}
        title={selectionMode ? "Select Media" : "Media Manager"}
        storageKey="media-manager-v3"
        tabs={folderTabs}
        activeTab={activeFolderTab}
        setActiveTab={key => {
          const raw = String(key).replace(/^folder:/, "");
          manager.setFolderFilter(raw === "all" || raw === "unfiled" ? raw : raw);
        }}
        defaultWidth={MEDIA_MANAGER_DEFAULT_WIDTH}
        defaultHeight={defaultHeight}
        minWidth={760}
        maxWidth={1400}
        minHeight={500}
        maxHeight={maxHeight}
        dockToEdge={dockEdge}
        zIndex={MEDIA_MANAGER_Z}
      >
        <MediaManagerBody
          manager={manager}
          selectionMode={selectionMode}
          onSelect={onSelect}
          onClose={onClose}
          popover={false}
        />
      </SettingsShell>

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
