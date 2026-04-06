import { TbBox } from "react-icons/tb";
import { Container } from "../../../components/Container";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

import generate from "../../../utils/data/nameGenerator";

export const RenderPageComponent = ({ text }) => (
  <RenderToolComponent
    element={Container}
    type="page"
    isHomePage={false}
    className="mx-auto flex flex-col items-center w-full h-full gap-8 py-6 px-3"
    display={<ToolboxItemDisplay icon={TbBox} label="Blank Page" />}
    custom={{ displayName: generate().spaced }}
  />
);

export const pageToolboxItems = [
  {
    title: "Pages",
    content: [<RenderPageComponent key="1" text="Blank Page" />],
  },
];
