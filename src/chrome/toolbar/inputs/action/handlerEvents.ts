/**
 * Event registry for `props.handlers` — keyed by React event name.
 * Single source of truth for the picker (HandlersAddPicker), per-handler
 * editor panel (event dropdown), and chip rendering (icon + label).
 */
import {
  TbCode,
  TbCursorText,
  TbHandClick,
  TbKeyboard,
  TbMouse,
  TbPointer,
  TbSend,
} from "react-icons/tb";

export interface HandlerEventDef {
  value: string;
  label: string;
}

export const HANDLER_EVENT_OPTIONS: HandlerEventDef[] = [
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

export const HANDLER_EVENT_LABEL: Record<string, string> = Object.fromEntries(
  HANDLER_EVENT_OPTIONS.map(o => [o.value, o.label])
);

const EVENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  onClick: TbHandClick,
  onDoubleClick: TbHandClick,
  onMouseEnter: TbMouse,
  onMouseLeave: TbMouse,
  onMouseDown: TbPointer,
  onMouseUp: TbPointer,
  onFocus: TbCursorText,
  onBlur: TbCursorText,
  onKeyDown: TbKeyboard,
  onKeyUp: TbKeyboard,
  onSubmit: TbSend,
  onChange: TbCursorText,
  onInput: TbCursorText,
};

export function getHandlerIcon(event: string): React.ComponentType<{ className?: string }> {
  return EVENT_ICON[event] || TbCode;
}
