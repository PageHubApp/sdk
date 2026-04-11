import { ROOT_NODE, useEditor } from "@craftjs/core";
import lz from "lzutf8";
import { useState } from "react";
import { TbDownload, TbUpload } from "react-icons/tb";
import { useSDK } from "../../context";
import { SidebarTabsPane } from "../shared/SidebarTabsPane";

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
                <p className="text-sm text-base-content/70">
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
              <h4 className="text-sm font-medium text-base-content">Import from backup</h4>
              <p className="mt-1 text-xs text-base-content/70">
                Replace this page with the same{" "}
                <span className="font-medium text-base-content">site JSON</span> you download under
                Export.
              </p>

              <div className="mt-4 border-t border-base-300 pt-4">
                <h5 className="text-xs font-semibold text-base-content">Paste backup</h5>
                <p className="mt-1 text-xs text-base-content/70">
                  Paste the full file contents, then import. This overwrites the current page in the
                  builder.
                </p>

                <textarea
                  placeholder="Paste site JSON here…"
                  required={true}
                  autoFocus={true}
                  value={stateToLoad}
                  onChange={e => setStateToLoad(e.target.value)}
                  className="mt-3 w-full min-h-[14rem] resize-y rounded-lg border border-base-300 bg-base-100 p-3 font-mono text-xs leading-relaxed text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={14}
                  spellCheck={false}
                />

                <button
                  type="button"
                  className="btn btn-outline mt-3 w-full border-base-content/30 normal-case disabled:border-base-300 disabled:bg-transparent disabled:text-base-content/30"
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
