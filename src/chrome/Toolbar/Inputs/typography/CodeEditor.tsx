import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState } from "react";

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

// Custom B&W high-contrast theme extension using project variables
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
        ".cm-selectionBackground, .cm-content ::selection": {
          backgroundColor: "var(--primary) !important",
          opacity: "0.15",
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
          backgroundColor: "var(--neutral) !important",
          opacity: "0.4",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "var(--neutral) !important",
        },
        ".cm-foldPlaceholder": {
          backgroundColor: "transparent",
          border: "none",
          color: "var(--neutral-content)",
        },
      },
      { dark: isDark }
    ),
    syntaxHighlighting(
      HighlightStyle.define([
        { tag: t.keyword, color: "var(--primary)", fontWeight: "bold" },
        {
          tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName],
          color: "var(--base-content)",
        },
        { tag: [t.function(t.variableName), t.labelName], color: "var(--base-content)" },
        { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "var(--base-content)" },
        { tag: [t.definition(t.name), t.separator], color: "var(--base-content)" },
        {
          tag: [
            t.typeName,
            t.className,
            t.number,
            t.changed,
            t.annotation,
            t.modifier,
            t.self,
            t.namespace,
          ],
          color: "var(--base-content)",
        },
        {
          tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)],
          color: "var(--primary)",
        },
        { tag: [t.meta, t.comment], color: "var(--neutral-content)", fontStyle: "italic" },
        { tag: t.strong, fontWeight: "bold" },
        { tag: t.emphasis, fontStyle: "italic" },
        { tag: t.strikethrough, textDecoration: "line-through" },
        { tag: t.link, color: "var(--neutral-content)", textDecoration: "underline" },
        { tag: t.heading, fontWeight: "bold", color: "var(--base-content)" },
        { tag: [t.atom, t.bool, t.special(t.variableName)], color: "var(--base-content)" },
        { tag: [t.processingInstruction, t.string, t.inserted], color: "var(--base-content)" },
        { tag: t.invalid, color: "var(--error)" },
      ])
    ),
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
}: CodeEditorProps) => {
  const isDark = useDarkMode();
  const themeMode = theme === "auto" ? isDark : theme === "dark";

  const langFn = languageExtensions[language];

  // Memoize theme to prevent unnecessary re-renders
  const customTheme = useMemo(() => createCustomTheme(themeMode), [themeMode]);

  const allExtensions = useMemo(
    () => [
      EditorView.lineWrapping,
      ...(langFn ? [langFn()] : []),
      ...customTheme,
      ...extraExtensions,
    ],
    [langFn, customTheme, extraExtensions]
  );

  return (
    <div className="overflow-hidden rounded-lg border border-base-300 bg-neutral/80 transition-all focus-within:border-primary/50 hover:bg-neutral">
      <CodeMirror
        value={typeof value === "string" ? value : String(value || "")}
        height={height}
        minHeight={minHeight}
        maxHeight={maxHeight}
        extensions={allExtensions}
        onChange={onChange}
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
        className="text-sm"
      />
    </div>
  );
};
