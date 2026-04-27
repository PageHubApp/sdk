/**
 * Custom event handlers — per-node `props.handlers: Record<string, string>`.
 * Each row binds a DOM event (onClick, onMouseEnter, ...) to a JS code string
 * evaluated at render time with `event` in scope. Runs AFTER any action handler.
 */
import { useNode } from "@craftjs/core";
import { useMemo } from "react";
import { TbTrash } from "react-icons/tb";
import { LabeledAddChip } from "@/chrome/primitives/LabeledAddChip";
import { ToolbarDashedButton } from "../../helpers/ToolbarDashedButton";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { CodeEditor } from "../typography/CodeEditor";

const EVENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "onClick", label: "On Click" },
  { value: "onDoubleClick", label: "On Double Click" },
  { value: "onMouseEnter", label: "On Mouse Enter" },
  { value: "onMouseLeave", label: "On Mouse Leave" },
  { value: "onMouseDown", label: "On Mouse Down" },
  { value: "onMouseUp", label: "On Mouse Up" },
  { value: "onFocus", label: "On Focus" },
  { value: "onBlur", label: "On Blur" },
  { value: "onKeyDown", label: "On Key Down" },
  { value: "onKeyUp", label: "On Key Up" },
  { value: "onSubmit", label: "On Submit" },
  { value: "onChange", label: "On Change" },
  { value: "onInput", label: "On Input" },
];

type Row = { event: string; code: string };

function pickNextEvent(used: string[]): string {
  const taken = new Set(used);
  return EVENT_OPTIONS.find(o => !taken.has(o.value))?.value ?? "onClick";
}

export default function HandlersInput() {
  const {
    handlers,
    actions: { setProp },
  } = useNode(node => ({
    handlers: (node.data.props.handlers || {}) as Record<string, string>,
  }));

  // Derive stable ordered rows from the object map.
  const rows: Row[] = useMemo(
    () =>
      Object.entries(handlers)
        .filter(([, v]) => typeof v === "string")
        .map(([event, code]) => ({ event, code })),
    [handlers]
  );

  const writeRows = (next: Row[]) => {
    setProp((props: any) => {
      if (next.length === 0) {
        delete props.handlers;
        return;
      }
      const map: Record<string, string> = {};
      for (const r of next) {
        if (!r.event) continue;
        map[r.event] = r.code;
      }
      props.handlers = map;
    });
  };

  const addRow = () => {
    const nextEvent = pickNextEvent(rows.map(r => r.event));
    writeRows([...rows, { event: nextEvent, code: "" }]);
  };

  const removeRow = (index: number) => {
    writeRows(rows.filter((_, i) => i !== index));
  };

  const updateEvent = (index: number, nextEvent: string) => {
    const next = rows.slice();
    next[index] = { ...next[index], event: nextEvent };
    writeRows(next);
  };

  const updateCode = (index: number, nextCode: string) => {
    const next = rows.slice();
    next[index] = { ...next[index], code: nextCode };
    writeRows(next);
  };

  const takenEvents = new Set(rows.map(r => r.event));

  // Empty state collapses to a single labeled chip — no section header, no
  // helper preamble. The header / explainer reappear only when at least one
  // handler is being edited (the explainer is the user's prompt at that point).
  if (rows.length === 0) {
    return (
      <div className="mt-2">
        <LabeledAddChip label="Handlers" ariaLabel="Add handler" onClick={addRow} />
      </div>
    );
  }

  return (
    <div className="border-base-300 mt-3 flex flex-col gap-2 border-t pt-3">
      <span className="text-neutral-content text-[10px] font-medium uppercase tracking-wide">
        Custom Handlers
      </span>
      <p className="text-neutral-content text-[10px] leading-snug">
        Runs after the action. <code className="text-[9px]">event</code> is in scope.
      </p>

      {rows.map((row, i) => (
        <div key={i} className="border-base-300 flex flex-col gap-2 rounded-md border p-2">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <ToolbarDropdown
                value={row.event}
                onChange={(val: string) => updateEvent(i, val)}
                propKey={`handler-event-${i}`}
              >
                {EVENT_OPTIONS.filter(
                  opt => opt.value === row.event || !takenEvents.has(opt.value)
                ).map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </ToolbarDropdown>
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-neutral-content hover:bg-error hover:text-error-content rounded p-1"
              aria-label="Remove handler"
            >
              <TbTrash size={12} />
            </button>
          </div>
          <CodeEditor
            value={row.code}
            onChange={next => updateCode(i, next)}
            language="javascript"
            minHeight="80px"
            maxHeight="240px"
            height="120px"
            lineNumbers={false}
            toolbarDenseCode
            placeholder="event.stopPropagation();"
          />
        </div>
      ))}

      <ToolbarDashedButton onClick={addRow}>Add Another Handler</ToolbarDashedButton>
    </div>
  );
}
