/**
 * The visibility keys a Form toggles on submit (`form:<id>:fields` / `:loading`
 * / `:loaded`). `<id>` is the Form's `stateKey` prop when set, else its node id.
 *
 * Node ids change whenever a block is applied, so a block that ships its own
 * sending / sent states names the form with `stateKey` and points those
 * Containers' `visibilityStateKey` at `form:<stateKey>:*`. Two forms sharing a
 * `stateKey` on one page share their states.
 *
 * The static runtime (`render/static/runtime/chunks/forms.ts`) mirrors this
 * through the `data-ph-form-state` attribute.
 */
export function formStateKeys(stateKey: unknown, nodeId: string) {
  const id = (typeof stateKey === "string" && stateKey.trim()) || nodeId;
  if (!id) return { fields: "", loading: "", loaded: "" };
  return {
    fields: `form:${id}:fields`,
    loading: `form:${id}:loading`,
    loaded: `form:${id}:loaded`,
  };
}
