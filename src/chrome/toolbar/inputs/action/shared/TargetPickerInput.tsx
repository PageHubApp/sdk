import { TbChevronDown } from "react-icons/tb";
import { Chip } from "@/chrome/primitives/Chip";
import {
  SearchableMenuPopover,
  type SearchableMenuItem,
} from "@/chrome/primitives/SearchableMenuPopover";
import { useElementPicker, type PickerFilter } from "../useElementPicker";

/**
 * Show-hide / open-modal target picker.
 *
 * Free-text input is the source of truth — users can always type / paste a
 * target id, even when the page hasn't loaded the candidate list yet, when
 * the target lives on another page, or when no canvas node is enumerable.
 * The trailing chevron opens a `SearchableMenuPopover` of discovered targets
 * (any node with `attrs.id`, `props.id`, or — for overlay components — a
 * `props.anchor`). Selecting an item writes its id into the input.
 */
export function TargetPickerInput({
  value,
  filter,
  label,
  onChange,
}: {
  value: string;
  filter: PickerFilter;
  label: string;
  onChange: (next: string) => void;
}) {
  const options = useElementPicker(filter);
  const items: SearchableMenuItem<string>[] = options.map(opt => ({
    id: opt.anchor,
    label: opt.label,
    hint: opt.anchor,
    keywords: [opt.anchor, opt.componentType],
    data: opt.anchor,
  }));
  const lower = label.toLowerCase();
  return (
    <Chip
      trailing={
        <SearchableMenuPopover<string>
          items={items}
          onSelect={item => onChange(item.data ?? item.id)}
          trigger={<TbChevronDown className="size-3.5" aria-hidden />}
          triggerAriaLabel={`Pick ${lower} from page`}
          triggerClassName="text-neutral-content hover:text-base-content hover:bg-base-200 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors"
          searchPlaceholder={`Search ${lower}…`}
          emptyMessage={`No ${lower}s on this page yet`}
          anchor="bottom end"
        />
      }
    >
      <input
        type="text"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={`${label} id…`}
        className="h-full w-full bg-transparent px-1 text-xs outline-none"
        aria-label={label}
      />
    </Chip>
  );
}
