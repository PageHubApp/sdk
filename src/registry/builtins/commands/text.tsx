/**
 * `ph.text.*` commands — Tiptap-driven rich text editing (palette + chord
 * surface). Tiptap owns the chord registration; commands let the palette
 * and right-click menu fire the same operations.
 */
import type { CommandDef } from "../../types";
import { setAtomExternal } from "../../../utils/atoms/external";
import {
  AssistantOpenAtom,
  InlineEditActivePanelAtom,
  type InlineEditActivePanel,
  MediaManagerModalAtom,
} from "../../../utils/atoms";
import { getEditorQuery } from "../../editorBackref";
import { getActiveTiptapEditor } from "../../tiptapBackref";
import { buildInlineCopyAssistantOpenState } from "../../../utils/buildInlineCopyAssistantOpenState";
import { paletteToCSSVar } from "../../../utils/design/palette";
import { sdkLog } from "../../../utils/logger";

/**
 * Run a Tiptap chain against the active editor. No-op when no editor is
 * focused so palette dispatch from outside an inline edit context is safe.
 */
function withActiveTiptap(fn: (editor: any) => void): void {
  const editor = getActiveTiptapEditor();
  if (!editor) return;
  try {
    fn(editor);
  } catch (e) {
    sdkLog.error("[ph.text] tiptap command failed:", e);
  }
}

function setActivePanelRun(panel: InlineEditActivePanel): void {
  setAtomExternal(InlineEditActivePanelAtom, panel);
}

/**
 * Append the current Tiptap selection to the AI assistant's prefill state.
 * Exported because `ph.ai.includeTextInChat` calls the same helper.
 */
export function tiptapIncludeTextInChatRun(): void {
  const editor = getActiveTiptapEditor();
  if (!editor) return;
  // The inline-copy assistant prefill walks the active text node id +
  // current selection — both are available on the editor view. We reuse
  // the existing builder so prefill semantics match the right-click path.
  const query = getEditorQuery();
  // The node id lives in the editor's editor.options or as a custom field;
  // lacking a craft node id here, fall back to selection.first().
  const id = query?.getEvent?.("selected")?.first?.() ?? null;
  setAtomExternal(
    AssistantOpenAtom,
    buildInlineCopyAssistantOpenState(query, id ?? "") as any
  );
}

export const TEXT_COMMANDS: CommandDef[] = [
  {
    id: "ph.text.bold",
    title: "Bold",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleBold().run()),
  },
  {
    id: "ph.text.italic",
    title: "Italic",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleItalic().run()),
  },
  {
    id: "ph.text.underline",
    title: "Underline",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleUnderline().run()),
  },
  {
    id: "ph.text.toggleStrike",
    title: "Strikethrough",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleStrike().run()),
  },
  {
    id: "ph.text.toggleSuperscript",
    title: "Superscript",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleSuperscript().run()),
  },
  {
    id: "ph.text.toggleSubscript",
    title: "Subscript",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleSubscript().run()),
  },
  {
    id: "ph.text.setBlockType",
    title: "Set block type",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: (_ctx, args) => {
      const type = (args as unknown as { type?: string } | undefined)?.type;
      if (!type) return;
      withActiveTiptap(ed => {
        if (type === "paragraph") {
          ed.chain().focus().setParagraph().run();
        } else {
          const m = /^heading([1-6])$/.exec(type);
          if (!m) return;
          const level = parseInt(m[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
          ed.chain().focus().toggleHeading({ level }).run();
        }
      });
    },
  },
  {
    id: "ph.text.setFontFamily",
    title: "Set font family",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: (_ctx, args) => {
      const family = (args as unknown as { family?: string } | undefined)?.family;
      if (!family) return;
      withActiveTiptap(ed => {
        ed.chain().focus().setFontFamily(family).run();
        // Lazy-load weights — matches FontPanel's commit path.
        import("../../../utils/fonts/googleFonts")
          .then(({ loadGoogleFont }) => loadGoogleFont(family, ["400", "700"]))
          .catch(() => {});
      });
    },
  },
  {
    id: "ph.text.setFontSize",
    title: "Set font size",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: (_ctx, args) => {
      const size = (args as unknown as { size?: string } | undefined)?.size;
      if (!size) return;
      withActiveTiptap(ed => ed.chain().focus().setFontSize(size).run());
    },
  },
  {
    id: "ph.text.applyTypographyPreset",
    title: "Apply typography preset",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) &&
      Number((ctx as Record<string, unknown>)["theme.typographyCount"] ?? 0) > 0,
    run: (_ctx, args) => {
      // Args carry a pre-resolved className + optional fontFamily/fontWeight
      // for the lazy Google Fonts load. Caller (FontPanel) owns the
      // resolveTheme lookup so the command body stays pure.
      const a = (args ?? {}) as {
        className?: string;
        fontFamily?: string;
        fontWeight?: string;
      };
      if (!a.className) return;
      withActiveTiptap(async ed => {
        if (a.fontFamily) {
          try {
            const { loadGoogleFont } = await import("../../../utils/fonts/googleFonts");
            await loadGoogleFont(a.fontFamily, [a.fontWeight || "400"]);
          } catch {}
        }
        ed.chain().focus().setMark("textStyle", { class: a.className }).run();
      });
    },
  },
  {
    id: "ph.text.setAlign",
    title: "Set text alignment",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: (_ctx, args) => {
      const dir = (args as unknown as { dir?: string } | undefined)?.dir;
      if (!dir) return;
      withActiveTiptap(ed => ed.chain().focus().setTextAlign(dir).run());
    },
  },
  {
    id: "ph.text.toggleBulletList",
    title: "Bullet list",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleBulletList().run()),
  },
  {
    id: "ph.text.toggleOrderedList",
    title: "Ordered list",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleOrderedList().run()),
  },
  {
    id: "ph.text.indentListItem",
    title: "Indent list item",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () =>
      withActiveTiptap(ed => ed.chain().focus().sinkListItem("listItem").run()),
  },
  {
    id: "ph.text.outdentListItem",
    title: "Outdent list item",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () =>
      withActiveTiptap(ed => ed.chain().focus().liftListItem("listItem").run()),
  },
  {
    id: "ph.text.openLinkPanel",
    title: "Open link panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () => setActivePanelRun("link"),
  },
  {
    id: "ph.text.setLink",
    title: "Set link",
    category: "Text",
    enablement: (_ctx, args) => {
      const href = (args as unknown as { href?: string } | undefined)?.href;
      return typeof href === "string" && href.length > 0;
    },
    run: (_ctx, args) => {
      const href = (args as unknown as { href?: string } | undefined)?.href;
      if (!href) return;
      withActiveTiptap(ed => {
        if (ed.isActive("link")) {
          ed.chain().focus().extendMarkRange("link").setLink({ href }).run();
        } else {
          ed.chain().focus().setLink({ href }).run();
        }
      });
    },
  },
  {
    id: "ph.text.unsetLink",
    title: "Remove link",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.isActive("link")),
    run: () =>
      withActiveTiptap(ed =>
        ed.chain().focus().extendMarkRange("link").unsetLink().run()
      ),
  },
  {
    id: "ph.text.openFontPanel",
    title: "Open font panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => setActivePanelRun("font"),
  },
  {
    id: "ph.text.openTextColorPanel",
    title: "Open text color panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => setActivePanelRun("textcolor"),
  },
  {
    id: "ph.text.openHighlightPanel",
    title: "Open highlight panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => setActivePanelRun("bgcolor"),
  },
  {
    id: "ph.text.openMorePanel",
    title: "Open more panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () => setActivePanelRun("more"),
  },
  {
    id: "ph.text.setColor",
    title: "Set text color",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: (_ctx, args) => {
      // Accept either a resolved cssVar OR a palette token; normalize.
      const a = (args ?? {}) as { cssVar?: string; value?: string };
      const cssVar =
        a.cssVar ?? (a.value ? paletteToCSSVar(a.value) : undefined);
      if (!cssVar) return;
      withActiveTiptap(ed => ed.chain().focus().setColor(cssVar).run());
    },
  },
  {
    id: "ph.text.unsetColor",
    title: "Clear text color",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () => withActiveTiptap(ed => ed.chain().focus().unsetColor().run()),
  },
  {
    id: "ph.text.setHighlight",
    title: "Highlight",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: (_ctx, args) => {
      const a = (args ?? {}) as { cssVar?: string; value?: string; color?: string };
      const color =
        a.color ?? a.cssVar ?? (a.value ? paletteToCSSVar(a.value) : undefined);
      if (!color) return;
      withActiveTiptap(ed => ed.chain().focus().setHighlight({ color }).run());
    },
  },
  {
    id: "ph.text.unsetHighlight",
    title: "Clear highlight",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () => withActiveTiptap(ed => ed.chain().focus().unsetHighlight().run()),
  },
  {
    id: "ph.text.insertImage",
    title: "Insert image",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) &&
      ctx.tiptap.richTextMode !== "inline" &&
      ctx.features?.mediaManager !== false,
    run: (_ctx, args) => {
      // Image insert is bimodal: with explicit `src`, drop the image now;
      // without one, open the media manager modal — the toolbar listens and
      // posts back to the editor with the picked URL via setImage.
      const src = (args as unknown as { src?: string } | undefined)?.src;
      if (src) {
        withActiveTiptap(ed => ed.chain().focus().setImage({ src }).run());
        return;
      }
      // Fall back to opening the modal; toolbar UX still owns the picker
      // since selection/binding logic lives in the surface.
      setAtomExternal(MediaManagerModalAtom, true);
    },
  },
  {
    id: "ph.text.insertHorizontalRule",
    title: "Insert horizontal rule",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: () => withActiveTiptap(ed => ed.chain().focus().setHorizontalRule().run()),
  },
  {
    id: "ph.text.clearFormatting",
    title: "Clear formatting",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: ctx => {
      const mode = ctx.tiptap?.richTextMode ?? "full";
      withActiveTiptap(ed => {
        if (mode === "inline") {
          ed.chain().focus().setContent("", { emitUpdate: false }).unsetAllMarks().run();
        } else {
          ed.chain().focus().clearNodes().unsetAllMarks().run();
        }
      });
    },
  },
  {
    id: "ph.text.openVariablePicker",
    title: "Insert variable",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    // Variable picker is a Popover anchored to the toolbar button — the
    // command body is a no-op signal; the surface owns popup open state.
    // Future: lift via a sibling atom if palette-driven picker is added.
    run: () => {
      // No-op: opening the picker requires an anchor element from the toolbar
      // surface (Headless UI Popover). Palette consumers should call
      // `ph.text.insertVariable` directly with an `{ id }`.
    },
  },
  {
    id: "ph.text.insertVariable",
    title: "Insert variable",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: (_ctx, args) => {
      const id = (args as unknown as { id?: string } | undefined)?.id;
      if (!id) return;
      withActiveTiptap(ed => {
        (ed.chain().focus() as any).insertVariable({ id }).run();
      });
    },
  },
  {
    id: "ph.text.closeActivePanel",
    title: "Close text panel",
    category: "Text",
    when: ctx => ctx.tiptap?.activePanel != null,
    run: () => setActivePanelRun(null),
  },
];
