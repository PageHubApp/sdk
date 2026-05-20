/**
 * Button — Component definition via defineComponent()
 */
import { TbHandClick } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { lazyNamed } from "../../utils/lazyNamed";
import { Button } from "./Button";
import { toHTML } from "./Button.toHTML";

const ButtonMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/ButtonMainTab"),
  "ButtonMainTab",
);

export { toHTML };

export const ButtonDef = defineComponent(
  {
    name: "Button",
    component: Button,
    icon: TbHandClick,
    category: "Buttons",
    settings: ButtonMainTab,
    toHTML,
    disable: ["opacity"],
    hoverClickVariant: "button",
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "Button"),
    },
    peerInherit: {
      whenParentIs: ["Container"],
      reference: "left-neighbor",
    },
  },
  { __internal: true }
);
