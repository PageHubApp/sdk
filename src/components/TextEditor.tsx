/**
 * TextEditorMode — Editor-only Tiptap integration for Text component.
 * Lazy-loaded by Text.tsx only when enabled=true.
 * Contains all TipTap, chrome, and editing dependencies.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { TbTypography } from "react-icons/tb";
import { useEditor } from "@craftjs/core";
import Color from "@tiptap/extension-color";
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
import { Extension, type Editor as TiptapEditorInstance } from "@tiptap/core";
import { EditorContent, useEditor as useTiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { changeProp } from "../chrome/Viewport/lib";
import { TiptapProvider } from "../chrome/TiptapContext";
import { InlineEditToolbar } from "../chrome/Tools/InlineEditToolbar/InlineEditToolbar";
import { OPEN_LINK_PANEL_EVENT } from "../chrome/Tools/openLinkPanelEvent";
import { VariableSuggestionPopup } from "../chrome/Tools/VariableSuggestion";

import { EditorEmptyLeafHint } from "../chrome/shared/EditorEmptyLeafHint";
import { replaceVariables, resolveVariable } from "../utils/design/variables";
import { getEditorVariableOptions } from "../utils/editorVariableOptions";
import { isVisuallyEmptyRichText, persistedTextHtmlFromEditor } from "../utils/isVisuallyEmptyRichText";
import { REACT_TOOLTIP_SURFACE_CLASS } from "components/layout/tooltipSurface";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { VariableNode, preprocessVariables } from "../extensions/VariableNode";
import type { SuggestionProps } from "../extensions/VariableNode";

// Helper to check if ancestor is a linked component
const checkIfAncestorLinked = (nodeId: string, query: any): boolean => {
  const node = query.node(nodeId).get();
  if (!node) return false;
  if (node.data.props?.belongsTo && node.data.props?.relationType !== "style") {
    return true;
  }
  if (node.data.parent) {
    return checkIfAncestorLinked(node.data.parent, query);
  }
  return false;
};

/** Explicit shortcuts while the TipTap view is focused (PM keymap; no global listeners). */
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

const getTiptapExtensions = (
  onSuggestion?: (props: SuggestionProps | null) => void,
  queryRef?: { current: any },
) => [
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
  Placeholder.configure({ placeholder: "Start typing..." }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TextStyle,
  Color.configure({ types: [TextStyle.name] }),
  FontFamily.configure({ types: [TextStyle.name] }),
  FontSize.configure({ types: [TextStyle.name] }),
  Highlight.configure({ multicolor: true }),
  Superscript,
  Subscript,
  TiptapLink.configure({
    openOnClick: false,
    /** Selection-on-click is handled in TextEditor `handleDOMEvents.click` (TipTap’s built-in path does not move the caret to the click first). */
    enableClickSelection: false,
    HTMLAttributes: { class: "text-primary underline" },
    protocols: ["ref"],
  }),
  Image.configure({
    HTMLAttributes: { class: "max-w-full h-auto" },
  }),
  VariableNode.configure({
    getVariables: () => getEditorVariableOptions(queryRef?.current),
    onSuggestion: onSuggestion || null,
    resolveVariable: (id: string) => queryRef?.current ? resolveVariable(id, queryRef.current) : id,
  }),
  TextEditorInlineKeymap,
];

function TextEditorMode({ props, id, query, enabled, isMounted, setProp }: {
  props: any;
  id: string;
  query: any;
  enabled: boolean;
  isMounted: boolean;
  setProp: any;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const isEditingRef = React.useRef(isEditing);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  const { isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  useEffect(() => {
    if (!isActive && isEditing) {
      setIsEditing(false);
    }
  }, [isActive, isEditing]);

  const isInsideLinkedComponent = checkIfAncestorLinked(id, query);
  const rawText = props.text || "";
  const editorContent = React.useMemo(() => preprocessVariables(rawText), [rawText]);

  const [suggestion, setSuggestion] = React.useState<SuggestionProps | null>(null);

  const queryRef = React.useRef(query);
  queryRef.current = query;

  const tiptapEditorRef = useRef<TiptapEditorInstance | null>(null);

  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          "ph-text-editor-root w-full min-h-[1.15em] leading-snug outline-none focus:outline-none focus-visible:outline-none",
      } as Record<string, string>,
      handleDOMEvents: {
        click(_view: unknown, event: Event) {
          const mouse = event as MouseEvent;
          if (mouse.button !== 0) return false;
          const target = mouse.target as HTMLElement | null;
          if (!target) return false;
          const anchor = target.closest("a");
          const ed = tiptapEditorRef.current;
          if (!anchor || !ed?.isEditable || !ed.view.dom.contains(anchor)) return false;

          const coords = ed.view.posAtCoords({ left: mouse.clientX, top: mouse.clientY });
          if (!coords) return false;

          ed.chain().focus().setTextSelection(coords.pos).extendMarkRange("link").run();
          if (!ed.isActive("link")) return false;

          mouse.preventDefault();
          window.dispatchEvent(new CustomEvent(OPEN_LINK_PANEL_EVENT));
          return true;
        },
        dblclick(_view: unknown, event: Event) {
          const mouse = event as MouseEvent;
          if (mouse.button !== 0) return false;
          const target = mouse.target as HTMLElement | null;
          if (!target) return false;
          const anchor = target.closest("a");
          const ed = tiptapEditorRef.current;
          if (!anchor || !ed?.isEditable || !ed.view.dom.contains(anchor)) return false;

          const coords = ed.view.posAtCoords({ left: mouse.clientX, top: mouse.clientY });
          if (!coords) return false;

          ed.chain().focus().setTextSelection(coords.pos).extendMarkRange("link").run();
          if (!ed.isActive("link")) return false;

          mouse.preventDefault();
          window.dispatchEvent(new CustomEvent(OPEN_LINK_PANEL_EVENT));
          return true;
        },
      },
    }),
    []
  );

  const tiptapEditor = useTiptapEditor(
    {
      extensions: enabled ? getTiptapExtensions(setSuggestion, queryRef) : [],
      content: editorContent,
      editable: enabled && isEditing && !isInsideLinkedComponent,
      immediatelyRender: false,
      editorProps,
      onUpdate: ({ editor }: { editor: any }) => {
        if (enabled && !isInsideLinkedComponent) {
          changeProp({
            setProp,
            propKey: "text",
            propType: "component",
            value: persistedTextHtmlFromEditor(editor.getHTML()),
          });
        }
      },
      onFocus: () => {
        if (enabled && isActive && !isEditingRef.current) {
          setIsEditing(true);
        }
      },
      onBlur: ({ editor }: { editor: any }) => {
        if (!enabled || !isEditingRef.current || isInsideLinkedComponent) return;
        changeProp({
          setProp,
          propKey: "text",
          propType: "component",
          value: persistedTextHtmlFromEditor(editor.getHTML()),
        });
      },
    },
    [enabled, isInsideLinkedComponent]
  );

  useEffect(() => {
    tiptapEditorRef.current = tiptapEditor ?? null;
  }, [tiptapEditor]);

  const [tiptapVisuallyEmpty, setTiptapVisuallyEmpty] = React.useState(true);

  useEffect(() => {
    if (!tiptapEditor) return;
    const sync = () => setTiptapVisuallyEmpty(isVisuallyEmptyRichText(tiptapEditor.getHTML()));
    sync();
    tiptapEditor.on("update", sync);
    tiptapEditor.on("selectionUpdate", sync);
    return () => {
      tiptapEditor.off("update", sync);
      tiptapEditor.off("selectionUpdate", sync);
    };
  }, [tiptapEditor]);

  useEffect(() => {
    if (!tiptapEditor) return;
    const currentContent = tiptapEditor.getHTML();
    const processed = preprocessVariables(rawText || "");
    const normalize = (html: string) => html.replace(/>\s+</g, "><").trim();
    if (normalize(currentContent) !== normalize(processed)) {
      tiptapEditor.commands.setContent(processed, {
        errorOnInvalidContent: false,
        emitUpdate: false,
      });
    }
  }, [rawText, tiptapEditor]);

  const prevCanEditRef = useRef(false);
  useLayoutEffect(() => {
    if (!tiptapEditor) return;
    const canEdit = Boolean(enabled && isEditing && !isInsideLinkedComponent);
    tiptapEditor.setEditable(canEdit, false);
    const becameEditable = canEdit && !prevCanEditRef.current;
    prevCanEditRef.current = canEdit;
    if (becameEditable) {
      queueMicrotask(() => {
        tiptapEditor.chain().focus("end").run();
      });
    }
  }, [tiptapEditor, enabled, isEditing, isInsideLinkedComponent]);

  if (!isMounted) return null;

  const enterEditFromPreview = () => {
    if (!isEditing && isActive && !isInsideLinkedComponent) {
      setIsEditing(true);
    }
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    if (!isEditing && isActive && !isInsideLinkedComponent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest("a[href]")) {
        e.preventDefault();
      }
      enterEditFromPreview();
      e.stopPropagation();
    }
  };

  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    if (!isEditing && isActive && !isInsideLinkedComponent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest("a[href]")) {
        e.preventDefault();
      }
    }
  };

  const previewHtml = replaceVariables(rawText, query);
  const previewEmpty = isVisuallyEmptyRichText(previewHtml);
  const showEmptyChrome =
    enabled && previewEmpty && !isEditing && !isInsideLinkedComponent;
  const showEmptyBlockHint = showEmptyChrome && isActive;

  return (
    <>
      <div
        role={isEditing ? undefined : "button"}
        tabIndex={isEditing ? undefined : 0}
        onMouseDown={handlePreviewMouseDown}
        onClick={handlePreviewClick}
        onKeyDown={
          isEditing
            ? undefined
            : e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  enterEditFromPreview();
                }
              }
        }
        className={`min-h-0 w-full ${isEditing ? "relative cursor-text" : "cursor-pointer"}`}
      >
        {enabled && tiptapEditor ? (
          isEditing ? (
            <div
              className={
                tiptapVisuallyEmpty
                  ? "w-full rounded-md border border-dashed border-base-300/55 bg-base-200/20 px-1.5 py-0.5"
                  : undefined
              }
            >
              <EditorContent editor={tiptapEditor} />
            </div>
          ) : showEmptyChrome ? (
            <EditorEmptyLeafHint
              selected={!!showEmptyBlockHint}
              icon={<TbTypography aria-hidden />}
              idleLabel="Empty text"
              selectedDetail="Click to edit"
            />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          )
        ) : (
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        )}
      </div>
      {enabled && isEditing && (
        <TiptapProvider editor={tiptapEditor}>
          <InlineEditToolbar editor={tiptapEditor} onSave={() => {
            const ed = tiptapEditorRef.current;
            if (!ed || !enabled) return;
            changeProp({ setProp, propKey: "text", propType: "component", value: persistedTextHtmlFromEditor(ed.getHTML()) });
          }} />
        </TiptapProvider>
      )}
      {isEditing && <VariableSuggestionPopup suggestion={suggestion} />}
      {isEditing && (
        <ReactTooltip id="variable-tip" variant="light" classNameArrow="hidden" className={REACT_TOOLTIP_SURFACE_CLASS} />
      )}
    </>
  );
}

export default TextEditorMode;
