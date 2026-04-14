/**
 * Permissions section — per-node toggle switches for drag, delete, drop-in, move-out.
 * Stored in node.data.custom.permissions, enforced by the wrapper in define.ts normalizeRules().
 */
import { useEditor, useNode } from "@craftjs/core";
import { TbLock } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { registerSection } from "./settingsRegistry";
import type { SectionProps } from "./types";

interface NodePermissions {
  canDrag?: boolean;
  canDelete?: boolean;
  canMoveIn?: boolean;
  canMoveOut?: boolean;
}

const PERM_LABELS: { key: keyof NodePermissions; label: string; description: string }[] = [
  { key: "canDrag", label: "Can drag", description: "Allow this node to be dragged" },
  { key: "canDelete", label: "Can delete", description: "Allow this node to be deleted" },
  { key: "canMoveIn", label: "Can drop into", description: "Allow children to be dropped in" },
  { key: "canMoveOut", label: "Can move children out", description: "Allow children to be moved out" },
];

function PermissionsSection() {
  const { id, permissions, isCanvas } = useNode(node => ({
    id: node.id,
    permissions: (node.data.custom?.permissions || {}) as NodePermissions,
    isCanvas: !!node.data.isCanvas,
  }));

  const { actions } = useEditor();

  const toggle = (key: keyof NodePermissions) => {
    const current = permissions[key];
    // Cycle: undefined (inherit=true) → false (locked) → undefined (inherit=true)
    const next = current === false ? undefined : false;
    actions.setCustom(id, (custom: any) => {
      if (!custom.permissions) custom.permissions = {};
      if (next === undefined) {
        delete custom.permissions[key];
        // Clean up empty permissions object
        if (Object.keys(custom.permissions).length === 0) {
          delete custom.permissions;
        }
      } else {
        custom.permissions[key] = next;
      }
    });
  };

  // ROOT node shouldn't have permissions
  if (id === "ROOT") return null;

  const visiblePerms = PERM_LABELS.filter(p => {
    // Only show canMoveIn and canMoveOut for canvas components
    if (p.key === "canMoveIn" || p.key === "canMoveOut") return isCanvas;
    return true;
  });

  const anyLocked = visiblePerms.some(p => permissions[p.key] === false);

  return (
    <ToolbarSection
      title="Permissions"
      icon={<TbLock />}
      help="Lock down what can be done with this node — prevent dragging, deleting, or dropping children."
    >
      <div className="flex flex-col gap-1">
        {anyLocked && (
          <p className="text-warning text-[10px] leading-tight mb-1">
            Some actions are locked on this node.
          </p>
        )}
        {visiblePerms.map(p => {
          const locked = permissions[p.key] === false;
          return (
            <label
              key={p.key}
              className="flex items-center justify-between gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-base-200/60 transition-colors"
              title={p.description}
            >
              <span className={`text-xs select-none ${locked ? "text-base-content/50 line-through" : "text-base-content"}`}>
                {p.label}
              </span>
              <input
                type="checkbox"
                checked={!locked}
                onChange={() => toggle(p.key)}
                className="toggle toggle-xs toggle-primary"
              />
            </label>
          );
        })}
      </div>
    </ToolbarSection>
  );
}

registerSection({
  id: "permissions",
  title: "Permissions",
  tab: "advanced",
  icon: <TbLock />,
  keywords: ["permission", "lock", "drag", "delete", "edit", "move", "protect", "restrict"],
  component: PermissionsSection,
  sortOrder: 200,
  defaultOpen: false,
  help: "Lock down what can be done with this node — prevent dragging, deleting, or dropping children.",
});
