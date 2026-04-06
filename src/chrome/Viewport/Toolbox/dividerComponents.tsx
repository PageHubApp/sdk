import { HiOutlineMinus } from "react-icons/hi";

import { Divider } from "../../../components/Divider";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

export const RenderDividerComponent = ({ text, ...props }) => (
  <RenderToolComponent element={Divider} display={text} {...props} />
);

export const DividerToolbox = {
  title: "Dividers",
  content: [
    <RenderDividerComponent
      key="1"
      className="bg-(--accent) border-0 h-2 my-3 w-full"
      text={<ToolboxItemDisplay icon={HiOutlineMinus} label="Line Divider" />}
    />,
  ],
};
