import { useEditor } from "@craftjs/core";
import Image from "next/image";
import { useState } from "react";
import { TbAlertTriangle, TbPhoto, TbTrash, TbUpload } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { SettingsAtom } from "../../utils/atoms";
import { getMediaContent } from "../../utils/lib";
import { MediaUploadError, uploadImageToCdn } from "../../utils/media/upload";
import Spinner from "../toolbar/helpers/Spinner";
import { MediaManagerModal } from "../toolbar/inputs/media/MediaManagerModal";

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

const uploadFiles = async (files, _settings, setErrors) => {
  const _saved = [];
  for (const file of files) {
    try {
      const { mediaId } = await uploadImageToCdn(file);
      _saved.push(mediaId);
    } catch (error) {
      const message =
        error instanceof MediaUploadError ? error.message : `Failed to upload ${file.name}`;
      setErrors([{ error: message, file }]);
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

  const handleChange = async e => {
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
          className={`btn btn-outline flex-1 ${
            errors.length
              ? "btn-error"
              : saved
                ? "btn-secondary"
                : loading
                  ? "btn-primary"
                  : "border-base-300 hover:border-primary"
          } ${!enabled ? "btn-disabled" : ""}`}
        >
          {loading ? (
            <Spinner />
          ) : errors.length ? (
            <TbAlertTriangle className="size-4" />
          ) : (
            <TbUpload className="size-4" />
          )}
          <span>{displayLabel}</span>
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
          className="btn btn-outline border-base-300 hover:border-primary"
        >
          <TbPhoto className="size-4" />
          <span>Browse</span>
        </button>

        {hasUploadedImage && (
          <button
            type="button"
            onClick={handleClear}
            className="btn btn-outline btn-error btn-square"
            aria-label="Remove image"
          >
            <TbTrash className="size-4" />
          </button>
        )}
      </div>

      {help && <p className="text-neutral-content text-xs">{help}</p>}

      {errors.length > 0 && (
        <div className="text-error text-sm">
          {errors.map((err, idx) => (
            <div key={idx}>{err.error}</div>
          ))}
        </div>
      )}

      {hasUploadedImage && mediaContent && (
        <div className="bg-neutral text-neutral-content relative h-48 w-full overflow-hidden rounded-lg">
          <img src={mediaContent} alt="Preview" className="size-full object-cover" />
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
