import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { AssistantOpenAtom, useSetAtomState } from "@/utils/atoms";
import { TbClipboard, TbPlus, TbUpload } from "react-icons/tb";
import { ToolbarDropdown } from "../../../../ToolbarDropdown";
import type { AddMode } from "../../utils/media-helpers";
import { TOOL_CLUSTER_CLASS } from "./styles";
import { ToolbarIconButton } from "./ToolbarIconButton";

interface AddModeClusterProps {
  addMode: AddMode;
  uploading: boolean;
  hasImageInClipboard: boolean;
  canUseImageGenerate: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setAddMode: (mode: AddMode) => void;
  handlePasteClick: () => void;
  onClose: () => void;
}

/**
 * State machine: dropdown's `onChange` switches `addMode` to "url" / "svg" /
 * "ai" / "paste". The parent renders the matching mode panel below the
 * toolbar (UrlInputMode / SvgInputMode); "ai" + "paste" trigger immediately
 * without rendering a panel.
 */
export function AddModeCluster({
  addMode,
  uploading,
  hasImageInClipboard,
  canUseImageGenerate,
  fileInputRef,
  setAddMode,
  handlePasteClick,
  onClose,
}: AddModeClusterProps) {
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);

  return (
    <div className={`${TOOL_CLUSTER_CLASS} order-2`}>
      <ToolbarIconButton
        onClick={() => {
          setAddMode("upload");
          fileInputRef.current?.click();
        }}
        disabled={uploading}
        active={addMode === "upload"}
        tooltip="Upload files"
      >
        <TbUpload className="size-4" />
      </ToolbarIconButton>
      <div className="flex h-full min-h-0 w-[2.5rem] items-stretch md:w-full md:max-w-[8.5rem] [&_button.input-plain]:text-xs">
        <ToolbarDropdown
          wrap="control"
          propKey="media-add-actions"
          tooltipId={PAGEHUB_RTT_GLOBAL_ID}
          tooltipContent="Add media actions"
          placeholder={<TbPlus className="size-4" />}
          value=""
          onChange={(val: string) => {
            if (val === "url") setAddMode("url" as AddMode);
            if (val === "svg") setAddMode("svg" as AddMode);
            if (val === "ai" && canUseImageGenerate) {
              onClose();
              setAssistantOpen({
                revealPanel: true,
                freshChat: true,
                assistantScope: "media",
                mediaContext: { intent: "generate-image" },
                promptHint: "Generate a new image for my media library.",
              });
            }
            if (val === "paste") handlePasteClick();
          }}
        >
          <option value="url">Add from URL</option>
          <option value="svg">Paste SVG</option>
          {canUseImageGenerate && <option value="ai">Generate with AI</option>}
          <option value="paste">Paste from clipboard</option>
        </ToolbarDropdown>
      </div>
      <ToolbarIconButton
        onClick={handlePasteClick}
        disabled={!hasImageInClipboard || uploading}
        tooltip={
          hasImageInClipboard
            ? "Paste image from clipboard (Ctrl+V / Cmd+V)"
            : "No image in clipboard"
        }
      >
        <TbClipboard className="size-4" />
      </ToolbarIconButton>
    </div>
  );
}
