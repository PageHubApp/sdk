/**
 * Canonical commands operating on a single property's breakpoint cascade.
 * Used by both ChipContextMenu and the popover's per-cell kebab.
 *
 * All writes go through `changeProp` from `viewportExports` so behavior
 * matches Label.tsx's existing handleRemove and toolbar inputs.
 */
import { changeProp, getPropFinalValue, setPropOnView } from "../../viewport/viewportExports";
import { CHIP_BP_ORDER, type ChipBp } from "./atoms";
import { BP_KEYS, type BpKey } from "../../../utils/breakpointRewrite";

export type CommandCtx = {
  nodeId: string;
  propKey: string;
  propType: string;
  index: any;
  propItemKey: string | null | undefined;
  /** From CraftJS useNode — the node setProp action. */
  setProp: any;
  /** From CraftJS useEditor — the editor query + actions. */
  query: any;
  actions: any;
  /** Snapshot of nodeProps at command time. */
  nodeProps: any;
  /** Active canvas bp (mobile/sm/md/.../2xl) at command time. */
  activeBp: ChipBp;
};

function writeAt(ctx: CommandCtx, bp: ChipBp, value: any) {
  changeProp({
    propKey: ctx.propKey,
    value,
    setProp: ctx.setProp,
    propType: ctx.propType,
    view: bp,
    index: ctx.index,
    propItemKey: ctx.propItemKey ?? undefined,
    query: ctx.query,
    actions: ctx.actions,
    nodeId: ctx.nodeId,
    classDark: false,
  });
}

/** Reset (clear) the value at a single bp. */
export function cmdResetAt(ctx: CommandCtx, bp: ChipBp) {
  writeAt(ctx, bp, null);
}

/**
 * Reset every bp (base + 5 breakpoints). CraftJS `actions.history` does NOT
 * expose a public `merge` API on this version — fall back to 6 sequential
 * setProps (each becomes its own history entry). Acceptable per plan.
 */
export function cmdResetAll(ctx: CommandCtx) {
  for (const bp of CHIP_BP_ORDER) {
    writeAt(ctx, bp, null);
  }
}

/**
 * Promote the value at the active bp to base (mobile), then null-out every
 * non-base bp. Effectively "use this everywhere — it's the new default."
 */
export function cmdPromoteToBase(ctx: CommandCtx) {
  const r = getPropFinalValue(
    {
      propKey: ctx.propKey,
      propType: ctx.propType,
      index: ctx.index ?? null,
      propItemKey: ctx.propItemKey ?? null,
    },
    ctx.activeBp,
    ctx.nodeProps,
    false
  );
  if (r.value == null || r.value === "") return;

  // Write to base first.
  writeAt(ctx, "mobile", r.value);
  // Clear every non-base.
  for (const bp of BP_KEYS) {
    writeAt(ctx, bp, null);
  }
}

/** Copy active value to every bp `<` active (smaller breakpoints). */
export function cmdCopyDown(ctx: CommandCtx) {
  const r = getPropFinalValue(
    {
      propKey: ctx.propKey,
      propType: ctx.propType,
      index: ctx.index ?? null,
      propItemKey: ctx.propItemKey ?? null,
    },
    ctx.activeBp,
    ctx.nodeProps,
    false
  );
  if (r.value == null || r.value === "") return;

  const idx = CHIP_BP_ORDER.indexOf(ctx.activeBp);
  if (idx < 0) return;
  for (let i = 0; i < idx; i++) {
    writeAt(ctx, CHIP_BP_ORDER[i], r.value);
  }
}

/** Copy active value to every bp `>` active (larger breakpoints). */
export function cmdCopyUp(ctx: CommandCtx) {
  const r = getPropFinalValue(
    {
      propKey: ctx.propKey,
      propType: ctx.propType,
      index: ctx.index ?? null,
      propItemKey: ctx.propItemKey ?? null,
    },
    ctx.activeBp,
    ctx.nodeProps,
    false
  );
  if (r.value == null || r.value === "") return;

  const idx = CHIP_BP_ORDER.indexOf(ctx.activeBp);
  if (idx < 0) return;
  for (let i = idx + 1; i < CHIP_BP_ORDER.length; i++) {
    writeAt(ctx, CHIP_BP_ORDER[i], r.value);
  }
}

/** Has any explicit override at any non-base bp? Determines context-menu enable state. */
export function hasAnyOverride(
  ctx: Pick<CommandCtx, "propKey" | "propType" | "index" | "propItemKey" | "nodeProps">
): boolean {
  for (const bp of BP_KEYS) {
    const r = getPropFinalValue(
      {
        propKey: ctx.propKey,
        propType: ctx.propType,
        index: ctx.index ?? null,
        propItemKey: ctx.propItemKey ?? null,
      },
      bp,
      ctx.nodeProps,
      false
    );
    if (r.viewValue === bp && r.value != null && r.value !== "") return true;
  }
  return false;
}

/** Has explicit value at active bp? Determines promote/copy enable state. */
export function hasValueAtActive(
  ctx: Pick<CommandCtx, "propKey" | "propType" | "index" | "propItemKey" | "nodeProps" | "activeBp">
): boolean {
  const r = getPropFinalValue(
    {
      propKey: ctx.propKey,
      propType: ctx.propType,
      index: ctx.index ?? null,
      propItemKey: ctx.propItemKey ?? null,
    },
    ctx.activeBp,
    ctx.nodeProps,
    false
  );
  return r.viewValue === ctx.activeBp && r.value != null && r.value !== "";
}

/** Resolve the bp where the currently-displayed value lives (Show source). */
export function sourceBp(
  ctx: Pick<CommandCtx, "propKey" | "propType" | "index" | "propItemKey" | "nodeProps" | "activeBp">
): ChipBp | null {
  const r = getPropFinalValue(
    {
      propKey: ctx.propKey,
      propType: ctx.propType,
      index: ctx.index ?? null,
      propItemKey: ctx.propItemKey ?? null,
    },
    ctx.activeBp,
    ctx.nodeProps,
    false
  );
  if (r.value == null || r.value === "") return null;
  return r.viewValue as ChipBp;
}

// Re-export so consumers don't need both modules.
export { setPropOnView };
