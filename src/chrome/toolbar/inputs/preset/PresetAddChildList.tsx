/**
 * Component-tab affordance for preset wrappers — surfaces an Add Item /
 * delete-row UI for the wrapper's children using the preset's
 * `addChild` config registered in `presetRegistry.ts`.
 *
 * Active when the selected node carries `custom.preset` and that preset
 * registered an `addChild` factory. Thin wrapper around `CraftListEditor`
 * (which owns filter + delete + batched-add + reorder + edit pencil) —
 * presets only declare the per-item label and template.
 */
import { useNode } from "@craftjs/core";
import { atom, useAtomState } from "@zedux/react";
import { getPresetMeta } from "../../../../core/presetRegistry";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";
import { CraftListEditor } from "./CraftListEditor";

const SelectedPresetItemAtom = atom<number | null>("preset_addchild_selected", null);

interface PresetChildItem {
  id: string;
  label: string;
}

export function PresetAddChildList(_props: PropertyInputProps) {
  const { id, presetName } = useNode(node => ({
    presetName: (node.data?.custom as any)?.preset as string | undefined,
  }));
  const [activeIndex, setActiveIndex] = useAtomState(
    SelectedPresetItemAtom
  ) as unknown as [number | null, (v: number | null) => void];

  const meta = getPresetMeta(presetName);
  const addChild = meta?.addChild;

  if (!addChild) return null;

  return (
    <CraftListEditor<PresetChildItem>
      parentId={id}
      mapItem={(childNode, childId, index) => ({
        label: addChild.childLabel
          ? addChild.childLabel(childNode, index)
          : childNode?.data?.custom?.displayName || `Item ${index + 1}`,
      })}
      activeIndex={activeIndex}
      setActiveIndex={setActiveIndex}
      addLabel={addChild.label}
      onAdd={({ addNode }) => addNode(addChild.template())}
      renderLabel={item => item.label}
      renderPopover={() => null}
      editTooltip="Open in editor"
    />
  );
}
