// @ts-nocheck
import { RiImageAddLine } from "react-icons/ri";
import { TbPhoto, TbPhotoScan } from "react-icons/tb";
import { Image } from "../../../components/Image";
import { ImageList } from "../../../components/ImageList";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";
import { RenderSectionComponent } from "./sectionComponents";

export const RenderImageComponent = ({ text = "", display, ...props }) => (
  <RenderToolComponent element={Image} type="cdn" display={display} text={text} {...props} />
);

export const ImageToolbox = {
  title: "Images",
  content: [
    <RenderImageComponent
      key="image1"
      className="object-cover flex overflow-hidden md:h-auto"
      display={<ToolboxItemDisplay icon={TbPhoto} label="Image" />}
      custom={{ displayName: "Image" }}
    />,
    <RenderSectionComponent
      key="image2"
      text={<ToolboxItemDisplay icon={RiImageAddLine} label="Image Background" />}
      className="flex min-h-[120px] justify-center flex-col w-full gap-8 bg-cover bg-center items-center h-96 md:flex-row md:h-full"
      type="imageContainer"
      custom={{ displayName: "Image Background" }}
    />,
    <RenderToolComponent
      key="imageList"
      element={ImageList}
      className="w-full p-4 flex flex-row gap-4"
      display={<ToolboxItemDisplay icon={TbPhotoScan} label="Image Gallery" />}
      custom={{ displayName: "Image List" }}
    />,
  ],
};
