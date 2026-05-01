/** Embed — presets extracted from Embed.craft.tsx. */
import {
  TbBrandInstagram,
  TbBrandSpotify,
  TbBrandX,
  TbCalendar,
  TbCalendarEvent,
  TbCalendarTime,
  TbClipboardList,
  TbCode,
  TbCoffee,
  TbCreditCard,
  TbForms,
  TbMail,
  TbMessageCircle,
  TbShoppingBag,
} from "react-icons/tb";
import type { ComponentPreset } from "../../define/types";
import { registerPresets } from "../../define/catalogRegistry";

export const embedPresets: ComponentPreset[] = [
      {
        label: "Custom HTML",
        icon: TbCode,
        props: { service: "custom", className: "w-full" },
      },
      {
        label: "Calendly",
        icon: TbCalendarEvent,
        props: { service: "calendly", className: "w-full" },
      },
      {
        label: "Cal.com",
        icon: TbCalendar,
        props: { service: "cal", className: "w-full" },
      },
      {
        label: "Stripe",
        icon: TbCreditCard,
        props: { service: "stripe", className: "w-full" },
      },
      {
        label: "Gumroad",
        icon: TbShoppingBag,
        props: { service: "gumroad", className: "w-full" },
      },
      {
        label: "Ko-fi",
        icon: TbCoffee,
        props: { service: "kofi", className: "w-full" },
      },
      {
        label: "Typeform",
        icon: TbForms,
        props: { service: "typeform", className: "w-full" },
      },
      {
        label: "Tally",
        icon: TbClipboardList,
        props: { service: "tally", className: "w-full" },
      },
      {
        label: "Mailchimp",
        icon: TbMail,
        props: { service: "mailchimp", className: "w-full" },
      },
      {
        label: "Spotify",
        icon: TbBrandSpotify,
        props: { service: "spotify", className: "w-full" },
      },
      {
        label: "Instagram",
        icon: TbBrandInstagram,
        props: { service: "instagram", className: "w-full" },
      },
      {
        label: "Twitter / X",
        icon: TbBrandX,
        props: { service: "twitter", className: "w-full" },
      },
      {
        label: "Google Calendar",
        icon: TbCalendarTime,
        props: { service: "google-calendar", className: "w-full" },
      },
      {
        label: "Crisp Chat",
        icon: TbMessageCircle,
        props: { service: "crisp", className: "w-full" },
      },
];

registerPresets("Embed", embedPresets);
