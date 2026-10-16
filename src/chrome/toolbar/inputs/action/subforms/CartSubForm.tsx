import { Chip } from "@/chrome/primitives/Chip";
import type { CartCheckoutAction } from "@/utils/action";
import { STATE_KEY_EXAMPLE } from "@/utils/state/keys";
import { LinkInput } from "../LinkInput";

/** Where Stripe sends the buyer afterwards. Empty = back to the page they were on. */
export function CartCheckoutForm({
  action,
  patch,
}: {
  action: CartCheckoutAction;
  patch: (p: Partial<CartCheckoutAction>) => void;
}) {
  const field = (key: "successHref" | "cancelHref", label: string) => (
    <div className="flex flex-col gap-1">
      <span className="text-neutral-content px-1 text-xs">{label}</span>
      <LinkInput
        action={{ type: "link", href: action[key] ?? "" }}
        onChange={next => patch({ [key]: next.href || undefined })}
        placeholder="This page"
        showTarget={false}
      />
    </div>
  );
  return (
    <>
      <p className="text-neutral-content text-[10px] leading-snug">
        Sends the cart to Stripe Checkout. Leave a page empty to bring the buyer back to the page
        they were on.
      </p>
      {field("successHref", "After paying, go to")}
      {field("cancelHref", "If they cancel, go to")}
    </>
  );
}

export function AddToCartForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <p className="text-neutral-content text-[10px] leading-snug">
        Adds the current product to the shopping cart. Must be inside a data-bound Container.
      </p>
      <Chip>
        <label className="text-neutral-content shrink-0 px-1 text-xs">Quantity</label>
        <input
          type="number"
          min={1}
          max={99}
          value={action.quantity || 1}
          onChange={e => patch({ quantity: parseInt(e.target.value) || 1 })}
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
        />
      </Chip>
      <Chip>
        <label className="text-neutral-content shrink-0 px-1 text-xs">Qty field</label>
        <input
          type="text"
          defaultValue={action.quantityField || ""}
          onChange={e => patch({ quantityField: e.target.value || undefined })}
          placeholder="input name (overrides static)"
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
        />
      </Chip>
      <Chip>
        <label className="text-neutral-content shrink-0 px-1 text-xs">Variant state</label>
        <input
          type="text"
          defaultValue={action.variantMatchStateKey || ""}
          onChange={e => patch({ variantMatchStateKey: e.target.value || undefined })}
          placeholder={STATE_KEY_EXAMPLE.pdpCurrentMatchingVariant}
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
        />
      </Chip>
    </>
  );
}
