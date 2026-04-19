import { Editor } from "@tiptap/react";
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor as useCraftEditor } from "@craftjs/core";
import { resolveTheme } from "@/utils/design/resolveTheme";

interface StylesPanelProps {
  editor: Editor;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
}

export function StylesPanel({ editor, onAction }: StylesPanelProps) {
  const { query } = useCraftEditor();
  const rootNode = query.node(ROOT_NODE).get();
  const typography = (resolveTheme(rootNode?.data?.props || {}).typography || []) as Array<
    Record<string, string>
  >;

  if (typography.length === 0) {
    return (
      <div className="text-neutral-content px-3 py-2 text-xs">
        No typography styles defined in Design System
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 p-2">
      {typography.map((font, index) => {
        const className = `ph-${font.name
          .replace(/([A-Z])/g, "-$1")
          .replace(/\s+/g, "-")
          .toLowerCase()
          .replace(/^-/, "")}`;
        return (
          <button
            key={index}
            onClick={onAction(async () => {
              if (font.fontFamily) {
                const { loadGoogleFont } = await import("@/utils/fonts/googleFonts");
                await loadGoogleFont(font.fontFamily, [font.fontWeight || "400"]);
              }
              editor.chain().focus().setMark("textStyle", { class: className }).run();
            })}
            className="hover:bg-base-200 flex items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors"
            style={{ fontFamily: font.fontFamily, fontSize: "13px" }}
          >
            <span className="text-base-content text-sm font-medium">{font.name}</span>
            <span className="text-neutral-content text-[10px]">{font.fontFamily}</span>
          </button>
        );
      })}
    </div>
  );
}
