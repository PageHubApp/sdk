import { useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const VideoMainTab = () => {
  const { provider } = useNode(node => ({ provider: node.data.props.provider }));

  const getProviderInstructions = () => {
    switch (provider) {
      case "youtube":
        return "Copy the Video ID from the YouTube video URL (e.g., 'dQw4w9WgXcQ' from youtube.com/watch?v=dQw4w9WgXcQ)";
      case "vimeo":
        return "Copy the Video ID from the Vimeo video URL (e.g., '123456789' from vimeo.com/123456789)";
      case "dailymotion":
        return "Copy the Video ID from the Dailymotion video URL (e.g., 'x8abcde' from dailymotion.com/video/x8abcde)";
      case "wistia":
        return "Copy the Video ID from your Wistia embed code or video URL";
      case "facebook":
        return "Paste the full Facebook video URL (e.g., https://www.facebook.com/...)";
      case "twitch":
        return "Copy the Video ID from the Twitch video URL (e.g., '1234567890' from twitch.tv/videos/1234567890)";
      case "url":
        return "Paste the direct video file URL (must be publicly accessible)";
      default:
        return "Enter the video ID or URL";
    }
  };

  return renderComponentSlots({
    Content: (
      <>
        <ToolbarSection
          title="Content"
          icon={SECTION_ICONS["Content"]}
          help="Video provider and ID or URL."
        >
          <ToolbarItem
            propKey="provider"
            propType="component"
            type="select"
            label="Video Provider"
            labelHide={false}
          >
            <option value="youtube">YouTube</option>
            <option value="vimeo">Vimeo</option>
            <option value="dailymotion">Dailymotion</option>
            <option value="wistia">Wistia</option>
            <option value="facebook">Facebook</option>
            <option value="twitch">Twitch</option>
            <option value="url">Direct URL</option>
          </ToolbarItem>
        </ToolbarSection>

        <p className="text-md text-neutral-content px-3 pt-2 pb-3 text-sm">
          {getProviderInstructions()}
        </p>

        <ToolbarSection title="">
          <ToolbarItem
            propKey="videoId"
            propType="component"
            type="text"
            label={provider === "url" || provider === "facebook" ? "Video URL" : "Video ID"}
            labelHide={true}
            placeholder={
              provider === "url" || provider === "facebook" ? "https://..." : "Enter video ID"
            }
          />
        </ToolbarSection>

        <SettingsAiSlot />
      </>
    ),
    Properties: (
      <ToolbarSection
        title="Properties"
        icon={SECTION_ICONS["Properties"]}
        help="Accessibility title for the video."
      >
        <ToolbarItem
          propKey="title"
          propType="component"
          type="text"
          label="Video Title"
          labelHide={false}
          placeholder="Describe the video content"
        />
      </ToolbarSection>
    ),
  });
};
