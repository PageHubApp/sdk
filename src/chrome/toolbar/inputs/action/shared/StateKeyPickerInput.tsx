import { TbChevronDown } from "react-icons/tb";
import { Chip } from "@/chrome/primitives/Chip";
import {
  SearchableMenuPopover,
  type SearchableMenuItem,
} from "@/chrome/primitives/SearchableMenuPopover";
import { useElementPicker } from "../useElementPicker";

/**
 * State-key picker — same pattern as `TargetPickerInput` but the popover lists
 * a "self" entry (this node's anchor id) on top of every discoverable element
 * id on the page. Free-form input remains the source of truth so authors can
 * type a named state (`tabs-1`, `cart-open`) without picking from the list.
 */
export function StateKeyPickerInput({
  value,
  selfId,
  ensureSelfId,
  onChange,
}: {
  value: string;
  selfId?: string;
  ensureSelfId?: () => string;
  onChange: (next: string) => void;
}) {
  const options = useElementPicker("all");
  const SELF_SENTINEL = "__ph_self__";
  const items: SearchableMenuItem<string>[] = [];
  if (ensureSelfId || selfId) {
    items.push({
      id: SELF_SENTINEL,
      label: "This element (self)",
      hint: selfId || "stamps an id when picked",
      keywords: ["self", "this", selfId || ""],
      data: SELF_SENTINEL,
    });
  }
  for (const opt of options) {
    if (selfId && opt.anchor === selfId) continue;
    items.push({
      id: opt.anchor,
      label: opt.label,
      hint: opt.anchor,
      keywords: [opt.anchor, opt.componentType],
      data: opt.anchor,
    });
  }
  return (
    <Chip
      trailing={
        <SearchableMenuPopover<string>
          items={items}
          onSelect={item => {
            const data = item.data ?? item.id;
            if (data === SELF_SENTINEL) {
              const id = ensureSelfId?.() ?? selfId;
              if (id) onChange(id);
              return;
            }
            onChange(data);
          }}
          trigger={<TbChevronDown className="size-3.5" aria-hidden />}
          triggerAriaLabel="Pick state key from page"
          triggerClassName="text-neutral-content hover:text-base-content hover:bg-base-200 flex size-5 shrink-0 items-center justify-center rounded-md transition-colors"
          searchPlaceholder="Search elements…"
          emptyMessage="No element ids on this page yet"
          anchor="bottom end"
        />
      }
    >
      <input
        type="text"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder="Element id or named state…"
        className="h-full w-full bg-transparent px-1 text-xs outline-none"
        aria-label="State key"
      />
    </Chip>
  );
}
