import {
  TbCode,
  TbCalendarEvent,
  TbCalendar,
  TbCreditCard,
  TbForms,
  TbMail,
  TbBrandSpotify,
  TbBrandInstagram,
  TbBrandX,
  TbMessageCircle,
} from "react-icons/tb";
import { Embed } from "../../../components/Embed";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

export const RenderEmbedComponent = ({ display, ...props }) => (
  <RenderToolComponent element={Embed} className="w-full" display={display} {...props} />
);

export const EmbedToolbox = {
  title: "Embeds",
  content: [
    <RenderEmbedComponent
      key="custom"
      display={<ToolboxItemDisplay icon={TbCode} label="HTML Code" />}
      custom={{ displayName: "HTML Code" }}
      service="custom"
    />,
    <RenderEmbedComponent
      key="calendly"
      display={<ToolboxItemDisplay icon={TbCalendarEvent} label="Calendly" />}
      custom={{ displayName: "Calendly" }}
      service="calendly"
    />,
    <RenderEmbedComponent
      key="cal"
      display={<ToolboxItemDisplay icon={TbCalendar} label="Cal.com" />}
      custom={{ displayName: "Cal.com" }}
      service="cal"
    />,
    <RenderEmbedComponent
      key="stripe"
      display={<ToolboxItemDisplay icon={TbCreditCard} label="Stripe" />}
      custom={{ displayName: "Stripe Buy Button" }}
      service="stripe"
    />,
    <RenderEmbedComponent
      key="typeform"
      display={<ToolboxItemDisplay icon={TbForms} label="Typeform" />}
      custom={{ displayName: "Typeform" }}
      service="typeform"
    />,
    <RenderEmbedComponent
      key="mailchimp"
      display={<ToolboxItemDisplay icon={TbMail} label="Newsletter" />}
      custom={{ displayName: "Newsletter Signup" }}
      service="mailchimp"
    />,
    <RenderEmbedComponent
      key="spotify"
      display={<ToolboxItemDisplay icon={TbBrandSpotify} label="Spotify" />}
      custom={{ displayName: "Spotify" }}
      service="spotify"
    />,
    <RenderEmbedComponent
      key="instagram"
      display={<ToolboxItemDisplay icon={TbBrandInstagram} label="Instagram" />}
      custom={{ displayName: "Instagram Post" }}
      service="instagram"
    />,
    <RenderEmbedComponent
      key="twitter"
      display={<ToolboxItemDisplay icon={TbBrandX} label="Twitter / X" />}
      custom={{ displayName: "Tweet" }}
      service="twitter"
    />,
    <RenderEmbedComponent
      key="crisp"
      display={<ToolboxItemDisplay icon={TbMessageCircle} label="Chat Widget" />}
      custom={{ displayName: "Chat Widget" }}
      service="crisp"
    />,
  ],
  classes: {
    content: "p-3 grid grid-cols-2 gap-3",
  },
};
