// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { Tooltip } from "components/layout/Tooltip";
import { useEffect, useState } from "react";
import {
  TbCheck,
  TbCopy,
  TbDeviceDesktop,
  TbDeviceMobile,
  TbLayersSubtract,
  TbSearch,
} from "react-icons/tb";
import { twMerge } from "tailwind-merge";
import { AllStyles, classNameToVar, isValidTailwindClass } from "utils/tailwind";
import {
  buildVariantPrefix,
  editorCanvasViewToClassPrefixKey,
  normalizeVariantSegments,
  splitClassVariants,
  VIEW_BREAKPOINT_SCOPE_KEYS,
} from "../../../utils/tailwind/className";
import { ViewAtom } from "../../Viewport/atoms";
import { changeProp } from "../../Viewport/lib";
import { breakpointScopeHasSelection, getEffectiveViews, ViewSelectionAtom } from "../Label";
import { ToolbarItemProps } from "../ToolbarItem";
import { Card, CardLight, Wrap } from "../ToolbarStyle";

const isMappedOrValidTailwind = classValue =>
  Boolean(classNameToVar(classValue)) || isValidTailwindClass(classValue);

const V1_VARIANT_SEGS = new Set(["sm", "md", "lg", "xl", "2xl", "dark", "hover"]);

/** Token uses only v1 variants (sm/md/lg/xl/2xl/dark/hover) and a single utility stem without extra `:`. */
const isBreakpointUtilityToken = cls => {
  if (!cls || typeof cls !== "string") return false;
  const { segments, base } = splitClassVariants(cls);
  for (const s of segments) {
    if (!V1_VARIANT_SEGS.has(s)) return false;
  }
  return !base.includes(":");
};

const DEFAULT_CLASS_INPUT_VIEWS = VIEW_BREAKPOINT_SCOPE_KEYS.reduce((acc, k) => {
  acc[k] = false;
  return acc;
}, {});

/** Panel row: id matches VIEW_BREAKPOINT_SCOPE_KEYS + getViewClassPrefix (desktop -> md:) */
const CLASS_BREAKPOINT_BUCKETS = [
  {
    id: "mobile",
    label: "Base",
    hint: "default",
    icon: "mobile" as const,
    selectedBg: "bg-primary text-primary-foreground",
    mutedHover: "text-muted-foreground hover:bg-muted hover:text-foreground",
    dropValid: "border-2 border-dashed border-primary bg-primary/10",
    dropInvalid: "border-2 border-dashed border-destructive bg-destructive/10",
    borderIdle: "border-border",
  },
  {
    id: "sm",
    label: "SM",
    hint: "640px+",
    icon: "badge" as const,
    selectedBg: "bg-(--chart-1) text-white",
    mutedHover: "text-muted-foreground hover:bg-muted hover:text-foreground",
    dropValid: "border-2 border-dashed border-(--chart-1) bg-(--chart-1)/10",
    dropInvalid: "border-2 border-dashed border-destructive bg-destructive/10",
    borderIdle: "border-border",
  },
  {
    id: "desktop",
    label: "MD",
    hint: "768px+",
    icon: "desktop" as const,
    selectedBg: "bg-(--chart-4) text-white",
    mutedHover: "text-muted-foreground hover:bg-muted hover:text-foreground",
    dropValid: "bg-(--chart-4)/10 border-2 border-dashed border-(--chart-4)",
    dropInvalid: "bg-(--chart-4)/20 border-2 border-dashed border-(--chart-4)",
    borderIdle: "border-border",
  },
  {
    id: "lg",
    label: "LG",
    hint: "1024px+",
    icon: "badge" as const,
    selectedBg: "bg-(--chart-2) text-white",
    mutedHover: "text-muted-foreground hover:bg-muted hover:text-foreground",
    dropValid: "border-2 border-dashed border-(--chart-2) bg-(--chart-2)/10",
    dropInvalid: "border-2 border-dashed border-destructive bg-destructive/10",
    borderIdle: "border-border",
  },
  {
    id: "xl",
    label: "XL",
    hint: "1280px+",
    icon: "badge" as const,
    selectedBg: "bg-(--chart-3) text-white",
    mutedHover: "text-muted-foreground hover:bg-muted hover:text-foreground",
    dropValid: "border-2 border-dashed border-(--chart-3) bg-(--chart-3)/10",
    dropInvalid: "border-2 border-dashed border-destructive bg-destructive/10",
    borderIdle: "border-border",
  },
  {
    id: "2xl",
    label: "2XL",
    hint: "1536px+",
    icon: "badge" as const,
    selectedBg: "bg-(--chart-5) text-white",
    mutedHover: "text-muted-foreground hover:bg-muted hover:text-foreground",
    dropValid: "border-2 border-dashed border-(--chart-5) bg-(--chart-5)/10",
    dropInvalid: "border-2 border-dashed border-destructive bg-destructive/10",
    borderIdle: "border-border",
  },
];

const APPLY_SCOPE_DISPLAY: Record<string, string> = {
  mobile: "base",
  sm: "sm",
  md: "md",
  desktop: "md",
  lg: "lg",
  xl: "xl",
  "2xl": "2xl",
};

/** Single Tailwind layer for unprefixed class writes (matches `changeProp` + ViewAtom). */
function canvasViewToClassScopeKey(canvasView: string | undefined): string {
  const v = canvasView || "desktop";
  if (v === "mobile") return "mobile";
  if (v === "sm" || v === "tablet") return "sm";
  if (v === "desktop") return "mobile";
  if (v === "md") return "desktop";
  if (v === "lg") return "lg";
  if (v === "xl") return "xl";
  if (v === "2xl") return "2xl";
  return "mobile";
}

function breakpointBucketForClassToken(
  cls: string,
): "mobile" | "sm" | "desktop" | "lg" | "xl" | "2xl" | "other" {
  const { segments } = splitClassVariants(cls);
  const norm = normalizeVariantSegments(segments);
  if (norm.includes("hover")) return "other";
  const r = norm.find(s => s === "sm" || s === "md" || s === "lg" || s === "xl" || s === "2xl");
  if (r === "sm") return "sm";
  if (r === "md") return "desktop";
  if (r === "lg") return "lg";
  if (r === "xl") return "xl";
  if (r === "2xl") return "2xl";
  return "mobile";
}

function parseClassNameIntoBreakpointBuckets(classNameStr: string, excludeList: string[]) {
  const mobileClasses: string[] = [];
  const smClasses: string[] = [];
  const desktopClasses: string[] = [];
  const lgClasses: string[] = [];
  const xlClasses: string[] = [];
  const twoxlClasses: string[] = [];
  const otherClasses: string[] = [];

  const tokens = (classNameStr || "").split(/\s+/).filter(Boolean);
  for (const cls of tokens) {
    if (excludeList?.includes(cls)) continue;
    const bucket = breakpointBucketForClassToken(cls);
    if (bucket === "sm") smClasses.push(cls);
    else if (bucket === "desktop") desktopClasses.push(cls);
    else if (bucket === "lg") lgClasses.push(cls);
    else if (bucket === "xl") xlClasses.push(cls);
    else if (bucket === "2xl") twoxlClasses.push(cls);
    else if (bucket === "other") otherClasses.push(cls);
    else mobileClasses.push(cls);
  }

  return {
    mobile: mobileClasses,
    sm: smClasses,
    desktop: desktopClasses,
    lg: lgClasses,
    xl: xlClasses,
    "2xl": twoxlClasses,
    other: otherClasses,
  };
}

function migrateClassInputSelectedViews(raw: unknown): Record<string, boolean> {
  const next = { ...DEFAULT_CLASS_INPUT_VIEWS };
  if (!raw || typeof raw !== "object") return next;
  const o = raw as Record<string, boolean>;
  for (const k of VIEW_BREAKPOINT_SCOPE_KEYS) {
    if (typeof o[k] === "boolean") next[k] = o[k];
  }
  return next;
}

function BreakpointBucketIcon({ icon, label }) {
  if (icon === "mobile") return <TbDeviceMobile className="size-3.5" />;
  if (icon === "desktop") return <TbDeviceDesktop className="size-3.5" />;
  return (
    <span className="min-w-[1.25rem] text-center font-mono text-[10px] font-bold tracking-tight">
      {label}
    </span>
  );
}

const CopyButton = ({ classes, category, copiedCategory, onCopy }) => {
  if (!classes || classes.length === 0) return null;

  return (
    <Tooltip
      content={copiedCategory === category ? "Copied!" : `Copy ${category} classes`}
      placement="top"
    >
      <button
        onClick={() => onCopy(classes, category)}
        className="text-muted-foreground hover:bg-accent/10 hover:text-foreground ml-auto rounded p-1 transition-all hover:scale-110"
      >
        {copiedCategory === category ? (
          <TbCheck className="size-3.5" />
        ) : (
          <TbCopy className="size-3.5" />
        )}
      </button>
    </Tooltip>
  );
};

const Input = ({ value, changed, nodeProps, setProp, canvasView }) => {
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classes = Array.isArray(value) ? value : [];
  const [classInput, setClassInput] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverCategory, setDragOverCategory] = useState(null);
  const [copiedCategory, setCopiedCategory] = useState(null);

  // Mobile/Desktop toggle state
  const [selectedViews, setSelectedViews] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("classNameInput-selectedViews");
      if (saved) {
        try {
          return migrateClassInputSelectedViews(JSON.parse(saved));
        } catch {
          return { ...DEFAULT_CLASS_INPUT_VIEWS };
        }
      }
    }
    return { ...DEFAULT_CLASS_INPUT_VIEWS };
  });

  // Handle view toggle changes
  const toggleView = view => {
    const newSelectedViews = {
      ...selectedViews,
      [view]: !selectedViews[view],
    };
    setSelectedViews(newSelectedViews);

    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("classNameInput-selectedViews", JSON.stringify(newSelectedViews));
    }
  };

  // Define conflicting class groups
  const conflictGroups = {
    flex: ["flex-row", "flex-row-reverse", "flex-col", "flex-col-reverse"],
    justify: [
      "justify-start",
      "justify-end",
      "justify-center",
      "justify-between",
      "justify-around",
      "justify-evenly",
    ],
    items: ["items-start", "items-end", "items-center", "items-baseline", "items-stretch"],
    text: ["text-left", "text-center", "text-right", "text-justify"],
    float: ["float-left", "float-right", "float-none"],
    clear: ["clear-left", "clear-right", "clear-both", "clear-none"],
    display: [
      "block",
      "inline-block",
      "inline",
      "flex",
      "inline-flex",
      "table",
      "inline-table",
      "table-caption",
      "table-cell",
      "table-column",
      "table-column-group",
      "table-footer-group",
      "table-header-group",
      "table-row-group",
      "table-row",
      "flow-root",
      "grid",
      "inline-grid",
      "contents",
      "list-item",
      "hidden",
    ],
    position: ["static", "fixed", "absolute", "relative", "sticky"],
    overflow: [
      "overflow-auto",
      "overflow-hidden",
      "overflow-clip",
      "overflow-visible",
      "overflow-scroll",
    ],
    whitespace: [
      "whitespace-normal",
      "whitespace-nowrap",
      "whitespace-pre",
      "whitespace-pre-line",
      "whitespace-pre-wrap",
      "whitespace-break-spaces",
    ],
  };

  const removeConflictingClasses = (newClass, existingClasses) => {
    // Find which conflict group the new class belongs to
    const conflictGroup = Object.values(conflictGroups).find(group => group.includes(newClass));

    if (!conflictGroup) {
      return existingClasses; // No conflicts to remove
    }

    // Remove any existing classes from the same conflict group
    return existingClasses.filter(cls => !conflictGroup.includes(cls));
  };

  const save = (input = null) => {
    const data = (input || classInput).split(" ").filter(_ => !classes.includes(_));

    if (!data.length) return;

    // Separate responsive classes from regular classes
    const responsiveClasses = data.filter(cls => breakpoints.some(bp => cls.startsWith(bp)));
    const regularClasses = data.filter(cls => !breakpoints.some(bp => cls.startsWith(bp)));

    // Handle responsive classes — all go into className via twMerge
    responsiveClasses.forEach(cls => {
      // All responsive classes (sm:, md:, lg:, xl:, 2xl:) go directly into className
      setProp(props => {
        props.className = twMerge(props.className || "", cls);
      }, 0);
    });

    // Handle regular classes - use the changed prop for proper assignment
    if (regularClasses.length > 0) {
      const newClasses = [...classes, ...regularClasses];
      changed(newClasses);
    }

    setClassInput("");
  };

  const del = (key, deleteLinked = false) => {
    const cl = [...(classes || [])];
    const classToDelete = cl[key];

    // For now, disable deleteLinked functionality to prevent cross-category deletion
    // TODO: Implement proper linked deletion within same category only
    if (deleteLinked) {
      console.warn(
        "Delete linked functionality temporarily disabled to prevent cross-category deletion"
      );
      return;
    }

    // Always delete the specific class that was clicked
    delete cl[key];
    changed(cl);
  };

  const [matches, setMatches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Tailwind responsive breakpoints
  const breakpoints = ["sm:", "md:", "lg:", "xl:", "2xl:"];

  useEffect(() => {
    if (classInput.length < 2) return;

    // Check if input contains a responsive prefix
    const hasBreakpoint = breakpoints.some(bp => classInput.startsWith(bp));

    let searchTerm = classInput;
    let responsiveMatches = [];

    if (hasBreakpoint) {
      // Extract the breakpoint and class
      const breakpoint = breakpoints.find(bp => classInput.startsWith(bp));
      const classAfterBreakpoint = classInput.substring(breakpoint.length);

      // Find matches for the class after the breakpoint
      const baseMatches = AllStyles.filter(s => s?.includes(classAfterBreakpoint));

      // Create responsive versions
      responsiveMatches = baseMatches.map(cls => `${breakpoint}${cls}`);
    } else {
      // Regular search + generate responsive suggestions
      const baseMatches = AllStyles.filter(s => s?.includes(classInput));

      // Add responsive versions for the first few matches
      responsiveMatches = baseMatches
        .slice(0, 5)
        .flatMap(cls => breakpoints.map(bp => `${bp}${cls}`));

      // Combine base matches with responsive suggestions
      responsiveMatches = [...baseMatches, ...responsiveMatches];
    }

    const matches = responsiveMatches.filter(item => !classes?.includes(item)).slice(0, 4);

    setMatches(matches);
    setSelectedIndex(0); // Reset selection when matches change
  }, [classInput]);

  const searched = !!(classInput && matches.length);

  const _nodeProps = nodeProps ? { ...nodeProps } : {};

  const delNodeProp = (classValue, _view, deleteLinked = false) => {
    // For now, disable deleteLinked functionality to prevent cross-category deletion
    if (deleteLinked) {
      console.warn(
        "Delete linked functionality temporarily disabled to prevent cross-category deletion"
      );
      return;
    }

    // className-first: remove the exact class token from props.className
    setProp(props => {
      if (!props.className) return props;
      const parts = (props.className || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter(c => c !== classValue);
      props.className = parts.join(" ");
      return props;
    });
  };

  // ── Helpers for responsive prefix manipulation ──
  /** Strip all v1 variant prefixes; return utility stem (e.g. md:dark:gap-4 → gap-4). */
  const stripToUtilityBase = cls => splitClassVariants(cls).base;

  // Drag and drop handlers
  const handleDragStart = (e, data) => {
    // Check if shift key is held for copy operation
    const isCopy = e.shiftKey;
    // Track source category so we don't have to guess later
    setDraggedItem({
      ...data,
      type: isCopy ? "copy" : "move",
      sourceCategory: data.sourceCategory,
    });

    // Only set dataTransfer if it exists (for native HTML5 drag events)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = isCopy ? "copy" : "move";
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverCategory(null);
  };

  const isValidDropTarget = (classValue, targetCategory) => {
    if (targetCategory === "other") return false;
    const baseClass = stripToUtilityBase(classValue);
    if (!isBreakpointUtilityToken(classValue) && targetCategory !== "mobile") return false;
    return isValidTailwindClass(baseClass) || isMappedOrValidTailwind(baseClass);
  };

  const handleDragOver = (e, category) => {
    e.preventDefault();

    if (draggedItem) {
      const isValid = isValidDropTarget(draggedItem.value, category);
      setDragOverCategory(isValid ? category : `invalid-${category}`);
    } else {
      setDragOverCategory(null);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = (e, targetCategory) => {
    e.preventDefault();
    setDragOverCategory(null);

    if (!draggedItem) return;

    const { value: draggedValue, type: dragType, sourceCategory } = draggedItem;
    const isCopy = dragType === "copy";

    if (sourceCategory === targetCategory) return;
    if (targetCategory === "other") return;

    const baseClass = stripToUtilityBase(draggedValue);
    const stdBp = isBreakpointUtilityToken(draggedValue);

    if (!stdBp && targetCategory !== "mobile") {
      console.warn(
        `Class "${draggedValue}" uses a variant prefix; drop onto Base only, not ${targetCategory}`
      );
      return;
    }

    if (!isValidDropTarget(draggedValue, targetCategory)) {
      console.warn(`Class "${baseClass}" is not valid for ${targetCategory} category`);
      return;
    }

    const mergedToken = stdBp
      ? (() => {
          const p = buildVariantPrefix(targetCategory, classDark);
          return p ? `${p}${baseClass}` : baseClass;
        })()
      : draggedValue;

    if (!isCopy && sourceCategory) {
      setProp((props: any) => {
        const parts = (props.className || "")
          .split(/\s+/)
          .filter(Boolean)
          .filter(c => c !== draggedValue);
        props.className = parts.join(" ");
      }, 0);
    }

    setProp((props: any) => {
      props.className = twMerge(props.className || "", mergedToken);
    }, 0);

    setDraggedItem(null);
  };

  const {
    mobile: mobileClasses,
    sm: smClasses,
    desktop: desktopClasses,
    lg: lgClasses,
    xl: xlClasses,
    "2xl": twoxlClasses,
    other: otherClasses,
  } = parseClassNameIntoBreakpointBuckets(_nodeProps.className || "", classes || []);

  const bucketLists = {
    mobile: mobileClasses,
    sm: smClasses,
    desktop: desktopClasses,
    lg: lgClasses,
    xl: xlClasses,
    "2xl": twoxlClasses,
  };

  const cardBgByBucket = {
    mobile: "bg-primary text-primary-foreground",
    sm: "bg-(--chart-1) text-white!",
    desktop: "bg-(--chart-4) text-white!",
    lg: "bg-(--chart-2) text-white!",
    xl: "bg-(--chart-3) text-white!",
    "2xl": "bg-(--chart-5) text-white!",
  };

  // Copy classes to clipboard
  const copyClasses = (classArray, category) => {
    if (classArray.length === 0) return;
    const classString = classArray.join(" ");
    navigator.clipboard.writeText(classString);
    setCopiedCategory(category);
    setTimeout(() => setCopiedCategory(null), 2000);
  };

  return (
    <div className="relative z-10 flex flex-col gap-6">
      <label htmlFor="search" className="text-foreground sr-only text-sm font-medium">
        Search
      </label>
      <div className="input-wrapper relative">
        <input
          type="search"
          id="search"
          className="input-plain h-7"
          placeholder="Class Search"
          required
          autoComplete="off"
          onChange={event => setClassInput(event.target.value)}
          onKeyDown={e => {
            // Tab completion
            if (e.key === "Tab" && matches.length > 0) {
              e.preventDefault();

              // Check if current input has a responsive prefix
              const hasBreakpoint = breakpoints.some(bp => classInput.startsWith(bp));

              if (hasBreakpoint) {
                // If we're typing with a prefix, complete with the first responsive match
                const responsiveMatch = matches.find(match =>
                  match.startsWith(classInput.split(":")[0] + ":")
                );
                setClassInput(responsiveMatch || matches[0]);
              } else {
                // Regular completion
                setClassInput(matches[0]);
              }
            }

            // Arrow key navigation
            if (e.key === "ArrowDown" && matches.length > 0) {
              e.preventDefault();
              setSelectedIndex(prev => Math.min(prev + 1, matches.length - 1));
            }

            if (e.key === "ArrowUp" && matches.length > 0) {
              e.preventDefault();
              setSelectedIndex(prev => Math.max(prev - 1, 0));
            }

            // Enter to select highlighted item (only if there's a selection)
            if (
              e.key === "Enter" &&
              matches.length > 0 &&
              selectedIndex >= 0 &&
              selectedIndex !== 0
            ) {
              e.preventDefault();
              setClassInput(matches[selectedIndex]);
            }
          }}
          onKeyUp={e => {
            if (e.key === "Enter") {
              save();
            }
          }}
          value={classInput}
        />
        {/* Ghost text suggestion - behind input */}
        {classInput?.length > 0 && matches.length > 0 && matches[0].startsWith(classInput) && (
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center px-3">
            <span className="invisible">{classInput}</span>
            <span className="text-muted-foreground font-mono">
              {matches[0].slice(classInput.length)}
            </span>
          </div>
        )}
        <button type="submit" className="btn-search" onClick={() => save()}>
          <TbSearch />
        </button>
      </div>

      {searched && (
        <div className="border-border bg-background absolute top-10 z-50 w-full overflow-hidden rounded-lg border shadow-lg">
          <div className="scrollbar flex max-h-60 w-full flex-wrap gap-2 overflow-auto p-2">
            {matches.map((mat, k) => (
              <CardLight
                key={k}
                value={mat}
                onClick={() => save(mat)}
                className={
                  k === selectedIndex
                    ? "bg-accent text-accent-foreground ring-accent rounded-lg ring-2"
                    : ""
                }
              />
            ))}
          </div>
          {matches.length > 0 && (
            <div className="border-border bg-muted/50 text-muted-foreground border-t p-2 text-xs">
              <div className="flex flex-wrap gap-1">
                <span>
                  Press{" "}
                  <kbd className="bg-background text-foreground rounded-lg border px-1.5 py-0.5">
                    Tab
                  </kbd>{" "}
                  to complete
                </span>
                <span>
                  Use{" "}
                  <kbd className="bg-background text-foreground rounded-lg border px-1.5 py-0.5">
                    ↑↓
                  </kbd>{" "}
                  to navigate
                </span>
                <span>
                  Press{" "}
                  <kbd className="bg-background text-foreground rounded-lg border px-1.5 py-0.5">
                    Enter
                  </kbd>{" "}
                  to select
                </span>
              </div>
              <div className="mt-1">
                Unprefixed classes are the base layer (mobile-first). Prefix with{" "}
                <kbd className="bg-background text-foreground rounded-lg border px-1.5 py-0.5">
                  sm:
                </kbd>
                ,{" "}
                <kbd className="bg-background text-foreground rounded-lg border px-1.5 py-0.5">
                  md:
                </kbd>
                ,{" "}
                <kbd className="bg-background text-foreground rounded-lg border px-1.5 py-0.5">
                  lg:
                </kbd>
                ,{" "}
                <kbd className="bg-background text-foreground rounded-lg border px-1.5 py-0.5">
                  xl:
                </kbd>
                , or{" "}
                <kbd className="bg-background text-foreground rounded-lg border px-1.5 py-0.5">
                  2xl:
                </kbd>{" "}
                for overrides from that min-width breakpoint and up.
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-xxs text-muted-foreground -mt-5 flex flex-wrap items-baseline gap-x-1 pl-1">
        <span>Apply to:</span>
        <span className="text-foreground font-medium">
          {breakpointScopeHasSelection(selectedViews)
            ? getEffectiveViews(selectedViews, canvasView)
                .map(v => APPLY_SCOPE_DISPLAY[v] ?? v)
                .join(" + ")
            : APPLY_SCOPE_DISPLAY[canvasViewToClassScopeKey(canvasView)] ??
              canvasViewToClassScopeKey(canvasView)}
        </span>
        {!breakpointScopeHasSelection(selectedViews) && (
          <span className="text-muted-foreground">(default layers)</span>
        )}
      </div>

      {CLASS_BREAKPOINT_BUCKETS.map(row => {
        const list = bucketLists[row.id];
        const isOn = selectedViews[row.id];
        return (
          <div key={row.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleView(row.id)}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                  isOn ? row.selectedBg : row.mutedHover
                }`}
              >
                <BreakpointBucketIcon icon={row.icon} label={row.label} />
                <span className="flex flex-col items-start leading-tight">
                  <span>{row.label}</span>
                  <span className="text-[10px] font-normal opacity-80">{row.hint}</span>
                </span>
              </button>
              <CopyButton
                classes={list}
                category={row.id}
                copiedCategory={copiedCategory}
                onCopy={copyClasses}
              />
            </div>
            <div
              className={`flex flex-wrap gap-1.5 rounded-lg border border-dashed p-2 transition-colors ${row.borderIdle} ${
                dragOverCategory === row.id
                  ? row.dropValid
                  : dragOverCategory === `invalid-${row.id}`
                    ? row.dropInvalid
                    : ""
              }`}
              onDragOver={e => handleDragOver(e, row.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, row.id)}
            >
              {list.map((cls, key) => (
                <Card
                  key={`${row.id}-${cls}-${key}`}
                  value={cls}
                  onClick={(e, options) => delNodeProp(cls, row.id, options?.deleteLinked)}
                  bgColor={cardBgByBucket[row.id]}
                  onDragStart={(e, data) => handleDragStart(e, { ...data, sourceCategory: row.id })}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        );
      })}

      {otherClasses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium">
              <TbLayersSubtract className="size-3.5 shrink-0 opacity-80" />
              <span className="flex flex-col items-start leading-tight">
                <span>Other variants</span>
                <span className="text-[10px] font-normal opacity-80">hover, max-, etc.</span>
              </span>
            </div>
            <CopyButton
              classes={otherClasses}
              category="other"
              copiedCategory={copiedCategory}
              onCopy={copyClasses}
            />
          </div>
          <div
            className={`border-border flex flex-wrap gap-1.5 rounded-lg border border-dashed p-2 transition-colors ${
              dragOverCategory === "invalid-other"
                ? "border-destructive bg-destructive/10 border-2 border-dashed"
                : ""
            }`}
            onDragOver={e => {
              e.preventDefault();
              if (draggedItem) setDragOverCategory("invalid-other");
            }}
            onDragLeave={handleDragLeave}
          >
            {otherClasses.map((cls, key) => (
              <Card
                key={`other-${cls}-${key}`}
                value={cls}
                onClick={(e, options) => delNodeProp(cls, "other", options?.deleteLinked)}
                bgColor="bg-muted text-foreground"
                onDragStart={(e, data) => handleDragStart(e, { ...data, sourceCategory: "other" })}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ClassItem = ({ full = false, propKey, ...props }: ToolbarItemProps) => {
  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data.props,
    id: node.id,
  }));

  const { query, actions } = useEditor();
  const propValue = (nodeProps || {})[propKey];
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classWriteView = editorCanvasViewToClassPrefixKey(view);

  const value = propValue;

  const changed = va => {
    const remaining = [];

    if (!va.filter(_ => _).length) {
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

    va.forEach(value => {
      const propKey = classNameToVar(value);

      if (propKey) {
        return changeProp({
          propKey,
          value,
          setProp,
          propType: "class",
          view: classWriteView,
          query,
          actions,
          nodeId: id,
          classDark,
        });
      }

      remaining.push(value);
    });

    if (remaining.length) {
      changeProp({
        propKey: "className",
        value: remaining.filter(_ => _),
        setProp,
        propType: "component",
        query,
        actions,
        nodeId: id,
      });
    }
  };

  let lab = value;

  if (props.valueLabels && props.valueLabels[value]) {
    lab = props.valueLabels[value];
  }

  return (
    <Wrap props={props} lab={lab} propKey={propKey}>
      <Input
        nodeProps={{ ...nodeProps }}
        value={value}
        changed={changed}
        setProp={setProp}
        canvasView={view}
      />
    </Wrap>
  );
};
