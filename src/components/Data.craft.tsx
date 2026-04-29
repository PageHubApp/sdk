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
    description: "A list that repeats per item — products, orders, etc.",
    toHTML: containerToHTML,
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: (node, into) => layoutCanvasCanMoveIn(node, into),
    },
  },
  { __internal: true }
);
