import { Suspense, lazy, useState } from "react";
import { useEditor, useNode } from "@craftjs/core";
import { TbCode } from "react-icons/tb";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { getEditorVariableOptions } from "../../../../utils/editorVariableOptions";
import { ItemAdvanceToggle } from "../../helpers/ItemSelector";
import { QuickLinkInput } from "../../inputs/action/LinkInput";
import { IpsumGenerator } from "../../inputs/media/IpsumGenerator";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

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

export const TextMainTab = () => {
  const [htmlOpen, setHtmlOpen] = useState(false);

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="The HTML content displayed in this text block."
      >
        <QuickLinkInput />
        <button
          type="button"
          className="ph-toolbar-dashed-btn"
          onClick={() => setHtmlOpen(true)}
        >
          <TbCode size={12} aria-hidden />
          Edit HTML
        </button>
        <FloatingPanel
          isOpen={htmlOpen}
          onClose={() => setHtmlOpen(false)}
          title="Edit HTML"
          icon={<TbCode className="size-3.5" />}
          storageKey="textContentEditor"
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
        <SettingsAiSlot />
        <IpsumGenerator propKey="text" propType="component" />
        <ItemAdvanceToggle propKey="textContentAdvanced" title="More content properties">
          <ToolbarItem
            propKey="richText.mode"
            propType="component"
            type="select"
            label="Editor profile"
          >
            <option value="full">Full (paragraphs, lists, images)</option>
            <option value="inline">Inline (no block wrapper in saved HTML)</option>
          </ToolbarItem>
        </ItemAdvanceToggle>
      </ToolbarSection>
    ),
  });
};
