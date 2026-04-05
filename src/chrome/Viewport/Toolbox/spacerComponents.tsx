// @ts-nocheck
import { TbSpace } from "react-icons/tb";
import { Spacer } from "../../../components/Spacer";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

export const RenderSpacerComponent = ({ text, ...props }) => (
  <RenderToolComponent element={Spacer} text="" display={text} {...props} />
);

export const SpacerToolbox = {
  title: "Spacers",
  content: [
    <RenderSpacerComponent key="1" text={<ToolboxItemDisplay icon={TbSpace} label="Spacer" />} />,
  ],
};
