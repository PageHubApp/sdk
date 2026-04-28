import { useEditor, useNode } from "@craftjs/core";
import { useState } from "react";
import { getBackgroundUrl } from "@/utils/lib";
import { BackgroundFocalPointPicker } from "../../inputs/color/BackgroundFocalPointPicker";
import { PropertySection } from "../PropertySection";

/**
 * Body for the Image Settings popover (cog trigger off the Background image
 * chip). Renders the Focal Point picker plus the registry's `image-settings`
 * section — `+ Add Setting` picker, isActive gating, dropdown label
 * formatting all come from PropertySection / AccordionAddMenu / PropertyRenderer.
 *
 * While the focal-point picker is open, the settings list is hidden so the
 * picker canvas + crosshair gets the full panel width.
 *
 * Mirrors `ContainerOverflowSection.tsx` — a focused mainTab body component
 * hosted inside a FloatingPanel by `ImageSettingsPanel`.
 */
export function ImageSettingsSection() {
  const { query } = useEditor();
  const { props } = useNode(node => ({ props: node.data?.props }));
  const hasImage = !!props?.background?.image;
  const [isPickingFocal, setIsPickingFocal] = useState(false);

  if (!hasImage) {
    return (
      <p className="text-neutral-content text-xs italic">
        Pick an image first to configure its settings.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <BackgroundFocalPointPicker
        imageUrl={getBackgroundUrl(props, query)}
        onOpenChange={setIsPickingFocal}
      />
      {!isPickingFocal && <PropertySection sectionId="image-settings" />}
    </div>
  );
}
