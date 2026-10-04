/**
 * ContainerStateBody — chip-list UI for Container-only state-registry props:
 *   - `visibilityStateKey`       : single chip, click → popover with key input
 *   - `computedStateBindings`    : chip per binding, click → popover with full editor
 *   - `inViewState`              : single chip, click → popover with key + value
 *
 * Rendered inside the Interactions → State accordion via the
 * `containerStateWiring` property def (see registry/properties/advanced.ts).
 * Mirrors the StateBindings chip+popover pattern so all three state-registry
 * verbs (read visibility / write computed / react with modifiers) feel uniform.
 *
 * The two chip implementations live in their own files
 * (`inputs/state/VisibilityKeyChip.tsx`, `inputs/state/ComputedBindingChip.tsx`)
 * — this file is just the composition root that wires them to the Container's
 * props.
 */
import { useNode } from "@craftjs/core";
import { ComputedBindingChipRow } from "../../inputs/state/ComputedBindingChip";
import { VisibilityKeyChip } from "../../inputs/state/VisibilityKeyChip";
import { InViewStateChip } from "../../inputs/state/InViewStateChip";
import type { InViewStateConfig } from "../../../../utils/state/inViewTracker";
import type { ComputedStateBinding } from "../../../../utils/conditions/computedState";

export const ContainerStateBody = () => {
  const {
    actions: { setProp },
    visibilityStateKey,
    computedStateBindings,
    inViewState,
  } = useNode(node => ({
    visibilityStateKey: node.data?.props?.visibilityStateKey as string | undefined,
    computedStateBindings: node.data?.props?.computedStateBindings as
      | ComputedStateBinding[]
      | undefined,
    inViewState: node.data?.props?.inViewState as InViewStateConfig | undefined,
  }));

  const bindings: ComputedStateBinding[] = computedStateBindings ?? [];
  const hasVisibilityKey = typeof visibilityStateKey === "string";

  const setVisibilityKey = (next: string) => {
    setProp((p: any) => {
      p.visibilityStateKey = next;
    });
  };
  const clearVisibilityKey = () => {
    setProp((p: any) => {
      delete p.visibilityStateKey;
    });
  };

  const hasInView = !!inViewState && typeof inViewState === "object";
  const setInView = (next: InViewStateConfig) => {
    setProp((p: any) => {
      p.inViewState = next;
    });
  };
  const clearInView = () => {
    setProp((p: any) => {
      delete p.inViewState;
    });
  };

  const updateBinding = (index: number, updated: ComputedStateBinding) => {
    setProp((p: any) => {
      if (!p.computedStateBindings) return;
      p.computedStateBindings[index] = updated;
    });
  };
  const removeBinding = (index: number) => {
    setProp((p: any) => {
      if (!p.computedStateBindings) return;
      p.computedStateBindings.splice(index, 1);
      if (p.computedStateBindings.length === 0) delete p.computedStateBindings;
    });
  };

  if (!hasVisibilityKey && bindings.length === 0 && !hasInView) return null;

  return (
    <div className="flex flex-col gap-1">
      {hasVisibilityKey && (
        <VisibilityKeyChip
          value={visibilityStateKey ?? ""}
          onChange={setVisibilityKey}
          onClear={clearVisibilityKey}
        />
      )}
      {hasInView && (
        <InViewStateChip value={inViewState!} onChange={setInView} onClear={clearInView} />
      )}
      {bindings.map((b, i) => (
        <ComputedBindingChipRow
          key={i}
          binding={b}
          onChange={next => updateBinding(i, next)}
          onRemove={() => removeBinding(i)}
        />
      ))}
    </div>
  );
};
