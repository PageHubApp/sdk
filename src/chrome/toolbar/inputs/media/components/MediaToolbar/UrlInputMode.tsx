import { TbInfoCircle } from "react-icons/tb";

interface UrlInputModeProps {
  urlInput: string;
  saveUrlToCdn: boolean;
  uploading: boolean;
  setUrlInput: (v: string) => void;
  setSaveUrlToCdn: (v: boolean) => void;
  handleAddUrl: () => void;
}

export function UrlInputMode({
  urlInput,
  saveUrlToCdn,
  uploading,
  setUrlInput,
  setSaveUrlToCdn,
  handleAddUrl,
}: UrlInputModeProps) {
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="input-dialog placeholder:text-neutral-content flex-1"
          onKeyDown={e => e.key === "Enter" && handleAddUrl()}
          autoFocus
        />
        <button
          type="button"
          onClick={handleAddUrl}
          disabled={!urlInput.trim() || uploading}
          className="btn btn-primary text-sm!"
        >
          Add
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="checkbox"
          id="saveUrlToCdn"
          checked={saveUrlToCdn}
          onChange={e => setSaveUrlToCdn(e.target.checked)}
          className="border-base-300 bg-neutral text-accent focus:ring-ring size-4 rounded-lg"
        />
        <label htmlFor="saveUrlToCdn" className="text-neutral-content text-xs">
          Save to CDN (downloads image to your account)
        </label>
      </div>
      <div className="text-neutral-content mt-2 text-xs">
        <TbInfoCircle className="mr-1 inline" /> Tip: You can also paste images directly (Ctrl+V /
        Cmd+V) or use the clipboard button above!
      </div>
    </div>
  );
}
