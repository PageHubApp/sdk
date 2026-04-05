// @ts-nocheck
import { useEditor } from "@craftjs/core";
import { GetSignedUrl, SaveMedia } from "./lib";
import Image from "next/image";
import { useState } from "react";
import { TbAlertTriangle, TbPhoto, TbTrash, TbUpload } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { SettingsAtom } from "utils/atoms";
import { getMediaContent } from "utils/lib";
import Spinner from "../Toolbar/Helpers/Spinner";
import { MediaManagerModal } from "../Toolbar/Inputs/media/MediaManagerModal";

const handleFileSelection = (e, setErrors) => {
  const errors = [];
  const files = [];

  for (let i = 0; i < e.target?.files?.length; i++) {
    const _file = e.target.files[i];
    files.push(_file);
  }

  setErrors(errors);
  return files;
};

const uploadFiles = async (files, settings, setErrors) => {
  const _saved = [];

  const geturl = await GetSignedUrl();
  const signedURL = geturl?.result?.uploadURL;

  if (!signedURL) {
    setErrors([{ error: "Failed to upload", file: files[0] }]);
  } else {
    for (const file of files) {
      const res = await SaveMedia(file, signedURL);
      if (res?.result?.id) _saved.push(res.result.id);
    }
  }

  return _saved;
};

interface StandaloneImagePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  help?: string;
}

export const StandaloneImagePicker = ({
  value,
  onChange,
  label = "Upload Image",
  help,
}: StandaloneImagePickerProps) => {
  const { query } = useEditor();
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);

  const settings = useAtomValue(SettingsAtom);

  let timeout;

  const handleChange = async (e) => {
    if (timeout) clearTimeout(timeout);

    setSaved(false);
    setErrors([]);
    setLoading(true);
    setEnabled(false);

    const files = handleFileSelection(e, setErrors);

    if (files.length) {
      const savedFiles = await uploadFiles(files, settings, setErrors);
      if (savedFiles.length > 0) {
        onChange(savedFiles[0]);
      }
    }

    setLoading(false);
    setEnabled(true);
    setSaved(true);

    timeout = setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  const handleBrowseSelect = (selectedMediaId: string) => {
    if (!selectedMediaId) return;
    onChange(selectedMediaId);
    setShowMediaBrowser(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    onChange("");
  };

  let displayLabel = label;
  if (loading) displayLabel = "Uploading";
  if (saved) displayLabel = "Saved";
  if (errors.length) displayLabel = "Error";

  const hasUploadedImage = !!value;
  const mediaContent = hasUploadedImage ? getMediaContent(query, value) : null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label
          htmlFor={`file-upload-${label}`}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 transition-all ${
            errors.length
              ? "border-destructive bg-destructive text-destructive-foreground"
              : saved
                ? "border-secondary bg-secondary text-secondary-foreground"
                : loading
                  ? "border-primary bg-muted text-primary"
                  : "border-border bg-muted text-foreground hover:border-primary hover:bg-muted"
          } ${!enabled && "cursor-not-allowed opacity-50"}`}
        >
          {loading ? (
            <Spinner />
          ) : errors.length ? (
            <TbAlertTriangle className="text-xl" />
          ) : (
            <TbUpload className="text-xl" />
          )}
          <span className="text-sm font-medium">{displayLabel}</span>
          <input
            id={`file-upload-${label}`}
            type="file"
            onChange={handleChange}
            disabled={!enabled}
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/svg+xml"
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={() => setShowMediaBrowser(true)}
          className="flex items-center gap-2 rounded-lg border-2 border-border px-4 py-3 text-foreground transition-all hover:border-primary hover:bg-muted"
        >
          <TbPhoto className="text-xl" />
          <span className="text-sm font-medium">Browse</span>
        </button>

        {hasUploadedImage && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-2 rounded-lg border-2 border-destructive px-4 py-3 text-destructive transition-all hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <TbTrash className="text-xl" />
          </button>
        )}
      </div>

      {help && <p className="text-xs text-muted-foreground">{help}</p>}

      {errors.length > 0 && (
        <div className="text-sm text-destructive">
          {errors.map((err, idx) => (
            <div key={idx}>{err.error}</div>
          ))}
        </div>
      )}

      {hasUploadedImage && mediaContent && (
        <div className="relative h-48 w-full overflow-hidden rounded-lg bg-muted text-muted-foreground">
          <img
            src={mediaContent}
            alt="Preview"
            className="size-full object-cover"
          />
        </div>
      )}

      <MediaManagerModal
        isOpen={showMediaBrowser}
        onClose={() => setShowMediaBrowser(false)}
        onSelect={handleBrowseSelect}
        selectionMode={true}
      />
    </div>
  );
};
