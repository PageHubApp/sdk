import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import type { EditorVariableOption } from "@/utils/editorVariableOptions";

/**
 * After `{{`, suggest site placeholders (company.*, year, variables.* from ROOT).
 */
function variableSource(options: EditorVariableOption[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/\{\{([\w.]*)$/);
    if (!before) return null;

    const partial = (before.text.startsWith("{{") ? before.text.slice(2) : "").toLowerCase();
    const from = before.from + 2;
    let to = context.pos;
    // closeBrackets auto-inserts `}}` after `{{`, leaving `{{|}}`; include those in the
    // replacement range so we do not append a second `}}`.
    const ahead = context.state.doc.sliceString(to, Math.min(to + 2, context.state.doc.length));
    if (ahead === "}}") {
      to += 2;
    }

    const matches = options.filter(
      o =>
        partial === "" ||
        o.id.toLowerCase().startsWith(partial) ||
        o.label.toLowerCase().includes(partial)
    );
    if (!matches.length) return null;

    const list: Completion[] = matches.map(o => ({
      label: o.label,
      detail: `{{${o.id}}}`,
      apply: `${o.id}}}`,
      type: "constant",
    }));

    return { from, to, options: list, filter: false };
  };
}

export function htmlVariableAutocompleteExtension(options: EditorVariableOption[]) {
  return autocompletion({
    override: [variableSource(options)],
    maxRenderedOptions: 40,
  });
}
