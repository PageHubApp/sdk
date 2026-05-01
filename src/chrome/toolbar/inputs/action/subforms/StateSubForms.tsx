import { ToolbarDropdown } from "../../../ToolbarDropdown";
import { StateKeyPickerInput } from "../shared/StateKeyPickerInput";

export function SetStateForm({
  action,
  patch,
  selfId,
  ensureSelfId,
}: {
  action: { key: string; kind?: string; value: string };
  patch: (p: any) => void;
  selfId?: string;
  ensureSelfId?: () => string;
}) {
  const fillFromSelf = () => {
    const id = ensureSelfId?.() ?? selfId;
    if (!id) return;
    patch({ key: id, value: id });
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Writes <code className="text-[9px]">key</code> → <code className="text-[9px]">value</code>{" "}
        to the central state registry. Pair with a State condition (visibility / className gating)
        elsewhere on the page to react.
      </p>
      {ensureSelfId && (
        <button
          type="button"
          onClick={fillFromSelf}
          className="text-primary hover:bg-base-200 self-start rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
        >
          Use this element for key + value
        </button>
      )}
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <StateKeyPickerInput
          value={action.key || ""}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
          onChange={key => patch({ key })}
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Kind</span>
        <ToolbarDropdown
          value={action.kind || "value"}
          onChange={(val: string) => patch({ kind: val })}
          propKey="setStateKind"
        >
          <option value="value">Value</option>
          <option value="visibility">Visibility</option>
          <option value="selection">Selection</option>
          <option value="flag">Flag</option>
        </ToolbarDropdown>
      </label>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Value</span>
        <input
          className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
          value={action.value || ""}
          onChange={e => patch({ value: e.target.value })}
          placeholder='"shown" / "panel-1" / "{{item.id}}"'
        />
      </label>
    </div>
  );
}

export function ToggleStateForm({
  action,
  patch,
  selfId,
  ensureSelfId,
}: {
  action: { key: string; kind?: string; values?: [string, string] };
  patch: (p: any) => void;
  selfId?: string;
  ensureSelfId?: () => string;
}) {
  const pair = Array.isArray(action.values) ? action.values : ["", ""];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Flips a state between two values on click. Defaults: visibility kind toggles{" "}
        <code className="text-[9px]">shown / hidden</code>; flag kind toggles{" "}
        <code className="text-[9px]">on / off</code>. Override with explicit values.
      </p>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <StateKeyPickerInput
          value={action.key || ""}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
          onChange={key => patch({ key })}
        />
      </label>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Kind</span>
        <ToolbarDropdown
          value={action.kind || "flag"}
          onChange={(val: string) => patch({ kind: val })}
          propKey="toggleStateKind"
        >
          <option value="flag">Flag</option>
          <option value="visibility">Visibility</option>
          <option value="value">Value</option>
        </ToolbarDropdown>
      </label>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-[10px]">
          <span className="text-neutral-content">Value A</span>
          <input
            className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
            value={pair[0]}
            onChange={e => patch({ values: [e.target.value, pair[1]] })}
            placeholder="optional"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-[10px]">
          <span className="text-neutral-content">Value B</span>
          <input
            className="bg-base-100 border-base-300 rounded-field border px-2 py-1 text-xs"
            value={pair[1]}
            onChange={e => patch({ values: [pair[0], e.target.value] })}
            placeholder="optional"
          />
        </label>
      </div>
    </div>
  );
}

export function ClearStateForm({
  action,
  patch,
  selfId,
  ensureSelfId,
}: {
  action: { key: string };
  patch: (p: any) => void;
  selfId?: string;
  ensureSelfId?: () => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-neutral-content text-[10px] leading-snug">
        Removes the state entry entirely. Useful for &quot;reset to default&quot; buttons.
      </p>
      <label className="flex flex-col gap-1 text-[10px]">
        <span className="text-neutral-content">Key</span>
        <StateKeyPickerInput
          value={action.key || ""}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
          onChange={key => patch({ key })}
        />
      </label>
    </div>
  );
}
