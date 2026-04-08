import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../Viewport/lib";
import { ViewAtom } from "../../../Viewport/atoms";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { generatePattern } from "utils/lib";
import { editorCanvasViewToClassPrefixKey } from "../../../../utils/tailwind/className";
import { ViewSelectionAtom } from "../../Label";
import { Wrap } from "../../ToolbarStyle";
import { getPageHubApiBaseUrl } from "../../../../runtimeApi";
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
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classWriteView = editorCanvasViewToClassPrefixKey(canvasView);

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data.props || {},
    id: node.id,
  }));

  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const value = nodeProps.root ? nodeProps.root[propKey] || "" : null;

  const patt = useMemo(() => (value ? makePreview(value) : null), [value]);

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
    <div ref={ref} className="relative">
      <Wrap
        props={{ label, labelHide: true }}
        lab={value?.name}
        propType={propType}
        propKey={propKey}
      >
        <div className="relative">
          <button
            title={value?.title || "Select pattern"}
            onClick={() => setIsOpen(prev => !prev)}
            className="input"
          >
            <div className="pointer-events-none flex h-7 w-full items-center gap-2">
              <div
                className="h-full w-12 shrink-0 rounded border border-base-300 bg-base-100"
                style={patt ? { backgroundImage: `url(${patt})` } : undefined}
              />
              <div className="flex-1 truncate text-left text-xs">
                {value?.title || <span className="text-neutral-content">Select pattern</span>}
              </div>
            </div>
          </button>

          {value && (
            <button
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-error text-xs font-bold text-error-content hover:bg-error/90"
              title="Clear pattern"
            >
              ×
            </button>
          )}
        </div>
      </Wrap>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1">
          <PatternPanel
            selected={value?.slug}
            onSelect={(pattern) => { changed(pattern); setIsOpen(false); }}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

const PatternPanel = ({
  selected,
  onSelect,
  onClose,
}: {
  selected?: string;
  onSelect: (pattern: any) => void;
  onClose: () => void;
}) => {
  const [patterns, setPatterns] = useState<any[] | null>(null);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"all" | "stroke" | "fill">("all");
  const panelRef = useRef<HTMLDivElement>(null);

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
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!patterns) return [];
    let list = patterns;
    if (mode !== "all") list = list.filter(p => p.mode === mode);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.tags?.some((t: string) => t.includes(q)));
    }
    return list;
  }, [patterns, mode, search]);

  return (
    <div ref={panelRef} className="w-64 rounded-lg border border-base-300 bg-base-200 shadow-xl">
      {/* Search */}
      <div className="flex items-center gap-1.5 border-b border-base-300 px-2 py-1.5">
        <TbSearch className="size-3.5 shrink-0 text-neutral-content" />
        <input
          type="text"
          placeholder="Search patterns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs outline-none placeholder:text-neutral-content"
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-neutral-content hover:text-base-content">
            <TbX className="size-3" />
          </button>
        )}
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 border-b border-base-300 px-2 py-1">
        {(["all", "stroke", "fill"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
              mode === m ? "bg-primary text-primary-content" : "text-neutral-content hover:bg-neutral"
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-neutral-content self-center">{filtered.length}</span>
      </div>

      {/* Pattern list */}
      <div className="max-h-48 overflow-y-auto scrollbar-light">
        {!patterns ? (
          <div className="px-3 py-6 text-center text-xs text-neutral-content">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-neutral-content">No patterns found</div>
        ) : (
          filtered.map(pattern => {
            const preview = makePreview(pattern);
            return (
              <button
                key={pattern.slug}
                onClick={() => onSelect(pattern)}
                className={`flex w-full items-center gap-2 px-2 py-1 text-left transition-colors hover:bg-neutral ${
                  selected === pattern.slug ? "bg-primary/10" : ""
                }`}
              >
                <div
                  className="h-10 w-16 shrink-0 rounded border border-base-300 bg-base-100"
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
