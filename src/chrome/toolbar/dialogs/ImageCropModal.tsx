import { useEffect, useId, useRef, useState } from "react";
import { TbLoader2, TbX } from "react-icons/tb";
import { Modal } from "../../floating/Modal";
import { OVERLAY_Z_CRITICAL_MODAL } from "../../popovers/overlayZIndex";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../primitives/layout/tooltipSurface";
import { ToolbarSegmentedControl } from "../primitives/ToolbarSegmentedControl";
import { MediaUploadError } from "../../../utils/media/errors";
import { sdkLog } from "../../../utils/logger";
import { CropStage } from "./ImageCrop/CropStage";
import { CROP_RATIO_PRESETS, cropSizeLabel } from "./ImageCrop/cropMath";
import { canReplaceInPlace, saveCrop, type CropSaveMode } from "./ImageCrop/cropSave";
import { useCropState } from "./ImageCrop/useCropState";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: any;
  onSave: (croppedImage: any) => void | Promise<void>;
  /** Stacking layer; defaults to the critical-modal layer. Raise it when opening over a higher overlay. */
  zIndex?: number;
}

const RATIO_OPTIONS = CROP_RATIO_PRESETS.map(p => ({ value: p.key, label: p.label }));

const BUTTON_BASE =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function ImageCropModal({
  isOpen,
  onClose,
  media,
  onSave,
  zIndex = OVERLAY_Z_CRITICAL_MODAL,
}: ImageCropModalProps) {
  const titleId = useId();
  const state = useCropState(media);
  const [saving, setSaving] = useState<CropSaveMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // A fresh open starts clean; closing mid-save stops the upload.
  useEffect(() => {
    if (isOpen) {
      setError(null);
      return;
    }
    abortRef.current?.abort();
  }, [isOpen]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const fileName = media?.metadata?.title || media?.name || media?.id || "";
  const showReplace = canReplaceInPlace(media);
  const canSave = !!state.pixelCrop && !state.unchanged && !saving;
  const hint = !state.natural
    ? ""
    : state.unchanged
      ? "Drag the edges of the box or pick a ratio."
      : showReplace
        ? "Replace original changes this image everywhere it's used."
        : "Images added by link are saved as a copy.";

  const save = async (mode: CropSaveMode) => {
    if (!state.pixelCrop || saving) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setSaving(mode);
    setError(null);
    try {
      const item = await saveCrop({
        media,
        crop: state.pixelCrop,
        mode,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      await onSave(item);
      onClose();
    } catch (err) {
      if (controller.signal.aborted) return;
      sdkLog.error("Image crop save failed:", err);
      setError(
        err instanceof MediaUploadError ? err.message : "Couldn't save the crop. Try again."
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSaving(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy={titleId}
      zIndex={zIndex}
      surface={false}
      className="border-base-300 bg-base-100 text-base-content flex h-[min(90vh,760px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-xl"
    >
      <header className="border-base-300 flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-base font-semibold">
            Crop image
          </h2>
          <p className="text-neutral-content truncate text-xs">{fileName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Close"
          className="text-neutral-content hover:bg-neutral hover:text-base-content rounded-md p-2 transition-colors"
        >
          <TbX className="size-4" />
        </button>
      </header>

      <CropStage
        src={state.src}
        natural={state.natural}
        loadFailed={state.loadFailed}
        crop={state.crop}
        aspect={state.aspect}
        onChange={state.setCrop}
        disabled={!!saving}
      />

      <div className="border-base-300 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3">
        <div
          className={`-mx-1 max-w-full overflow-x-auto px-1 ${state.natural && !saving ? "" : "pointer-events-none opacity-50"}`}
        >
          <ToolbarSegmentedControl
            compact
            aria-label="Aspect ratio"
            value={state.ratioKey}
            onChange={state.selectRatio}
            options={RATIO_OPTIONS}
          />
        </div>
        <p className="text-neutral-content text-xs tabular-nums" aria-live="polite">
          {state.pixelCrop ? cropSizeLabel(state.pixelCrop) : " "}
        </p>
      </div>

      <footer className="border-base-300 flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          role={error ? "alert" : undefined}
          className={`min-h-4 text-xs ${error ? "text-error" : "text-neutral-content"}`}
        >
          {error ?? hint}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:shrink-0 sm:flex-row">
          {showReplace && (
            <button
              type="button"
              onClick={() => save("replace")}
              disabled={!canSave}
              className={`${BUTTON_BASE} border-base-300 hover:bg-neutral border`}
            >
              {saving === "replace" && <TbLoader2 className="size-4 animate-spin" />}
              {saving === "replace" ? "Replacing…" : "Replace original"}
            </button>
          )}
          <button
            type="button"
            onClick={() => save("copy")}
            disabled={!canSave}
            className={`${BUTTON_BASE} bg-primary text-primary-content hover:bg-primary/90`}
          >
            {saving === "copy" && <TbLoader2 className="size-4 animate-spin" />}
            {saving === "copy" ? "Saving…" : "Save as copy"}
          </button>
        </div>
      </footer>
    </Modal>
  );
}
