/**
 * ModifiersAddPicker — section-header `+` for the Modifiers section.
 *
 * Click `+` opens a small menu with two actions:
 *   - "Browse library" → opens the modifier picker FloatingPanel
 *   - "Save current styles as modifier" → opens the SaveModifierPanel
 *
 * Surfacing save under the same `+` (instead of burying it in the picker
 * footer) means users discover it without first opening the library.
 *
 * Bypass paths (skip the menu, go straight to the library):
 *   - Chip click in ModifierChipList dispatches PopoverOpenRequestAtom for
 *     this def → opens the library directly.
 *   - SessionAddedAtom (legacy `+ Add` flow) → opens the library directly.
 *
 * Both panels (library + save) are independent FloatingPanels with their
 * own state and lazy chunks.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TbDeviceFloppy, TbList, TbPlus } from "react-icons/tb";
import {
  SearchableMenuPopover,
  type SearchableMenuItem,
} from "../../../primitives/SearchableMenuPopover";
import { SideBarAtom } from "../../../../utils/lib";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

const ModifiersPickerPanel = lazy(() => import("./ModifiersPickerPanel"));
const SaveModifierPanel = lazy(() => import("./SaveModifierPanel"));

// Library panel is fixed-resizable (modifier grid needs known column count)
// — defaults sized to fit the categorized library + previews.
const LIBRARY_WIDTH = 320;
const LIBRARY_HEIGHT = 520;
// Save panel is auto-sized — width is a position hint only.
const SAVE_WIDTH = 320;

type MenuAction = "library" | "save";

const MENU_ITEMS: SearchableMenuItem<MenuAction>[] = [
  {
    id: "library",
    label: "Browse library",
    data: "library",
    keywords: ["add", "browse", "library", "pattern", "variant"],
  },
  {
    id: "save",
    label: "Save current styles as modifier",
    data: "save",
    keywords: ["save", "create", "new", "modifier"],
  },
];

const ITEM_ICON: Record<MenuAction, React.ComponentType<{ className?: string }>> = {
  library: TbList,
  save: TbDeviceFloppy,
};

export default function ModifiersAddPicker({ def }: PropertyInputProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [libraryPos, setLibraryPos] = useState<{ x: number; y: number } | undefined>();
  const [savePos, setSavePos] = useState<{ x: number; y: number } | undefined>();
  // Wrapper around the SearchableMenuPopover trigger button — needed because
  // the popover owns its own ref internally; we read the wrapper's rect to
  // dock both panels next to the `+` instead of the menu.
  const triggerWrapRef = useRef<HTMLSpanElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const sessionAdded = useAtomValue(SessionAddedAtom);
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);

  const { id } = useNode(node => ({ id: node.id }));

  const computePosition = (panelWidth: number) => {
    const rect = triggerWrapRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - panelWidth - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const openLibrary = () => {
    setLibraryPos(computePosition(LIBRARY_WIDTH));
    setLibraryOpen(true);
  };

  const openSave = () => {
    setSavePos(computePosition(SAVE_WIDTH));
    setSaveOpen(true);
  };

  // Auto-open the library directly when this property was just session-added
  // (legacy `+ Add` flow). Bypasses the menu so the user lands on the picker.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (def && sessionAdded.has(sessionKey(id, def.id))) {
      requestAnimationFrame(openLibrary);
      autoOpenedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAdded, id, def?.id]);

  // Open the library directly whenever a popover-open-request fires for this
  // def (chip click in ModifierChipList). Bypasses the menu — same reason.
  // Init to 0, NOT current version: if a dispatch fired while this trigger
  // was unmounted, the very first version we see on mount IS the bump.
  const lastRequestVersion = useRef(0);
  useEffect(() => {
    if (!def) return;
    const version = popoverRequests.get(popoverRequestKey(id, def.id)) || 0;
    if (version === 0 || version === lastRequestVersion.current) return;
    lastRequestVersion.current = version;
    requestAnimationFrame(openLibrary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverRequests, id, def?.id]);

  const handleSelect = (item: SearchableMenuItem<MenuAction>) => {
    if (item.data === "library") openLibrary();
    if (item.data === "save") openSave();
  };

  const renderItem = (item: SearchableMenuItem<MenuAction>) => {
    const Icon = ITEM_ICON[item.data!];
    return (
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="text-neutral-content size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{item.label}</span>
      </span>
    );
  };

  return (
    <>
      <span ref={triggerWrapRef} className="inline-flex">
        <SearchableMenuPopover<MenuAction>
          trigger={<TbPlus className="size-3.5" aria-hidden />}
          triggerAriaLabel="Add or save modifier"
          items={MENU_ITEMS}
          onSelect={handleSelect}
          renderItem={renderItem}
          searchPlaceholder="Search actions…"
          panelWidthClass="w-72"
          anchor="bottom end"
        />
      </span>
      {libraryOpen && (
        <Suspense fallback={null}>
          <ModifiersPickerPanel
            initialPosition={libraryPos}
            onClose={() => setLibraryOpen(false)}
            defaultWidth={LIBRARY_WIDTH}
            defaultHeight={LIBRARY_HEIGHT}
          />
        </Suspense>
      )}
      {saveOpen && (
        <Suspense fallback={null}>
          <SaveModifierPanel initialPosition={savePos} onClose={() => setSaveOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
