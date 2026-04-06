import { useEditor, useNode } from "@craftjs/core";
import { useState } from "react";
import { TbCopy, TbDownload, TbUpload } from "react-icons/tb";
import { CodeEditor } from "../typography/CodeEditor";

interface ComponentImportExportProps {
  className?: string;
}

export const ComponentImportExport = ({ className = "" }: ComponentImportExportProps) => {
  const { id } = useNode();
  const { actions, query } = useEditor();

  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");
  const [activeImportExport, setActiveImportExport] = useState<"import" | "export">("export");

  const generateExportText = () => {
    try {
      const tree = query.node(id).toNodeTree();
      const nodePairs = Object.keys(tree.nodes).map(nodeId => [
        nodeId,
        query.node(nodeId).toSerializedNode(),
      ]);

      const componentData = {
        rootNodeId: tree.rootNodeId,
        nodes: Object.fromEntries(nodePairs),
        componentName:
          query.node(id).get().data.displayName || query.node(id).get().data.name || "Component",
        timestamp: new Date().toISOString(),
      };

      setExportText(JSON.stringify(componentData, null, 2));
    } catch (error) {
      console.error("Error generating component JSON:", error);
      setExportText("Error generating JSON");
    }
  };

  const handleImport = () => {
    if (!importText.trim()) {
      console.log("No import text provided");
      return;
    }

    try {
      const componentData = JSON.parse(importText);

      if (componentData.nodes && componentData.rootNodeId) {
        actions.deserialize(JSON.stringify(componentData));
        console.log("Component imported successfully");
        setImportText("");
      } else {
        console.error("Invalid component data structure");
      }
    } catch (error) {
      console.error("Error importing component:", error);
    }
  };

  const handleCopyExport = () => {
    navigator.clipboard
      .writeText(exportText)
      .then(() => console.log("Component JSON copied to clipboard"))
      .catch(err => console.error("Failed to copy JSON:", err));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tab buttons */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
        <button
          onClick={() => setActiveImportExport("export")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeImportExport === "export"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TbDownload className="size-4" />
          Export
        </button>
        <button
          onClick={() => setActiveImportExport("import")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeImportExport === "import"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TbUpload className="size-4" />
          Import
        </button>
      </div>

      {/* Export Tab */}
      {activeImportExport === "export" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={generateExportText}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <TbDownload className="size-4" />
              Generate JSON
            </button>
            <button
              onClick={handleCopyExport}
              disabled={!exportText}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TbCopy className="size-4" />
              Copy
            </button>
          </div>
          <CodeEditor
            value={exportText}
            onChange={setExportText}
            language="javascript"
            height="200px"
            readOnly
            foldGutter
            theme="auto"
            placeholder="Click 'Generate JSON' to create component data..."
          />
        </div>
      )}

      {/* Import Tab */}
      {activeImportExport === "import" && (
        <div className="space-y-3">
          <CodeEditor
            value={importText}
            onChange={setImportText}
            language="javascript"
            height="200px"
            foldGutter
            theme="auto"
            placeholder="Paste component JSON data here..."
          />
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TbUpload className="size-4" />
            Import Component
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {activeImportExport === "export"
          ? "Export this component's complete data structure as JSON"
          : "Import component data from JSON to replace current component"}
      </p>
    </div>
  );
};
