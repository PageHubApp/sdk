import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { SketchPicker } from "@hello-pangea/color-picker";
import { useEffect, useRef, useState } from "react";
import { TbCheck, TbTrash, TbX } from "react-icons/tb";
import { resolveTheme } from "@/utils/design/resolveTheme";

interface CreateTokenDialogProps {
  /** When set, dialog is in edit mode: pre-fills name + color, shows Delete button.
   *  Saving renames/recolors the existing entry (matched by `originalName`). */
  existing?: { originalName: string; color: string };
  /** Which palette to write to. Defaults to "palette" (light); pass "darkPalette" for dark mode. */
  paletteKey?: "palette" | "darkPalette";
  /** Fired after a successful create OR rename. Receives the final (possibly new) name. */
  onCreated: (name: string) => void;
  /** Fired after a successful delete (edit mode only). */
  onDeleted?: (name: string) => void;
  onClose: () => void;
}

export function CreateTokenDialog({
  existing,
  paletteKey = "palette",
  onCreated,
  onDeleted,
  onClose,
}: CreateTokenDialogProps) {
  const { actions, query } = useEditor();
  const isEdit = !!existing;
  const [name, setName] = useState(existing?.originalName ?? "New Color");
  const [color, setColor] = useState(existing?.color ?? "#3b82f6");
  const nameRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    nameRef.current?.select();
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle, true);
    return () => document.removeEventListener("mousedown", handle, true);
  }, [onClose]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const node = query.node(ROOT_NODE).get();
      const theme = resolveTheme(node?.data?.props || {});
      const palette = ((paletteKey === "darkPalette" ? theme.darkPalette : theme.palette) ?? []) as Array<{
        name: string;
        color: string;
      }>;

      let nextPalette: Array<{ name: string; color: string }>;
      if (isEdit) {
        // Replace by originalName (allows rename + recolor in one save).
        nextPalette = palette.map(entry =>
          entry.name === existing!.originalName ? { name: trimmed, color } : entry
        );
        // If originalName wasn't found (deleted in another tab?), append.
        if (!nextPalette.some(e => e.name === trimmed)) {
          nextPalette = [...nextPalette, { name: trimmed, color }];
        }
      } else {
        nextPalette = [...palette, { name: trimmed, color }];
      }

      actions.setProp(ROOT_NODE, (props: any) => {
        if (!props.theme) props.theme = {};
        props.theme[paletteKey] = nextPalette;
      });
      onCreated(trimmed);
    } catch (e) {
      console.error("Failed to save token:", e);
    }
  };

  const handleDelete = () => {
    if (!isEdit) return;
    try {
      const node = query.node(ROOT_NODE).get();
      const theme = resolveTheme(node?.data?.props || {});
      const palette = ((paletteKey === "darkPalette" ? theme.darkPalette : theme.palette) ?? []) as Array<{
        name: string;
        color: string;
      }>;
      const nextPalette = palette.filter(e => e.name !== existing!.originalName);
      actions.setProp(ROOT_NODE, (props: any) => {
        if (!props.theme) props.theme = {};
        props.theme[paletteKey] = nextPalette;
      });
      onDeleted?.(existing!.originalName);
      onClose();
    } catch (e) {
      console.error("Failed to delete token:", e);
    }
  };

  return (
    <div
      ref={containerRef}
      className="border-base-300 bg-base-200 flex w-[240px] flex-col gap-3 rounded-xl border p-3 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-base-content text-xs font-medium">
          {isEdit ? "Edit Token" : "New Token"}
        </span>
        <button onClick={onClose} className="text-neutral-content hover:text-base-content">
          <TbX className="size-3.5" />
        </button>
      </div>

      {/* Name */}
      <input
        ref={nameRef}
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Token name..."
        className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:border-ring focus:ring-ring rounded-md border px-2 py-1.5 text-xs outline-none focus:ring-1"
        onKeyDown={e => {
          if (e.key === "Enter") handleSave();
        }}
      />

      {/* Color preview + picker */}
      <div className="flex items-center gap-2">
        <div
          className="border-base-300 size-8 shrink-0 rounded-md border-2"
          style={{ backgroundColor: color }}
        />
        <span className="text-neutral-content text-[10px]">{color}</span>
      </div>

      <div className="overflow-hidden rounded-md">
        <SketchPicker
          width="100%"
          presetColors={[]}
          styles={{
            picker: {},
            saturation: {
              width: "100%",
              height: "80px",
              paddingBottom: "",
              position: "relative" as const,
              overflow: "hidden",
            },
          }}
          color={color}
          onChangeComplete={c => setColor(c.hex)}
        />
      </div>

      {/* Save (+ Delete in edit mode) */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="bg-primary text-primary-content hover:bg-primary/90 flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          <TbCheck className="size-3" />
          {isEdit ? "Save" : "Save Token"}
        </button>
        {isEdit && (
          <button
            onClick={handleDelete}
            className="border-base-300 text-neutral-content hover:border-error hover:text-error flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors"
            aria-label="Delete token"
          >
            <TbTrash className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
