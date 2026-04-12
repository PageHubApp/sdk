import { useEditor, useNode } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { classNameToVar } from "utils/tailwind";
import {
  buildVariantPrefix,
  editorCanvasViewToClassPrefixKey,
  splitClassVariants,
} from "../../../utils/tailwind/className";
import { ViewAtom } from "../../Viewport/atoms";
import { changeProp } from "../../Viewport/lib";
import { breakpointScopeHasSelection, getEffectiveViews, ViewSelectionAtom } from "../Label";
import { ToolbarItemProps } from "../ToolbarItem";
import { Card, Wrap } from "../ToolbarStyle";
import { ClassSearchInput } from "./ClassInput/ClassSearchInput";
import { BreakpointBuckets, ClearAllStylesButton } from "./ClassInput/BreakpointBuckets";
import {
  APPLY_SCOPE_DISPLAY,
  BREAKPOINT_PREFIXES,
  canvasViewToClassScopeKey,
  isMappedOrValidTailwind,
  isBreakpointUtilityToken,
  parseClassNameIntoBreakpointBuckets,
} from "./ClassInput/classItemUtils";

const Input = ({
  value,
  changed,
  nodeProps,
  setProp,
  canvasView,
  children,
  clearAllPlacement = "in-buckets",
}: {
  value: any;
  changed: (v: any) => void;
  nodeProps: any;
  setProp: any;
  canvasView: string;
  children?: ReactNode;
  clearAllPlacement?: "in-buckets" | "after-append";
}) => {
  const [selectedViews, setSelectedViews] = useAtomState(ViewSelectionAtom);
  const classDark = selectedViews.dark ?? false;
  const classes = Array.isArray(value) ? value : [];
  const [classInput, setClassInput] = useState("");
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const toggleView = (view: string) => {
    setSelectedViews(prev => ({ ...prev, [view]: !prev[view] }));
  };

  const save = (input: string | null = null) => {
    const data = (input || classInput).split(" ").filter(c => !classes.includes(c));
    if (!data.length) return;

    const responsive = data.filter(cls => BREAKPOINT_PREFIXES.some(bp => cls.startsWith(bp)));
    const regular = data.filter(cls => !BREAKPOINT_PREFIXES.some(bp => cls.startsWith(bp)));

    responsive.forEach(cls => {
      setProp((props: any) => {
        props.className = twMerge(props.className || "", cls);
      }, 0);
    });

    if (regular.length > 0) changed([...classes, ...regular]);
    setClassInput("");
  };

  const delNodeProp = (classValue: string) => {
    setProp((props: any) => {
      if (!props.className) return;
      props.className = (props.className || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((c: string) => c !== classValue)
        .join(" ");
    });
  };

  const stripToUtilityBase = (cls: string) => splitClassVariants(cls).base;

  const handleDragStart = (e: React.DragEvent, data: any) => {
    setDraggedItem({ ...data, type: e.shiftKey ? "copy" : "move" });
    if (e.dataTransfer) e.dataTransfer.effectAllowed = e.shiftKey ? "copy" : "move";
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverCategory(null);
  };

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    if (draggedItem) {
      const baseClass = stripToUtilityBase(draggedItem.value);
      const valid =
        category !== "other" &&
        (isBreakpointUtilityToken(draggedItem.value) || category === "mobile") &&
        isMappedOrValidTailwind(baseClass);
      setDragOverCategory(valid ? category : `invalid-${category}`);
    }
  };

  const handleDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    setDragOverCategory(null);
    if (!draggedItem) return;

    const { value: draggedValue, type: dragType, sourceCategory } = draggedItem;
    if (sourceCategory === targetCategory || targetCategory === "other") return;

    const baseClass = stripToUtilityBase(draggedValue);
    if (!isBreakpointUtilityToken(draggedValue) && targetCategory !== "mobile") return;

    const mergedToken = isBreakpointUtilityToken(draggedValue)
      ? (() => {
          const p = buildVariantPrefix(targetCategory, classDark);
          return p ? `${p}${baseClass}` : baseClass;
        })()
      : draggedValue;

    if (dragType !== "copy" && sourceCategory) {
      setProp((props: any) => {
        props.className = (props.className || "")
          .split(/\s+/)
          .filter(Boolean)
          .filter((c: string) => c !== draggedValue)
          .join(" ");
      }, 0);
    }

    setProp((props: any) => {
      props.className = twMerge(props.className || "", mergedToken);
    }, 0);
    setDraggedItem(null);
  };

  const _nodeProps = nodeProps ? { ...nodeProps } : {};
  const {
    mobile,
    sm,
    desktop,
    lg,
    xl,
    "2xl": twoxl,
    other,
  } = parseClassNameIntoBreakpointBuckets(_nodeProps.className || "", classes || []);
  const allBucketClasses = [mobile, sm, desktop, lg, xl, twoxl, other].flat();

  const clearBucket = (bucketClasses: string[]) => {
    setProp((props: any) => {
      if (!props.className) return;
      const remaining = (props.className || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((c: string) => !bucketClasses.includes(c));
      props.className = remaining.join(" ");
    }, 0);
  };

  const clearAll = () => {
    setProp((props: any) => {
      if (!props.className) return;
      const remaining = (props.className || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((c: string) => !allBucketClasses.includes(c));
      props.className = remaining.join(" ");
    }, 0);
    changed([]);
  };

  return (
    <div className="relative z-10 flex flex-col gap-6">
      <ClassSearchInput
        classes={classes}
        onSave={save}
        classInput={classInput}
        setClassInput={setClassInput}
      />

      <div className="text-xxs text-neutral-content -mt-5 flex flex-wrap items-baseline gap-x-1 pl-1">
        <span>Apply to:</span>
        <span className="text-base-content font-medium">
          {breakpointScopeHasSelection(selectedViews)
            ? getEffectiveViews(selectedViews, canvasView)
                .map(v => APPLY_SCOPE_DISPLAY[v] ?? v)
                .join(" + ")
            : (APPLY_SCOPE_DISPLAY[canvasViewToClassScopeKey(canvasView)] ??
              canvasViewToClassScopeKey(canvasView))}
        </span>
        {!breakpointScopeHasSelection(selectedViews) && (
          <span className="text-neutral-content">(default layers)</span>
        )}
      </div>

      <BreakpointBuckets
        bucketLists={{ mobile, sm, desktop, lg, xl, "2xl": twoxl }}
        otherClasses={other}
        selectedViews={selectedViews}
        toggleView={toggleView}
        dragOverCategory={dragOverCategory}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOverCategory(null)}
        onDrop={handleDrop}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDelete={delNodeProp}
        onClearBucket={clearBucket}
        onClearAll={clearAll}
        draggedItem={draggedItem}
        showClearAllButton={clearAllPlacement === "in-buckets"}
      />

      {children}

      {clearAllPlacement === "after-append" && allBucketClasses.length > 0 && (
        <ClearAllStylesButton onClick={clearAll} />
      )}
    </div>
  );
};

export function ClassItem({
  full = false,
  propKey,
  children,
  clearAllPlacement = "in-buckets",
  ...props
}: ToolbarItemProps & {
  children?: ReactNode;
  clearAllPlacement?: "in-buckets" | "after-append";
}) {
  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({ nodeProps: node.data.props, id: node.id }));
  const { query, actions } = useEditor();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classWriteView = editorCanvasViewToClassPrefixKey(view);
  const value = (nodeProps || {})[propKey];

  const changed = (va: string[]) => {
    const remaining: string[] = [];
    if (!va.filter(v => v).length) {
      return changeProp({
        propKey: "className",
        value: [],
        setProp,
        propType: "component",
        query,
        actions,
        nodeId: id,
      });
    }
    va.forEach(v => {
      const pk = classNameToVar(v);
      if (pk) {
        return changeProp({
          propKey: pk,
          value: v,
          setProp,
          propType: "class",
          view: classWriteView,
          query,
          actions,
          nodeId: id,
          classDark,
        });
      }
      remaining.push(v);
    });
    if (remaining.length) {
      changeProp({
        propKey: "className",
        value: remaining.filter(v => v),
        setProp,
        propType: "component",
        query,
        actions,
        nodeId: id,
      });
    }
  };

  let lab = value;
  if (props.valueLabels && props.valueLabels[value]) lab = props.valueLabels[value];

  return (
    <Wrap props={props} lab={lab} propKey={propKey}>
      <Input
        nodeProps={{ ...nodeProps }}
        value={value}
        changed={changed}
        setProp={setProp}
        canvasView={view}
        clearAllPlacement={clearAllPlacement}
      >
        {children}
      </Input>
    </Wrap>
  );
}
