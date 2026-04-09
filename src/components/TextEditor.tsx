/**
 * TextEditorMode — Editor-only Tiptap integration for Text component.
 * Lazy-loaded by Text.tsx only when enabled=true.
 * Contains all TipTap, chrome, and editing dependencies.
 */
import React, { useEffect } from "react";
import { useEditor, ROOT_NODE } from "@craftjs/core";
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
import { InlineEditToolbar } from "../chrome/Tools/InlineEditToolbar/InlineEditToolbar";
import { VariableSuggestionPopup } from "../chrome/Tools/VariableSuggestion";

import { replaceVariables, resolveVariable } from "../utils/design/variables";
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

// Built-in variables for the suggestion popup
const BUILTIN_VARIABLES = [
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
    HTMLAttributes: { class: "text-primary underline" },
  }),
  Image.configure({
    HTMLAttributes: { class: "max-w-full h-auto" },
  }),
  VariableNode.configure({
    getVariables: () => {
      const vars = [...BUILTIN_VARIABLES];
      try {
        const root = queryRef?.current?.node(ROOT_NODE)?.get();
        const customVars = root?.data?.props?.variables;
        if (Array.isArray(customVars)) {
          customVars.forEach((v: any) => {
            if (v.key?.trim()) {
              vars.push({ id: `variables.${v.key}`, label: v.key });
            }
          });
        }
      } catch {}
      return vars;
    },
    onSuggestion: onSuggestion || null,
    resolveVariable: (id: string) => queryRef?.current ? resolveVariable(id, queryRef.current) : id,
  }),
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
        role={isEditing ? undefined : "button"}
        tabIndex={isEditing ? undefined : 0}
        onClick={handleClick}
        onKeyDown={isEditing ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        className={`min-h-inherit w-full ${isEditing ? "relative cursor-text" : "cursor-pointer"}`}
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
          <InlineEditToolbar editor={tiptapEditor} />
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
