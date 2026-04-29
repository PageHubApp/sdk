import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Children, isValidElement, useMemo } from "react";
import { ToolbarRowFrame } from "@/chrome/primitives/ToolbarRowFrame";
import { formatTailwindDisplayLabel } from "@/utils/tailwind/displayLabel";
import { OVERLAY_Z_TOOLBAR_DROPDOWN } from "@/chrome/overlays/overlayZIndex";

const EMPTY = "__ph_empty__";
const toInternal = (v: string) => (v === "" ? EMPTY : v);
const fromInternal = (v: string) => (v === EMPTY ? "" : v);

const extractText = (node: any): string => {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  return "";
};

type OptionItem =
  | { kind: "item"; value: string; label: string }
  | { kind: "group"; label: string };

const useOptions = (children: any, valueLabels: string[], propKey?: string): OptionItem[] =>
  useMemo(() => {
    if (children) {
      const items: OptionItem[] = [];
      const parseChild = (child: any) => {
        if (!isValidElement(child)) return;
        const props = child.props as any;
        if ((child.type as any) === "optgroup") {
          if (props.label) items.push({ kind: "group", label: props.label });
          Children.forEach(props.children, parseChild);
          return;
        }
        const label = extractText(props.children);
        const raw = props.value !== undefined ? String(props.value) : label;
        const isNone = toInternal(raw) === EMPTY;
        items.push({
          kind: "item",
          value: toInternal(raw),
          label: isNone ? "None" : label || raw,
        });
      };
      Children.forEach(children, parseChild);
      return items;
    }
    return [
      { kind: "item", value: EMPTY, label: " " },
      ...valueLabels.map(
        v =>
          ({
            kind: "item",
            value: toInternal(v),
            label: formatTailwindDisplayLabel(v, propKey),
          }) as OptionItem
      ),
    ];
  }, [children, valueLabels, propKey]);

const ChevronDown = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ToolbarDropdown = ({
  title,
  value,
  onChange,
  children,
  placeholder,
  valueLabels = [],
  wrap = null,
  append,
  propKey,
  tooltipId,
  tooltipContent,
  tooltipPlace = "bottom",
  tooltipOffset = 10,
  chevron = false,
}: any) => {
  const options = useOptions(children, valueLabels, propKey);
  const internalValue = toInternal(String(value ?? ""));
  const selectedLabel =
    internalValue === EMPTY
      ? null
      : options.find(o => o.kind === "item" && o.value === internalValue)?.label;

  const handleChange = (val: string) => onChange(fromInternal(val));

  const handleButtonClick = () => {
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl?.contentEditable === "true") activeEl.blur();
  };

  const trigger = (
    <ListboxButton
      id={propKey ? `input-${propKey}` : undefined}
      className="aria-expanded:bg-base-300/15 flex h-full min-w-0 flex-1 items-center px-1 text-left text-xs outline-none focus:outline-none focus-visible:outline-none"
      aria-label={title || (typeof placeholder === "string" ? placeholder : "Select option")}
      onClick={handleButtonClick}
      data-tooltip-id={tooltipId}
      data-tooltip-content={tooltipContent}
      data-tooltip-place={tooltipPlace}
      data-tooltip-offset={tooltipOffset}
    >
      <span className="truncate">{selectedLabel ?? placeholder ?? ""}</span>
    </ListboxButton>
  );

  const trailing =
    append || chevron ? (
      <>
        {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        {chevron && (
          <span className="text-neutral-content flex size-5 shrink-0 items-center justify-center">
            <ChevronDown />
          </span>
        )}
      </>
    ) : null;

  return (
    <Listbox value={internalValue} onChange={handleChange}>
      {title && (
        <div className="mb-2 block">
          <label>{title}</label>
        </div>
      )}

      {wrap === "control" ? (
        <div className="flex w-full items-center gap-1.5">
          {trigger}
          {trailing}
        </div>
      ) : (
        <ToolbarRowFrame trailing={trailing}>{trigger}</ToolbarRowFrame>
      )}

      <ListboxOptions
        anchor="bottom start"
        transition
        className="pagehub-sdk-root ph-select-content"
        modal={false}
        portal
        style={{ zIndex: OVERLAY_Z_TOOLBAR_DROPDOWN }}
      >
        <div className="scrollbar max-h-72 overflow-y-auto">
        {options.map((opt, i) => {
          if (opt.kind === "group") {
            const prev = options[i - 1];
            const isFirst = !prev;
            return (
              <div
                key={`group-${opt.label}-${i}`}
                className={`ph-select-group text-base-content px-2 pb-1.5 font-bold ${
                  isFirst ? "pt-1" : "pt-2"
                }`}
              >
                {opt.label}
              </div>
            );
          }
          return (
            <ListboxOption
              key={opt.value}
              value={opt.value}
              className="ph-select-item data-selected:bg-primary data-selected:text-primary-content"
            >
              {opt.value === EMPTY ? (
                <span className="text-neutral-content">None</span>
              ) : (
                opt.label
              )}
            </ListboxOption>
          );
        })}
        </div>
      </ListboxOptions>
    </Listbox>
  );
};
