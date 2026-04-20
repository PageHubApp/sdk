import { TbIcons, TbPhoto } from "react-icons/tb";
import { MediaManagerModal } from "../inputs/media/MediaManagerModal";
import { LeftSidebarDialog } from "./LeftSidebarDialog";
import { MediaTab } from "./IconDialog/components/MediaTab";
import { IconsTab } from "./IconDialog/components/IconsTab";
import { useIconDialog } from "./IconDialog/hooks/useIconDialog";

export { IconPickerDialogAtom } from "./dialogAtoms";

export function IconPickerDialog() {
  const d = useIconDialog();

  if (typeof document === "undefined" || !d.isClient) return null;

  return (
    <>
      <LeftSidebarDialog
        isOpen={d.dialog.enabled}
        onClose={d.closeDialog}
        title="Select Icon"
        icon={<TbIcons />}
      >
        <div
          className="border-base-300 bg-neutral flex border-b"
          role="tablist"
          aria-label="Icon selection tabs"
        >
          <TabButton
            active={d.activeTab === "icons"}
            onClick={() => d.setActiveTab("icons")}
            icon={<TbIcons size={18} />}
            label="Icons"
            id="icons"
          />
          <TabButton
            active={d.activeTab === "media"}
            onClick={() => d.setActiveTab("media")}
            icon={<TbPhoto size={18} />}
            label="Media"
            id="media"
          />
        </div>

        {d.activeTab === "icons" && <IconsTab d={d} />}
        {d.activeTab === "media" && <MediaTab d={d} />}
      </LeftSidebarDialog>

      {d.showMediaBrowser && (
        <MediaManagerModal
          isOpen={d.showMediaBrowser}
          onClose={() => d.setShowMediaBrowser(false)}
          onSelect={d.handleMediaSelect}
          selectionMode={true}
        />
      )}
    </>
  );
}

// Backwards-compat re-export so existing imports keep working during migration.
export const GoogleIconDialog = IconPickerDialog;

function TabButton({
  active,
  onClick,
  icon,
  label,
  id,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  id: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-base-100 text-primary border-b-2"
          : "text-neutral-content hover:text-base-content"
      }`}
      role="tab"
      aria-selected={active}
      aria-controls={`${id}-tabpanel`}
      id={`${id}-tab`}
      tabIndex={active ? 0 : -1}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
