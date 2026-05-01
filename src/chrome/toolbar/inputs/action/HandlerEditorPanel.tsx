/**
 * HandlerEditorPanel — single-handler editor in a draggable FloatingPanel.
 *
 * One panel per handler chip. Owns the event dropdown (lets the user retarget
 * the handler at a different event without losing the JS code) + a CodeMirror
 * JS editor. Adding more handlers happens at the chip-list level via the
 * `+ Add Handler` picker, so this panel intentionally does NOT include any
 * "add another" UI.
 *
 * Mirrors `ActionEditorPanel.tsx` shape — see editor-popover-pattern.md §8.
 */
import { TbX } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { CodeEditor } from "../typography/CodeEditor";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";
import { HANDLER_EVENT_LABEL, HANDLER_EVENT_OPTIONS } from "./handlerEvents";

interface Props {
  event: string;
  code: string;
  /** Other events already in use on this node — filtered out of the dropdown. */
  takenEvents: string[];
  onChange: (next: { event: string; code: string }) => void;
  onRemove: () => void;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function HandlerEditorPanel({
  event,
  code,
  takenEvents,
  onChange,
  onRemove,
  initialPosition,
  onClose,
}: Props) {
  const taken = new Set(takenEvents);
  const eventOptions = HANDLER_EVENT_OPTIONS.filter(
    opt => opt.value === event || !taken.has(opt.value)
  );

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title={`Handler: ${HANDLER_EVENT_LABEL[event] ?? event}`}
      storageKey="handler-input"
      minWidth={320}
      maxWidth={560}
      minHeight={260}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <ToolbarDropdown
              value={event}
              onChange={(val: string) => onChange({ event: val, code })}
              propKey="handlerEvent"
            >
              {eventOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </ToolbarDropdown>
          </div>
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="text-neutral-content hover:bg-error hover:text-error-content flex shrink-0 items-center justify-center rounded p-1 text-xs transition-colors"
            aria-label="Remove handler"
          >
            <TbX />
          </button>
        </div>

        <p className="text-neutral-content text-[10px] leading-snug">
          Runs after the action. <code className="text-[9px]">event</code> is in scope.
        </p>

        <CodeEditor
          value={code}
          onChange={next => onChange({ event, code: next })}
          language="javascript"
          minHeight="120px"
          maxHeight="320px"
          height="160px"
          lineNumbers={false}
          toolbarDenseCode
          placeholder="event.stopPropagation();"
        />
      </div>
    </FloatingPanel>
  );
}
