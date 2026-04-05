// @ts-nocheck
/**
 * TextEditorMode — Editor-only Tiptap integration for Text component.
 * Lazy-loaded by Text.tsx only when enabled=true.
 * Contains all TipTap, chrome, and editing dependencies.
 */
import React, { useEffect } from "react";
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
import { EditorContent, useEditor as useTiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { changeProp } from "../chrome/Viewport/lib";
import { TiptapProvider } from "../chrome/TiptapContext";
import { TiptapToolbar } from "../chrome/Tools/TiptapToolbar";
import { VariableSuggestionPopup } from "../chrome/Tools/VariableSuggestion";
import { Tooltip as ReactTooltip } from "react-tooltip";

import { replaceVariables, resolveVariable } from "../utils/design/variables";
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

// Default available variables for the suggestion popup
const ALL_VARIABLES = [
  { id: "company.name", label: "Company Name" },
  { id: "company.tagline", label: "Tagline" },
  { id: "company.type", label: "Business Type" },
  { id: "company.location", label: "Location" },
  { id: "company.address", label: "Address" },
  { id: "company.phone", label: "Phone" },
  { id: "company.email", label: "Email" },
  { id: "company.website", label: "Website" },
  { id: "year", label: "Current Year" },
];

const getTiptapExtensions = (
  onSuggestion?: (props: SuggestionProps | null) => void,
  queryRef?: { current: any }
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
    HTMLAttributes: { class: "text-primary underline" },
  }),
  Image.configure({
    HTMLAttributes: { class: "max-w-full h-auto" },
  }),
  VariableNode.configure({
    getVariables: () => ALL_VARIABLES,
    onSuggestion: onSuggestion || null,
    resolveVariable: (id: string) => queryRef?.current ? resolveVariable(id, queryRef.current) : id,
  }),
];

const TextEditorMode: React.FC<{
  props: any;
  id: string;
  query: any;
  enabled: boolean;
  isMounted: boolean;
  setProp: any;
}> = ({ props, id, query, enabled, isMounted, setProp }) => {
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

  const tiptapEditor = useTiptapEditor(
    {
      extensions: enabled ? getTiptapExtensions(setSuggestion, queryRef) : [],
      content: editorContent,
      editable: enabled && isEditing && !isInsideLinkedComponent,
      immediatelyRender: false,
      editorProps: { attributes: {} },
      onUpdate: ({ editor }: { editor: any }) => {
        if (enabled && isEditingRef.current && !isInsideLinkedComponent) {
          changeProp({
            setProp,
            propKey: "text",
            propType: "component",
            value: editor.getHTML(),
          });
        }
      },
      onFocus: () => {
        if (enabled && isActive && !isEditingRef.current) {
          setIsEditing(true);
        }
      },
      onBlur: () => {},
    },
    [enabled]
  );

  useEffect(() => {
    if (tiptapEditor && rawText) {
      const currentContent = tiptapEditor.getHTML();
      const processed = preprocessVariables(rawText);
      const normalize = (html: string) => html.replace(/>\s+</g, "><").trim();
      if (normalize(currentContent) !== normalize(processed)) {
        tiptapEditor.commands.setContent(processed, {
          errorOnInvalidContent: false,
          emitUpdate: false,
        });
      }
    }
  }, [rawText, tiptapEditor]);

  useEffect(() => {
    if (tiptapEditor) {
      tiptapEditor.setEditable(isEditing, false);
    }
  }, [tiptapEditor, isEditing]);

  if (!isMounted) return null;

  const handleClick = () => {
    if (!isEditing && isActive && !isInsideLinkedComponent) {
      setIsEditing(true);
      setTimeout(() => {
        tiptapEditor?.commands.focus();
      }, 10);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className={`min-h-inherit w-full transition-all duration-150 ease-in-out ${isEditing ? "relative cursor-text" : "cursor-pointer"}`}
      >
        {enabled && tiptapEditor ? (
          isEditing ? (
            <EditorContent editor={tiptapEditor} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: replaceVariables(rawText, query) }} />
          )
        ) : (
          <div dangerouslySetInnerHTML={{ __html: replaceVariables(rawText, query) }} />
        )}
      </div>
      {enabled && isEditing && (
        <TiptapProvider editor={tiptapEditor}>
          <TiptapToolbar editor={tiptapEditor} />
        </TiptapProvider>
      )}
      {isEditing && <VariableSuggestionPopup suggestion={suggestion} />}
      {isEditing && <ReactTooltip id="variable-tip" classNameArrow="hidden" className="max-w-[220px] rounded-lg! border! !border-border !bg-primary px-2! py-1! text-xs! font-normal! !text-primary-foreground shadow-lg!" />}
    </>
  );
};

export default TextEditorMode;
