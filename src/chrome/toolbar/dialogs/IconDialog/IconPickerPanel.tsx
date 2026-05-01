/**
 * IconPickerPanel — heavy panel module: FloatingPanel + tabs + icon grid + hook.
 *
 * Lazy-loaded by IconPickerPopover so editing anything in this module (or its
 * transitive deps: useIconDialog, IconsTab, MediaTab, IconCell, FloatingPanel)
 * doesn't cascade HMR through the whole toolbar import graph.
 */
import { type ReactNode } from "react";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { MediaManagerModal } from "../../inputs/media/MediaManagerModal";
import { IconsTab } from "./components/IconsTab";
import { MediaTab } from "./components/MediaTab";
import { useIconDialog } from "./hooks/useIconDialog";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";

interface PanelProps {
  value: string;
  prefix?: string;
  onChange: (value: string) => void;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  defaultWidth: number;
  defaultHeight: number;
}

export default function IconPickerPanel({
  value,
  prefix,
  onChange,
  onClose,
  initialPosition,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Select Icon"
      storageKey="icon-picker"
      autoSize={false}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={320}
      maxWidth={640}
      minHeight={360}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
    >
      <IconPickerBody value={value} prefix={prefix} onChange={onChange} onClose={onClose} />
    </FloatingPanel>
  );
}

interface BodyProps {
  value: string;
  prefix?: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

function IconPickerBody({ value, prefix, onChange, onClose }: BodyProps) {
  const d = useIconDialog({
    value,
    prefix,
    isOpen: true, // body only mounts when panel open
    onChange,
    onClose,
  });

  if (!d.isClient) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="border-base-300 flex shrink-0 gap-4 border-b px-3"
        role="tablist"
        aria-label="Icon selection tabs"
      >
        <TabButton
          active={d.activeTab === "icons"}
          onClick={() => d.setActiveTab("icons")}
          label="Icons"
          id="icons"
        />
        <TabButton
          active={d.activeTab === "media"}
          onClick={() => d.setActiveTab("media")}
          label="Media"
          id="media"
        />
      </div>

      {d.activeTab === "icons" && <IconsTab d={d} />}
      {d.activeTab === "media" && <MediaTab d={d} />}

      {d.showMediaBrowser && (
        <MediaManagerModal
          isOpen={d.showMediaBrowser}
          onClose={() => d.setShowMediaBrowser(false)}
          onSelect={d.handleMediaSelect}
          selectionMode={true}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  id,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  id: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative cursor-pointer py-2 text-xs font-medium transition-colors ${
        active
          ? "text-base-content after:bg-base-content after:absolute after:inset-x-0 after:-bottom-px after:h-px after:content-['']"
          : "text-neutral-content hover:text-base-content"
      }`}
      role="tab"
      aria-selected={active}
      aria-controls={`${id}-tabpanel`}
      id={`${id}-tab`}
      tabIndex={active ? 0 : -1}
    >
      {label}
    </button>
  );
}
