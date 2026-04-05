// @ts-nocheck
import { TbMusic } from "react-icons/tb";
import { Audio } from "../../../components/Audio";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

export const RenderAudioComponent = ({ text, ...props }) => (
  <RenderToolComponent element={Audio} display={text} {...props} />
);

export const AudioToolbox = {
  title: "Audio",

  content: [
    <RenderAudioComponent
      key="1"
      className="w-full flex"
      text={<ToolboxItemDisplay icon={TbMusic} label="Audio" />}
      custom={{ displayName: "Audio" }}
    />,
  ],
};
