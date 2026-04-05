// @ts-nocheck
import { Image } from "../../../components/Image";
import { RenderToolComponent } from "./lib";

export const RenderImageComponent = ({ text }) => (
  <RenderToolComponent element={Image} display={text} />
);

export const ImageToolbox = {
  title: "Images",
  content: [
    <RenderImageComponent key="1" text={<div>Subscribe</div>} />,
    <RenderImageComponent key="2" text="Contact" />,
  ],
};
