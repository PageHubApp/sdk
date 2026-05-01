import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import lz from "lzutf8";
import { useState } from "react";
import { TbDownload, TbUpload } from "react-icons/tb";
import { useSDK } from "../../../core/context";
import { SidebarTabsPane } from "../../primitives/SidebarTabsPane";

export interface ImportExportPanelProps {
  onClose: () => void;
}

export function ImportExportPanel({ onClose }: ImportExportPanelProps) {
  const { config } = useSDK();
  const handoffExtras = config.editorChromeSlots?.renderImportExportHandoffExtras;
  const [activeTab, setActiveTab] = useState<"import" | "export">("export");
  const [stateToLoad, setStateToLoad] = useState("");

  const { actions } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  const handleImport = () => {
    if (!stateToLoad) {
      return;
    }

    try {
      let json;

      if (stateToLoad.trim().startsWith("{") || stateToLoad.trim().startsWith("[")) {
        json = stateToLoad;
      } else {
        json = lz.decompress(lz.decodeBase64(stateToLoad));
      }

      actions.deserialize(json);
      actions.selectNode(ROOT_NODE);
      onClose();
    } catch (e) {
      console.error("Import failed:", e);
    }
  };

  return (
    <SidebarTabsPane
      className="h-full"
      bodyClassName="overflow-y-auto bg-base-100"
      ariaLabel="Import or export"
      value={activeTab}
      onValueChange={id => setActiveTab(id as "import" | "export")}
      tabs={[
        {
          id: "export",
          label: "Export",
          icon: <TbDownload className="size-4 shrink-0 opacity-80" aria-hidden />,
          content: (
            <div className="p-6">
              {handoffExtras ? (
                handoffExtras()
              ) : (
                <p className="text-base-content/70 text-sm">
                  Site downloads are not configured for this editor build.
                </p>
              )}
            </div>
          ),
        },
        {
          id: "import",
          label: "Import",
          icon: <TbUpload className="size-4 shrink-0 opacity-80" aria-hidden />,
          content: (
            <div className="p-6">
              <h4 className="text-base-content text-sm font-medium">Import from backup</h4>
              <p className="text-base-content/70 mt-1 text-xs">
                Replace this page with the same{" "}
                <span className="text-base-content font-medium">site JSON</span> you download under
                Export.
              </p>

              <div className="border-base-300 mt-4 border-t pt-4">
                <h5 className="text-base-content text-xs font-semibold">Paste backup</h5>
                <p className="text-base-content/70 mt-1 text-xs">
                  Paste the full file contents, then import. This overwrites the current page in the
                  builder.
                </p>

                <textarea
                  placeholder="Paste site JSON here…"
                  required={true}
                  autoFocus={true}
                  value={stateToLoad}
                  onChange={e => setStateToLoad(e.target.value)}
                  className="border-base-300 bg-base-100 text-base-content focus:ring-primary mt-3 min-h-[14rem] w-full resize-y rounded-lg border p-3 font-mono text-xs leading-relaxed focus:ring-2 focus:outline-none"
                  rows={14}
                  spellCheck={false}
                />

                <button
                  type="button"
                  className="btn btn-outline border-base-content/30 disabled:border-base-300 disabled:text-base-content/30 mt-3 w-full normal-case disabled:bg-transparent"
                  onClick={handleImport}
                  disabled={!stateToLoad.trim()}
                >
                  Import layout
                </button>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
