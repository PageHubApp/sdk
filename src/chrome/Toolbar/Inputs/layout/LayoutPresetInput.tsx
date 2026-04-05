// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { UnsavedChangesAtom, ViewAtom } from "../../../Viewport/atoms";
import { changeProp } from "../../../Viewport/lib";
import { AutoHideScrollbar } from "components/layout/AutoHideScrollbar";
import { useEffect, useRef, useState } from "react";
import {
  TbChevronDown,
  TbLayoutColumns,
  TbLayoutGrid,
  TbLayoutRows,
  TbSquare,
} from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../../../utils/atoms";
import { BatchOperationAtom } from "utils/atoms";
import { getClassForView } from "../../../../utils/tailwind/className";
import { getEffectiveViews, ViewSelectionAtom } from "../../Label";
import { ToolbarSection } from "../../ToolbarSection";
import { generateLayoutIcon } from "../LayoutIconGenerator";
import { useContainerLayoutManager } from "../useContainerLayoutManager";

interface LayoutPreset {
  name: string;
  icon: React.ReactNode;
  layout: "flex" | "grid";
  direction?: "row" | "column";
  columns?: number;
  rows?: number;
  gridTemplate?: string;
  gridRows?: string;
  flexDirection?: string;
  flexWrap?: string;
  gap?: string;
  asymmetric?: boolean;
  widths?: string[];
}

interface LayoutPresetInputProps {
  propKey?: string;
  propType?: string;
  onLayoutChange?: (preset: LayoutPreset) => void;
}

export const LayoutPresetInput = ({
  propKey = "layoutPreset",
  propType = "root",
  onLayoutChange,
}: LayoutPresetInputProps) => {
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

  const currentDisplay = getClassForView(classNameStr, "display", view, { classDark }) || "";
  const currentFlexDirection = getClassForView(classNameStr, "flexDirection", view, { classDark }) || "";

  // Detect layout mode from actual props
  const detectMode = (): "flex-row" | "flex-col" | "grid" | "block" => {
    if (currentDisplay.includes("grid")) return "grid";
    if (currentDisplay.includes("flex")) {
      if (currentFlexDirection.includes("flex-row")) return "flex-row";
      return "flex-col";
    }
    if (currentDisplay.includes("block") || currentDisplay.includes("inline-block")) return "block";
    // Fall back to saved layoutMode
    return (currentLayoutMode as "flex-row" | "flex-col" | "grid" | "block") || "flex-col";
  };

  const [layoutMode, setLayoutMode] = useState<"flex-row" | "flex-col" | "grid" | "block">(
    detectMode()
  );
  const [showDisplayDropdown, setShowDisplayDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { adjustContainerCount } = useContainerLayoutManager();
  const setBatchOperation = useSetAtomState(BatchOperationAtom);
  const setUnsavedChanged = useSetAtomState(UnsavedChangesAtom);

  // Reusable preset button component
  const PresetButton = ({
    item,
    index,
    isActive,
    onClick,
    title,
  }: {
    item: { name: string; icon: React.ReactNode };
    index: number;
    isActive: boolean;
    onClick: () => void;
    title: string;
  }) => (
    <button
      key={index}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-left transition-all ${
        isActive
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background hover:border-primary hover:bg-accent"
      }`}
      title={title}
    >
      <div className="w-full">{item.icon}</div>
      <div className={`text-xs font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
        {item.name}
      </div>
    </button>
  );

  // Sync local state with saved props and actual display props
  useEffect(() => {
    const newMode = detectMode();
    if (newMode !== layoutMode) {
      setLayoutMode(newMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLayoutMode, currentDisplay, currentFlexDirection]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDisplayDropdown(false);
      }
    };

    if (showDisplayDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDisplayDropdown]);

  // Define layout presets based on current mode
  const getFlexPresets = (direction: "row" | "column") => {
    const isColumn = direction === "column"; // Columns = horizontal layout
    const containerClass = isColumn ? "flex h-full gap-px" : "flex flex-col h-full gap-px";
    const itemClass = "flex-1 rounded-sm bg-primary/30";

    return [
      {
        name: isColumn ? "Single Column" : "Single Row",
        icon: (
          <div className="h-6 w-full overflow-hidden rounded-sm border border-border p-px">
            <div className="h-full rounded-sm bg-primary/30"></div>
          </div>
        ),
        layout: "flex" as const,
        direction,
        flexDirection: isColumn ? "flex-row" : "flex-col",
        columns: 1,
        gap: "gap-4",
      },
      {
        name: isColumn ? "Two Columns" : "Two Rows",
        icon: (
          <div className="h-6 w-full overflow-hidden rounded-sm border border-border p-px">
            <div className={containerClass}>
              <div className={itemClass}></div>
              <div className={itemClass}></div>
            </div>
          </div>
        ),
        layout: "flex" as const,
        direction,
        flexDirection: isColumn ? "flex-row" : "flex-col",
        columns: 2,
        gap: "gap-4",
      },
      {
        name: isColumn ? "Three Columns" : "Three Rows",
        icon: (
          <div className="h-6 w-full overflow-hidden rounded-sm border border-border p-px">
            <div className={containerClass}>
              <div className={itemClass}></div>
              <div className={itemClass}></div>
              <div className={itemClass}></div>
            </div>
          </div>
        ),
        layout: "flex" as const,
        direction,
        flexDirection: isColumn ? "flex-row" : "flex-col",
        columns: 3,
        gap: "gap-4",
      },
      {
        name: isColumn ? "Four Columns" : "Four Rows",
        icon: (
          <div className="h-6 w-full overflow-hidden rounded-sm border border-border p-px">
            <div className={containerClass}>
              <div className={itemClass}></div>
              <div className={itemClass}></div>
              <div className={itemClass}></div>
              <div className={itemClass}></div>
            </div>
          </div>
        ),
        layout: "flex" as const,
        direction,
        flexDirection: isColumn ? "flex-row" : "flex-col",
        columns: 4,
        gap: "gap-4",
      },

      // Asymmetric flex presets (only for columns)
      ...(isColumn
        ? [
            {
              name: "Wide Left",
              icon: (
                <div className="h-6 w-full overflow-hidden rounded-sm border border-border p-px">
                  <div className="flex h-full gap-px">
                    <div className="w-3/4 rounded-sm bg-primary/30"></div>
                    <div className="w-1/4 rounded-sm bg-primary/20"></div>
                  </div>
                </div>
              ),
              layout: "flex" as const,
              direction,
              flexDirection: "flex-row",
              columns: 2,
              gap: "gap-4",
              asymmetric: true,
              widths: ["w-3/4", "w-1/4"],
            },
            {
              name: "Wide Right",
              icon: (
                <div className="h-6 w-full overflow-hidden rounded-sm border border-border p-px">
                  <div className="flex h-full gap-px">
                    <div className="w-1/4 rounded-sm bg-primary/20"></div>
                    <div className="w-3/4 rounded-sm bg-primary/30"></div>
                  </div>
                </div>
              ),
              layout: "flex" as const,
              direction,
              flexDirection: "flex-row",
              columns: 2,
              gap: "gap-4",
              asymmetric: true,
              widths: ["w-1/4", "w-3/4"],
            },
            {
              name: "Wide Middle",
              icon: generateLayoutIcon({
                type: "flex",
                columns: 3,
                widths: ["w-1/4", "w-1/2", "w-1/4"],
              }),
              layout: "flex" as const,
              direction,
              flexDirection: "flex-row",
              columns: 3,
              gap: "gap-4",
              asymmetric: true,
              widths: ["w-1/4", "w-1/2", "w-1/4"],
            },
          ]
        : []),
    ];
  };

  const gridPresets: LayoutPreset[] = [
    {
      name: "Single Column",
      icon: (
        <div className="grid h-6 w-full overflow-hidden rounded-sm border border-border p-px">
          <div className="rounded-sm bg-primary/30"></div>
        </div>
      ),
      layout: "grid",
      columns: 1,
      gridTemplate: "grid-cols-1",
      gap: "gap-4",
    },
    {
      name: "Two Columns",
      icon: (
        <div className="grid h-6 w-full grid-cols-2 gap-px overflow-hidden rounded-sm border border-border p-px">
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
        </div>
      ),
      layout: "grid",
      columns: 2,
      gridTemplate: "grid-cols-2",
      gap: "gap-4",
    },
    {
      name: "2x2 Grid",
      icon: (
        <div className="grid h-6 w-full grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-sm border border-border p-px">
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
        </div>
      ),
      layout: "grid",
      columns: 4,
      gridTemplate: "grid-cols-2",
      gridRows: "grid-rows-2",
      gap: "gap-4",
    },
    {
      name: "Three Columns",
      icon: (
        <div className="grid h-6 w-full grid-cols-3 gap-px overflow-hidden rounded-sm border border-border p-px">
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
        </div>
      ),
      layout: "grid",
      columns: 3,
      gridTemplate: "grid-cols-3",
      gap: "gap-4",
    },
    {
      name: "3x2 Grid",
      icon: (
        <div className="grid h-6 w-full grid-cols-3 grid-rows-2 gap-px overflow-hidden rounded-sm border border-border p-px">
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
        </div>
      ),
      layout: "grid",
      columns: 6,
      gridTemplate: "grid-cols-3",
      gridRows: "grid-rows-2",
      gap: "gap-4",
    },
    {
      name: "Four Columns",
      icon: (
        <div className="grid h-6 w-full grid-cols-4 gap-px overflow-hidden rounded-sm border border-border p-px">
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
          <div className="rounded-sm bg-primary/30"></div>
        </div>
      ),
      layout: "grid",
      columns: 4,
      gridTemplate: "grid-cols-4",
      gap: "gap-4",
    },
    {
      name: "Header + 2 Columns",
      icon: generateLayoutIcon({
        type: "grid",
        columns: 2,
        rows: 4,
        spans: ["col-span-2 row-span-2", "row-span-2", "row-span-2"],
      }),
      layout: "grid",
      columns: 3,
      gridTemplate: "grid-cols-2",
      gridRows: "grid-rows-2",
      gap: "gap-4",
    },
    {
      name: "Wide Left",
      icon: (
        <div className="h-6 w-full overflow-hidden rounded-sm border border-border p-px">
          <div className="grid h-full grid-cols-[3fr_1fr] gap-px overflow-hidden rounded-sm border border-border p-px">
            <div className="rounded-sm bg-primary/30"></div>
            <div className="rounded-sm bg-primary/20"></div>
          </div>
        </div>
      ),
      layout: "grid",
      columns: 2,
      gridTemplate: "grid-cols-[2fr_1fr]",
      gap: "gap-4",
    },
    {
      name: "Wide Right",
      icon: (
        <div className="h-6 w-full overflow-hidden rounded-sm border border-border p-px">
          <div className="grid h-full grid-cols-[1fr_3fr] gap-px overflow-hidden rounded-sm border border-border p-px">
            <div className="rounded-sm bg-primary/20"></div>
            <div className="rounded-sm bg-primary/30"></div>
          </div>
        </div>
      ),
      layout: "grid",
      columns: 2,
      gridTemplate: "grid-cols-[1fr_2fr]",
      gap: "gap-4",
    },
    {
      name: "Wide Middle",
      icon: (
        <div className="h-6 w-full overflow-hidden rounded-sm border border-border p-px">
          <div className="grid h-full grid-cols-[1fr_2fr_1fr] gap-px overflow-hidden rounded-sm border border-border p-px">
            <div className="rounded-sm bg-primary/20"></div>
            <div className="rounded-sm bg-primary/30"></div>
            <div className="rounded-sm bg-primary/20"></div>
          </div>
        </div>
      ),
      layout: "grid",
      columns: 3,
      gridTemplate: "grid-cols-[1fr_2fr_1fr]",
      gap: "gap-4",
    },
  ];

  // Determine which presets to show based on current mode
  const currentPresets = (() => {
    if (layoutMode === "grid") return gridPresets;
    if (layoutMode === "flex-row") return getFlexPresets("column"); // flex-row = columns (horizontal)
    return getFlexPresets("row"); // flex-col = rows (vertical)
  })();

  const handlePresetSelect = (preset: LayoutPreset) => {
    console.log("🎯 handlePresetSelect:", preset.name, preset.gridTemplate);
    // Apply layout properties
    if (preset.layout === "flex") {
      changeProp({
        propKey: "display",
        value: "flex",
        setProp,
        propType: "class",
        view: "mobile",
        query,
        actions,
        nodeId: id,
        classDark,
      });

      if (preset.flexDirection) {
        changeProp({
          propKey: "flexDirection",
          value: preset.flexDirection,
          setProp,
          propType: "class",
          view: "mobile",
          query,
          actions,
          nodeId: id,
          classDark,
        });
      }

      if (preset.flexWrap) {
        changeProp({
          propKey: "flexWrap",
          value: preset.flexWrap,
          setProp,
          propType: "class",
          view: "mobile",
          query,
          actions,
          nodeId: id,
          classDark,
        });
      }
    } else if (preset.layout === "grid") {
      // Clear flex properties from both mobile and desktop
      ["mobile", "desktop"].forEach(view => {
        changeProp({
          propKey: "flexDirection",
          value: "",
          setProp,
          propType: "class",
          view: view as "mobile" | "desktop",
          query,
          actions,
          nodeId: id,
          classDark,
        });
        changeProp({
          propKey: "flexWrap",
          value: "",
          setProp,
          propType: "class",
          view: view as "mobile" | "desktop",
          query,
          actions,
          nodeId: id,
          classDark,
        });
        changeProp({
          propKey: "justifyContent",
          value: "",
          setProp,
          propType: "class",
          view: view as "mobile" | "desktop",
          query,
          actions,
          nodeId: id,
          classDark,
        });
        changeProp({
          propKey: "alignItems",
          value: "",
          setProp,
          propType: "class",
          view: view as "mobile" | "desktop",
          query,
          actions,
          nodeId: id,
          classDark,
        });
      });

      // Desktop grid
      changeProp({
        propKey: "display",
        value: "grid",
        setProp,
        propType: "class",
        view: "desktop",
        query,
        actions,
        nodeId: id,
        classDark,
      });

      if (preset.gridTemplate) {
        console.log("🔧 Setting gridCols:", preset.gridTemplate);
        changeProp({
          propKey: "gridCols",
          value: preset.gridTemplate,
          setProp,
          propType: "class",
          view: "desktop",
          query,
          actions,
          nodeId: id,
          classDark,
        });
      }

      if (preset.gridRows) {
        console.log("🔧 Setting gridRows:", preset.gridRows);
        changeProp({
          propKey: "gridRows",
          value: preset.gridRows,
          setProp,
          propType: "class",
          view: "desktop",
          query,
          actions,
          nodeId: id,
          classDark,
        });
      }

      // Mobile stays single column
      changeProp({
        propKey: "display",
        value: "grid",
        setProp,
        propType: "class",
        view: "mobile",
        query,
        actions,
        nodeId: id,
        classDark,
      });
      changeProp({
        propKey: "gridCols",
        value: "grid-cols-1",
        setProp,
        propType: "class",
        view: "mobile",
        query,
        actions,
        nodeId: id,
        classDark,
      });
    }

    if (preset.gap) {
      changeProp({
        propKey: "gap",
        value: preset.gap,
        setProp,
        propType: "class",
        view: "mobile",
        query,
        actions,
        nodeId: id,
        classDark,
      });
    }

    // Save the preset identifier and layout info
    changeProp({
      propKey,
      value: preset.name.toLowerCase().replace(/\s+/g, "-"),
      setProp,
      propType: "root",
      query,
      actions,
      nodeId: id,
    });

    // Save layout mode and column count for reference
    changeProp({
      propKey: "layoutMode",
      value: layoutMode,
      setProp,
      propType: "root",
      query,
      actions,
      nodeId: id,
    });

    if (preset.columns) {
      changeProp({
        propKey: "layoutColumns",
        value: preset.columns,
        setProp,
        propType: "root",
        query,
        actions,
        nodeId: id,
      });
    }

    // Auto-adjust container count based on layout
    if (preset.columns) {
      let layoutModeForManager: "flex-row" | "flex-col" | "grid";
      if (preset.layout === "flex") {
        layoutModeForManager = preset.direction === "row" ? "flex-row" : "flex-col";
      } else {
        layoutModeForManager = "grid";
      }

      // Enable batch operation mode to prevent auto-selection and auto-save of added containers
      setBatchOperation(true);
      try {
        adjustContainerCount(preset.columns, layoutModeForManager);
      } finally {
        // Disable batch operation mode and trigger a single save after all operations complete
        setTimeout(() => {
          setBatchOperation(false);
          // Manually trigger a save after batch operation completes
          setUnsavedChanged(query.serialize());
        }, 150);
      }
    }

    // Handle special grid layouts with spans
    if (preset.layout === "grid" && preset.name === "Header + 2 Columns") {
      // Apply col-span-2 to the first child
      const currentNode = query.node(id).get();
      const childNodes = currentNode?.data?.nodes || [];

      if (childNodes.length > 0) {
        const firstChildId = childNodes[0];
        console.log("🎯 Applying col-span-2 to first child:", firstChildId);

        // Use changeProp to apply to the child node via className
        changeProp({
          propKey: "gridColSpan",
          value: "col-span-2",
          setProp: (cb) => actions.setProp(firstChildId, cb),
          propType: "class",
          view: "desktop",
          query,
          actions,
          nodeId: firstChildId,
          classDark,
        });
      }
    }

    // Handle asymmetric flex layouts
    if (preset.layout === "flex" && preset.asymmetric && preset.widths) {
      const currentNode = query.node(id).get();
      const childNodes = currentNode?.data?.nodes || [];

      console.log("🎯 Applying asymmetric widths:", preset.widths);

      childNodes.forEach((childId, index) => {
        if (preset.widths && preset.widths[index]) {
          const widthClass = preset.widths[index];
          console.log(`🎯 Applying ${widthClass} to child ${index}:`, childId);

          changeProp({
            propKey: "width",
            value: widthClass,
            setProp: (cb) => actions.setProp(childId, cb),
            propType: "class",
            view: "desktop",
            query,
            actions,
            nodeId: childId,
            classDark,
          });
        }
      });
    }

    // Call the callback to handle container addition/removal
    if (onLayoutChange) {
      onLayoutChange(preset);
    }
  };

  // Helper function to clear layout properties
  const clearLayoutProps = (views: ("mobile" | "desktop")[]) => {
    const propsToClear = [
      "flexDirection",
      "flexWrap",
      "justifyContent",
      "alignItems",
      "gridTemplateColumns",
      "gridTemplateRows",
      "gridGap",
    ];

    views.forEach(view => {
      propsToClear.forEach(propKey => {
        changeProp({
          propKey,
          value: "",
          setProp,
          propType: "class",
          view: view,
          query,
          actions,
          nodeId: id,
          classDark,
        });
      });
    });
  };

  // Helper function to set flex layout
  const setFlexLayout = (direction: "row" | "column", views: string[]) => {
    views.forEach(targetView => {
      changeProp({
        propKey: "display",
        value: "flex",
        setProp,
        propType: "class",
        view: targetView as "mobile" | "desktop",
        query,
        actions,
        nodeId: id,
        classDark,
      });
      changeProp({
        propKey: "flexDirection",
        value: direction === "row" ? "flex-row" : "flex-col",
        setProp,
        propType: "class",
        view: targetView as "mobile" | "desktop",
        query,
        actions,
        nodeId: id,
        classDark,
      });
    });
  };

  // Helper function to set grid layout
  const setGridLayout = (views: string[], cols: string = "grid-cols-2") => {
    views.forEach(targetView => {
      changeProp({
        propKey: "display",
        value: "grid",
        setProp,
        propType: "class",
        view: targetView as "mobile" | "desktop",
        query,
        actions,
        nodeId: id,
        classDark,
      });
      changeProp({
        propKey: "gridCols",
        value: cols,
        setProp,
        propType: "class",
        view: targetView as "mobile" | "desktop",
        query,
        actions,
        nodeId: id,
        classDark,
      });
    });
  };

  // Helper function to set block layout
  const setBlockLayout = (views: string[]) => {
    views.forEach(targetView => {
      changeProp({
        propKey: "display",
        value: "block",
        setProp,
        propType: "class",
        view: targetView as "mobile" | "desktop",
        query,
        actions,
        nodeId: id,
        classDark,
      });
    });
  };

  // Handle display variant change
  const handleDisplayVariant = (variant: string) => {
    const effectiveViews = getEffectiveViews(viewSelection, view);

    effectiveViews.forEach(targetView => {
      changeProp({
        propKey: "display",
        value: variant,
        setProp,
        propType: "class",
        view: targetView as "mobile" | "desktop",
        query,
        actions,
        nodeId: id,
        classDark,
      });
    });

    // Clean up layout-specific props if switching to inline or hidden
    if (variant === "inline" || variant === "hidden") {
      clearLayoutProps(effectiveViews.map(v => v as "mobile" | "desktop"));
    }
    setShowDisplayDropdown(false);
  };

  const displayVariants = [
    { value: "inline-block", label: "Inline-block" },
    { value: "inline-flex", label: "Inline-flex" },
    { value: "inline-grid", label: "Inline-grid" },
    { value: "inline", label: "Inline" },
    { value: "hidden", label: "None" },
  ];

  return (
    <ToolbarSection title="Layout" icon={<TbLayoutGrid />} propKey="display" collapsible={true} defaultOpen={true}>
      {/* Layout Mode Buttons */}
      <div className="col-span-full flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => {
            const effectiveViews = getEffectiveViews(viewSelection, view);
            setLayoutMode("flex-row");
            clearLayoutProps(effectiveViews.map(v => v as "mobile" | "desktop"));
            setFlexLayout("row", effectiveViews);
          }}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            layoutMode === "flex-row"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TbLayoutColumns className="size-3" />
          Columns
        </button>
        <button
          onClick={() => {
            const effectiveViews = getEffectiveViews(viewSelection, view);
            setLayoutMode("flex-col");
            clearLayoutProps(effectiveViews.map(v => v as "mobile" | "desktop"));
            setFlexLayout("column", effectiveViews);
          }}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            layoutMode === "flex-col"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TbLayoutRows className="size-3" />
          Rows
        </button>
        <button
          onClick={() => {
            const effectiveViews = getEffectiveViews(viewSelection, view);
            setLayoutMode("grid");
            clearLayoutProps(effectiveViews.map(v => v as "mobile" | "desktop"));
            // Apply grid-cols based on each view
            effectiveViews.forEach(targetView => {
              const cols = targetView === "desktop" ? "grid-cols-2" : "grid-cols-1";
              setGridLayout([targetView], cols);
            });
          }}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            layoutMode === "grid"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TbLayoutGrid className="size-3" />
          Grid
        </button>
        <button
          onClick={() => {
            const effectiveViews = getEffectiveViews(viewSelection, view);
            setLayoutMode("block");
            clearLayoutProps(effectiveViews.map(v => v as "mobile" | "desktop"));
            setBlockLayout(effectiveViews);
          }}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            layoutMode === "block"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TbSquare className="size-3" />
          Block
        </button>
        {/* Display Variants Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowDisplayDropdown(!showDisplayDropdown)}
            className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              ["inline-block", "inline-flex", "inline-grid", "inline", "hidden"].includes(
                currentDisplay
              )
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TbChevronDown className="size-3" />
          </button>

          {showDisplayDropdown && (
            <div className="absolute right-0 top-full z-50 mt-1 w-32 rounded-md border border-border bg-background shadow-lg">
              {displayVariants.map(variant => (
                <button
                  key={variant.value}
                  onClick={() => handleDisplayVariant(variant.value)}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${
                    currentDisplay === variant.value
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Show presets only for flex and grid modes */}
      {layoutMode !== "block" && (
        <AutoHideScrollbar className="h-[210px]">
          <div className="col-span-full grid grid-cols-2 gap-1.5">
            {currentPresets.map((preset, index) => {
              const isActive =
                currentLayoutMode === layoutMode &&
                currentLayoutColumns === preset.columns &&
                currentPresetLayout === preset.name.toLowerCase().replace(/\s+/g, "-");

              return (
                <PresetButton
                  key={index}
                  item={preset}
                  index={index}
                  isActive={isActive}
                  onClick={() => handlePresetSelect(preset)}
                  title={preset.name}
                />
              );
            })}
          </div>
        </AutoHideScrollbar>
      )}
    </ToolbarSection>
  );
};
