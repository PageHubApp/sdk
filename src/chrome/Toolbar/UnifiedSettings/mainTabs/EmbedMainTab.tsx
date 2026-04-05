// @ts-nocheck
import { useNode } from "@craftjs/core";
import { EMBED_SERVICES, type EmbedService } from "../../../../components/Embed";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

/** Services where the user pastes raw code instead of a URL */
const CODE_PASTE_SERVICES: EmbedService[] = [
  "custom", "stripe", "mailchimp", "convertkit", "beehiiv",
];

/** Chat widget services that use an ID, not a URL */
const ID_SERVICES: EmbedService[] = ["crisp", "intercom", "tidio"];

function getInputLabel(service: EmbedService): string {
  if (CODE_PASTE_SERVICES.includes(service)) return "Embed Code";
  if (ID_SERVICES.includes(service)) return "Widget ID";
  return "URL";
}

function getServiceHelp(service: EmbedService): string {
  switch (service) {
    case "custom":
      return "Paste any HTML, iframe, or script embed code.";
    case "calendly":
      return "Paste your Calendly scheduling link.";
    case "cal":
      return "Paste your Cal.com booking link.";
    case "stripe":
      return "Stripe Dashboard → Payment Links → Buy Button, paste the code.";
    case "gumroad":
      return "Paste your Gumroad product link.";
    case "kofi":
      return "Paste your Ko-fi page URL.";
    case "typeform":
      return "Paste your Typeform form URL.";
    case "tally":
      return "Paste your Tally form URL.";
    case "jotform":
      return "Paste your Jotform form URL.";
    case "mailchimp":
      return "Mailchimp → Audience → Signup forms → Embedded forms, paste the code.";
    case "convertkit":
      return "Kit → Forms → Embed, paste the code.";
    case "beehiiv":
      return "Beehiiv → Settings → Embed, paste the code.";
    case "spotify":
      return "Paste a Spotify link (track, album, playlist, episode, or show).";
    case "soundcloud":
      return "Paste a SoundCloud track or playlist URL.";
    case "podcast":
      return "Paste an Apple Podcasts link.";
    case "instagram":
      return "Paste an Instagram post URL.";
    case "twitter":
      return "Paste a tweet URL.";
    case "tiktok":
      return "Paste a TikTok video URL.";
    case "crisp":
      return "Crisp → Settings → Website Settings, paste your Website ID.";
    case "intercom":
      return "Intercom → Settings → Installation, paste your App ID.";
    case "tidio":
      return "Tidio → Settings → Installation, paste your Public Key.";
    case "google-calendar":
      return "Paste your Google Calendar embed URL or calendar ID.";
    default:
      return "";
  }
}

export const EmbedMainTab = () => {
  const { props } = useNode(node => ({
    props: node.data.props,
  }));

  const service: EmbedService = props.service || "custom";
  const isCodePaste = CODE_PASTE_SERVICES.includes(service);

  return renderComponentSlots({
    Content: (
      <ToolbarSection title="Embed" icon={SECTION_ICONS["Content"]}>
        <ToolbarItem
          propKey="service"
          propType="component"
          type="select"
          label="Service"
          labelHide={false}
        >
          <optgroup label="Booking">
            <option value="calendly">Calendly</option>
            <option value="cal">Cal.com</option>
            <option value="google-calendar">Google Calendar</option>
          </optgroup>
          <optgroup label="Payments">
            <option value="stripe">Stripe Buy Button</option>
            <option value="gumroad">Gumroad</option>
            <option value="kofi">Ko-fi</option>
          </optgroup>
          <optgroup label="Forms">
            <option value="typeform">Typeform</option>
            <option value="tally">Tally</option>
            <option value="jotform">Jotform</option>
          </optgroup>
          <optgroup label="Newsletter">
            <option value="mailchimp">Mailchimp</option>
            <option value="convertkit">Kit (ConvertKit)</option>
            <option value="beehiiv">Beehiiv</option>
          </optgroup>
          <optgroup label="Audio">
            <option value="spotify">Spotify</option>
            <option value="soundcloud">SoundCloud</option>
            <option value="podcast">Apple Podcasts</option>
          </optgroup>
          <optgroup label="Social">
            <option value="instagram">Instagram</option>
            <option value="twitter">Twitter / X</option>
            <option value="tiktok">TikTok</option>
          </optgroup>
          <optgroup label="Chat Widgets">
            <option value="crisp">Crisp</option>
            <option value="intercom">Intercom</option>
            <option value="tidio">Tidio</option>
          </optgroup>
          <optgroup label="Other">
            <option value="custom">Custom HTML</option>
          </optgroup>
        </ToolbarItem>

        {isCodePaste ? (
          <ToolbarItem
            propKey={service === "custom" ? "code" : "url"}
            propType="component"
            type="codemirror"
            rows={10}
            labelHide={true}
            placeholder={EMBED_SERVICES[service]?.placeholder}
            description={getServiceHelp(service)}
          />
        ) : (
          <>
            <ToolbarItem
              propKey="url"
              propType="component"
              type="text"
              label={getInputLabel(service)}
              labelHide={false}
              placeholder={EMBED_SERVICES[service]?.placeholder}
            />
            <p className="col-span-full text-[11px] leading-snug text-muted-foreground">
              {getServiceHelp(service)}
            </p>
          </>
        )}
      </ToolbarSection>
    ),
    Properties: (
      <ToolbarSection title="Properties" icon={SECTION_ICONS["Properties"]}>
        <ToolbarItem
          propKey="title"
          propType="component"
          type="text"
          label="Title"
          labelHide={false}
          placeholder="Describe the embedded content"
        />
        {service !== "custom" && (
          <ToolbarItem
            propKey="code"
            propType="component"
            type="codemirror"
            rows={6}
            label="Code Override"
            labelHide={false}
            description="Override the auto-generated embed code."
          />
        )}
      </ToolbarSection>
    ),
  });
};
