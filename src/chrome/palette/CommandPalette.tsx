/**
 * Command palette (⌘K) UI.
 *
 * Phase 1 Wave B2. Search-driven, gated by `when` predicates, dispatches via
 * `commands.execute(id, undefined, { trigger: "palette" })`. Most builtin
 * command run bodies are stubs in Wave B — the palette still "works" but the
 * stubs log a warning. Real behavior wires in during Phase 2 surface
 * migration.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useEditor } from "@craftjs/core";
import { useRegistries } from "../../registry/provider";
import { useCommandContext } from "../../registry/hooks";
import { OVERLAY_Z_CRITICAL_MODAL } from "../popovers/overlayZIndex";
import { useCommandPalette } from "./useCommandPalette";
import {
  useCommandPaletteResults,
  type PaletteEntry,
  type FlattenedResults,
} from "./useCommandPaletteResults";

/**
 * Format a keybinding spec ("mod+k", "shift+mod+m", "backspace") into a
 * platform-appropriate shortcut hint ("⌘K", "⇧⌘M", "⌫").
 */
function formatShortcut(spec: string): string {
  if (!spec) return "";
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
  const cmd = isMac ? "⌘" : "Ctrl+";
  const meta = isMac ? "⌘" : "Win+";
  const opt = isMac ? "⌥" : "Alt+";
  const shift = isMac ? "⇧" : "Shift+";
  const ctrl = isMac ? "⌃" : "Ctrl+";

  const KEY_MAP: Record<string, string> = {
    backspace: "⌫",
    delete: "⌦",
    escape: "Esc",
    enter: "↵",
    tab: "⇥",
    space: "Space",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
  };

  return spec
    .split("+")
    .map(part => part.trim().toLowerCase())
    .map(token => {
      switch (token) {
        case "mod":
        case "cmd":
          return cmd;
        case "meta":
          return meta;
        case "ctrl":
        case "control":
          return ctrl;
        case "alt":
        case "option":
        case "opt":
          return opt;
        case "shift":
          return shift;
        default:
          return KEY_MAP[token] ?? token.toUpperCase();
      }
    })
    .join(isMac ? "" : "");
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="bg-base-300/40 text-base-content/60 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
      {category}
    </span>
  );
}

function PaletteRow({
  entry,
  active,
  shortcut,
  onSelect,
  onHover,
}: {
  entry: PaletteEntry;
  active: boolean;
  shortcut: string | null;
  onSelect: () => void;
  onHover: () => void;
}) {
  const icon = entry.def.icon;
  const renderedIcon =
    typeof icon === "function"
      ? null /* dynamic icons need full ctx; skip in palette for simplicity */
      : (icon ?? null);

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      disabled={!entry.enabled}
      onClick={() => {
        if (entry.enabled) onSelect();
      }}
      onMouseMove={onHover}
      className={[
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
        active ? "bg-primary/15 text-base-content" : "text-base-content/90 hover:bg-base-300/30",
        !entry.enabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      ].join(" ")}
    >
      <span className="text-base-content/70 flex w-5 shrink-0 items-center justify-center text-base">
        {renderedIcon}
      </span>
      <span className="flex-1 truncate">{entry.title}</span>
      <CategoryBadge category={entry.category} />
      {shortcut ? (
        <span className="text-base-content/50 ml-1 font-mono text-[11px]">{shortcut}</span>
      ) : null}
    </button>
  );
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const { commands, keybindings } = useRegistries();
  const ctx = useCommandContext();
  const { query: craftQuery, actions: craftActions } = useEditor();

  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Reset state when (re-)opening; auto-focus input.
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setActiveIndex(0);
    // Defer focus until after portal mount.
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [open]);

  // Build the full list (commands changes are subscribed via the registries
  // provider; we read the array each render). The pure hook memoizes the
  // grouped/flattened result.
  const commandList = useMemo(() => commands.list(), [commands, open]);
  const results: FlattenedResults = useCommandPaletteResults(commandList, ctx, search);
  const { groups, flat, count } = results;

  // Build a per-command shortcut map (first matching keybinding wins).
  const shortcutMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const def of keybindings.list()) {
      if (map[def.command]) continue;
      map[def.command] = def.key;
    }
    return map;
  }, [keybindings, open]);

  // Clamp active index when results change.
  useEffect(() => {
    if (activeIndex >= count) setActiveIndex(Math.max(0, count - 1));
  }, [count, activeIndex]);

  // Scroll active row into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const dispatch = (entry: PaletteEntry) => {
    if (!entry.enabled) return;
    setOpen(false);
    // Defer dispatch a tick so the modal teardown completes before the
    // command's side-effects run (e.g. focusing a different panel).
    setTimeout(() => {
      void commands.execute(entry.id, undefined, {
        trigger: "palette",
        query: craftQuery,
        actions: craftActions,
      });
    }, 0);
  };

  if (!open) return null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const entry = flat[activeIndex];
      if (entry) dispatch(entry);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, count - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, count - 1));
      return;
    }
  };

  // Track flat index across groups during render.
  let flatIdx = -1;

  const portalTarget =
    (typeof document !== "undefined" &&
      document.querySelector(".pagehub-sdk-root")) ||
    (typeof document !== "undefined" ? document.body : null);
  if (!portalTarget) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        role="presentation"
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
        style={{ zIndex: OVERLAY_Z_CRITICAL_MODAL - 1 }}
        onClick={() => setOpen(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="pagehub-sdk-root fixed left-1/2 top-[18vh] w-[600px] max-w-[92vw] -translate-x-1/2"
        style={{ zIndex: OVERLAY_Z_CRITICAL_MODAL }}
        onKeyDown={handleKeyDown}
      >
        <div className="bg-neutral border-base-300 overflow-hidden rounded-lg border shadow-2xl">
          {/* Search input */}
          <div className="border-base-300/60 border-b px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Type a command…"
              autoComplete="off"
              spellCheck={false}
              className="text-base-content placeholder:text-base-content/40 w-full bg-transparent text-sm outline-none"
            />
          </div>

          {/* Results */}
          <div
            ref={listRef}
            role="listbox"
            aria-label="Commands"
            className="max-h-[60vh] overflow-y-auto px-2 py-2"
          >
            {count === 0 ? (
              <div className="text-base-content/50 px-3 py-8 text-center text-sm">
                {search ? (
                  <>
                    No commands found for{" "}
                    <span className="text-base-content/80">&ldquo;{search}&rdquo;</span>
                  </>
                ) : (
                  <>No commands available in this context.</>
                )}
              </div>
            ) : (
              groups.map(group => (
                <div key={group.category} className="mb-2 last:mb-0">
                  <div className="text-base-content/40 px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider">
                    {group.category}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map(entry => {
                      flatIdx += 1;
                      const idx = flatIdx;
                      return (
                        <div key={entry.id} data-palette-index={idx}>
                          <PaletteRow
                            entry={entry}
                            active={idx === activeIndex}
                            shortcut={
                              shortcutMap[entry.id]
                                ? formatShortcut(shortcutMap[entry.id]!)
                                : null
                            }
                            onSelect={() => dispatch(entry)}
                            onHover={() => {
                              if (activeIndex !== idx) setActiveIndex(idx);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="border-base-300/60 text-base-content/40 flex items-center justify-between border-t px-3 py-1.5 text-[10px]">
            <span>
              <kbd className="font-mono">↑↓</kbd> navigate ·{" "}
              <kbd className="font-mono">↵</kbd> select ·{" "}
              <kbd className="font-mono">esc</kbd> close
            </span>
            <span>
              {count} command{count === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </>,
    portalTarget
  );
}
