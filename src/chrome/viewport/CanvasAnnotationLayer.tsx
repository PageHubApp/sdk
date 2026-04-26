import React from "react";
import { TbX } from "react-icons/tb";
import type { CanvasAnnotation } from "../../utils/componentCanvas";

interface Props {
  annotations: CanvasAnnotation[];
  onChange: (next: CanvasAnnotation[]) => void;
}

const SURFACE_SELECTOR = "[data-canvas-zoom-component-canvas]";

/**
 * Floating text annotations (labels + titles).
 *
 * Same React-bypass pattern as ComponentCanvasItem: pan/zoom are read from
 * CSS vars on the surface (`--ph-pan-x`, `--ph-pan-y`, `--ph-zoom`) via a
 * calc-based transform, so panning/zooming costs zero React renders. Drag
 * writes `--ph-ann-x/y` directly to the wrapper ref + commits to onChange
 * only on pointerup.
 */
export function CanvasAnnotationLayer({ annotations, onChange }: Props) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const update = (id: string, patch: Partial<CanvasAnnotation>) =>
    onChange(annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const remove = (id: string) => onChange(annotations.filter((a) => a.id !== id));

  // Delete key removes selected annotation when not editing
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (editingId) return;
      if (!selectedId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, editingId, annotations]);

  return (
    <>
      {annotations.map((a) => (
        <AnnotationItem
          key={a.id}
          a={a}
          editing={editingId === a.id}
          selected={selectedId === a.id}
          onSelect={() => setSelectedId(a.id)}
          onStartEdit={() => {
            setEditingId(a.id);
            setSelectedId(a.id);
          }}
          onCommitText={(text) => {
            update(a.id, { text });
            setEditingId(null);
          }}
          onCommitPos={(x, y) => update(a.id, { x, y })}
          onDelete={() => {
            remove(a.id);
            setSelectedId(null);
          }}
        />
      ))}
    </>
  );
}

interface ItemProps {
  a: CanvasAnnotation;
  editing: boolean;
  selected: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onCommitText: (text: string) => void;
  onCommitPos: (x: number, y: number) => void;
  onDelete: () => void;
}

function AnnotationItem({
  a,
  editing,
  selected,
  onSelect,
  onStartEdit,
  onCommitText,
  onCommitPos,
  onDelete,
}: ItemProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const editableRef = React.useRef<HTMLDivElement>(null);
  const livePosRef = React.useRef({ x: a.x, y: a.y });
  const dragRef = React.useRef<{
    startCanvas: { x: number; y: number };
    startScreenX: number;
    startScreenY: number;
    moved: boolean;
  } | null>(null);
  const moveRafRef = React.useRef<number>(0);
  const pendingPosRef = React.useRef<{ x: number; y: number } | null>(null);

  // Sync CSS vars when external position changes (and we're not dragging).
  React.useLayoutEffect(() => {
    if (dragRef.current) return;
    livePosRef.current = { x: a.x, y: a.y };
    const w = wrapperRef.current;
    if (!w) return;
    w.style.setProperty("--ph-ann-x", `${a.x}px`);
    w.style.setProperty("--ph-ann-y", `${a.y}px`);
  }, [a.x, a.y]);

  React.useEffect(() => {
    return () => {
      if (moveRafRef.current) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = 0;
      }
    };
  }, []);

  // Auto-focus + select-all on entering edit mode
  React.useEffect(() => {
    if (!editing || !editableRef.current) return;
    const el = editableRef.current;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  const readZoom = () => {
    const surface = wrapperRef.current?.closest(SURFACE_SELECTOR) as HTMLElement | null;
    if (!surface) return 1;
    return parseFloat(getComputedStyle(surface).getPropertyValue("--ph-zoom")) || 1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startCanvas: { ...livePosRef.current },
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const zoomNow = readZoom();
    const dx = (e.clientX - dragRef.current.startScreenX) / zoomNow;
    const dy = (e.clientY - dragRef.current.startScreenY) / zoomNow;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragRef.current.moved = true;
    pendingPosRef.current = {
      x: dragRef.current.startCanvas.x + dx,
      y: dragRef.current.startCanvas.y + dy,
    };
    if (moveRafRef.current) return;
    moveRafRef.current = requestAnimationFrame(() => {
      moveRafRef.current = 0;
      const next = pendingPosRef.current;
      pendingPosRef.current = null;
      if (!next || !wrapperRef.current) return;
      livePosRef.current = next;
      wrapperRef.current.style.setProperty("--ph-ann-x", `${next.x}px`);
      wrapperRef.current.style.setProperty("--ph-ann-y", `${next.y}px`);
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (moveRafRef.current) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = 0;
    }
    const flushed = pendingPosRef.current;
    pendingPosRef.current = null;
    const finalBasis = flushed ?? livePosRef.current;
    if (dragRef.current.moved) {
      onCommitPos(finalBasis.x, finalBasis.y);
    } else {
      onSelect();
    }
    dragRef.current = null;
  };

  const sizeCls =
    a.kind === "title"
      ? "text-2xl font-semibold"
      : "text-sm font-medium";
  const colorCls =
    a.kind === "title" ? "text-base-content" : "text-base-content/80";

  return (
    <div
      ref={wrapperRef}
      className={`pointer-events-auto absolute ${sizeCls} ${colorCls} ${
        editing ? "" : "cursor-move"
      } group select-none`}
      style={
        {
          left: 0,
          top: 0,
          minWidth: 80,
          // Cards are pinned `position: fixed; z-index: 40`. Annotations sit
          // above them so labels/titles never get hidden under a card.
          // Toolbars/pills are z-50, so annotations stay below those.
          zIndex: 45,
          willChange: "transform",
          transformOrigin: "0 0",
          "--ph-ann-x": `${a.x}px`,
          "--ph-ann-y": `${a.y}px`,
          transform:
            "translate3d(" +
            "calc(var(--ph-pan-x, 0px) + var(--ph-ann-x, 0px) * var(--ph-zoom, 1))," +
            "calc(var(--ph-pan-y, 0px) + var(--ph-ann-y, 0px) * var(--ph-zoom, 1))," +
            "0) scale(var(--ph-zoom, 1))",
        } as React.CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
    >
      <div
        ref={editableRef}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={false}
        className={`outline-none ${
          editing
            ? "bg-base-100 ring-primary rounded px-2 py-1 ring-2"
            : selected
              ? "ring-primary/50 rounded px-1 ring-2"
              : ""
        }`}
        onBlur={(e) => {
          if (!editing) return;
          onCommitText((e.target as HTMLElement).innerText.trim() || "Label");
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            (e.target as HTMLElement).blur();
            e.stopPropagation();
          }
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            (e.target as HTMLElement).blur();
          }
        }}
      >
        {a.text}
      </div>
      {selected && !editing && (
        <button
          type="button"
          className="bg-error text-error-content absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full opacity-0 shadow group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete annotation"
        >
          <TbX className="size-3" />
        </button>
      )}
    </div>
  );
}
