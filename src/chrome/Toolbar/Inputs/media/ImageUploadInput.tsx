import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { GetSignedUrl, SaveMedia } from "../../../Viewport/lib";
import { useState } from "react";
import { TbAlertTriangle, TbPhoto, TbUpload } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { SettingsAtom } from "utils/atoms";
import { getImageDimensionsFromFile } from "utils/imageDimensions";
import { getMediaContent, registerMediaWithBackground } from "utils/lib";
import Spinner from "../../Helpers/Spinner";
import { MediaManagerModal } from "./MediaManagerModal";

import { Wrap } from "../../ToolbarStyle";

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

const uploadFiles = async (files, settings, setErrors, query, actions) => {
  const _saved = [];

  const geturl = await GetSignedUrl();
  const signedURL = geturl?.result?.uploadURL;

  if (!signedURL) {
    setErrors([{ error: "Failed to upload", file: files[0] }]);
  } else {
    for (const file of files) {
      try {
        const res = await SaveMedia(file, signedURL);
        if (res?.result?.id) {
          const mediaId = res.result.id;
          _saved.push(mediaId);

          // Extract dimensions and store metadata
          try {
            const dimensions = await getImageDimensionsFromFile(file);
            console.log(`📐 Extracted dimensions for ${file.name}:`, dimensions);

            // Store metadata with dimensions
            actions.setProp(ROOT_NODE, (props: any) => {
              props.pageMedia = props.pageMedia || [];
              const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

              if (existingMedia) {
                existingMedia.metadata = {
                  ...existingMedia.metadata,
                  title: file.name,
                  alt: file.name.replace(/\.[^/.]+$/, ""),
                  size: file.size,
                  dimensions: {
                    width: dimensions.width,
                    height: dimensions.height,
                    aspectRatio: dimensions.aspectRatio,
                  },
                };
              }
            });
          } catch (dimensionError) {
            console.warn(`Failed to extract dimensions for ${file.name}:`, dimensionError);
            // Still save without dimensions
            actions.setProp(ROOT_NODE, (props: any) => {
              props.pageMedia = props.pageMedia || [];
              const existingMedia = props.pageMedia.find((m: any) => m.id === mediaId);

              if (existingMedia) {
                existingMedia.metadata = {
                  ...existingMedia.metadata,
                  title: file.name,
                  alt: file.name.replace(/\.[^/.]+$/, ""),
                  size: file.size,
                };
              }
            });
          }
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        setErrors([{ error: `Failed to upload ${file.name}`, file }]);
      }
    }
  }

  return _saved;
};

const updateNodeProps = (setProp, isLoading, loaded, propKey = null, typeKey = null, id = null) => {
  setProp(_props => {
    _props.isLoading = isLoading;
    _props.loaded = loaded;
    if (id) {
      _props[propKey] = id;
      _props[typeKey] = "cdn";
    }
  }, 3000);
};

export const ImageUploadInput: any = ({
  full = false,
  multiple = false,
  propKey,
  typeKey,
  onChange,
  index,
  label = "Upload Image",
  accept = "image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/svg+xml",
  ...props
}) => {
  const {
    actions: { setProp },
    nodeProps,
    id: componentId,
  } = useNode(node => ({
    nodeProps: node.data.props,
  }));

  const { query, actions } = useEditor();

  const [errors, setErrors] = useState([]);
  const [value] = useState("");
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

    updateNodeProps(setProp, true, false);

    const files = handleFileSelection(e, setErrors);
    const _saved = [];

    if (files.length) {
      // Note: We don't delete old media from the library anymore
      // Media stays in the library until explicitly deleted via Media Manager

      const savedFiles = await uploadFiles(files, settings, setErrors, query, actions);
      _saved.push(...savedFiles);
    }

    setLoading(false);
    setEnabled(true);
    setSaved(true);

    updateNodeProps(setProp, false, true);

    setTimeout(() => {
      _saved.forEach(id => {
        updateNodeProps(setProp, false, true, propKey, typeKey, id);
        // Register new media with Background
        registerMediaWithBackground(query, actions, id, "cdn", componentId);
      });
    }, 500);

    timeout = setTimeout(() => {
      setSaved(false);
      updateNodeProps(setProp, false, false);
    }, 3000);
  };

  const handleBrowseSelect = (selectedMediaId: string) => {
    if (!selectedMediaId) return;

    // Note: We don't unregister old media - it stays in the library
    // Media is only removed via delete button in Media Manager

    // Set the new media ID - metadata will be looked up at render time
    setProp(_props => {
      _props[propKey] = selectedMediaId;
      _props[typeKey] = "cdn";
    });

    // Register with background (if not already registered)
    registerMediaWithBackground(query, actions, selectedMediaId, "reference", componentId);

    setShowMediaBrowser(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) label = "Uploading";
  if (saved) label = "Saved";
  if (errors.length) label = "Error";

  const mediaId = nodeProps[propKey];
  const hasUploadedImage = !!mediaId;
  // Use getMediaContent to handle both CDN and base64
  const imageUrl = hasUploadedImage ? getMediaContent(query, mediaId) : null;

  if (hasUploadedImage && !loading && !saved) {
    label = "Change Image";
  }

  return (
    <Wrap props={props}>
      <div className="flex gap-2">
        {/* Upload Button */}
        <label
          htmlFor={`files-${componentId}`}
          className={`btn w-full ${
            !enabled ? "opacity-50" : ""
          } ${hasUploadedImage ? "relative overflow-hidden" : ""}`}
        >
          {hasUploadedImage && imageUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          )}
          <div className="relative z-10 flex gap-3">
            <div className="">
              {errors.length ? <TbAlertTriangle /> : null}
              {!loading && !errors.length && <TbUpload />}
              {loading && <Spinner />}
            </div>{" "}
            {label}
          </div>
        </label>

        {/* Browse Button */}
        <button
          onClick={() => setShowMediaBrowser(true)}
          className="btn flex gap-2"
          title="Browse media library"
        >
          <TbPhoto />
          Browse
        </button>
      </div>

      <input
        id={`files-${componentId}`}
        className="hidden"
        type="file"
        multiple={multiple}
        value={value}
        onChange={handleChange}
        accept={accept}
      />

      {errors.length ? (
        <div className="whitespace-nowrap py-3">
          {errors.map((error, key) => (
            <div key={key}>{error.error}</div>
          ))}
        </div>
      ) : null}

      {/* Media Browser Modal */}
      <MediaBrowserSelector
        isOpen={showMediaBrowser}
        onClose={() => setShowMediaBrowser(false)}
        onSelect={handleBrowseSelect}
      />
    </Wrap>
  );
};

// Simplified media browser that wraps MediaManagerModal for selection
const MediaBrowserSelector = ({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaId: string) => void;
}) => {
  const handleSelect = (mediaId: string) => {
    onSelect(mediaId);
    onClose();
  };

  return (
    <MediaManagerModal
      isOpen={isOpen}
      onClose={onClose}
      onSelect={handleSelect}
      selectionMode={true}
    />
  );
};
