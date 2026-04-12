import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../Viewport/lib";

import { ViewAtom } from "../../../Viewport/atoms";
import { LoremIpsum } from "../../../../utils/data/loremIpsum";
import { useAtomValue } from "@zedux/react";
import { editorCanvasViewToClassPrefixKey } from "../../../../utils/tailwind/className";
import { ViewSelectionAtom } from "../../Label";
import { TbLetterA, TbMinus, TbAlignLeft } from "react-icons/tb";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { REACT_TOOLTIP_SURFACE_CLASS } from "components/layout/tooltipSurface";

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const IpsumGenerator = ({ propKey, propType }) => {
  const canvasView = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classWriteView = editorCanvasViewToClassPrefixKey(canvasView);
  const { actions, query } = useEditor();

  const lorem = new LoremIpsum({
    sentencesPerParagraph: {
      max: 5,
      min: 3,
    },
    wordsPerSentence: {
      max: 16,
      min: 4,
    },
  });

  const {
    actions: { setProp },
    propValues,
    id,
  } = useNode(node => ({
    propValues: node.data.props,
    id: node.id,
  }));

  const save = value => {
    changeProp({
      propKey,
      value,
      setProp,
      view: propType === "class" ? classWriteView : canvasView,
      propType,
      query,
      actions,
      nodeId: id,
      ...(propType === "class" ? { classDark } : {}),
    });
  };

  const buttons = [
    {
      icon: TbLetterA,
      label: "Word",
      generate: () => capitalizeFirstLetter(lorem.generateWords(1)),
    },
    { icon: TbMinus, label: "Sentence", generate: () => lorem.generateSentences(1) },
    { icon: TbAlignLeft, label: "Paragraph", generate: () => lorem.generateParagraphs(1) },
  ];

  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-neutral-content text-xs">Lorem</span>
      <div className="flex gap-0.5">
        {buttons.map(({ icon: Icon, label, generate }) => (
          <button
            key={label}
            type="button"
            data-tooltip-id="ipsum-tip"
            data-tooltip-content={label}
            className="text-neutral-content hover:bg-neutral hover:text-base-content rounded-md p-1.5 transition-colors"
            onClick={() => save(generate())}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
      <ReactTooltip
        id="ipsum-tip"
        variant="light"
        classNameArrow="hidden"
        className={REACT_TOOLTIP_SURFACE_CLASS}
      />
    </div>
  );
};
