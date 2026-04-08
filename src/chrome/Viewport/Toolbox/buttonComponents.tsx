import { Button } from "../../../components/Button";
import { ButtonList } from "../../../components/ButtonList";
import { LuImage } from "react-icons/lu";
import { RxButton } from "react-icons/rx";
import { TbList } from "react-icons/tb";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

// Default icon SVG for star icon
const defaultIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>`;

export const RenderButtonComponent = ({ text = "Button", display = null, ...props }) => {
  // Handle both old flat structure and new nested structure
  let icon = props.icon;
  if (
    typeof props.icon === "string" ||
    props.iconOnly !== undefined ||
    props.iconPosition !== undefined
  ) {
    icon = {
      value: props.icon,
      only: props.iconOnly,
      position: props.iconPosition || "left",
    };
  }

  return (
    <RenderToolComponent
      display={display || <ToolboxItemDisplay icon={RxButton} label={text} />}
      text={props.text || text}
      icon={icon}
      className={props.className || "flex flex-row items-center justify-center gap-2 px-6 py-3 w-auto cursor-pointer"}
      element={Button}
      custom={props.custom}
    />
  );
};

export const RenderButtonListComponent = ({ text = "Button List", ...props }) => {
  return (
    <RenderToolComponent
      display={<ToolboxItemDisplay icon={TbList} label={text} />}
      buttons={
        props.buttons || [
          {
            text: "Button 1",
          },
          {
            text: "Button 2",
          },
        ]
      }
      className={props.className || "flex flex-col items-center justify-start gap-2 px-4 py-2 w-auto md:flex-row md:items-center md:justify-start md:gap-2"}
      element={ButtonList}
      custom={props.custom}
    />
  );
};

export const ButtonToolbox = {
  title: "Buttons",
  content: [
    <RenderButtonComponent
      text="Button"
      key="1"
      custom={{ displayName: "Button" }}
      className="flex flex-row items-center justify-center gap-2 px-6 py-3 w-auto cursor-pointer border border-base-300 rounded-lg"
    />,
    <RenderButtonListComponent
      text="Button List"
      key="2"
      custom={{ displayName: "Button List" }}
      className="flex flex-col items-center justify-start gap-2 px-4 py-2 w-auto md:flex-row md:items-center md:justify-start md:gap-2 border border-base-300 rounded-lg"
    />,
    <RenderButtonComponent
      text="Icon"
      key="3"
      custom={{ displayName: "Icon Button" }}
      icon={{
        value: defaultIconSvg,
        only: true,
      }}
      display={<ToolboxItemDisplay icon={LuImage} label={"Icon"} />}
    />,
  ],
  classes: {
    content: "p-3 grid grid-cols-2 gap-3",
  },
};
