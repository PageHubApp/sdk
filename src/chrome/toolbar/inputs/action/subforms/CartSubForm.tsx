import { Chip } from "@/chrome/primitives/Chip";

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
          placeholder="pdp:current:matching-variant"
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
        />
      </Chip>
    </>
  );
}
