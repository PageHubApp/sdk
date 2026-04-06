import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { editorCanvasViewToClassPrefixKey } from "../../../utils/tailwind/className";
import { changeProp } from "../../Viewport/lib";
import { getEffectiveViews, ViewSelectionAtom } from "../Label";

/**
 * Hook for applying presets to selected toolbar breakpoint scopes
 * Respects the ViewSelectionAtom to only apply to selected views
 */
export const usePresetHandler = () => {
  const { actions, query } = useEditor();
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;

  const {
    actions: { setProp },
    id,
  } = useNode(node => ({ id: node.id }));

  /**
   * Apply a preset to the selected views
   * @param preset - Preset object; may include `root` (allowlisted keys), `className`, and a variant id field
   * @param propKey - The prop key to save the preset identifier
   * @param propType - The prop type (root, class, component)
   * @param viewSelection - The current view selection state
   * @param currentView - The current view
   */
  const applyPreset = (
    preset: any,
    propKey: string = "preset",
    propType: string = "root",
    viewSelection: { mobile: boolean; desktop: boolean },
    currentView: string
  ) => {
    if (!preset) return;

    // Save the preset identifier so we know which one is selected
    changeProp({
      propKey,
      value: preset?.var || preset?.title,
      setProp,
      propType,
      ...(propType === "class"
        ? { view: editorCanvasViewToClassPrefixKey(currentView), classDark }
        : {}),
      query,
      actions,
      nodeId: id,
    });

    // Get which views to apply to based on selection
    const effectiveViews = getEffectiveViews(viewSelection, currentView);
    console.log(
      "🎯 usePresetHandler - effectiveViews:",
      effectiveViews,
      "viewSelection:",
      viewSelection
    );

    // Apply root properties (always applied)
    if (preset.hasOwnProperty("root")) {
      Object.keys(preset.root).forEach(_var =>
        changeProp({
          propKey: _var,
          value: preset.root[_var],
          setProp,
          view: "root",
          query,
          actions,
          nodeId: id,
        })
      );
    }

    // Apply className string (contains mobile + md: desktop classes)
    if (preset.hasOwnProperty("className")) {
      changeProp({
        propKey: "className",
        value: preset.className || "",
        setProp,
        propType: "component",
        view: "root",
        query,
        actions,
        nodeId: id,
      });
    }
  };

  return { applyPreset };
};
