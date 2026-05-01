export function SetLocalStorageForm({
  action,
  patch,
}: {
  action: { key: string; value: string };
  patch: (p: any) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Writes <code className="text-[9px]">key</code> → <code className="text-[9px]">value</code>{" "}
        to <code className="text-[9px]">window.localStorage</code> when the button is clicked. Pairs
        with a load-trigger Show / Hide action whose Local Storage condition watches the same key —
        once the key is set, the target stays hidden on subsequent visits.
      </p>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <input
          className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
          value={action.key || ""}
          onChange={e => patch({ key: e.target.value })}
          placeholder="ph-cookie-consent"
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Value</span>
        <input
          className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
          value={action.value || ""}
          onChange={e => patch({ value: e.target.value })}
          placeholder="dismissed"
        />
      </label>
    </div>
  );
}

export function RemoveLocalStorageForm({
  action,
  patch,
}: {
  action: { key: string };
  patch: (p: any) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Clears the <code className="text-[9px]">key</code> from{" "}
        <code className="text-[9px]">window.localStorage</code> — useful for &quot;show this banner
        again&quot; links.
      </p>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <input
          className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
          value={action.key || ""}
          onChange={e => patch({ key: e.target.value })}
          placeholder="ph-cookie-consent"
        />
      </label>
    </div>
  );
}
