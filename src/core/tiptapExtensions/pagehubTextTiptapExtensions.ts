/**
 * TipTap extension sets for {@link Text} — full rich text vs inline-only (no block `<p>` in persisted HTML).
 */
import Color from "@tiptap/extension-color";
import { Document } from "@tiptap/extension-document";
import FontFamily from "@tiptap/extension-font-family";
import FontSize from "@tiptap/extension-font-size";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Link as TiptapLink } from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Extension, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import { OPEN_LINK_PANEL_EVENT } from "@/chrome/inline-tools/openLinkPanelEvent";
import { VariableNode, type SuggestionProps } from "@/core/tiptapExtensions/VariableNode";
import { getEditorVariableOptions } from "@/utils/editorVariableOptions";
import { resolveVariable } from "@/utils/design/variables";

/** `inline` = ProseMirror `doc` with `inline*` only — getHTML() has no wrapping `<p>`. */
export type PagehubTextRichMode = "full" | "inline";

const PagehubInlineDocument = Document.extend({
  content: "inline*",
});

const TextEditorInlineKeymap = Extension.create({
  name: "textEditorInlineKeymap",
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      "Mod-b": () => this.editor.chain().focus().toggleBold().run(),
      "Mod-i": () => this.editor.chain().focus().toggleItalic().run(),
      "Mod-u": () => this.editor.chain().focus().toggleUnderline().run(),
      "Mod-k": () => {
        if (this.editor.isActive("link")) {
          this.editor.chain().focus().extendMarkRange("link").run();
        }
        window.dispatchEvent(new CustomEvent(OPEN_LINK_PANEL_EVENT));
        return true;
      },
    };
  },
});

const linkExtension = () =>
  TiptapLink.configure({
    openOnClick: false,
    enableClickSelection: false,
    HTMLAttributes: { class: "text-primary underline" },
    protocols: ["ref"],
  });

const variableExtension = (
  onSuggestion: ((props: SuggestionProps | null) => void) | undefined,
  queryRef: { current: any } | undefined,
  nodeIdRef?: { current: string | undefined }
) =>
  VariableNode.configure({
    getVariables: () => getEditorVariableOptions(queryRef?.current, nodeIdRef?.current),
    onSuggestion: onSuggestion || null,
    resolveVariable: (id: string) =>
      queryRef?.current ? resolveVariable(id, queryRef.current) : id,
  });

const marksAndShared = (
  onSuggestion: ((props: SuggestionProps | null) => void) | undefined,
  queryRef: { current: any } | undefined,
  opts: { textAlign: boolean; image: boolean },
  nodeIdRef?: { current: string | undefined }
): Extensions => [
  Placeholder.configure({ placeholder: "Start typing..." }),
  ...(opts.textAlign
    ? [TextAlign.configure({ types: ["heading", "paragraph"] as const })]
    : []),
  TextStyle,
  Color.configure({ types: [TextStyle.name] }),
  FontFamily.configure({ types: [TextStyle.name] }),
  FontSize.configure({ types: [TextStyle.name] }),
  Highlight.configure({ multicolor: true }),
  Superscript,
  Subscript,
  linkExtension(),
  ...(opts.image
    ? [Image.configure({ HTMLAttributes: { class: "max-w-full h-auto" } })]
    : []),
  variableExtension(onSuggestion, queryRef, nodeIdRef),
  TextEditorInlineKeymap,
];

export function getPagehubTextTiptapExtensions(
  mode: PagehubTextRichMode,
  onSuggestion: ((props: SuggestionProps | null) => void) | undefined,
  queryRef: { current: any } | undefined,
  nodeIdRef?: { current: string | undefined }
): Extensions {
  if (mode === "inline") {
    return [
      PagehubInlineDocument,
      StarterKit.configure({
        document: false,
        paragraph: false,
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        codeBlock: false,
        horizontalRule: false,
        trailingNode: false,
        link: false,
      }),
      ...marksAndShared(onSuggestion, queryRef, { textAlign: false, image: false }, nodeIdRef),
    ];
  }

  return [
    StarterKit.configure({
      heading: {},
      codeBlock: false,
      blockquote: {},
      horizontalRule: {},
      bulletList: {},
      orderedList: {},
      listItem: {},
      link: false,
    }),
    ...marksAndShared(onSuggestion, queryRef, { textAlign: true, image: true }, nodeIdRef),
  ];
}
