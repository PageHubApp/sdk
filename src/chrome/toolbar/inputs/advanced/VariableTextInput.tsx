import { useEditor, useNode } from "@craftjs/core";
import { useMemo, useRef, useState } from "react";
import { TbBraces, TbCode } from "react-icons/tb";
import { getEditorVariableOptions } from "@/utils/editorVariableOptions";
import { Chip } from "@/chrome/primitives/Chip";
import { SearchInput } from "@/chrome/primitives/SearchInput";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { useAtomValue } from "@zedux/react";
import { SideBarAtom } from "@/utils/atoms";
import { ToolbarDropdown } from "@/chrome/toolbar/ToolbarDropdown";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../overlays/overlayZIndex";
import {
  findAncestorDataSource,
  getConnectorCollectionLabel,
  getConnectorProviderLabel,
} from "@/utils/data/dataSourceContext";

interface VariableSnippet {
  label: string;
  value: string;
}

interface VariableTextInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  snippets?: VariableSnippet[];
  showExpressionHelp?: boolean;
  intent?: "generic" | "image-src";
}

type ExpressionMode = "variable" | "fallback" | "ifelse" | "equals" | "not-equals";

function insertAtCursor(
  input: HTMLInputElement,
  current: string,
  insertText: string,
  onChange: (value: string) => void
) {
  const start = input.selectionStart ?? current.length;
  const end = input.selectionEnd ?? current.length;
  const next = `${current.slice(0, start)}${insertText}${current.slice(end)}`;
  onChange(next);
  requestAnimationFrame(() => {
    const pos = start + insertText.length;
    input.focus();
    input.setSelectionRange(pos, pos);
  });
}

export function VariableTextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  helpText,
  snippets = [],
  showExpressionHelp = true,
  intent = "generic",
}: VariableTextInputProps) {
  const { query } = useEditor();
  const { nodeId } = useNode(node => ({ nodeId: node.id }));
  const inputRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<null | "variables" | "expressions">(null);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const [search, setSearch] = useState("");
  const [showAllVariables, setShowAllVariables] = useState(false);
  const variableBtnRef = useRef<HTMLButtonElement>(null);
  const expressionBtnRef = useRef<HTMLButtonElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);
  const [exprMode, setExprMode] = useState<ExpressionMode>("variable");
  const [exprVar, setExprVar] = useState("item.image");
  const [exprFallback, setExprFallback] = useState("/placeholder.jpg");
  const [exprCompare, setExprCompare] = useState("logged-in");
  const [exprTrue, setExprTrue] = useState("item.image");
  const [exprFalse, setExprFalse] = useState("/placeholder.jpg");

  const options = useMemo(() => getEditorVariableOptions(query, nodeId), [query, nodeId]);
  const dataScope = useMemo(() => {
    const ds = findAncestorDataSource(nodeId, query);
    if (!ds) return null;
    return `${getConnectorProviderLabel(ds.provider)} ${getConnectorCollectionLabel(ds.provider, ds.collection)}`;
  }, [nodeId, query]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchesSearch = (v: (typeof options)[number]) =>
      v.id.toLowerCase().includes(q) ||
      v.label.toLowerCase().includes(q) ||
      v.group?.toLowerCase().includes(q);

    const imageTokenRegex =
      /(image|img|photo|thumbnail|thumb|src|url|avatar|logo|banner|cover|hero|media)/i;
    const isImageLike = (v: (typeof options)[number]) =>
      imageTokenRegex.test(v.id) || imageTokenRegex.test(v.label);

    const base = q ? options.filter(matchesSearch) : options;
    if (intent !== "image-src") return base;
    if (showAllVariables) return base;
    return base.filter(isImageLike);
  }, [options, search, intent, showAllVariables]);

  const sortedFiltered = useMemo(() => {
    if (intent !== "image-src") return filtered;
    const imageTokenRegex =
      /(image|img|photo|thumbnail|thumb|src|url|avatar|logo|banner|cover|hero|media)/i;
    const score = (v: (typeof filtered)[number]) => {
      const id = v.id.toLowerCase();
      const label = v.label.toLowerCase();
      let s = 0;
      if (id.startsWith("item.")) s += 8;
      if (id.includes(".image") || label.includes("image")) s += 6;
      if (imageTokenRegex.test(id) || imageTokenRegex.test(label)) s += 4;
      return s;
    };
    return [...filtered].sort((a, b) => score(b) - score(a));
  }, [filtered, intent]);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof sortedFiltered>();
    for (const option of sortedFiltered) {
      const group = option.group || "Other";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(option);
    }
    return Array.from(map.entries());
  }, [sortedFiltered]);

  const flatOptions = useMemo(() => grouped.flatMap(([, vars]) => vars), [grouped]);

  const builtExpression = useMemo(() => {
    const v = exprVar || "item.image";
    const fb = exprFallback || "/placeholder.jpg";
    const tv = exprTrue || v;
    const fv = exprFalse || fb;
    if (exprMode === "variable") return `{{${v}}}`;
    if (exprMode === "fallback") return `{{${v} || "${fb}"}}`;
    if (exprMode === "ifelse") return `{{${v} ? ${tv} : "${fv}"}}`;
    if (exprMode === "equals") return `{{${v} == ${exprCompare} ? ${tv} : "${fv}"}}`;
    return `{{${v} != ${exprCompare} ? ${tv} : "${fv}"}}`;
  }, [exprMode, exprVar, exprFallback, exprTrue, exprFalse, exprCompare]);

  const setFieldFromVariable = (setter: (value: string) => void, varId: string, wrap = false) => {
    if (!varId) return;
    setter(wrap ? `{{${varId}}}` : varId);
  };

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={id} className="toolbar-label block font-medium">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <Chip
          open={panel !== null}
          trailing={
            <div className="flex items-center gap-0.5">
              <button
                ref={variableBtnRef}
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  const rect = variableBtnRef.current?.getBoundingClientRect();
                  if (rect) {
                    const x = sidebarLeft ? rect.right + 8 : rect.left - 420;
                    setInitialPos({ x: Math.max(8, x), y: Math.max(8, rect.top) });
                  }
                  setPanel(v => (v === "variables" ? null : "variables"));
                }}
                aria-label="Insert variable"
              >
                <TbBraces className="size-3.5" />
              </button>
              <button
                ref={expressionBtnRef}
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  const rect = expressionBtnRef.current?.getBoundingClientRect();
                  if (rect) {
                    const x = sidebarLeft ? rect.right + 8 : rect.left - 420;
                    setInitialPos({ x: Math.max(8, x), y: Math.max(8, rect.top) });
                  }
                  setPanel(v => (v === "expressions" ? null : "expressions"));
                }}
                aria-label="Insert expression"
              >
                <TbCode className="size-3.5" />
              </button>
            </div>
          }
        >
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="input-plain h-full min-w-0 flex-1 px-2!"
          />
        </Chip>

        {panel === "variables" ? (
          <FloatingPanel
            isOpen
            onClose={() => setPanel(null)}
            title="Variables"
            storageKey="variable-text-input-vars"
            minWidth={360}
            maxWidth={520}
            minHeight={280}
            initialPosition={initialPos}
            zIndex={OVERLAY_Z_FLOATING_PANEL}
          >
            <div className="flex flex-col gap-2 p-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search variables..."
                size="slim"
                clearTooltip="Clear variable search"
              />
              {intent === "image-src" ? (
                <div className="flex items-center justify-between px-1">
                  <span className="text-neutral-content text-[10px] uppercase">
                    Image-relevant fields
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => setShowAllVariables(v => !v)}
                  >
                    {showAllVariables ? "Show image fields" : "Show all variables"}
                  </button>
                </div>
              ) : null}
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {grouped.map(([group, vars]) => (
                  <div key={group}>
                    <div className="text-neutral-content px-2 pb-1 text-[10px] font-semibold uppercase">
                      {group}
                    </div>
                    <div className="space-y-1">
                      {vars.map(v => (
                        <button
                          key={`${group}-${v.id}`}
                          type="button"
                          className="hover:bg-base-200 flex w-full items-center justify-between rounded px-2 py-1 text-left"
                          onClick={() => {
                            const el = inputRef.current;
                            if (!el) return;
                            insertAtCursor(el, value || "", `{{${v.id}}}`, onChange);
                            setPanel(null);
                          }}
                        >
                          <span className="truncate text-xs">{v.label}</span>
                          <span className="text-neutral-content ml-2 shrink-0 text-[10px]">{`{{${v.id}}}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FloatingPanel>
        ) : null}

        {panel === "expressions" ? (
          <FloatingPanel
            isOpen
            onClose={() => setPanel(null)}
            title="Expression Builder"
            storageKey="variable-text-input-expr"
            minWidth={360}
            maxWidth={560}
            minHeight={320}
            initialPosition={initialPos}
            zIndex={OVERLAY_Z_FLOATING_PANEL}
          >
            <div className="flex flex-col gap-2 p-3">
              <div>
                <label className="toolbar-label mb-1 block">Mode</label>
                <ToolbarDropdown
                  value={exprMode}
                  onChange={(v: string) => setExprMode(v as ExpressionMode)}
                  placeholder="Select mode"
                  chevron
                >
                  <option value="variable">Variable</option>
                  <option value="fallback">Variable + Fallback</option>
                  <option value="ifelse">If / else</option>
                  <option value="equals">Equals check</option>
                  <option value="not-equals">Not equals check</option>
                </ToolbarDropdown>
              </div>

              <div>
                <label className="toolbar-label mb-1 block">Variable</label>
                <ToolbarDropdown
                  value={exprVar}
                  onChange={(v: string) => setExprVar(v)}
                  placeholder="Select variable"
                  chevron
                >
                  {flatOptions.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.group ? `${o.group}: ` : ""}
                      {o.label}
                    </option>
                  ))}
                </ToolbarDropdown>
              </div>

              {exprMode === "fallback" ? (
                <div>
                  <label className="toolbar-label mb-1 block">Fallback URL/value</label>
                  <Chip>
                    <input
                      value={exprFallback}
                      onChange={e => setExprFallback(e.target.value)}
                      className="input-plain h-full min-w-0 flex-1 px-2!"
                    />
                  </Chip>
                </div>
              ) : null}

              {exprMode === "ifelse" || exprMode === "equals" || exprMode === "not-equals" ? (
                <>
                  {exprMode === "equals" || exprMode === "not-equals" ? (
                    <div>
                      <label className="toolbar-label mb-1 block">Compare to</label>
                      <div className="flex gap-1">
                        <Chip>
                          <input
                            value={exprCompare}
                            onChange={e => setExprCompare(e.target.value)}
                            className="input-plain h-full min-w-0 flex-1 px-2!"
                            placeholder="logged-in"
                          />
                        </Chip>
                        <div className="w-34">
                          <ToolbarDropdown
                            value=""
                            onChange={(v: string) => setFieldFromVariable(setExprCompare, v, true)}
                            placeholder="Pick var..."
                            chevron
                          >
                            <option value="">Pick var…</option>
                            {flatOptions.map(o => (
                              <option key={`cmp-${o.id}`} value={o.id}>
                                {o.label}
                              </option>
                            ))}
                          </ToolbarDropdown>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <label className="toolbar-label mb-1 block">True value</label>
                    <div className="flex gap-1">
                      <Chip>
                        <input
                          value={exprTrue}
                          onChange={e => setExprTrue(e.target.value)}
                          className="input-plain h-full min-w-0 flex-1 px-2!"
                        />
                      </Chip>
                      <div className="w-34">
                        <ToolbarDropdown
                          value=""
                          onChange={(v: string) => setFieldFromVariable(setExprTrue, v)}
                          placeholder="Pick var..."
                          chevron
                        >
                          <option value="">Pick var…</option>
                          {flatOptions.map(o => (
                            <option key={`tv-${o.id}`} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </ToolbarDropdown>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="toolbar-label mb-1 block">False value</label>
                    <div className="flex gap-1">
                      <Chip>
                        <input
                          value={exprFalse}
                          onChange={e => setExprFalse(e.target.value)}
                          className="input-plain h-full min-w-0 flex-1 px-2!"
                        />
                      </Chip>
                      <div className="w-34">
                        <ToolbarDropdown
                          value=""
                          onChange={(v: string) => setFieldFromVariable(setExprFalse, v)}
                          placeholder="Pick var..."
                          chevron
                        >
                          <option value="">Pick var…</option>
                          {flatOptions.map(o => (
                            <option key={`fv-${o.id}`} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </ToolbarDropdown>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              <div>
                <label className="toolbar-label mb-1 block">Preview</label>
                <Chip grow>
                  <code className="block w-full py-1 text-[11px] break-all whitespace-pre-wrap">
                    {builtExpression}
                  </code>
                </Chip>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onChange(builtExpression);
                    setPanel(null);
                  }}
                >
                  Insert Expression
                </button>
              </div>
            </div>
          </FloatingPanel>
        ) : null}
      </div>

      {dataScope ? (
        <div className="text-neutral-content text-xs">
          Data scope: <span className="text-base-content font-medium">{dataScope}</span>
        </div>
      ) : null}

      {snippets.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {snippets.map(s => (
            <button
              key={s.label}
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => onChange(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      {helpText ? <p className="text-neutral-content text-xs">{helpText}</p> : null}

      {showExpressionHelp ? (
        <details className="text-neutral-content text-xs">
          <summary className="cursor-pointer font-medium select-none">What works here</summary>
          <div className="mt-2 space-y-1">
            <div>
              Variables:
              <code className="ml-1">{`{{item.image}}`}</code>
            </div>
            <div>
              Fallback:
              <code className="ml-1">{`{{item.image || "/placeholder.jpg"}}`}</code>
            </div>
            <div>
              If / else:
              <code className="ml-1">{`{{item.image ? item.image : "/placeholder.jpg"}}`}</code>
            </div>
            <div>
              Equality check:
              <code className="ml-1">{`{{auth.status == logged-in ? item.image : "/placeholder.jpg"}}`}</code>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
