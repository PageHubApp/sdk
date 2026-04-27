import { useNode } from "@craftjs/core";
import { useEffect, useRef } from "react";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { MediaInput } from "../../inputs/media/MediaInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";
import { isDirectVideoFileUrl } from "@/utils/nativeVideo";

export const VideoMainTab = () => {
  const {
    provider,
    videoId,
    actions: { setProp },
  } = useNode(node => ({
    provider: node.data?.props.provider,
    videoId: node.data?.props.videoId,
  }));

  // Clear `videoId` when crossing the r2 boundary — R2 mediaIds are not
  // valid for remote providers (and vice versa), so a stale value would
  // make the rendered embed silently break.
  const prevProviderRef = useRef<string | undefined>(provider);
  useEffect(() => {
    const prev = prevProviderRef.current;
    prevProviderRef.current = provider;
    if (prev === provider) return;
    const crossed = (prev === "r2") !== (provider === "r2");
    if (crossed && videoId) {
      setProp((props: Record<string, unknown>) => {
        props.videoId = "";
      });
    }
  }, [provider, videoId, setProp]);

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
        return "Paste a direct file URL ending in .mp4, .webm, .mov, etc. Uses native HTML5 video (not an iframe). For fullscreen backgrounds, enable Playback: Autoplay, Loop, Muted, turn off Controls.";
      case "r2":
        return "Pick a video file from your media library.";
      default:
        return "Enter the video ID or URL";
    }
  };

  return renderComponentSlots({
    Content: (
      <>
        <ToolbarSection collapsible={false}>
          <ToolbarItem
            propKey="provider"
            propType="component"
            type="select"
            label="Video Provider"
            labelHide={false}
          >
            <option value="r2">Uploaded</option>
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

        {provider === "r2" ? (
          <ToolbarSection title="">
            <MediaInput
              propKey="videoId"
              typeKey="provider"
              contentKey="videoId"
              title=""
              kindFilter="video"
              defaultTypeValue="r2"
              showObjectProperties={false}
            />
          </ToolbarSection>
        ) : (
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
        )}

        {(provider === "r2" || provider === "url") && (provider === "r2" || isDirectVideoFileUrl(videoId)) ? (
          <ToolbarSection
            title="Playback"
            icon={SECTION_ICONS["Type"]}
            help="HTML5 video only (uploaded files, or direct .mp4/.webm URLs). Ignored for YouTube/Vimeo iframe embeds."
          >
            <ToolbarItem
              propKey="controls"
              propType="component"
              type="checkbox"
              label="Show controls"
              labelWidth="w-full"
              inputWidth="w-fit"
            />
            <ToolbarItem
              propKey="autoPlay"
              propType="component"
              type="checkbox"
              label="Autoplay"
              labelWidth="w-full"
              inputWidth="w-fit"
            />
            <ToolbarItem
              propKey="loop"
              propType="component"
              type="checkbox"
              label="Loop"
              labelWidth="w-full"
              inputWidth="w-fit"
            />
            <ToolbarItem
              propKey="muted"
              propType="component"
              type="checkbox"
              label="Muted"
              labelWidth="w-full"
              inputWidth="w-fit"
            />
            <ToolbarItem
              propKey="playsInline"
              propType="component"
              type="checkbox"
              label="Plays inline (iOS)"
              labelWidth="w-full"
              inputWidth="w-fit"
            />
          </ToolbarSection>
        ) : null}

        <ToolbarSection
          title="Accessibility"
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

        <SettingsAiSlot />
      </>
    ),
  });
};
