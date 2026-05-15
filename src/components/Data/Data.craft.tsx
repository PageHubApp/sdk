import React from "react";
/** Data — Component definition via defineComponent(). */
import { TbDatabase } from "react-icons/tb";
const DataMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/DataMainTab").then(mod => ({
    default: mod.DataMainTab,
  }))
);
import { defineComponent } from "../../define/defineComponent";
import { Data } from "./Data";
import { layoutCanvasCanMoveIn } from "../layoutCanvasCanMoveIn";
import { toHTML as dataToHTML } from "./toHTML";

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
