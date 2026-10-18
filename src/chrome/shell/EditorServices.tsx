/**
 * Headless mount for everything editor-wide: the document load/save
 * lifecycle (`useEditorDocument`), the effects in `useEditorWideEffects`, and
 * the singleton dialogs and popovers (media
 * manager, layers, modifiers, breakpoint-chip popover, ⌘K palette, color /
 * font / pattern / global-section pickers, the unsaved-changes prompt).
 *
 * `PageHubEditor` renders it once inside `<Editor>` in every layout, so the
 * visible pieces (canvas, inspector, layers, top-bar actions…) can be placed,
 * hidden or left out without losing any of these. All the dialogs portal or
 * position themselves, so where this sits in the DOM doesn't matter.
 */
import { useEditor } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import React, { Suspense, lazy } from "react";
import { useSDK } from "../../core/context";
import {
  LayersDialogOpenAtom,
  MediaManagerModalAtom,
  ModifiersModalAtom,
} from "../../utils/atoms";
import { ChipPopover } from "../toolbar/breakpoint-chip/ChipPopover";
import { MediaManagerModal } from "../toolbar/inputs/media/MediaManagerModal";
import { GlobalSectionPickerDialog } from "./GlobalSectionPickerDialog";
import { useEditorDocument } from "./useEditorDocument";
import { useEditorWideEffects } from "./useEditorWideEffects";

// Lazy: rarely-open dialogs — fetched on first open.
const LayersDialog = lazy(() =>
  import("../toolbar/dialogs/LayersDialog").then(m => ({ default: m.LayersDialog }))
);
const ModifiersModal = lazy(() =>
  import("../viewport/modals/ModifiersModal").then(m => ({ default: m.ModifiersModal }))
);
const CommandPaletteRoot = lazy(() =>
  import("../palette").then(m => ({ default: m.CommandPaletteRoot }))
);
const ColorPickerDialog = lazy(() =>
  import("../toolbar/dialogs/ColorPickerDialog").then(m => ({ default: m.ColorPickerDialog }))
);
const ColorPickerSidebarDialog = lazy(() =>
  import("../toolbar/dialogs/ColorPickerSidebarDialog").then(m => ({
    default: m.ColorPickerSidebarDialog,
  }))
);
const FontFamilyDialog = lazy(() =>
  import("../toolbar/dialogs/FontFamilyDialog").then(m => ({ default: m.FontFamilyDialog }))
);
const PatternDialog = lazy(() =>
  import("../toolbar/dialogs/PatternDialog").then(m => ({ default: m.PatternDialog }))
);

export function EditorServices({
  onQueryReady,
}: {
  /** Receives Craft's query once the editor is up (`PageHubEditor` `onQueryReady`). */
  onQueryReady?: (query: any) => void;
}): React.JSX.Element {
  const { readOnly, features } = useSDK();
  const { enabled } = useEditor(state => ({ enabled: state.options.enabled }));
  useEditorDocument(onQueryReady);
  const unsavedChangesDialog = useEditorWideEffects();

  const [isMediaManagerModalOpen, setIsMediaManagerModalOpen] =
    useAtomState(MediaManagerModalAtom);
  const [isLayersDialogOpen, setIsLayersDialogOpen] = useAtomState(LayersDialogOpenAtom);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useAtomState(ModifiersModalAtom);

  return (
    <>
      {unsavedChangesDialog}

      {/* Color pickers, font selector, patterns, global-section picker */}
      {!readOnly && (
        <>
          <ColorPickerDialog />
          <ColorPickerSidebarDialog />
          <FontFamilyDialog />
          <PatternDialog />
          <GlobalSectionPickerDialog />
        </>
      )}

      {/* Editing-only singletons: gone in preview, like the chrome that opens them. */}
      {enabled && (
        <>
          <MediaManagerModal
            isOpen={isMediaManagerModalOpen && features.mediaManager !== false}
            onClose={() => setIsMediaManagerModalOpen(false)}
          />

          {isLayersDialogOpen && (
            <Suspense fallback={null}>
              <LayersDialog isOpen onClose={() => setIsLayersDialogOpen(false)} />
            </Suspense>
          )}

          {isModifiersModalOpen && features.modifiers !== false && (
            <Suspense fallback={null}>
              <ModifiersModal isOpen onClose={() => setIsModifiersModalOpen(false)} />
            </Suspense>
          )}

          {/* Breakpoint-chip popover, anchored to whichever chip is open. */}
          <ChipPopover />

          {/* Command palette (⌘K). Off when the host owns ⌘K. */}
          {features.commandPalette !== false && (
            <Suspense fallback={null}>
              <CommandPaletteRoot />
            </Suspense>
          )}
        </>
      )}
    </>
  );
}
