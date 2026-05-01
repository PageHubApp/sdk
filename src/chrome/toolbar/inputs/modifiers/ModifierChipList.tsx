/**
 * ModifierChipList — body for the list-style Modifiers section.
 *
 * Renders one Chip per entry in `props.root.activeModifiers`. Click on
 * a chip dispatches an open-request to the section's picker (so the user can
 * see context / change selection). X removes the modifier via the existing
 * `toggleModifier` (which strips the modifier's classes and updates
 * activeModifiers).
 *
 * Section is gated by `isActive` on the def — when activeModifiers is empty,
 * the section collapses back to header-only with the picker `+`.
 */
import { useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import { TbStack2 } from "react-icons/tb";
import { Chip } from "../../../primitives/Chip";
import {
  PopoverOpenRequestAtom,
  requestOpenPopover,
} from "../../inspector/popoverOpenRequestAtom";
import { useModifiers, type ResolvedModifier } from "./useModifiers";

// Picker's def id — chip click dispatches an open-request keyed by this so
// the picker (which lives in the section header) opens the FloatingPanel.
const MODIFIERS_PICKER_DEF_ID = "modifiers:add";

export function ModifierChipList() {
  const { id } = useNode(node => ({ id: node.id }));
  const { allModifiers, isActive, toggleModifier } = useModifiers();
  const [popoverRequests, setPopoverRequests] = useAtomState(PopoverOpenRequestAtom);

  // Filter by isActive (NOT props.root.activeModifiers) so chips also appear
  // for modifiers applied directly via className — templates / Class Search
  // can stamp a modifier's class string without ever touching the explicit
  // activeModifiers tracking array, and the user expects to see those too.
  const resolved: ResolvedModifier[] = allModifiers.filter(m => isActive(m));

  if (resolved.length === 0) return null;

  const openPicker = () => {
    requestOpenPopover(popoverRequests, setPopoverRequests, id, MODIFIERS_PICKER_DEF_ID);
  };

  return (
    <div className="flex flex-col gap-1">
      {resolved.map(mod => (
        <Chip
          mode="popover"
          key={mod.name}
          onTriggerClick={openPicker}
          onClear={() => toggleModifier(mod)}
          triggerAriaLabel={`Edit modifier ${mod.label}`}
          clearAriaLabel={`Remove modifier ${mod.label}`}
          leading={<TbStack2 className="size-3.5" aria-hidden />}
          summary={
            <span className="flex items-center gap-1.5">
              <span className="truncate">{mod.label}</span>
              {mod.category && (
                <span className="text-neutral-content/60 shrink-0 text-[10px]">{mod.category}</span>
              )}
              {mod.origin === "site" && (
                <span className="text-neutral-content/50 shrink-0 text-[10px]">custom</span>
              )}
            </span>
          }
        />
      ))}
    </div>
  );
}
