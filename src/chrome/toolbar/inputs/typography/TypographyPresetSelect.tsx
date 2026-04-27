import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import type { CSSProperties } from "react";
import { useCallback, useRef, useState } from "react";
import { AutoHideScrollbar } from "@/chrome/primitives/layout/AutoHideScrollbar";
import { ToolbarRowFrame } from "@/chrome/primitives/ToolbarRowFrame";

/** Same sentinel as ToolbarDropdown — not a real preset name */
const EMPTY = "__ph_empty__";

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

const Check = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Dash = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="6" y1="12" x2="18" y2="12" />
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

export type TypographyPresetRow = {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing?: string;
  textTransform?: string;
};

type Props = {
  presets: TypographyPresetRow[];
  /** Active preset name from helpers, or null when using local class-based styles */
  selectedName: string | null;
  onSelect: (preset: TypographyPresetRow | null) => void;
  placeholder?: string;
  id?: string;
};

export function TypographyPresetSelect({
  presets,
  selectedName,
  onSelect,
  placeholder = "Local styles",
  id = "typography-preset",
}: Props) {
  const internalValue =
    selectedName && presets.some(p => p.name === selectedName) ? selectedName : EMPTY;
  const triggerLabel =
    internalValue !== EMPTY
      ? (presets.find(p => p.name === internalValue)?.name ?? placeholder)
      : placeholder;

  const { sentinelRef, canUp, canDown, startScroll, stopScroll } = useScrollOverflow();

  const handleChange = (val: string) => {
    if (val === EMPTY) {
      onSelect(null);
      return;
    }
    const preset = presets.find(p => p.name === val);
    if (preset) onSelect(preset);
  };

  const handleButtonClick = () => {
    const activeEl = document.activeElement as HTMLElement;
    if (activeEl && activeEl.contentEditable === "true") {
      activeEl.blur();
    }
  };

  return (
    <Listbox value={internalValue} onChange={handleChange}>
      <ToolbarRowFrame
        trailing={
          <span
            className="text-neutral-content flex size-5 shrink-0 items-center justify-center"
            aria-hidden
          >
            <ChevronDown />
          </span>
        }
      >
        <ListboxButton
          id={id}
          className="flex h-full min-w-0 flex-1 items-center px-1 text-left text-xs focus:border-transparent focus:outline-none active:border-transparent active:outline-none"
          aria-label="Text style"
          onClick={handleButtonClick}
        >
          <span className="truncate">{triggerLabel}</span>
        </ListboxButton>
      </ToolbarRowFrame>

      <ListboxOptions
        anchor="bottom start"
        className="pagehub-sdk-root ph-select-content"
        modal={false}
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

          <span key={EMPTY}>
            <ListboxOption value={EMPTY} className="ph-select-item">
              {({ selected }) => (
                <>
                  <span className="flex w-4 shrink-0 items-center justify-center">
                    {selected ? <Dash /> : null}
                  </span>
                  <span className="text-neutral-content">Local styles</span>
                </>
              )}
            </ListboxOption>
            {presets.length > 0 ? <div className="bg-border my-1 h-px" /> : null}
          </span>

          {presets.map(font => (
            <ListboxOption
              key={font.name}
              value={font.name}
              className="ph-select-item !items-start !py-2"
            >
              {({ selected }) => (
                <>
                  <span className="flex w-4 shrink-0 items-start justify-center pt-0.5">
                    {selected ? <Check /> : null}
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <div
                      className="text-base-content truncate"
                      style={{
                        fontFamily: font.fontFamily,
                        fontSize: font.fontSize,
                        fontWeight: font.fontWeight,
                        lineHeight: font.lineHeight,
                        letterSpacing: font.letterSpacing || "normal",
                        textTransform: (font.textTransform ||
                          "none") as CSSProperties["textTransform"],
                      }}
                    >
                      {font.name}
                    </div>
                    <div className="text-neutral-content mt-0.5 truncate text-[10px]">
                      {font.fontFamily} · {font.fontSize}
                    </div>
                  </div>
                </>
              )}
            </ListboxOption>
          ))}

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
}
