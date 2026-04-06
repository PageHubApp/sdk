import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../Viewport/lib";
import { ViewAtom } from "../../../Viewport/atoms";
import { getRect } from "../../../Viewport/useRect";
import { useRef } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { generatePattern } from "utils/lib";
import { editorCanvasViewToClassPrefixKey } from "../../../../utils/tailwind/className";
import { ViewSelectionAtom } from "../../Label";
import { Wrap } from "../../ToolbarStyle";
import { useDialog } from "../../Tools/lib";
import { PatternDialogAtom } from "../../Tools/PatternDialog";

export const PatternsDialogInput = ({
  propKey,
  label = "",
  prefix = "",
  index = null,
  propItemKey = "",
  propType = "class",
}) => {
  const [dialog, setDialog] = useAtomState(PatternDialogAtom);
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

  const value = nodeProps.root ? nodeProps.root[propKey] || "" : null;

  let patt;

  if (value) {
    patt = generatePattern({
      root: {
        pattern: value,
        patternVerticalPosition: 0,
        patternHorizontalPosition: 0,
        patternStroke: 1,
        patternZoom: 0,
        patternAngle: 0,
        patternSpacingX: 0,
        patternSpacingY: 0,
        patternColor1: "rgba(59, 130, 246, 0.8)", // Blue
        patternColor2: "rgba(16, 185, 129, 0.8)", // Green
        patternColor3: "rgba(245, 101, 101, 0.8)", // Red
        patternColor4: "rgba(168, 85, 247, 0.8)", // Purple
      },
    });
  }

  const ref = useRef(null);

  useDialog(dialog, setDialog, ref, propKey);

  return (
    <div ref={ref}>
      <Wrap
        props={{ label, labelHide: true }}
        lab={value?.name}
        propType={propType}
        propKey={propKey}
      >
        <button
          title={value?.name}
          onClick={e => {
            setDialog({
              enabled: true,
              value,
              prefix,
              propKey,
              changed,
              e: getRect(ref.current),
            });
          }}
          className="input"
        >
          <div className="pointer-events-none flex h-6 items-center justify-between gap-3">
            <div className="w-1/2 truncate whitespace-nowrap">{value?.title || null}</div>
            {patt && (
              <div
                className="h-full w-1/2 rounded-lg border border-border bg-background"
                style={{ backgroundImage: patt ? `url(${patt})` : null }}
              ></div>
            )}
          </div>
        </button>
      </Wrap>
    </div>
  );
};
