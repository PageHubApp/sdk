import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useState } from "react";
import { TbPhoto } from "react-icons/tb";
import { editorCanvasViewToClassPrefixKey } from "@/utils/tailwind/className";
import { Chip } from "@/chrome/primitives/Chip";
import { changeProp } from "../../../viewport/viewportExports";
import { ViewAtom } from "../../../viewport/atoms";
import { ViewSelectionAtom } from "../../Label";
import ClientIconLoader from "../../dialogs/ClientIconLoader";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";

const IconPickerPanel = lazy(() => import("../../dialogs/IconDialog/IconPickerPanel"));

const PANEL_WIDTH = 384;
const PANEL_HEIGHT = 480;

function summaryFor(value: string): string {
  if (!value) return "Pick icon";
  if (value.startsWith("ref-image:")) return "Image";
  // ref-icon:tb/TbCircleCheck → "Circle Check"
  const slash = value.lastIndexOf("/");
  const exportName = slash >= 0 ? value.slice(slash + 1) : value;
  return exportName.replace(/^(Tb|Fa6?|Bs|Bi|Im|Si|Lia)/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

export const IconDialogInput = ({
  propKey,
  label = "",
  prefix = "",
  index = null,
  propItemKey = "",
  propType = "class",
}: {
  propKey: string;
  label?: string;
  prefix?: string;
  index?: number | null;
  propItemKey?: string;
  propType?: string;
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

  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

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

  // Resolve current value: array access (navItems[0].icon) vs nested (icon.value).
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

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  const leading = value ? (
    <span
      className="text-base-content flex size-4 shrink-0 items-center justify-center [&>svg]:size-full"
      aria-hidden
    >
      <ClientIconLoader value={value} />
    </span>
  ) : (
    <TbPhoto className="size-3.5" aria-hidden />
  );

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label={label}
        propKey={propKey}
        propType={propType}
        index={index ?? undefined}
        propItemKey={propItemKey || null}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          changed("");
        }}
        triggerAriaLabel={value ? `Icon: ${value}` : "Choose icon"}
        clearAriaLabel="Clear icon"
        leading={leading}
        summary={summaryFor(value)}
      />

      {open && (
        <Suspense fallback={null}>
          <IconPickerPanel
            value={value}
            prefix={prefix}
            onChange={changed}
            onClose={() => setOpen(false)}
            initialPosition={initialPos}
            defaultWidth={PANEL_WIDTH}
            defaultHeight={PANEL_HEIGHT}
          />
        </Suspense>
      )}
    </>
  );
};
