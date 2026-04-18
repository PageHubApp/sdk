/**
 * Automatic — a smart Container alias.
 *
 * Renders exactly like Container (shares the React component, settings, and toHTML),
 * but registers under its own CraftJS name so `applyAutomaticMorph` in
 * `chrome/shell/automatic/` can target it specifically via the detector pipeline.
 *
 * Dropping an Automatic into a section morphs it into a "Content" wrapper; dropping
 * it into a nested container in a section morphs it into a "Card". Base Container
 * drops stay vanilla.
 */
import { TbAdjustmentsAlt } from "react-icons/tb";
import { ContainerMainTab } from "../chrome/toolbar/unified-settings/mainTabs/ContainerMainTab";
import { defineComponent } from "../define";
import { Container } from "./Container";
import { toHTML } from "./Container.craft";
import { layoutCanvasCanMoveIn } from "./layoutCanvasCanMoveIn";

export const AutomaticDef = defineComponent(
  {
    name: "Automatic",
    displayName: "Automatic",
    description: "Smart container that adapts to where you drop it — becomes a content wrapper inside a section, or a card inside a nested container.",
    component: Container,
    icon: TbAdjustmentsAlt,
    category: "Layout",
    canvas: true,
    settings: ContainerMainTab,
    toHTML,
    defaultProps: {
      className: "flex flex-col gap-space-md w-full",
    },
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: (node, into) => layoutCanvasCanMoveIn(node, into),
    },
  },
  { __internal: true }
);
