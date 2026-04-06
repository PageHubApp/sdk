import { Diagnostic, linter } from "@codemirror/lint";
import { useEditor, useNode } from "@craftjs/core";
import { ViewAtom } from "../../../Viewport/atoms";
import { changeProp, getPropFinalValue } from "../../../Viewport/lib";
import { useAtomValue } from "@zedux/react";
import { ToolbarSection } from "../../ToolbarSection";
import { CodeEditor } from "../typography/CodeEditor";

const cssLinter = linter(view => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc.toString();

  try {
    const openBraces = (doc.match(/{/g) || []).length;
    const closeBraces = (doc.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      diagnostics.push({
        from: 0,
        to: doc.length,
        severity: "error",
        message: "Unmatched braces in CSS",
      });
    }

    const lines = doc.split("\n");
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (
        trimmed &&
        trimmed.includes(":") &&
        !trimmed.endsWith(";") &&
        !trimmed.endsWith("{") &&
        !trimmed.endsWith("}") &&
        !trimmed.startsWith("/*") &&
        !trimmed.startsWith("//")
      ) {
        const lineStart = doc.split("\n").slice(0, index).join("\n").length + index;
        diagnostics.push({
          from: lineStart,
          to: lineStart + line.length,
          severity: "warning",
          message: "Missing semicolon",
        });
      }
    });
  } catch (e) {
    // Ignore parsing errors
  }

  return diagnostics;
});

export const CSSEditorInput = () => {
  const view = useAtomValue(ViewAtom);
  const { query, actions } = useEditor();

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data.props || {},
    id: node.id,
  }));

  const { value } = getPropFinalValue({ propKey: "style", propType: "root" }, view, nodeProps);

  const handleChange = (val: string) => {
    changeProp({
      propKey: "style",
      value: val,
      setProp,
      view: "root",
      propType: "root",
      query,
      actions,
      nodeId: id,
    });
  };

  const editor = (
    <CodeEditor
      value={value}
      onChange={handleChange}
      language="css"
      extensions={[cssLinter]}
      height="150px"
      lineNumbers={false}
      theme="auto"
      placeholder="color: tomato; border-style: dotted;"
    />
  );

  return (
    <ToolbarSection title="Inline Style" nested collapsible defaultOpen={false} accordionPassive>
      {editor}
    </ToolbarSection>
  );
};
