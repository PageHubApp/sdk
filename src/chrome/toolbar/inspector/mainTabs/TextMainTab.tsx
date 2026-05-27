import { Suspense, lazy, useState } from "react";
import { useEditor, useNode } from "@craftjs/core";
import { TbCode } from "react-icons/tb";
import { Chip } from "@/chrome/primitives/Chip";
import { SlotRenderer } from "../../../../registry";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { getEditorVariableOptions } from "../../../../utils/editorVariableOptions";
import { ToolbarSegmentedControl } from "../../primitives/ToolbarSegmentedControl";
import { IpsumGenerator } from "../../inputs/media/IpsumGenerator";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

const CodeEditor = lazy(() =>
  import("../../inputs/typography/CodeEditor").then(m => ({ default: m.CodeEditor }))
);

function HtmlEditorBody() {
  const { query } = useEditor();
  const {
    actions: { setProp },
    id,
    text,
  } = useNode(node => ({
    text: typeof node.data.props?.text === "string" ? node.data.props.text : "",
  }));
  const variableOptions = getEditorVariableOptions(query);
  return (
    <div className="bg-base-100 flex min-h-0 flex-1 flex-col p-4">
      <div className="min-h-0 flex-1 [&>div]:h-full">
        <Suspense fallback={null}>
          <CodeEditor
            value={text}
            onChange={val => setProp((props: any) => (props.text = val))}
            language="html"
            height="100%"
            lineNumbers={false}
            theme="auto"
            autoFormatOnMount
            autoFormatMountKey={id}
            toolbarDenseCode
            htmlVariableCompletionOptions={variableOptions}
            placeholder="Enter HTML content"
          />
        </Suspense>
      </div>
    </div>
  );
}

type RichTextMode = "full" | "inline";

const FORMAT_OPTIONS: { value: RichTextMode; label: string }[] = [
  { value: "full", label: "Rich" },
  { value: "inline", label: "Inline" },
];

function FormatControl() {
  const {
    actions: { setProp },
    mode,
  } = useNode((node: any) => ({
    mode: (node.data?.props?.richText?.mode as RichTextMode | undefined) || "full",
  }));

  return (
    <Chip label="Format" frame="bare">
      <div className="min-w-0 flex-1">
        <ToolbarSegmentedControl
          dense
          aria-label="Text format"
          value={mode}
          onChange={next =>
            setProp((p: any) => {
              if (!p.richText || typeof p.richText !== "object") p.richText = {};
              p.richText.mode = next;
            }, 0)
          }
          options={FORMAT_OPTIONS}
        />
      </div>
    </Chip>
  );
}

export const TextMainTab = () => {
  const [htmlOpen, setHtmlOpen] = useState(false);

  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <IpsumGenerator propKey="text" propType="component" />
        <FormatControl />
        <div className="flex w-full gap-2 [&>*]:flex-1">
          <button type="button" className="ph-toolbar-dashed-btn" onClick={() => setHtmlOpen(true)}>
            <TbCode size={12} aria-hidden />
            Edit HTML
          </button>
          <SlotRenderer id="settings/ai-button" />
        </div>
        <FloatingPanel
          isOpen={htmlOpen}
          onClose={() => setHtmlOpen(false)}
          title="Edit HTML"
          icon={<TbCode className="size-3.5" />}
          storageKey="textContentEditor"
          autoSize={false}
          defaultWidth={720}
          defaultHeight={520}
          minWidth={420}
          maxWidth={1100}
          minHeight={320}
          maxHeight={900}
          backdrop
          edges={["e", "s", "se", "w", "sw", "n", "ne", "nw"]}
        >
          {htmlOpen ? <HtmlEditorBody /> : null}
        </FloatingPanel>
      </ToolbarSection>
    ),
  });
};
