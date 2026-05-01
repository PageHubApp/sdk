import { Chip } from "@/chrome/primitives/Chip";

export function CopyToClipboardForm({
  action,
  patch,
}: {
  action: any;
  patch: (p: any) => void;
}) {
  return (
    <Chip>
      <input
        type="text"
        defaultValue={action.text || ""}
        onChange={e => patch({ text: e.target.value })}
        placeholder="Text to copy..."
        className="h-full w-full bg-transparent px-1 text-xs outline-none"
        aria-label="Text to copy"
      />
    </Chip>
  );
}

export function DownloadFileForm({ action, patch }: { action: any; patch: (p: any) => void }) {
  return (
    <>
      <Chip>
        <input
          type="url"
          defaultValue={action.url || ""}
          onChange={e => patch({ url: e.target.value })}
          placeholder="https://example.com/file.pdf"
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
          aria-label="File URL"
        />
      </Chip>
      <Chip>
        <input
          type="text"
          defaultValue={action.filename || ""}
          onChange={e => patch({ filename: e.target.value })}
          placeholder="Filename (optional)"
          className="h-full w-full bg-transparent px-1 text-xs outline-none"
          aria-label="Download filename"
        />
      </Chip>
    </>
  );
}
