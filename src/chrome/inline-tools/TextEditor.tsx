/**
 * TextEditorMode — Editor-only Tiptap integration for Text component.
 * Lazy-loaded by Text.tsx only when enabled=true.
 * Contains all TipTap, chrome, and editing dependencies.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { TbTypography } from "react-icons/tb";
import { useEditor } from "@craftjs/core";
import { EditorContent, useEditor as useTiptapEditor } from "@tiptap/react";
import type { Editor as TiptapEditorInstance } from "@tiptap/core";

import { useSDKSafe } from "../../core/context";
import { changeProp } from "../viewport/viewportExports";
import { TiptapProvider } from "./TiptapContext";
import { InlineEditToolbar } from "./inline-edit-toolbar/InlineEditToolbar";
import { TiptapRichTextContextMenu } from "./inline-edit-toolbar/TiptapRichTextContextMenu";
import { OPEN_LINK_PANEL_EVENT } from "./openLinkPanelEvent";
import { VariableSuggestionPopup } from "./VariableSuggestion";

import { LazyEditorEmptyLeafHint as EditorEmptyLeafHint } from "../../components/LazyEditorEmptyLeafHint";
import { replaceVariables, resolveVariable } from "../../utils/design/variables";
import { useItemContext } from "../../utils/itemContext";
import { useAnchors } from "../../utils/anchors/anchorContext";
import {
  isVisuallyEmptyRichText,
  persistedTextHtmlFromEditor,
} from "../../utils/isVisuallyEmptyRichText";
import { preprocessVariables } from "@/core/tiptapExtensions/VariableNode";
import type { SuggestionProps } from "@/core/tiptapExtensions/VariableNode";
import {
  getPagehubTextTiptapExtensions,
  type PagehubTextRichMode,
} from "@/core/tiptapExtensions/pagehubTextTiptapExtensions";

// Helper to check if ancestor is a linked component
const checkIfAncestorLinked = (nodeId: string, query: any): boolean => {
  const node = query.node(nodeId).get();
  if (!node) return false;
  if (node.data.props?.relation?.belongsTo && node.data.props?.relation?.relationType !== "style") {
    return true;
  }
  if (node.data.parent) {
    return checkIfAncestorLinked(node.data.parent, query);
  }
  return false;
};

function TextEditorMode({
  props,
  id,
  query,
  enabled,
  isMounted,
  setProp,
}: {
  props: any;
  id: string;
  query: any;
  enabled: boolean;
  isMounted: boolean;
  setProp: any;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const isEditingRef = React.useRef(isEditing);
  const itemContext = useItemContext();
  const anchors = useAnchors();

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

  useEffect(() => {
    if (!isEditing) setRichTextCtxMenu(null);
  }, [isEditing]);

  const isInsideLinkedComponent = checkIfAncestorLinked(id, query);
  const rawText = props.text || "";
  const editorContent = React.useMemo(() => preprocessVariables(rawText), [rawText]);

  const richTextMode: PagehubTextRichMode = props.richText?.mode === "inline" ? "inline" : "full";

  const [suggestion, setSuggestion] = React.useState<SuggestionProps | null>(null);
  const [richTextCtxMenu, setRichTextCtxMenu] = React.useState<null | { x: number; y: number }>(
    null
  );

  const sdk = useSDKSafe();
  const hasInlineAiChrome =
    sdk?.features.aiGeneration &&
    Boolean(sdk.config.editorChromeSlots?.renderInlineCopyAssistantTrigger);

  const queryRef = React.useRef(query);
  queryRef.current = query;

  const nodeIdRef = React.useRef<string | undefined>(id);
  nodeIdRef.current = id;

  const tiptapEditorRef = useRef<TiptapEditorInstance | null>(null);

  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          "ph-text-editor-root w-full min-h-[1.15em] outline-none focus:outline-none focus-visible:outline-none",
      } as Record<string, string>,
      handleDOMEvents: {
        contextmenu(_view: unknown, event: Event) {
          const mouse = event as MouseEvent;
          const ed = tiptapEditorRef.current;
          if (!ed?.isEditable) return false;
          mouse.preventDefault();
          mouse.stopPropagation();
          setRichTextCtxMenu({ x: mouse.clientX, y: mouse.clientY });
          return true;
        },
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

  const tiptapExtensions = useMemo(
    () => getPagehubTextTiptapExtensions(richTextMode, setSuggestion, queryRef, nodeIdRef),
    [richTextMode]
  );

  const tiptapEditor = useTiptapEditor(
    {
      extensions: enabled ? tiptapExtensions : [],
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
    [enabled, isInsideLinkedComponent, richTextMode, tiptapExtensions]
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

  const previewHtml = replaceVariables(rawText, query, itemContext, anchors);
  const previewEmpty = isVisuallyEmptyRichText(previewHtml);
  const showEmptyChrome = enabled && previewEmpty && !isEditing && !isInsideLinkedComponent;
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
                  ? "border-base-300/55 bg-base-200/20 w-full rounded-md border border-dashed px-1.5 py-0.5"
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
              selectedLabel="Click to edit"
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
          <InlineEditToolbar
            editor={tiptapEditor}
            richTextMode={richTextMode}
            onSave={() => {
              const ed = tiptapEditorRef.current;
              if (!ed || !enabled) return;
              changeProp({
                setProp,
                propKey: "text",
                propType: "component",
                value: persistedTextHtmlFromEditor(ed.getHTML()),
              });
            }}
          />
          <TiptapRichTextContextMenu
            open={richTextCtxMenu !== null}
            anchor={richTextCtxMenu}
            onClose={() => setRichTextCtxMenu(null)}
            editor={tiptapEditor}
            query={query}
            textNodeId={id}
            showAi={hasInlineAiChrome}
          />
        </TiptapProvider>
      )}
      {isEditing && <VariableSuggestionPopup suggestion={suggestion} />}
    </>
  );
}

export default TextEditorMode;
