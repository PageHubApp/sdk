// @ts-nocheck
import { Diagnostic, linter } from "@codemirror/lint";
import { CodeEditor } from "../typography/CodeEditor";

const htmlLinter = linter(view => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc.toString();

  try {
    const scriptTags = (doc.match(/<script[^>]*>/gi) || []).length;
    const scriptCloseTags = (doc.match(/<\/script>/gi) || []).length;

    if (scriptTags !== scriptCloseTags) {
      diagnostics.push({
        from: 0,
        to: doc.length,
        severity: "error",
        message: "Unclosed <script> tags detected",
      });
    }

    const styleTags = (doc.match(/<style[^>]*>/gi) || []).length;
    const styleCloseTags = (doc.match(/<\/style>/gi) || []).length;

    if (styleTags !== styleCloseTags) {
      diagnostics.push({
        from: 0,
        to: doc.length,
        severity: "error",
        message: "Unclosed <style> tags detected",
      });
    }

    const lines = doc.split("\n");
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.includes('="') && !trimmed.includes('"')) {
        const lineStart = doc.split("\n").slice(0, index).join("\n").length + index;
        diagnostics.push({
          from: lineStart,
          to: lineStart + line.length,
          severity: "warning",
          message: "Unclosed quote in attribute",
        });
      }
    });
  } catch (e) {
    // Ignore parsing errors
  }

  return diagnostics;
});

interface HTMLCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  label?: string;
  helpText?: string;
  className?: string;
}

export const HTMLCodeInput = ({
  value,
  onChange,
  placeholder = "<script>...</script>",
  height = "200px",
  label,
  helpText,
  className = "",
}: HTMLCodeInputProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-medium text-foreground">{label}</label>}
      <CodeEditor
        value={value}
        onChange={onChange}
        language="html"
        extensions={[htmlLinter]}
        height={height}
        placeholder={placeholder}
      />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
};

export default HTMLCodeInput;
