import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../viewport/state/viewportExports";
import { ViewAtom } from "../../../viewport/state/atoms";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRegisterFloatingPanelPortal } from "@/chrome/floating/FloatingPanel";
import { useAtomValue } from "@zedux/react";
import { generatePattern } from "@/utils/background";
import { editorCanvasViewToClassPrefixKey } from "@/utils/tailwind/className";
import { EditModifiersAtom } from "../../Label";
import { Chip } from "@/chrome/primitives/Chip";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { InlineClearButton } from "@/chrome/primitives/InlineClearButton";
import { MiniPreviewTile } from "@/chrome/primitives/MiniPreviewTile";
import { getPageHubApiBaseUrl } from "@/core/apiConfig";
import { TbSearch, TbX } from "react-icons/tb";

const DEMO_COLORS = {
  patternColor1: "rgba(59, 130, 246, 0.8)",
  patternColor2: "rgba(16, 185, 129, 0.8)",
  patternColor3: "rgba(245, 101, 101, 0.8)",
  patternColor4: "rgba(168, 85, 247, 0.8)",
};

const makePreview = (pattern: any) =>
  generatePattern({
    root: {
      pattern,
      patternVerticalPosition: 0,
      patternHorizontalPosition: 0,
      patternStroke: 1,
      patternZoom: 0.4,
      patternAngle: 0,
      patternSpacingX: 0,
      patternSpacingY: 0,
      ...DEMO_COLORS,
    },
  });

export const PatternsDialogInput = ({
  propKey,
  label = "",
  prefix = "",
  index = null,
  propItemKey = "",
  propType = "class",
}) => {
  const { actions, query } = useEditor();
  const canvasView = useAtomValue(ViewAtom);
  const classDark = useAtomValue(EditModifiersAtom).dark ?? false;
  const classWriteView = editorCanvasViewToClassPrefixKey(canvasView);

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data?.props || {},
    id: node.id,
  }));

  const [isOpen, setIsOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const value = nodeProps.root ? nodeProps.root[propKey] || "" : null;

  const patt = useMemo(() => (value ? makePreview(value) : null), [value]);

  const openPicker = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPickerPos({ top: rect.bottom + 4, left: rect.left });
    }
    setIsOpen(true);
  };

  const changed = (pattern: any) => {
    changeProp({
      propType,
      propKey,
      value: pattern,
      setProp,
      index,
      propItemKey,
      query,
      actions,
      nodeId: id,
      ...(propType === "class" ? { view: classWriteView, classDark } : {}),
    });
    // Set default colors if not already set
    if (pattern) {
      setProp((p: any) => {
        p.root = p.root || {};
        if (!p.root.patternColor1) p.root.patternColor1 = DEMO_COLORS.patternColor1;
        if (!p.root.patternColor2) p.root.patternColor2 = DEMO_COLORS.patternColor2;
        if (!p.root.patternColor3) p.root.patternColor3 = DEMO_COLORS.patternColor3;
        if (!p.root.patternColor4) p.root.patternColor4 = DEMO_COLORS.patternColor4;
        if (!p.root.patternStroke) p.root.patternStroke = 1;
        if (!p.root.patternZoom) p.root.patternZoom = 1;
      }, 500);
    }
  };

  const clear = () => {
    changed(null);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Chip
        propType={propType}
        propKey={propKey}
        trailing={value ? <InlineClearButton onClick={clear} tooltip="Clear pattern" /> : null}
      >
        <button
          ref={triggerRef}
          type="button"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content={value?.title || "Select pattern"}
          id={propKey ? `input-${propKey}` : undefined}
          onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
          className="input-plain flex min-w-0 flex-1 items-center text-left"
        >
          <div className="pointer-events-none flex min-h-0 w-full items-center gap-2">
            <MiniPreviewTile
              size="swatch"
              rounded="md"
              style={patt ? { backgroundImage: `url(${patt})` } : undefined}
            />
            <div className="min-w-0 flex-1 truncate text-left">
              {value?.title || <span className="text-neutral-content">Select pattern</span>}
            </div>
          </div>
        </button>
      </Chip>

      {isOpen &&
        pickerPos &&
        createPortal(
          <PatternPickerPanel
            selected={value?.slug}
            position={pickerPos}
            triggerRef={triggerRef}
            onSelect={pattern => {
              changed(pattern);
              setIsOpen(false);
            }}
            onClose={() => setIsOpen(false)}
          />,
          document.querySelector(".pagehub-sdk-root") || document.body
        )}
    </div>
  );
};

interface PickerPanelProps {
  selected?: string;
  position: { top: number; left: number };
  /** Trigger element — excluded from outside-click detection so clicking the
   *  trigger to toggle the picker doesn't trigger a double-open cycle. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (pattern: any) => void;
  onClose: () => void;
}

const PatternPickerPanel = ({
  selected,
  position,
  triggerRef,
  onSelect,
  onClose,
}: PickerPanelProps) => {
  const [patterns, setPatterns] = useState<any[] | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"all" | "stroke" | "fill">("all");
  const panelRef = useRef<HTMLDivElement>(null);
  useRegisterFloatingPanelPortal(panelRef);

  useEffect(() => {
    const apiUrl = getPageHubApiBaseUrl();
    fetch(`${apiUrl}/api/patterns`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(res => res.json())
      .then(re => setPatterns(Array.isArray(re) ? re : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (panelRef.current && panelRef.current.contains(target)) return;
      // Also exclude the trigger button — clicking it fires onClose here then
      // immediately re-opens via onClick. The parent's onClick toggle handles
      // closing when the picker is already open.
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, triggerRef]);

  const filtered = useMemo(() => {
    if (!patterns) return [];
    let list = patterns;
    if (mode !== "all") list = list.filter(p => p.mode === mode);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        p => p.title.toLowerCase().includes(q) || p.tags?.some((t: string) => t.includes(q))
      );
    }
    return list;
  }, [patterns, mode, search]);

  return (
    <div
      ref={panelRef}
      className="pagehub-sdk-root border-base-300 bg-base-200 fixed z-[1200] w-64 rounded-xl border shadow-xl"
      style={{ top: position.top, left: position.left }}
    >
      {/* Search */}
      <div className="border-base-300 flex items-center gap-1.5 border-b px-2 py-1.5">
        <TbSearch className="text-neutral-content size-3.5 shrink-0" />
        <input
          type="text"
          placeholder="Search patterns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="placeholder:text-neutral-content w-full bg-transparent text-xs outline-none"
          autoFocus
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-neutral-content hover:text-base-content"
          >
            <TbX className="size-3" />
          </button>
        )}
      </div>

      {/* Mode tabs */}
      <div className="border-base-300 flex gap-1 border-b px-2 py-1">
        {(["all", "stroke", "fill"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              mode === m
                ? "bg-primary text-primary-content"
                : "text-neutral-content hover:bg-neutral"
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
        <span className="text-neutral-content ml-auto self-center text-[10px]">
          {filtered.length}
        </span>
      </div>

      {/* Pattern list */}
      <div className="scrollbar-light max-h-48 overflow-y-auto">
        {!patterns ? (
          <div className="text-neutral-content px-3 py-6 text-center text-xs">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-neutral-content px-3 py-6 text-center text-xs">
            No patterns found
          </div>
        ) : (
          filtered.map(pattern => {
            const preview = makePreview(pattern);
            return (
              <button
                key={pattern.slug}
                onClick={() => onSelect(pattern)}
                className={`hover:bg-neutral flex w-full items-center gap-2 px-2 py-1 text-left transition-colors ${
                  selected === pattern.slug ? "bg-primary/10" : ""
                }`}
              >
                <div
                  className="border-base-300 bg-base-200 h-10 w-16 shrink-0 rounded border"
                  style={{ backgroundImage: preview ? `url(${preview})` : undefined }}
                />
                <span className="truncate text-xs">{pattern.title}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
