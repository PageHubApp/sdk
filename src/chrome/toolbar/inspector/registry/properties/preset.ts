/**
 * Component-tab property: list-editor for preset wrappers (Accordion, Tabs,
 * etc.). Active when the selected node carries `custom.preset` AND that
 * preset registered an `addChild` factory in `presetRegistry.ts`.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { getPresetMeta } from "../../../../../core/presetRegistry";
import type { PropertyDef } from "../propertyDefs";

export const presetProperties: PropertyDef[] = [
  {
    id: "preset:add-child",
    label: "Items",
    section: "preset-items",
    keywords: ["add", "item", "child", "preset", "list"],
    input: { type: "custom", component: "PresetAddChildList" },
    pinned: true,
    isActive: (_className, _props, ctx) => {
      if (!ctx) return false;
      try {
        if (ctx.nodeId === ROOT_NODE) return false;
        const node = ctx.query.node(ctx.nodeId).get();
        const presetName = node?.data?.custom?.preset as string | undefined;
        if (!presetName) return false;
        return !!getPresetMeta(presetName)?.addChild;
      } catch {
        return false;
      }
    },
    sortOrder: -10,
  },
];
