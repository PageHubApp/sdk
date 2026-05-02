/**
 * TextStylePicker — chip trigger + state coordinator for the Framer-style
 * text-styles flow. Owns the chip + transition state between picker and
 * editor; both panels are lazy-loaded heavy chunks that match the
 * editor-popover pattern (see docs/sdk/editor-popover-pattern.md).
 *
 * Stages:
 *   1. Closed — chip only.
 *   2. "picker" — `TextStylePickerPanel` (FloatingPanel with search + list).
 *   3. "editor:new" / "editor:edit" — `TextStyleEditorPanel` (FloatingPanel
 *      with name + typography fields). Save / Cancel / Delete callbacks land
 *      back in the host (`TypographyPresetInput`).
 *
 * The picker and editor are mutually exclusive — opening the editor closes
 * the picker. Closing the editor returns to the closed state (chip only).
 */
import { lazy, Suspense, useRef, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { Chip } from "@/chrome/primitives/Chip";
import { SideBarAtom } from "@/utils/atoms";
import type { TypographyPresetRow } from "./TypographyPresetSelect";
import type { TextStyleDraft } from "./textStyleDraft";

const TextStylePickerPanel = lazy(() => import("./TextStylePickerPanel"));
const TextStyleEditorPanel = lazy(() => import("./TextStyleEditorPanel"));

const PICKER_WIDTH = 300;
const PICKER_HEIGHT = 360;
const EDITOR_WIDTH = 340;
const EDITOR_HEIGHT = 540;

interface Props {
  presets: TypographyPresetRow[];
  /** Active preset name from helpers, or null when using local class-based styles */
  selectedName: string | null;
  onSelect: (preset: TypographyPresetRow | null) => void;
  /** Called when user clicks "New Style" — host returns the seed draft (DOM-captured). */
  buildNewDraft: () => TextStyleDraft;
  /** Called when user clicks "Edit" on a preset row — host returns the seed draft. */
  buildEditDraft: (preset: TypographyPresetRow) => TextStyleDraft;
  /** Persist a new preset and apply it to the current node. */
  onCreate: (draft: TextStyleDraft) => void;
  /** Persist updates to an existing preset (rename allowed). */
  onUpdate: (originalName: string, draft: TextStyleDraft) => void;
  /** Remove a preset and strip its class from the current node. */
  onDelete: (presetName: string) => void;
}

/** Heading short tag for the chip leading slot. */
function styleTagShorthand(name: string): string {
  const m = /^\s*h(?:eading)?\s*([1-6])/i.exec(name);
  if (m) return `H${m[1]}`;
  return "P";
}

const TagChip = ({ tag }: { tag: string }) => (
  <span className="border-base-300 bg-base-100 text-base-content flex h-5 min-w-[1.5rem] shrink-0 items-center justify-center rounded border px-1.5 text-[10px] font-bold">
    {tag}
  </span>
);

type EditorState =
  | { mode: "new"; draft: TextStyleDraft }
  | { mode: "edit"; originalName: string; draft: TextStyleDraft };

export function TextStylePicker({
  presets,
  selectedName,
  onSelect,
  buildNewDraft,
  buildEditDraft,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);

  const selectedPreset =
    selectedName != null ? (presets.find(p => p.name === selectedName) ?? null) : null;

  const triggerLabel = selectedPreset?.name ?? "Default";
  const triggerTag = selectedPreset ? styleTagShorthand(selectedPreset.name) : "—";

  const computePickerPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - PICKER_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const computeEditorPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    // When the picker is open, park the editor on the far side of the picker
    // so both panels are visible side-by-side instead of stacking.
    const offset = pickerOpen ? PICKER_WIDTH + 16 : 8;
    const x = sidebarLeft ? rect.right + offset : rect.left - EDITOR_WIDTH - offset;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const togglePicker = () => {
    if (editor) {
      setEditor(null);
      setPickerOpen(false);
      return;
    }
    setPickerOpen(prev => !prev);
  };

  const handleClear = () => {
    onSelect(null);
  };

  const existingNames = presets.map(p => p.name);

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        open={pickerOpen || editor != null}
        onTriggerClick={togglePicker}
        onClear={handleClear}
        triggerAriaLabel={selectedPreset ? `Style: ${selectedPreset.name}` : "Pick style"}
        clearAriaLabel="Clear style"
        leading={<TagChip tag={triggerTag} />}
        summary={triggerLabel}
      />

      {pickerOpen && (
        <Suspense fallback={null}>
          <TextStylePickerPanel
            presets={presets}
            selectedName={selectedName}
            initialPosition={computePickerPosition()}
            defaultWidth={PICKER_WIDTH}
            defaultHeight={PICKER_HEIGHT}
            onClose={() => {
              setPickerOpen(false);
              setEditor(null);
            }}
            onApply={preset => {
              onSelect(preset);
              setPickerOpen(false);
              setEditor(null);
            }}
            onEditPreset={preset =>
              setEditor({
                mode: "edit",
                originalName: preset.name,
                draft: buildEditDraft(preset),
              })
            }
            onCreateNew={() => setEditor({ mode: "new", draft: buildNewDraft() })}
            overlay={
              editor ? (
                <Suspense fallback={null}>
                  <TextStyleEditorPanel
                    mode={editor.mode}
                    initialDraft={editor.draft}
                    originalName={editor.mode === "edit" ? editor.originalName : null}
                    existingNames={existingNames}
                    initialPosition={computeEditorPosition()}
                    defaultWidth={EDITOR_WIDTH}
                    defaultHeight={EDITOR_HEIGHT}
                    onClose={() => setEditor(null)}
                    onSave={draft => {
                      if (editor.mode === "edit") {
                        onUpdate(editor.originalName, draft);
                      } else {
                        onCreate(draft);
                      }
                      setEditor(null);
                      setPickerOpen(false);
                    }}
                    onDelete={
                      editor.mode === "edit"
                        ? () => {
                            onDelete(editor.originalName);
                            setEditor(null);
                            setPickerOpen(false);
                          }
                        : undefined
                    }
                  />
                </Suspense>
              ) : null
            }
          />
        </Suspense>
      )}
    </>
  );
}
