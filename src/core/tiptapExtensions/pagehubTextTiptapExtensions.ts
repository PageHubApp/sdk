/**
 * TipTap extension sets for {@link Text} — full rich text vs inline-only (no block `<p>` in persisted HTML).
 */
import { Bold } from "@tiptap/extension-bold";
import Color from "@tiptap/extension-color";
import { Code } from "@tiptap/extension-code";
import { Document } from "@tiptap/extension-document";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "@tiptap/extension-text-style/font-size";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Italic } from "@tiptap/extension-italic";
import { Link as TiptapLink } from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import { Strike } from "@tiptap/extension-strike";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { Extension, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import { OPEN_LINK_PANEL_EVENT } from "@/chrome/inline-tools/openLinkPanelEvent";
import { VariableNode, type SuggestionProps } from "@/core/tiptapExtensions/VariableNode";
import { getEditorVariableOptions } from "@/utils/editorVariableOptions";
import { resolveVariable } from "@/utils/design/variables";
import { extractRootDataFromQuery } from "@/utils/page/pageManagement";
import { getAnchorsForNode } from "@/utils/anchors/resolveAnchorsViaCraft";

/** `inline` = ProseMirror `doc` with `inline*` only — getHTML() has no wrapping `<p>`. */
export type PagehubTextRichMode = "full" | "inline";

/** Declarations mapped by Color / FontFamily / FontSize / BackgroundColor on `textStyle` — keep the rest verbatim. */
const TEXT_STYLE_STRUCTURED_PROPS = new Set([
  "color",
  "font-family",
  "font-size",
  "background-color",
]);

function remainderInlineStyle(styleAttr: string | null | undefined): string | null {
  if (styleAttr == null || !String(styleAttr).trim()) return null;
  const kept: string[] = [];
  for (const part of String(styleAttr).split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const prop = trimmed.slice(0, colon).trim().toLowerCase();
    if (TEXT_STYLE_STRUCTURED_PROPS.has(prop)) continue;
    kept.push(trimmed);
  }
  return kept.length ? kept.join("; ") : null;
}

/**
 * Default TipTap marks parse common tags but often omit `style` / `class` from the schema,
 * so template HTML with inline CSS is stripped on edit. We extend marks to round-trip those attrs.
 */
const inlineAttrsOnMark = () => ({
  style: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.getAttribute("style"),
    renderHTML: (attributes: Record<string, unknown>) => {
      const s = attributes.style;
      if (s == null || s === "") return {};
      return { style: String(s) };
    },
  },
  class: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.getAttribute("class"),
    renderHTML: (attributes: Record<string, unknown>) => {
      const c = attributes.class;
      if (c == null || c === "") return {};
      return { class: String(c) };
    },
  },
});

const extendMarkWithInlineAttrs = <
  T extends typeof Bold | typeof Italic | typeof Strike | typeof Code | typeof Underline,
>(
  Mark: T
) =>
  Mark.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        ...inlineAttrsOnMark(),
      };
    },
  });

const PagehubBold = extendMarkWithInlineAttrs(Bold);
const PagehubItalic = extendMarkWithInlineAttrs(Italic);
const PagehubStrike = extendMarkWithInlineAttrs(Strike);
const PagehubCode = extendMarkWithInlineAttrs(Code);
const PagehubUnderline = extendMarkWithInlineAttrs(Underline);

const PagehubSuperscript = Superscript.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...inlineAttrsOnMark(),
    };
  },
});

const PagehubSubscript = Subscript.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...inlineAttrsOnMark(),
    };
  },
});

const PagehubHighlight = Highlight.extend({
  addAttributes() {
    const base = (this.parent?.() ?? {}) as Record<string, unknown>;
    return {
      ...base,
      ...inlineAttrsOnMark(),
    };
  },
});

/** Link already declares `class`; add `style` only so we do not duplicate class handling. */
const PagehubLink = TiptapLink.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => element.getAttribute("style"),
        renderHTML: (attributes: Record<string, unknown>) => {
          const s = attributes.style;
          if (s == null || s === "") return {};
          return { style: String(s) };
        },
      },
    };
  },
});

const PagehubTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      inlineStyle: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => remainderInlineStyle(element.getAttribute("style")),
        renderHTML: (attributes: Record<string, unknown>) => {
          const s = attributes.inlineStyle;
          if (s == null || s === "") return {};
          return { style: String(s) };
        },
      },
      inlineClass: {
        default: null as string | null,
        parseHTML: (element: HTMLElement) => element.getAttribute("class"),
        renderHTML: (attributes: Record<string, unknown>) => {
          const c = attributes.inlineClass;
          if (c == null || c === "") return {};
          return { class: String(c) };
        },
      },
    };
  },
});

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
  PagehubLink.configure({
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
      queryRef?.current
        ? resolveVariable(
            id,
            extractRootDataFromQuery(queryRef.current).rootProps,
            nodeIdRef?.current ? getAnchorsForNode(nodeIdRef.current, queryRef.current) : undefined
          )
        : id,
    getAnchors: () =>
      queryRef?.current && nodeIdRef?.current
        ? getAnchorsForNode(nodeIdRef.current, queryRef.current)
        : {},
  });

const marksAndShared = (
  onSuggestion: ((props: SuggestionProps | null) => void) | undefined,
  queryRef: { current: any } | undefined,
  opts: { textAlign: boolean; image: boolean },
  nodeIdRef?: { current: string | undefined }
): Extensions => [
  Placeholder.configure({ placeholder: "Start typing..." }),
  ...(opts.textAlign ? [TextAlign.configure({ types: ["heading", "paragraph"] as const })] : []),
  PagehubTextStyle,
  Color.configure({ types: [PagehubTextStyle.name] }),
  FontFamily.configure({ types: [PagehubTextStyle.name] }),
  FontSize.configure({ types: [PagehubTextStyle.name] }),
  PagehubHighlight.configure({ multicolor: true }),
  PagehubSuperscript,
  PagehubSubscript,
  linkExtension(),
  ...(opts.image ? [Image.configure({ HTMLAttributes: { class: "max-w-full h-auto" } })] : []),
  variableExtension(onSuggestion, queryRef, nodeIdRef),
  TextEditorInlineKeymap,
];

const starterKitSansReplacedMarks = {
  link: false,
  bold: false,
  italic: false,
  strike: false,
  code: false,
  underline: false,
} as const;

export function getPagehubTextTiptapExtensions(
  mode: PagehubTextRichMode,
  onSuggestion: ((props: SuggestionProps | null) => void) | undefined,
  queryRef: { current: any } | undefined,
  nodeIdRef?: { current: string | undefined }
): Extensions {
  const pagehubMarks = [PagehubBold, PagehubItalic, PagehubStrike, PagehubCode, PagehubUnderline];

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
        ...starterKitSansReplacedMarks,
      }),
      ...pagehubMarks,
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
      ...starterKitSansReplacedMarks,
    }),
    ...pagehubMarks,
    ...marksAndShared(onSuggestion, queryRef, { textAlign: true, image: true }, nodeIdRef),
  ];
}
