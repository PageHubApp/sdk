import { Editor } from "@tiptap/react";
import { ROOT_NODE, useEditor as useCraftEditor } from "@craftjs/core";
import { resolveTheme } from "../../../../utils/design/resolveTheme";

interface StylesPanelProps {
  editor: Editor;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
}

export function StylesPanel({ editor, onAction }: StylesPanelProps) {
  const { query } = useCraftEditor();
  const rootNode = query.node(ROOT_NODE).get();
  const typography = (resolveTheme(rootNode?.data?.props || {}).typography || []) as Array<Record<string, string>>;

  if (typography.length === 0) {
    return <div className="px-3 py-2 text-xs text-neutral-content">No typography styles defined in Design System</div>;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2">
      {typography.map((font, index) => {
        const className = `ph-${font.name.replace(/([A-Z])/g, "-$1").replace(/\s+/g, "-").toLowerCase().replace(/^-/, "")}`;
        return (
          <button
            key={index}
            onClick={onAction(async () => {
              if (font.fontFamily) {
                const { loadGoogleFont } = await import("utils/fonts/googleFonts");
                await loadGoogleFont(font.fontFamily, [font.fontWeight || "400"]);
              }
              editor.chain().focus().setMark("textStyle", { class: className }).run();
            })}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-base-200"
            style={{ fontFamily: font.fontFamily, fontSize: "13px" }}
          >
            <span className="text-sm font-medium text-base-content">{font.name}</span>
            <span className="text-[10px] text-neutral-content">{font.fontFamily}</span>
          </button>
        );
      })}
    </div>
  );
}
