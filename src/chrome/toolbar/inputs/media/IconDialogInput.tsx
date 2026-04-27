import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { editorCanvasViewToClassPrefixKey } from "@/utils/tailwind/className";
import { changeProp } from "../../../viewport/viewportExports";
import { ViewAtom } from "../../../viewport/atoms";
import { ViewSelectionAtom } from "../../Label";
import { Wrap } from "../../ToolbarStyle";
import ClientIconLoader from "../../dialogs/ClientIconLoader";
import { IconPickerPopover } from "../../dialogs/IconDialog/IconPickerPopover";
import { InlineClearButton } from "../../../primitives/InlineClearButton";

export const IconDialogInput = ({
  propKey,
  label = "",
  prefix = "",
  index = null,
  propItemKey = "",
  propType = "class",
  inline = true,
  labelWidth = "",
  inputWidth = "",
}) => {
  const { actions, query } = useEditor();
  const canvasView = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classWriteView = editorCanvasViewToClassPrefixKey(canvasView);

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data.props || {},
    id: node.id,
  }));

  const changed = (value: string) => {
    changeProp({
      propType,
      propKey,
      value,
      setProp,
      index,
      propItemKey,
      query,
      actions,
      nodeId: id,
      ...(propType === "class" ? { view: classWriteView, classDark } : {}),
    });
  };

  // Resolve the current value: array access (navItems[0].icon) vs nested (icon.value).
  let value = "";
  if (index !== null && propItemKey) {
    value = nodeProps[propKey]?.[index]?.[propItemKey] || "";
  } else {
    const keys = propKey.split(".");
    let val: any = nodeProps;
    for (const key of keys) {
      val = val?.[key];
      if (val === undefined) break;
    }
    value = typeof val === "string" ? val : "";
  }

  return (
    <Wrap
      props={{ label, labelHide: true }}
      lab={value}
      propType={propType}
      propKey={propKey}
      inline={inline}
      inputWidth={inputWidth}
      labelWidth={labelWidth}
    >
      <div className="relative">
        <IconPickerPopover
          value={value}
          prefix={prefix}
          onChange={changed}
          triggerAriaLabel={value ? `Icon: ${value}` : "Choose icon"}
          triggerClassName="input flex h-12 w-[70px]! cursor-pointer items-center justify-center overflow-hidden px-1"
          triggerContent={
            <div
              className="text-base-content pointer-events-none flex h-6 w-6 cursor-pointer items-center justify-center"
              aria-hidden="true"
            >
              <ClientIconLoader value={value} />
            </div>
          }
        />

        {value && (
          <InlineClearButton onClick={() => changed("")} tooltip="Clear icon" floating />
        )}
      </div>
    </Wrap>
  );
};
