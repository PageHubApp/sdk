import { TbLayoutColumns, TbLayoutRows } from "react-icons/tb";
import { Container } from "../../../components/Container";
import { ContainerGroup } from "../../../components/ContainerGroup";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

export const RenderSectionComponent = ({ text = <></>, display = <></>, ...props }) => (
  <RenderToolComponent element={Container} renderer={text || display} {...props} />
);

export const RenderContainerGroupComponent = ({ text = <></>, display = <></>, ...props }) => (
  <RenderToolComponent element={ContainerGroup} renderer={text || display} {...props} />
);

export const sectionToolboxItems = [
  {
    title: "Layout",
    content: [
      <RenderSectionComponent
        key="row1"
        text={<ToolboxItemDisplay icon={TbLayoutColumns} label="Row" />}
        className="w-full"
        custom={{ displayName: "Row" }}
      />,

      <RenderSectionComponent
        key="col"
        text={<ToolboxItemDisplay icon={TbLayoutRows} label="Column" />}
        className="w-full"
        custom={{ displayName: "Column" }}
      />,
    ],
  },
];
