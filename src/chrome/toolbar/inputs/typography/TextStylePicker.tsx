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
import { PopoverChip } from "@/chrome/primitives/PopoverChip";
import { SideBarAtom } from "@/utils/lib";
import type { TypographyPresetRow } from "./TypographyPresetSelect";
import type { TextStyleDraft } from "./TextStyleEditorPanel";

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

type Stage =
  | { kind: "closed" }
  | { kind: "picker" }
  | { kind: "editor"; mode: "new"; draft: TextStyleDraft }
  | { kind: "editor"; mode: "edit"; originalName: string; draft: TextStyleDraft };

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
  const [stage, setStage] = useState<Stage>({ kind: "closed" });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);

  const selectedPreset =
    selectedName != null ? presets.find(p => p.name === selectedName) ?? null : null;

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
    // Park the editor next to the picker so opening it doesn't yank focus
    // across the screen.
    const x = sidebarLeft ? rect.right + 8 : rect.left - EDITOR_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const togglePicker = () => {
    setStage(prev => (prev.kind === "closed" ? { kind: "picker" } : { kind: "closed" }));
  };

  const handleClear = () => {
    onSelect(null);
  };

  const existingNames = presets.map(p => p.name);

  return (
    <>
      <PopoverChip
        ref={triggerRef}
        open={stage.kind !== "closed"}
        onTriggerClick={togglePicker}
        onClear={handleClear}
        triggerAriaLabel={selectedPreset ? `Style: ${selectedPreset.name}` : "Pick style"}
        clearAriaLabel="Clear style"
        leading={<TagChip tag={triggerTag} />}
        summary={triggerLabel}
      />

      {stage.kind === "picker" && (
        <Suspense fallback={null}>
          <TextStylePickerPanel
            presets={presets}
            selectedName={selectedName}
            initialPosition={computePickerPosition()}
            defaultWidth={PICKER_WIDTH}
            defaultHeight={PICKER_HEIGHT}
            onClose={() => setStage({ kind: "closed" })}
            onApply={preset => {
              onSelect(preset);
              setStage({ kind: "closed" });
            }}
            onEditPreset={preset =>
              setStage({
                kind: "editor",
                mode: "edit",
                originalName: preset.name,
                draft: buildEditDraft(preset),
              })
            }
            onCreateNew={() =>
              setStage({ kind: "editor", mode: "new", draft: buildNewDraft() })
            }
          />
        </Suspense>
      )}

      {stage.kind === "editor" && (
        <Suspense fallback={null}>
          <TextStyleEditorPanel
            mode={stage.mode}
            initialDraft={stage.draft}
            originalName={stage.mode === "edit" ? stage.originalName : null}
            existingNames={existingNames}
            initialPosition={computeEditorPosition()}
            defaultWidth={EDITOR_WIDTH}
            defaultHeight={EDITOR_HEIGHT}
            onClose={() => setStage({ kind: "closed" })}
            onSave={draft => {
              if (stage.mode === "edit") {
                onUpdate(stage.originalName, draft);
              } else {
                onCreate(draft);
              }
              setStage({ kind: "closed" });
            }}
            onDelete={
              stage.mode === "edit"
                ? () => {
                    onDelete(stage.originalName);
                    setStage({ kind: "closed" });
                  }
                : undefined
            }
          />
        </Suspense>
      )}
    </>
  );
}
