import { RiImageAddLine } from "react-icons/ri";
import { TbListNumbers } from "react-icons/tb";
import { Image } from "../../../components/Image";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";
import { RenderSectionComponent } from "./sectionComponents";

export const RenderImageComponent = ({ text = "", display, ...props }) => (
  <RenderToolComponent element={Image} type="cdn" display={display} text={text} {...props} />
);

export const ListToolbox = {
  title: "Lists",
  content: [
    <RenderImageComponent
      key="1"
      className="object-cover min-h-[120px] h-96 w-full flex overflow-hidden md:h-auto"
      display={<ToolboxItemDisplay icon={TbListNumbers} label="Item List" />}
      custom={{ displayName: "Inline Image" }}
    />,
    <RenderSectionComponent
      key="image1"
      display={<ToolboxItemDisplay icon={RiImageAddLine} label="Background Image" />}
      className="flex min-h-[120px] justify-center flex-col w-full gap-8 bg-cover bg-center items-center h-96 md:flex-row md:h-full"
      type="imageContainer"
      custom={{ displayName: "Image Background" }}
    />,
  ],
};
