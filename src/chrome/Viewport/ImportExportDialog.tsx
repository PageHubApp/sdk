import { ROOT_NODE, useEditor } from "@craftjs/core";
import lz from "lzutf8";
import { useState } from "react";
import { TbDownload, TbUpload } from "react-icons/tb";
import { LeftSidebarDialog } from "../Toolbar/Tools/LeftSidebarDialog";

interface ImportExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportExportDialog = ({ isOpen, onClose }: ImportExportDialogProps) => {
  const [activeTab, setActiveTab] = useState<"import" | "export">("export");
  const [stateToLoad, setStateToLoad] = useState("");
  const [exportFormat, setExportFormat] = useState<"compressed" | "json">("compressed");

  // Detect import format
  const detectedFormat =
    stateToLoad.trim().startsWith("{") || stateToLoad.trim().startsWith("[")
      ? "json"
      : stateToLoad.trim()
        ? "compressed"
        : null;

  const { query, actions } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  const json = query.serialize();
  const compressedData = lz.encodeBase64(lz.compress(json));
  const exportData =
    exportFormat === "compressed" ? compressedData : JSON.stringify(JSON.parse(json), null, 2);

  const handleImport = () => {
    if (!stateToLoad) {
      return;
    }

    try {
      let json;

      // Try to detect if it's JSON or compressed data
      if (stateToLoad.trim().startsWith("{") || stateToLoad.trim().startsWith("[")) {
        // It's JSON data
        json = stateToLoad;
      } else {
        // It's compressed data
        json = lz.decompress(lz.decodeBase64(stateToLoad));
      }

      actions.deserialize(json);
      actions.selectNode(ROOT_NODE);
      onClose();
    } catch (e) {
      console.error("Import failed:", e);
      // You could add a toast notification here to show the error to the user
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData);
  };

  return (
    <LeftSidebarDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import / Export"
      icon={activeTab === "export" ? <TbDownload /> : <TbUpload />}
      position="absolute"
    >
      <div className="flex h-full flex-col">
        {/* Tab Navigation */}
        <div className="flex border-b border-base-300 bg-neutral">
          <button
            onClick={() => setActiveTab("export")}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "export"
                ? "border-b-2 border-primary bg-base-100 text-primary"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            <TbDownload />
            Export
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "import"
                ? "border-b-2 border-primary bg-base-100 text-primary"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            <TbUpload />
            Import
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-base-100">
          {activeTab === "export" ? (
            <div className="space-y-6 p-6">
              <div>
                <h3 className="text-lg font-medium">Export Page Layout</h3>
                <p className="mt-2 text-sm text-neutral-content">
                  Copy and save this exported version of your page. You can then import it at
                  anytime into a builder.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="flex gap-1 rounded-lg border border-base-300 bg-neutral p-1">
                    <button
                      onClick={() => setExportFormat("compressed")}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        exportFormat === "compressed"
                          ? "bg-base-100 text-base-content shadow-sm"
                          : "text-neutral-content hover:text-base-content"
                      }`}
                    >
                      Compressed
                    </button>
                    <button
                      onClick={() => setExportFormat("json")}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        exportFormat === "json"
                          ? "bg-base-100 text-base-content shadow-sm"
                          : "text-neutral-content hover:text-base-content"
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>

                <pre
                  className="input h-32 max-h-[200px] w-full overflow-auto whitespace-pre-wrap break-all p-3 text-xs"
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                >
                  {exportData}
                </pre>
              </div>

              <button className="btn w-full py-3" autoFocus={true} onClick={handleCopy}>
                Copy to Clipboard
              </button>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div>
                <h3 className="text-lg font-medium">Import Page Layout</h3>
                <p className="mt-2 text-sm text-neutral-content">
                  Paste exported data and click Import to update this builder with your exported
                  version. Supports both compressed and JSON formats.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="flex gap-1 rounded-lg border border-base-300 bg-neutral p-1">
                    <div
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        detectedFormat === "compressed"
                          ? "bg-base-100 text-base-content shadow-sm"
                          : "text-neutral-content"
                      }`}
                    >
                      Compressed
                    </div>
                    <div
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        detectedFormat === "json"
                          ? "bg-base-100 text-base-content shadow-sm"
                          : "text-neutral-content"
                      }`}
                    >
                      JSON
                    </div>
                  </div>
                </div>

                <textarea
                  placeholder="Paste your exported data here (compressed or JSON format)..."
                  required={true}
                  autoFocus={true}
                  value={stateToLoad}
                  onChange={e => setStateToLoad(e.target.value)}
                  className="input w-full p-3 text-sm"
                  rows={6}
                />
              </div>

              <button
                className="btn w-full py-3"
                onClick={handleImport}
                disabled={!stateToLoad.trim()}
              >
                Import Layout
              </button>
            </div>
          )}
        </div>
      </div>
    </LeftSidebarDialog>
  );
};
