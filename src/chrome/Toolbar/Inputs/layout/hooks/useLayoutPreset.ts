import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../../../../utils/atoms";
import { BatchOperationAtom } from "utils/atoms";
import { UnsavedChangesAtom, ViewAtom } from "../../../../Viewport/atoms";
import { changeProp, getPropFinalValue } from "../../../../Viewport/lib";
import { getEffectiveViews, ViewSelectionAtom } from "../../../Label";
import { useContainerLayoutManager } from "../../useContainerLayoutManager";
import { getFlexPresets, GRID_PRESETS, type LayoutPreset } from "../presets/layoutPresets";

export type LayoutMode = "flex-row" | "flex-col" | "grid" | "block";

interface UseLayoutPresetOptions {
  propKey: string;
  onLayoutChange?: (preset: LayoutPreset) => void;
}

export type LayoutPresetHandle = ReturnType<typeof useLayoutPreset>;

export function useLayoutPreset({ propKey, onLayoutChange }: UseLayoutPresetOptions) {
  const { actions, query } = useEditor();
  const view = useAtomValue(ViewAtom);
  const viewSelection = useAtomValue(ViewSelectionAtom);
  const classDark = viewSelection.dark ?? false;

  const {
    actions: { setProp },
    id,
    currentLayoutMode,
    currentLayoutColumns,
    currentPresetLayout,
    classNameStr,
  } = useNode(node => ({
    id: node.id,
    currentLayoutMode: node.data.props.root?.layoutMode,
    currentLayoutColumns: node.data.props.root?.layoutColumns,
    currentPresetLayout: node.data.props.root?.[propKey || "presetLayout"],
    classNameStr: node.data.props.className || "",
  }));

  const nodePropsForRead = { className: classNameStr };
  const currentDisplay = String(
    getPropFinalValue({ propKey: "display", propType: "class" }, view, nodePropsForRead, classDark)
      .value ?? ""
  );
  const currentFlexDirection = String(
    getPropFinalValue(
      { propKey: "flexDirection", propType: "class" },
      view,
      nodePropsForRead,
      classDark
    ).value ?? ""
  );

  const detectMode = (): LayoutMode => {
    if (currentDisplay.includes("grid")) return "grid";
    if (currentDisplay.includes("flex")) {
      // Align with LayoutInput: default flex axis is row unless flex-col* is set.
      if (currentFlexDirection.includes("flex-col")) return "flex-col";
      return "flex-row";
    }
    if (currentDisplay.includes("block") || currentDisplay.includes("inline-block")) return "block";
    return (currentLayoutMode as LayoutMode) || "flex-col";
  };

  const [layoutMode, setLayoutMode] = useState<LayoutMode>(detectMode());
  const [showDisplayDropdown, setShowDisplayDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { adjustContainerCount } = useContainerLayoutManager();
  const setBatchOperation = useSetAtomState(BatchOperationAtom);
  const setUnsavedChanged = useSetAtomState(UnsavedChangesAtom);

  // Sync local state with saved props
  useEffect(() => {
    const newMode = detectMode();
    if (newMode !== layoutMode) setLayoutMode(newMode);
  }, [currentLayoutMode, currentDisplay, currentFlexDirection]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDisplayDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDisplayDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDisplayDropdown]);

  // ─── changeProp helper (reduces boilerplate) ───
  const cp = (
    key: string,
    value: string,
    targetView: string,
    type: string = "class",
    targetNodeId?: string
  ) => {
    changeProp({
      propKey: key,
      value,
      setProp: targetNodeId ? (cb: any) => actions.setProp(targetNodeId, cb) : setProp,
      propType: type,
      view: targetView as "mobile" | "desktop",
      query,
      actions,
      nodeId: targetNodeId || id,
      classDark,
    });
  };

  // ─── Layout helpers ───

  const clearLayoutProps = (views: string[]) => {
    const props = [
      "flexDirection",
      "flexWrap",
      "justifyContent",
      "alignItems",
      "gridTemplateColumns",
      "gridTemplateRows",
      "gridGap",
    ];
    views.forEach(v => props.forEach(p => cp(p, "", v)));
  };

  const setFlexLayout = (direction: "row" | "column", views: string[]) => {
    views.forEach(v => {
      cp("display", "flex", v);
      cp("flexDirection", direction === "row" ? "flex-row" : "flex-col", v);
    });
  };

  const setGridLayout = (views: string[], cols = "grid-cols-2") => {
    views.forEach(v => {
      cp("display", "grid", v);
      cp("gridCols", cols, v);
    });
  };

  const setBlockLayout = (views: string[]) => {
    views.forEach(v => cp("display", "block", v));
  };

  // ─── Current presets ───

  const currentPresets = (() => {
    if (layoutMode === "grid") return GRID_PRESETS;
    if (layoutMode === "flex-row") return getFlexPresets("column");
    return getFlexPresets("row");
  })();

  // ─── Preset selection ───

  const handlePresetSelect = (preset: LayoutPreset) => {
    if (preset.layout === "flex") {
      cp("display", "flex", "mobile");
      if (preset.flexDirection) cp("flexDirection", preset.flexDirection, "mobile");
      if (preset.flexWrap) cp("flexWrap", preset.flexWrap, "mobile");
    } else if (preset.layout === "grid") {
      ["mobile", "desktop"].forEach(v => {
        cp("flexDirection", "", v);
        cp("flexWrap", "", v);
        cp("justifyContent", "", v);
        cp("alignItems", "", v);
      });

      cp("display", "grid", "desktop");
      if (preset.gridTemplate) cp("gridCols", preset.gridTemplate, "desktop");
      if (preset.gridRows) cp("gridRows", preset.gridRows, "desktop");
      cp("display", "grid", "mobile");
      cp("gridCols", "grid-cols-1", "mobile");
    }

    if (preset.gap) cp("gap", preset.gap, "mobile");

    // Save preset metadata
    cp(propKey, preset.name.toLowerCase().replace(/\s+/g, "-"), "mobile", "root");
    cp("layoutMode", layoutMode, "mobile", "root");
    if (preset.columns) cp("layoutColumns", String(preset.columns), "mobile", "root");

    // Auto-adjust containers
    if (preset.columns) {
      const mode =
        preset.layout === "flex" ? (preset.direction === "row" ? "flex-row" : "flex-col") : "grid";

      setBatchOperation(true);
      try {
        adjustContainerCount(preset.columns, mode as "grid" | "flex-row" | "flex-col");
      } finally {
        setTimeout(() => {
          setBatchOperation(false);
          setUnsavedChanged(query.serialize());
        }, 150);
      }
    }

    // Grid spans for "Header + 2 Columns"
    if (preset.layout === "grid" && preset.name === "Header + 2 Columns") {
      const childNodes = query.node(id).get()?.data?.nodes || [];
      if (childNodes.length > 0) {
        cp("gridColSpan", "col-span-2", "desktop", "class", childNodes[0]);
      }
    }

    // Asymmetric flex widths
    if (preset.layout === "flex" && preset.asymmetric && preset.widths) {
      const childNodes = query.node(id).get()?.data?.nodes || [];
      childNodes.forEach((childId: string, index: number) => {
        if (preset.widths?.[index]) {
          cp("width", preset.widths[index], "desktop", "class", childId);
        }
      });
    }

    onLayoutChange?.(preset);
  };

  // ─── Display variant change ───

  const handleDisplayVariant = (variant: string) => {
    const effectiveViews = getEffectiveViews(viewSelection, view);
    effectiveViews.forEach(v => cp("display", variant, v));
    if (variant === "inline" || variant === "hidden") {
      clearLayoutProps(effectiveViews);
    }
    setShowDisplayDropdown(false);
  };

  // ─── Mode switch handlers ───

  const switchToMode = (mode: LayoutMode) => {
    const effectiveViews = getEffectiveViews(viewSelection, view);
    setLayoutMode(mode);
    clearLayoutProps(effectiveViews);

    if (mode === "flex-row") setFlexLayout("row", effectiveViews);
    else if (mode === "flex-col") setFlexLayout("column", effectiveViews);
    else if (mode === "grid") {
      effectiveViews.forEach(v => {
        setGridLayout([v], v === "desktop" ? "grid-cols-2" : "grid-cols-1");
      });
    } else if (mode === "block") setBlockLayout(effectiveViews);
  };

  return {
    // State
    layoutMode,
    showDisplayDropdown,
    setShowDisplayDropdown,
    dropdownRef,
    currentDisplay,
    // Presets
    currentPresets,
    currentLayoutMode,
    currentLayoutColumns,
    currentPresetLayout,
    // Handlers
    handlePresetSelect,
    handleDisplayVariant,
    switchToMode,
  };
}
