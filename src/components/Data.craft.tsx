/** Data — Component definition via defineComponent(). */
import { TbDatabase } from "react-icons/tb";
import { DataMainTab } from "../chrome/toolbar/unified-settings/mainTabs/DataMainTab";
import { defineComponent } from "../define";
import { toHTML as containerToHTML } from "./Container.craft";
import { Data } from "./Data";
import { layoutCanvasCanMoveIn } from "./layoutCanvasCanMoveIn";

export const DataDef = defineComponent(
  {
    name: "Data",
    component: Data,
    icon: TbDatabase,
    category: "Layout",
    canvas: true,
    settings: DataMainTab,
    description:
      "Data-aware container. Repeats its children per item from a connector (Stripe products, customer orders, nested scopes). Same layout as Container.",
    toHTML: containerToHTML,
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: (node, into) => layoutCanvasCanMoveIn(node, into),
    },
  },
  { __internal: true }
);
