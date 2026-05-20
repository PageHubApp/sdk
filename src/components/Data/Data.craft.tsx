/** Data — Component definition via defineComponent(). */
import { TbDatabase } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { lazyNamed } from "../../utils/lazyNamed";
import { Data } from "./Data";
import { layoutCanvasCanMoveIn } from "../layoutCanvasCanMoveIn";
import { toHTML as dataToHTML } from "./Data.toHTML";

const DataMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/DataMainTab"),
  "DataMainTab",
);

export const DataDef = defineComponent(
  {
    name: "Data",
    component: Data,
    icon: TbDatabase,
    category: "Layout",
    canvas: true,
    settings: DataMainTab,
    description: "A list that repeats per item — products, orders, etc.",
    toHTML: dataToHTML,
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: (node, into) => layoutCanvasCanMoveIn(node, into),
    },
  },
  { __internal: true }
);
