/** Container — Component definition via defineComponent(). */
import React from "react";
import { TbContainer } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { Container } from "./Container";
import { layoutCanvasCanMoveIn } from "../layoutCanvasCanMoveIn";
import { toHTML } from "./toHTML";
import { containerPresets } from "./Container.presets";
import { containerModifiers } from "./Container.modifiers";

const ContainerMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/ContainerMainTab").then(mod => ({
    default: mod.ContainerMainTab,
  }))
);
const HeaderFooterToggles = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/ContainerMainTab").then(mod => ({
    default: mod.HeaderFooterToggles,
  }))
);
const ContainerPaddingOverlay = React.lazy(() =>
  import("../../chrome/canvas/overlays/ContainerPaddingOverlay").then(mod => ({
    default: mod.ContainerPaddingOverlay,
  }))
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
    presets: containerPresets,
    modifiers: containerModifiers,
  },
  { __internal: true }
);
