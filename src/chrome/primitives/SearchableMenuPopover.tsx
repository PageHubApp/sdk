/**
 * SearchableMenuPopover — anchored popover with search-filtered list.
 *
 * Composition: <AnchoredPopover> owns positioning + outside-click + escape +
 * fade animation; Headless UI <Combobox> owns search input, filtering, and
 * keyboard nav.
 *
 * Use this for any "click trigger → search → pick one" UX. Don't reach for
 * a hand-rolled `absolute + outside-click` popover.
 */
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TbCheck, TbSearch } from "react-icons/tb";
import { AnchoredPopover } from "../overlays/AnchoredPopover";
import { PAGEHUB_RTT_GLOBAL_ID } from "./layout/tooltipSurface";

export type SearchableMenuItem<TData = unknown> = {
  id: string;
  label: string;
  /** Right-aligned secondary text (e.g. group/category). */
  hint?: string;
  /** Tooltip / native title attribute. */
  help?: string;
  /** Extra keywords for filtering beyond label/id. */
  keywords?: string[];
  /** Caller payload — passed through to onSelect. */
  data?: TData;
};

export interface SearchableMenuPopoverHandle {
  open: () => void;
  close: () => void;
}

type Anchor = "bottom start" | "bottom end" | "top start" | "top end";

const ANCHOR_TO_PLACEMENT: Record<
  Anchor,
  "bottom-start" | "bottom-end" | "top-start" | "top-end"
> = {
  "bottom start": "bottom-start",
  "bottom end": "bottom-end",
  "top start": "top-start",
  "top end": "top-end",
};

interface Props<TData> {
  /** Trigger content — sits inside the trigger button. */
  trigger: ReactNode;
  /** className applied to the trigger button. */
  triggerClassName?: string;
  /** aria-label for the trigger button. */
  triggerAriaLabel?: string;
  /** Fired on trigger click — runs alongside the open toggle. */
  onTriggerClick?: () => void;
  items: SearchableMenuItem<TData>[];
  onSelect: (item: SearchableMenuItem<TData>) => void;
  searchPlaceholder?: string;
  /** Shown when items array is empty (nothing to add at all). */
  emptyMessage?: string;
  /** Shown when items exist but search filtered them all out. */
  noResultsMessage?: (query: string) => string;
  /** Floating-UI anchor for the panel. Default `bottom end` (right-aligned). */
  anchor?: Anchor;
  /** Tailwind width class for the panel. Default `w-64`. */
  panelWidthClass?: string;
  /** Custom filter — defaults to substring match on label/id/keywords. */
  filterFn?: (item: SearchableMenuItem<TData>, query: string) => boolean;
  /** Optional renderer per item. Default = label + hint pill. */
  renderItem?: (item: SearchableMenuItem<TData>) => ReactNode;
  /**
   * Multi-select mode — checkbox column on the left + Apply button at the
   * bottom. Picking a row toggles its selection instead of closing the menu.
   * Apply fires `onSelectMany` with the chosen items in click order.
   */
  multiSelect?: boolean;
  /** Required when `multiSelect` is true. Receives all picked items at apply. */
  onSelectMany?: (items: SearchableMenuItem<TData>[]) => void;
  /** Apply button label. Default `Add (N)`. */
  applyLabel?: (count: number) => string;
}

const TRIGGER_DEFAULT =
  "text-neutral-content hover:text-base-content hover:bg-base-200 flex size-4 shrink-0 items-center justify-center rounded-md opacity-70 hover:opacity-100 transition-[color,background-color,opacity]";

function defaultFilter<T>(item: SearchableMenuItem<T>, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (item.label.toLowerCase().includes(q)) return true;
  if (item.id.toLowerCase().includes(q)) return true;
  if (item.keywords?.some(k => k.toLowerCase().includes(q))) return true;
  return false;
}

function defaultRender<T>(item: SearchableMenuItem<T>): ReactNode {
  return (
    <>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.hint && (
        <span className="text-neutral-content shrink-0 text-[10px]">{item.hint}</span>
      )}
    </>
  );
}

function SearchableMenuPopoverInner<TData>(
  {
    trigger,
    triggerClassName = TRIGGER_DEFAULT,
    triggerAriaLabel,
    onTriggerClick,
    items,
    onSelect,
    searchPlaceholder = "Type to search...",
    emptyMessage = "Nothing to add",
    noResultsMessage = q => `No matches for "${q}"`,
    anchor = "bottom end",
    panelWidthClass = "w-64",
    filterFn = defaultFilter,
    renderItem = defaultRender,
    multiSelect = false,
    onSelectMany,
    applyLabel = (n: number) => `Add${n ? ` (${n})` : ""}`,
  }: Props<TData>,
  ref: React.Ref<SearchableMenuPopoverHandle>
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchableMenuItem<TData>[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    []
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelected([]);
  }, []);

  const toggleSelected = useCallback((item: SearchableMenuItem<TData>) => {
    setSelected(prev => {
      const idx = prev.findIndex(p => p.id === item.id);
      if (idx === -1) return [...prev, item];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  }, []);

  const applyMulti = useCallback(() => {
    if (selected.length && onSelectMany) onSelectMany(selected);
    close();
  }, [selected, onSelectMany, close]);

  const handleTriggerClick = useCallback(() => {
    onTriggerClick?.();
    setOpen(prev => !prev);
  }, [onTriggerClick]);

  const filtered = useMemo(
    () => items.filter(item => filterFn(item, query)),
    [items, query, filterFn]
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={triggerClassName}
        aria-label={triggerAriaLabel}
        aria-expanded={open}
        onClick={handleTriggerClick}
      >
        {trigger}
      </button>
      <AnchoredPopover
        open={open}
        onOpenChange={setOpen}
        anchor={buttonRef}
        placement={ANCHOR_TO_PLACEMENT[anchor]}
        ignoreOutsideClicks={[buttonRef]}
        className={`pagehub-sdk-root border-base-300 bg-base-100 ${panelWidthClass} overflow-hidden rounded-xl border p-1 shadow-xl`}
      >
        <Combobox<SearchableMenuItem<TData> | null>
          value={null}
          onChange={item => {
            if (!item) return;
            if (multiSelect) {
              toggleSelected(item);
              return;
            }
            onSelect(item);
            close();
          }}
        >
          <div className="border-base-300/60 mb-1 flex items-center gap-1.5 border-b px-2 py-1.5">
            <TbSearch className="text-neutral-content size-3.5 shrink-0" aria-hidden />
            <ComboboxInput
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              displayValue={() => query}
              className="text-base-content placeholder:text-neutral-content min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
          </div>
          <ComboboxOptions static as="div" className="scrollbar max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-neutral-content px-3 py-4 text-center text-xs italic">
                {items.length === 0 ? emptyMessage : noResultsMessage(query)}
              </div>
            ) : (
              filtered.map(item => {
                const isSelected =
                  multiSelect && selected.some(s => s.id === item.id);
                return (
                  <ComboboxOption
                    key={item.id}
                    value={item}
                    data-tooltip-id={item.help ? PAGEHUB_RTT_GLOBAL_ID : undefined}
                    data-tooltip-content={item.help}
                    data-tooltip-place="right"
                    className={({ focus }) =>
                      `flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors ${
                        focus ? "bg-base-200 text-base-content" : "text-base-content"
                      }`
                    }
                  >
                    {multiSelect && (
                      <span
                        aria-hidden
                        className={`flex size-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-content"
                            : "border-base-300 bg-base-100"
                        }`}
                      >
                        {isSelected && <TbCheck className="size-2.5" />}
                      </span>
                    )}
                    {renderItem(item)}
                  </ComboboxOption>
                );
              })
            )}
          </ComboboxOptions>
          {multiSelect && (
            <div className="border-base-300/60 mt-1 flex items-center justify-between gap-2 border-t px-2 py-1.5">
              <span className="text-neutral-content text-[10px]">
                {selected.length
                  ? `${selected.length} selected`
                  : "Pick one or more"}
              </span>
              <button
                type="button"
                onClick={applyMulti}
                disabled={selected.length === 0}
                className="bg-primary text-primary-content rounded-md px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {applyLabel(selected.length)}
              </button>
            </div>
          )}
        </Combobox>
      </AnchoredPopover>
    </>
  );
}

export const SearchableMenuPopover = forwardRef(SearchableMenuPopoverInner) as <TData>(
  props: Props<TData> & { ref?: React.Ref<SearchableMenuPopoverHandle> }
) => ReturnType<typeof SearchableMenuPopoverInner>;
