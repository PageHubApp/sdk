import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Children, isValidElement, useCallback, useMemo, useRef, useState } from "react";
import { AutoHideScrollbar } from "@/chrome/primitives/layout/AutoHideScrollbar";
import { ToolbarRowFrame } from "@/chrome/primitives/ToolbarRowFrame";
import { formatTailwindDisplayLabel } from "@/utils/tailwind/displayLabel";

const Label = ({ value }) => <label>{value}</label>;

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
  | { value: string; label: string; group?: undefined }
  | { group: string; value?: undefined; label?: undefined };

const useOptions = (children: any, valueLabels: string[], propKey?: string): OptionItem[] =>
  useMemo(() => {
    if (children) {
      const items: OptionItem[] = [];
      const parseChild = (child: any) => {
        if (!isValidElement(child)) return;
        const props = child.props as any;
        // Handle <optgroup> by inserting a group label then recursing into its children
        if ((child.type as any) === "optgroup") {
          if (props.label) items.push({ group: props.label });
          Children.forEach(props.children, parseChild);
          return;
        }
        const label = extractText(props.children);
        const raw = props.value !== undefined ? String(props.value) : label;
        const isNone = toInternal(raw) === EMPTY;
        items.push({ value: toInternal(raw), label: isNone ? "None" : label || raw });
      };
      Children.forEach(children, parseChild);
      return items;
    }
    return [
      { value: EMPTY, label: " " },
      ...valueLabels.map(v => ({
        value: toInternal(v),
        label: formatTailwindDisplayLabel(v, propKey),
      })),
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
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ScrollChevron = ({ direction }: { direction: "up" | "down" }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={direction === "up" ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
  </svg>
);

const useScrollOverflow = () => {
  const containerRef = useRef<HTMLElement | null>(null);
  const [canUp, setCanUp] = useState(false);
  const [canDown, setCanDown] = useState(false);
  const armed = useRef(false);
  const raf = useRef(0);

  const update = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanUp(scrollTop > 2);
    setCanDown(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const el = node.closest<HTMLElement>("[data-custom-scroll]");
      if (!el || containerRef.current === el) return;
      containerRef.current = el;
      armed.current = false;
      setTimeout(() => {
        armed.current = true;
      }, 200);
      update();
      el.addEventListener("scroll", update, { passive: true });
      const ro = new ResizeObserver(update);
      ro.observe(el);
    },
    [update]
  );

  const startScroll = useCallback((dir: number) => {
    if (!armed.current) return;
    const step = () => {
      if (!containerRef.current) return;
      containerRef.current.scrollTop += dir * 4;
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);
  const stopScroll = useCallback(() => cancelAnimationFrame(raf.current), []);

  return { sentinelRef, canUp, canDown, startScroll, stopScroll };
};

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
    internalValue === EMPTY ? null : options.find(o => o.value === internalValue)?.label;
  const { sentinelRef, canUp, canDown, startScroll, stopScroll } = useScrollOverflow();

  const handleChange = (val: string) => {
    onChange(fromInternal(val));
  };

  const handleButtonClick = () => {
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl && activeEl.contentEditable === "true") {
      activeEl.blur();
    }
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

  const chevronSlot = chevron ? (
    <span
      className="text-neutral-content flex size-5 shrink-0 items-center justify-center"
      aria-hidden
    >
      <ChevronDown />
    </span>
  ) : null;

  const trailing =
    append || chevronSlot ? (
      <>
        {append && <div className="flex shrink-0 items-center gap-0.5">{append}</div>}
        {chevronSlot}
      </>
    ) : null;

  return (
    <Listbox value={internalValue} onChange={handleChange}>
      {title && (
        <div className="mb-2 block">
          <Label value={title} />
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
        style={{ zIndex: 12000 }}
      >
        <AutoHideScrollbar className="ph-select-scroll-area" hideDelay={600}>
          <div ref={sentinelRef} />
          <div
            className={`ph-select-scroll-indicator top ${canUp ? "active" : ""}`}
            onPointerEnter={() => startScroll(-1)}
            onPointerLeave={stopScroll}
          >
            <ScrollChevron direction="up" />
          </div>
          {options.map((opt, i) => {
            if ("group" in opt && opt.group) {
              const prev = options[i - 1];
              const showDivider = prev && !("group" in prev && prev.group);
              return (
                <div key={`group-${opt.group}`}>
                  {showDivider && <div className="bg-border mx-1.5 my-1 h-px" />}
                  <div className="text-base-content/55 px-2 pt-1 pb-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase">
                    {opt.group}
                  </div>
                </div>
              );
            }
            const isNone = opt.value === EMPTY;
            const nextIsReal = isNone && options[i + 1]?.value !== EMPTY;
            return (
              <span key={opt.value}>
                <ListboxOption
                  value={opt.value}
                  className="ph-select-item data-selected:bg-primary/10 data-selected:text-primary"
                >
                  {isNone ? <span className="text-neutral-content">None</span> : opt.label}
                </ListboxOption>
                {nextIsReal && <div className="bg-border my-1 h-px" />}
              </span>
            );
          })}
          <div
            className={`ph-select-scroll-indicator bottom ${canDown ? "active" : ""}`}
            onPointerEnter={() => startScroll(1)}
            onPointerLeave={stopScroll}
          >
            <ScrollChevron direction="down" />
          </div>
        </AutoHideScrollbar>
      </ListboxOptions>
    </Listbox>
  );
};
