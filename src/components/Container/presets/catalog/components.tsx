/** Container catalog — pseudo-component presets (Badge, Avatar, Alert, Stat). */
import { Element } from "@craftjs/core";
import { TbAlertTriangle, TbBadge, TbChartBar, TbUserCircle } from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";
import { Text } from "../../../Text/Text";
import { buildAlertChildren, buildAvatarChildren, buildStatChildren } from "../lists";

export const componentPresets: ComponentPreset[] = [
  {
    label: "Badge",
    description: "A tiny pill for tags, status, or labels.",
    icon: TbBadge,
    category: "Components",
    props: { className: "badge badge-primary font-medium self-start" },
    children: () => [
      <Element
        key="label"
        is={Text}
        custom={{ displayName: "Label" }}
        text="New"
        canDelete={true}
        canEditName={true}
      />,
    ],
  },
  {
    label: "Avatar",
    description: "A round photo for profile or team headshots.",
    icon: TbUserCircle,
    category: "Components",
    props: { className: "w-16 h-16 rounded-full overflow-hidden shrink-0" },
    children: buildAvatarChildren,
  },
  {
    label: "Alert",
    description: "A coloured banner that says 'heads up'.",
    icon: TbAlertTriangle,
    category: "Components",
    props: { className: "alert alert-info flex flex-row items-center gap-space-xs w-full" },
    children: buildAlertChildren,
  },
  {
    label: "Stat",
    description: "A big number with a label underneath.",
    icon: TbChartBar,
    category: "Components",
    props: { className: "flex flex-col items-center gap-space-xs text-center" },
    children: buildStatChildren,
  },
];
