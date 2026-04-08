import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { VariableNodeView } from "./VariableNodeView";

export interface VariableNodeOptions {
  /**
   * Callback to get available variables for suggestions.
   */
  getVariables: () => { id: string; label: string }[];
  /**
   * Called when the suggestion popup should open/close/update.
   */
  onSuggestion?: (props: SuggestionProps | null) => void;
  /**
   * Resolves a variable ID to its display text (e.g. "company.name" -> "Acme Inc.")
   */
  resolveVariable?: (id: string) => string;
}

export interface SuggestionProps {
  query: string;
  items: { id: string; label: string }[];
  command: (item: { id: string; label: string }) => void;
  clientRect: (() => DOMRect | null) | null;
  decorationId: string | null;
}

const SUGGESTION_PLUGIN_KEY = new PluginKey("variableSuggestion");

/**
 * Custom TipTap Node extension for template variables.
 *
 * - Renders as normal-looking text with a subtle variable indicator icon
 * - Atomic (selected/deleted as a whole unit)
 * - Double-click reveals the variable name in a popover
 * - Serializes to <span data-variable="company.name"> in HTML
 * - Typing {{ triggers autocomplete suggestion popup
 */
export const VariableNode = Node.create<VariableNodeOptions>({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      getVariables: () => [],
      onSuggestion: null,
      resolveVariable: (id: string) => id,
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute("data-variable"),
        renderHTML: attributes => ({
          "data-variable": attributes.id,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-variable]",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    // Serialized HTML — used for storage and getHTML().
    // The {{...}} text is kept so replaceVariables() can process it at render time.
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-variable": node.attrs.id,
        class: "variable-node",
      }),
      `{{${node.attrs.id}}}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView, {
      as: "span",
      className: "",
    });
  },

  addCommands() {
    return {
      insertVariable:
        (attrs: { id: string }) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: SUGGESTION_PLUGIN_KEY,
        state: {
          init() {
            return { active: false, range: null, query: "", decorationId: null };
          },
          apply(tr, prev, _oldState, newState) {
            const meta = tr.getMeta(SUGGESTION_PLUGIN_KEY);
            if (meta?.close) {
              return { active: false, range: null, query: "", decorationId: null };
            }

            const { selection } = newState;
            const { $from } = selection;

            if (!selection.empty) {
              return { active: false, range: null, query: "", decorationId: null };
            }

            // Look backwards from cursor for {{ trigger
            const textBefore = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\ufffc"
            );

            const match = textBefore.match(/\{\{([^}]*)$/);

            if (match) {
              const query = match[1];
              const from = $from.pos - match[0].length;
              const to = $from.pos;
              const decorationId = `variable-suggestion-${from}`;

              return {
                active: true,
                range: { from, to },
                query,
                decorationId,
              };
            }

            return { active: false, range: null, query: "", decorationId: null };
          },
        },

        props: {
          decorations(state) {
            const pluginState = SUGGESTION_PLUGIN_KEY.getState(state);
            if (!pluginState?.active || !pluginState.range) {
              return DecorationSet.empty;
            }

            return DecorationSet.create(state.doc, [
              Decoration.inline(pluginState.range.from, pluginState.range.to, {
                class: "variable-suggestion-active",
                "data-decoration-id": pluginState.decorationId,
              }),
            ]);
          },
        },

        view() {
          return {
            update: (view, prevState) => {
              const prev = SUGGESTION_PLUGIN_KEY.getState(prevState);
              const next = SUGGESTION_PLUGIN_KEY.getState(view.state);

              if (prev?.active === next?.active && prev?.query === next?.query) {
                return;
              }

              if (!next?.active) {
                extension.options.onSuggestion?.(null);
                return;
              }

              const allVars = extension.options.getVariables();
              const query = next.query.toLowerCase();
              const filtered = query
                ? allVars.filter(
                    v =>
                      v.id.toLowerCase().includes(query) ||
                      v.label.toLowerCase().includes(query)
                  )
                : allVars;

              const clientRect = () => {
                const c = view.coordsAtPos(next.range.from);
                return new DOMRect(c.left, c.top, 0, c.bottom - c.top);
              };

              extension.options.onSuggestion?.({
                query: next.query,
                items: filtered,
                decorationId: next.decorationId,
                clientRect,
                command: (item) => {
                  const { tr } = view.state;
                  const node = view.state.schema.nodes.variable.create({
                    id: item.id,
                  });

                  tr.replaceWith(next.range.from, next.range.to, node);
                  tr.setMeta(SUGGESTION_PLUGIN_KEY, { close: true });
                  view.dispatch(tr);
                  view.focus();
                },
              });
            },
          };
        },
      }),
    ];
  },
});

/**
 * Preprocesses HTML content to convert raw {{variable}} text into
 * <span data-variable="variable"> nodes that TipTap can parse.
 *
 * Handles legacy content stored with plain text variables.
 * Already-wrapped spans are left untouched.
 */
export function preprocessVariables(html: string): string {
  if (!html || typeof html !== "string") return html;

  return html.replace(/\{\{([^}]+)\}\}/g, (match, varName, offset) => {
    const trimmed = varName.trim();
    // Check if already inside a data-variable span
    const before = html.substring(Math.max(0, offset - 100), offset);
    if (before.match(/<span[^>]*data-variable[^>]*>$/)) {
      return match;
    }
    return `<span data-variable="${trimmed}" class="variable-node">{{${trimmed}}}</span>`;
  });
}
