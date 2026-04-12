import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatToolbarCode, type ToolbarFormatLanguage } from "../../../../utils/formatToolbarCode";
import type { EditorVariableOption } from "../../../../utils/editorVariableOptions";
import { htmlVariableAutocompleteExtension } from "./htmlVariableCompletions";

/** Blend a Daisy role toward `--base-content` so tokens stay readable on `bg-base-200` when the role is low-luminance. */
function mixToInk(roleVar: string, rolePercent: number) {
  return `color-mix(in oklch, ${roleVar} ${rolePercent}%, var(--base-content))`;
}

const languageExtensions = {
  html: () => html(),
  css: () => css(),
  javascript: () => javascript(),
  js: () => javascript(),
};

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// Specific → broad. Many roles are mixed toward `--base-content` so they stay visible on `bg-base-200`.
const codeHighlightStyle = HighlightStyle.define([
  { tag: t.invalid, color: "var(--error)" },

  { tag: t.tagName, color: mixToInk("var(--primary)", 62), fontWeight: "600" },
  { tag: [t.attributeName, t.propertyName], color: mixToInk("var(--info)", 44), fontWeight: "500" },
  {
    tag: [t.attributeValue, t.string, t.inserted, t.docString, t.special(t.string)],
    color: "var(--success)",
  },
  { tag: t.content, color: "var(--base-content)" },

  {
    tag: [
      t.angleBracket,
      t.bracket,
      t.paren,
      t.squareBracket,
      t.brace,
      t.punctuation,
      t.separator,
      t.derefOperator,
    ],
    color: "var(--info)",
  },
  { tag: [t.definitionOperator, t.typeOperator], color: "var(--info)" },

  {
    tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.definitionKeyword, t.operatorKeyword],
    color: "var(--primary)",
    fontWeight: "600",
  },
  { tag: [t.self, t.null], color: "var(--primary)", fontWeight: "600" },
  { tag: [t.atom, t.bool], color: "var(--warning)" },
  { tag: t.modifier, color: "var(--warning)", fontWeight: "600" },

  {
    tag: [
      t.operator,
      t.arithmeticOperator,
      t.logicOperator,
      t.bitwiseOperator,
      t.compareOperator,
      t.updateOperator,
      t.controlOperator,
    ],
    color: "var(--info)",
  },

  { tag: [t.typeName, t.className, t.labelName], color: mixToInk("var(--warning)", 52) },
  { tag: t.namespace, color: mixToInk("var(--neutral-content)", 42) },

  { tag: t.function(t.variableName), color: "var(--info)" },
  { tag: t.variableName, color: "var(--base-content)" },

  { tag: t.color, color: "var(--success)" },
  { tag: [t.number, t.integer, t.float], color: "var(--warning)" },
  { tag: t.unit, color: "var(--neutral-content)" },

  { tag: t.character, color: "var(--info)" },
  { tag: [t.constant(t.name), t.standard(t.name)], color: mixToInk("var(--neutral-content)", 38) },

  { tag: [t.name, t.deleted, t.macroName], color: "var(--base-content)" },
  { tag: t.special(t.variableName), color: mixToInk("var(--accent)", 50) },
  { tag: [t.changed, t.annotation], color: "var(--neutral-content)" },

  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: "var(--neutral-content)",
    fontStyle: "italic",
  },
  { tag: t.meta, color: "var(--neutral-content)", fontStyle: "italic" },
  {
    tag: [t.processingInstruction, t.documentMeta],
    color: "var(--neutral-content)",
    fontStyle: "italic",
  },

  { tag: [t.url, t.escape, t.regexp], color: "var(--info)" },
  { tag: t.link, color: "var(--primary)", textDecoration: "underline" },

  { tag: t.definition(t.name), color: "var(--info)" },

  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.heading, fontWeight: "bold", color: "var(--primary)" },
]);

const createCustomTheme = (isDark: boolean) => {
  return [
    EditorView.theme(
      {
        "&": {
          backgroundColor: "transparent !important",
          color: "var(--base-content)",
        },
        "&.cm-editor": {
          outline: "none",
        },
        ".cm-content": {
          caretColor: "var(--primary) !important",
          fontFamily: "var(--font-mono)",
        },
        ".cm-cursor, .cm-dropCursor": {
          borderLeftColor: "var(--primary) !important",
        },
        // Never use `opacity` on the selection layer — it makes the highlight nearly invisible.
        ".cm-selectionBackground": {
          backgroundColor:
            "color-mix(in oklch, var(--primary) 46%, var(--color-base-300)) !important",
        },
        ".cm-content ::selection": {
          backgroundColor:
            "color-mix(in oklch, var(--primary) 46%, var(--color-base-300)) !important",
        },
        ".cm-gutters": {
          backgroundColor: "transparent !important",
          color: "var(--neutral-content) !important",
          borderRight: "1px solid var(--base-300) !important",
          minWidth: "30px",
        },
        ".cm-gutterElement": {
          display: "flex",
          justifyContent: "flex-end",
          paddingRight: "8px !important",
        },
        ".cm-activeLine": {
          backgroundColor: "color-mix(in oklch, var(--color-base-200) 65%, transparent) !important",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "color-mix(in oklch, var(--color-base-200) 65%, transparent) !important",
        },
        ".cm-foldPlaceholder": {
          backgroundColor: "transparent",
          border: "none",
          color: "var(--neutral-content)",
        },
      },
      { dark: isDark }
    ),
    syntaxHighlighting(codeHighlightStyle),
  ];
};

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: "html" | "css" | "javascript" | "js";
  extensions?: any[];
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  placeholder?: string;
  readOnly?: boolean;
  lineNumbers?: boolean;
  foldGutter?: boolean;
  theme?: "dark" | "light" | "auto";
  onFocus?: () => void;
  onBlur?: () => void;
  /**
   * When true with `autoFormatMountKey`, Prettier runs once whenever the key changes
   * (e.g. selecting another Text node). Does not run while typing the same node.
   */
  autoFormatOnMount?: boolean;
  /** Session id for mount-time format (Craft `node.id`, or a stable tab id). */
  autoFormatMountKey?: string;
  /** Smaller monospace (toolbar CodeMirror only; site settings / import UI stay default). */
  toolbarDenseCode?: boolean;
  /** When set (HTML mode), `{{` triggers completion for company / site variables. */
  htmlVariableCompletionOptions?: EditorVariableOption[];
}

export const CodeEditor = ({
  value,
  onChange,
  language = "html",
  extensions: extraExtensions = [],
  height = "200px",
  minHeight,
  maxHeight,
  placeholder,
  readOnly = false,
  lineNumbers = true,
  foldGutter = false,
  theme = "auto",
  onFocus,
  onBlur,
  autoFormatOnMount = false,
  autoFormatMountKey,
  toolbarDenseCode = false,
  htmlVariableCompletionOptions,
}: CodeEditorProps) => {
  const latestValue = useRef(typeof value === "string" ? value : String(value || ""));
  useEffect(() => {
    latestValue.current = typeof value === "string" ? value : String(value || "");
  }, [value]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!autoFormatOnMount || !autoFormatMountKey || readOnly) return;
    const raw = latestValue.current;
    let cancelled = false;
    void (async () => {
      try {
        const fmt = await formatToolbarCode(raw, language as ToolbarFormatLanguage);
        if (!cancelled && fmt !== raw) {
          latestValue.current = fmt;
          onChangeRef.current?.(fmt);
        }
      } catch {
        // leave as stored
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoFormatOnMount, autoFormatMountKey, language, readOnly]);

  const isDark = useDarkMode();
  const themeMode = theme === "auto" ? isDark : theme === "dark";

  const langFn = languageExtensions[language];

  // Memoize theme to prevent unnecessary re-renders
  const customTheme = useMemo(() => createCustomTheme(themeMode), [themeMode]);

  const variableExtensions = useMemo(() => {
    if (language !== "html" || htmlVariableCompletionOptions === undefined) return [];
    return [htmlVariableAutocompleteExtension(htmlVariableCompletionOptions)];
  }, [language, htmlVariableCompletionOptions]);

  const allExtensions = useMemo(
    () => [
      EditorView.lineWrapping,
      ...(langFn ? [langFn()] : []),
      ...customTheme,
      ...variableExtensions,
      ...extraExtensions,
    ],
    [langFn, customTheme, extraExtensions, variableExtensions]
  );

  const handleChange = useCallback(
    (next: string) => {
      latestValue.current = next;
      onChange?.(next);
    },
    [onChange]
  );

  return (
    <div className="border-base-300 bg-base-200 focus-within:border-primary/50 hover:bg-base-300/25 overflow-hidden rounded-lg border">
      <CodeMirror
        value={typeof value === "string" ? value : String(value || "")}
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
        extensions={allExtensions}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
        placeholder={placeholder}
        className={
          toolbarDenseCode ? "text-[10px] leading-snug [&_.cm-content]:text-[10px]" : "text-sm"
        }
      />
    </div>
  );
};
