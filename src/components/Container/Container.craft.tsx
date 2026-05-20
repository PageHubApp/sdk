/** Container — Component definition via defineComponent(). */
import { TbContainer } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { lazyNamed } from "../../utils/lazyNamed";
import { Container } from "./Container";
import { layoutCanvasCanMoveIn } from "../layoutCanvasCanMoveIn";
import { toHTML } from "./Container.toHTML";

const ContainerMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/ContainerMainTab"),
  "ContainerMainTab",
);
const HeaderFooterToggles = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/ContainerMainTab"),
  "HeaderFooterToggles",
);
const ContainerPaddingOverlay = lazyNamed(
  () => import("../../chrome/canvas/overlays/ContainerPaddingOverlay"),
  "ContainerPaddingOverlay",
);

export { toHTML };

export const ContainerDef = defineComponent(
  {
    name: "Container",
    component: Container,
    icon: TbContainer,
    category: "Layout",
    canvas: true,
    settings: ContainerMainTab,
    toolbarExtra: <HeaderFooterToggles />,
    toHTML,
    tools: () => [<ContainerPaddingOverlay key="padding-overlay" />],
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: (node, into) => layoutCanvasCanMoveIn(node, into),
    },
  },
  { __internal: true }
);
