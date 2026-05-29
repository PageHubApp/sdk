import { useEditor, useNode } from "@craftjs/core";
import { useState } from "react";
import { TbCopy, TbDownload, TbUpload } from "react-icons/tb";
import { ToolbarSegmentedControl } from "../../primitives/ToolbarSegmentedControl";
import { CodeEditor } from "../typography/CodeEditor";
import { sdkLog } from "../../../../utils/logger";

export const ComponentImportExport = ({ className = "" }: { className?: string }) => {
  const { id } = useNode();
  const { actions, query } = useEditor();

  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");

  const generateExportText = () => {
    try {
      const tree = query.node(id).toNodeTree();
      const nodePairs = Object.keys(tree.nodes).map(nodeId => [
        nodeId,
        query.node(nodeId).toSerializedNode(),
      ]);
      setExportText(
        JSON.stringify(
          {
            rootNodeId: tree.rootNodeId,
            nodes: Object.fromEntries(nodePairs),
            componentName:
              query.node(id).get().data.displayName ||
              query.node(id).get().data.name ||
              "Component",
            timestamp: new Date().toISOString(),
          },
          null,
          2
        )
      );
    } catch (error) {
      sdkLog.error("Error generating component JSON:", error);
      setExportText("Error generating JSON");
    }
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    try {
      const data = JSON.parse(importText);
      if (data.nodes && data.rootNodeId) {
        actions.deserialize(JSON.stringify(data));
        setImportText("");
      } else {
        sdkLog.error("Invalid component data structure");
      }
    } catch (error) {
      sdkLog.error("Error importing component:", error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText).catch(err => sdkLog.error("Failed to copy:", err));
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <ToolbarSegmentedControl
        aria-label="Import or export component JSON"
        value={activeTab}
        onChange={v => setActiveTab(v as "export" | "import")}
        options={[
          {
            value: "export",
            label: (
              <>
                <TbDownload className="size-3.5 shrink-0" />
                Export
              </>
            ),
          },
          {
            value: "import",
            label: (
              <>
                <TbUpload className="size-3.5 shrink-0" />
                Import
              </>
            ),
          },
        ]}
      />

      {activeTab === "export" ? (
        <>
          <div className="flex gap-1.5">
            <button
              onClick={generateExportText}
              className="border-base-300 bg-base-200 text-base-content hover:bg-base-300/25 flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors"
            >
              <TbDownload className="size-3.5" />
              Generate JSON
            </button>
            <button
              onClick={handleCopy}
              disabled={!exportText}
              className="border-base-300 bg-base-200 text-base-content hover:bg-base-300/25 flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TbCopy className="size-3.5" />
              Copy
            </button>
          </div>
          <CodeEditor
            value={exportText}
            onChange={setExportText}
            language="javascript"
            height="150px"
            readOnly
            lineNumbers={false}
            theme="auto"
            placeholder="Click 'Generate JSON'..."
          />
        </>
      ) : (
        <>
          <CodeEditor
            value={importText}
            onChange={setImportText}
            language="javascript"
            height="150px"
            lineNumbers={false}
            theme="auto"
            placeholder="Paste component JSON here..."
          />
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="border-base-300 bg-base-200 text-base-content hover:bg-base-300/25 flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TbUpload className="size-3.5" />
            Import Component
          </button>
        </>
      )}
    </div>
  );
};
