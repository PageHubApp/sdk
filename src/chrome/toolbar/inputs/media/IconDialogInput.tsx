import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../viewport/viewportExports";
import { ViewAtom } from "../../../viewport/atoms";
import { getRect } from "../../../viewport/useRect";
import { useRef, useState } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { editorCanvasViewToClassPrefixKey } from "@/utils/tailwind/className";
import { ViewSelectionAtom } from "../../Label";
import { Wrap } from "../../ToolbarStyle";
import ClientIconLoader from "../../dialogs/ClientIconLoader";
import { IconPickerDialogAtom } from "../../dialogs/GoogleIconDialog";
import { useDialog } from "../../dialogs/toolHooks";
import { MediaManagerModal } from "./MediaManagerModal";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";

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
  const [dialog, setDialog] = useAtomState(IconPickerDialogAtom);
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
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

  const changed = value => {
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

  const handleMediaSelect = (mediaId: string) => {
    if (!mediaId) return;
    // Save media reference with ref-image: prefix
    const imageRef = `ref-image:${mediaId}`;
    changed(imageRef);
    setShowMediaBrowser(false);
  };

  // Handle both array access (navItems[0].icon) and direct access (icon.value)
  let value = "";
  if (index !== null && propItemKey) {
    value = nodeProps[propKey]?.[index]?.[propItemKey] || "";
  } else {
    // Handle nested prop keys like "icon.value"
    const keys = propKey.split(".");
    let val = nodeProps;
    for (const key of keys) {
      val = val?.[key];
      if (val === undefined) break;
    }
    value = typeof val === "string" ? val : "";
  }

  const ref = useRef(null);

  useDialog(dialog, setDialog, ref, propKey);

  return (
    <>
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
          <button
            ref={ref}
            title={value}
            aria-label={value ? `Icon: ${value}` : "Choose icon"}
            onClick={e => {
              setDialog({
                enabled: true,
                value,
                prefix,
                propKey,
                changed,
                onUseMedia: () => setShowMediaBrowser(true),
                e: getRect(ref.current),
              });
            }}
            className="input flex h-12 w-[70px]! items-center justify-center overflow-hidden px-1"
          >
            <div
              className="pointer-events-none flex h-6 w-6 items-center justify-center text-base-content"
              aria-hidden="true"
            >
              <ClientIconLoader value={value} />
            </div>
          </button>

          {/* Clear button - only show when icon is set */}
          {value && (
            <button
              onClick={e => {
                e.stopPropagation();
                changed("");
              }}
              className="bg-error text-error-content hover:bg-error/90 absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-xs font-bold"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Clear icon"
            >
              ×
            </button>
          )}
        </div>
      </Wrap>

      <MediaManagerModal
        isOpen={showMediaBrowser}
        onClose={() => setShowMediaBrowser(false)}
        onSelect={handleMediaSelect}
        selectionMode={true}
      />
    </>
  );
};
