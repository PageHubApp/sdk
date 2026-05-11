import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbCode, TbSearch, TbX } from "react-icons/tb";
import { useFloatingPanelPortalRegister } from "../../../../floating/FloatingPanel";
import { OVERLAY_Z_MODAL } from "../../../../popovers/overlayZIndex";
import {
  SCHEMA_TYPES,
  type SchemaGroup,
  type SchemaTypeDef,
  type SchemaTypeKey,
} from "../../../../../utils/seo/schemaTypes";

interface SchemaTypePickerProps {
  open: boolean;
  onClose: () => void;
  onPickType: (type: SchemaTypeKey) => void;
  onPickRaw: () => void;
}

const GROUP_ORDER: SchemaGroup[] = ["Business", "Content", "Commerce", "Event", "Media", "Misc"];

export function SchemaTypePicker({ open, onClose, onPickType, onPickRaw }: SchemaTypePickerProps) {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const registerWithParentPanel = useFloatingPanelPortalRegister();

  useEffect(() => setMounted(true), []);

  // Skip parent FloatingPanel's outside-click handler when clicking inside the
  // picker (it portals to document.body, so the panel sees the click as outside).
  useEffect(() => {
    if (!open || !registerWithParentPanel) return;
    const node = rootRef.current;
    if (!node) return;
    return registerWithParentPanel(node);
  }, [open, mounted, registerWithParentPanel]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? SCHEMA_TYPES.filter(
          t =>
            t.label.toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q)
        )
      : SCHEMA_TYPES;

    const map = new Map<SchemaGroup, SchemaTypeDef[]>();
    for (const t of filtered) {
      const list = map.get(t.group) || [];
      list.push(t);
      map.set(t.group, list);
    }
    return GROUP_ORDER.filter(g => map.has(g)).map(g => ({ group: g, types: map.get(g)! }));
  }, [query]);

  if (!open || !mounted) return null;

  const tree = (
    <div
      ref={rootRef}
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
      style={{ zIndex: OVERLAY_Z_MODAL + 1 }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-base-100 border-base-300 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="border-base-300 flex items-center gap-3 border-b px-5 py-4">
          <div className="flex-1">
            <h3 className="text-base-content text-base font-semibold">Add schema</h3>
            <p className="text-neutral-content text-xs">
              Pick a schema.org type to add structured data to this page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-content hover:text-base-content rounded-md p-1.5 transition-colors"
            aria-label="Close"
          >
            <TbX className="size-5" />
          </button>
        </header>

        <div className="border-base-300 border-b px-5 py-3">
          <div className="bg-base-200/50 border-base-300 flex items-center gap-2 rounded-lg border px-3 py-2">
            <TbSearch className="text-neutral-content size-4 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search schema types…"
              className="text-base-content placeholder:text-neutral-content w-full bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {grouped.length === 0 ? (
            <p className="text-neutral-content py-8 text-center text-sm">
              No schema types match &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ group, types }) => (
                <section key={group} className="space-y-2">
                  <h4 className="text-neutral-content text-xs font-semibold tracking-wide uppercase">
                    {group}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {types.map(t => (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => {
                          onPickType(t.type);
                          onClose();
                        }}
                        className="border-base-300 hover:border-primary hover:bg-base-200/40 group flex flex-col gap-1 rounded-xl border p-3 text-left transition-colors"
                      >
                        <span className="text-base-content group-hover:text-primary text-sm font-semibold">
                          {t.label}
                        </span>
                        <span className="text-neutral-content text-xs leading-snug">
                          {t.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <footer className="border-base-300 bg-base-200/30 border-t px-5 py-3">
          <button
            type="button"
            onClick={() => {
              onPickRaw();
              onClose();
            }}
            className="text-neutral-content hover:text-base-content flex items-center gap-2 text-sm transition-colors"
          >
            <TbCode className="size-4" />
            Paste raw JSON-LD instead
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(tree, document.body);
}
