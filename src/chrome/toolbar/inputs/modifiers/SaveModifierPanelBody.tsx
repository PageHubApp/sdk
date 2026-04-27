/**
 * SaveModifierPanelBody — full-featured "save current styles as a modifier"
 * editor. Lives in its own FloatingPanel (lazy via SaveModifierPanel) so the
 * inline footer button stays light and the form has room to breathe.
 *
 * The user sees every className token on the current node as a removable
 * chip. Pruning a chip excludes it from what gets saved (does NOT touch the
 * actual node className — this is a "save a curated subset" flow). Name +
 * component type inputs sit above; a Save button at the bottom commits via
 * `useModifiers().saveAsModifier(label, type, customClasses)`.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { TbX } from "react-icons/tb";
import { ToolbarRowFrame } from "@/chrome/primitives/ToolbarRowFrame";
import { useModifiers } from "./useModifiers";

interface Props {
  onClose: () => void;
}

function uniqueTokens(className: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of className.split(/\s+/)) {
    const tok = t.trim();
    if (!tok || seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
  }
  return out;
}

export function SaveModifierPanelBody({ onClose }: Props) {
  const { currentClassName, nodeTypeName, saveAsModifier } = useModifiers();

  const allTokens = useMemo(() => uniqueTokens(currentClassName), [currentClassName]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [label, setLabel] = useState("");
  const [targetType, setTargetType] = useState(nodeTypeName);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Reset target type if the selected node changes underneath us.
  useEffect(() => setTargetType(nodeTypeName), [nodeTypeName]);

  // Focus the name input on open — it's the field most likely to be edited.
  useEffect(() => {
    labelInputRef.current?.focus();
  }, []);

  const includedTokens = allTokens.filter(t => !excluded.has(t));
  const includedClasses = includedTokens.join(" ");
  const canSave = !!label.trim() && !!targetType.trim() && includedTokens.length > 0;

  const toggleToken = (token: string) => {
    setExcluded(prev => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  };

  const submit = () => {
    if (!canSave) return;
    saveAsModifier(label, targetType, includedClasses);
    onClose();
  };

  if (allTokens.length === 0) {
    return (
      <div className="text-neutral-content py-6 text-center text-xs">
        This node has no classes to save.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <label className="text-neutral-content px-0.5 text-[10px] font-medium">
          Modifier name
        </label>
        <ToolbarRowFrame>
          <input
            ref={labelInputRef}
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. my-card-style"
            onKeyDown={e => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onClose();
            }}
            className="h-full w-full bg-transparent px-1 text-xs outline-none"
          />
        </ToolbarRowFrame>
      </div>

      <div className="flex flex-col gap-0.5">
        <label className="text-neutral-content px-0.5 text-[10px] font-medium">
          Component type
        </label>
        <ToolbarRowFrame>
          <input
            type="text"
            value={targetType}
            onChange={e => setTargetType(e.target.value)}
            placeholder="e.g. Button, Container"
            className="h-full w-full bg-transparent px-1 text-xs outline-none"
          />
        </ToolbarRowFrame>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between px-0.5">
          <span className="text-neutral-content text-[10px] font-medium">
            Classes to include
          </span>
          <span className="text-neutral-content/70 text-[10px]">
            {includedTokens.length} / {allTokens.length}
          </span>
        </div>
        <div className="border-base-300 bg-base-100 min-h-0 flex-1 overflow-y-auto rounded-md border p-1.5">
          <div className="flex flex-wrap gap-1">
            {allTokens.map(token => {
              const isExcluded = excluded.has(token);
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => toggleToken(token)}
                  className={
                    isExcluded
                      ? "border-base-300 text-neutral-content/50 line-through inline-flex items-center gap-1 rounded border bg-transparent px-1.5 py-0.5 font-mono text-[10px]"
                      : "border-primary/40 bg-primary/10 text-primary inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]"
                  }
                  aria-pressed={!isExcluded}
                  aria-label={isExcluded ? `Include ${token}` : `Exclude ${token}`}
                >
                  <span>{token}</span>
                  {!isExcluded && <TbX size={10} aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className="bg-primary text-primary-content disabled:bg-neutral disabled:text-neutral-content/60 h-7 flex-1 rounded-md px-3 text-xs font-medium"
        >
          Save modifier
        </button>
        <button
          type="button"
          onClick={onClose}
          className="border-base-300 hover:bg-base-200 h-7 rounded-md border px-3 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
