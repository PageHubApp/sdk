// @ts-nocheck
import { TbVideo } from "react-icons/tb";
import { Video } from "../../../components/Video";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

export const RenderVideoComponent = ({ text, ...props }) => (
  <RenderToolComponent element={Video} display={text} {...props} />
);

export const VideoToolbox = {
  title: "Videos",

  content: [
    <RenderVideoComponent
      key="1"
      className="w-full h-full flex overflow-hidden"
      text={<ToolboxItemDisplay icon={TbVideo} label="Video" />}
      custom={{ displayName: "Video" }}
    />,
  ],
};
