import { SettingsShell } from "@/chrome/viewport/modals/settings/SettingsShell";
import { useEditorSidebarDockLeft } from "@/utils/atoms";
import { useEffect, useMemo, useState } from "react";
import { TbFolder } from "react-icons/tb";
import { MediaManagerBody } from "./MediaManagerBody";
import { useEditorDesignContext } from "./hooks/useEditorDesignContext";
import { useMediaManager } from "./hooks/useMediaManager";
import type { MediaKind } from "@/utils/media/libraryTypes";
import { getMediaPicker, type MediaPickerSource } from "@/utils/media/registry";
import { OVERLAY_Z_MEDIA_MANAGER } from "@/chrome/popovers/overlayZIndex";

interface MediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mediaId: string) => void;
  selectionMode?: boolean;
  /** Restrict the picker to a single media kind (e.g. only videos for a Video
   *  component picker). User can still flip the "All" tab to widen. */
  kindFilter?: MediaKind;
  /** The file the caller uses now — a registered picker shows it selected. */
  selectedId?: string | null;
  /** Other sources a registered picker offers (ignored by the SDK manager). */
  sources?: MediaPickerSource[];
}

const MEDIA_MANAGER_DEFAULT_WIDTH = 1080;
const MEDIA_MANAGER_Z = OVERLAY_Z_MEDIA_MANAGER;

/**
 * The library dialog every SDK surface opens. A host-registered picker
 * (`registerMediaPicker`) replaces the SDK Media Manager below; picking
 * defaults to images, the kind nearly every caller inserts.
 */
export function MediaManagerModal(props: MediaManagerModalProps) {
  // Read once per mount, like the library store: the branch can't change mid-life.
  const [Picker] = useState(getMediaPicker);
  if (!Picker) return <SdkMediaManagerModal {...props} />;
  const { isOpen, onClose, onSelect, selectionMode = false, kindFilter, selectedId, sources } =
    props;
  return (
    <Picker
      isOpen={isOpen}
      onClose={onClose}
      mode={selectionMode ? "pick" : "browse"}
      kind={selectionMode ? (kindFilter ?? "image") : "all"}
      selectedId={selectedId}
      onPick={item => onSelect?.(item.id)}
      sources={sources}
    />
  );
}

function SdkMediaManagerModal({
  isOpen,
  onClose,
  onSelect,
  selectionMode = false,
  kindFilter,
}: MediaManagerModalProps) {
  const designContext = useEditorDesignContext();
  const manager = useMediaManager({ isOpen, onClose, onSelect, selectionMode, designContext });

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
  );
}
