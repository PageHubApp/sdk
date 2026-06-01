import { getUploadAccept } from "@/utils/media/upload";

interface HiddenFileInputsProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  replaceInputRef: React.RefObject<HTMLInputElement | null>;
  /**
   * SSR/initial value for the replace `<input>`. The real per-replace accept
   * is set imperatively in `MediaManagerModal.onReplace` BEFORE click().
   */
  replaceAccept: string;
  handleUpload: (files: FileList | null) => void;
  handleReplaceMedia: (files: FileList | null) => void;
}

export function HiddenFileInputs({
  fileInputRef,
  replaceInputRef,
  replaceAccept,
  handleUpload,
  handleReplaceMedia,
}: HiddenFileInputsProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={getUploadAccept()}
        multiple
        onChange={e => handleUpload(e.target.files)}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept={replaceAccept}
        onChange={e => handleReplaceMedia(e.target.files)}
        className="hidden"
      />
    </>
  );
}
