import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../viewport/viewportExports";

import { ViewAtom } from "../../../viewport/atoms";
import { LoremIpsum } from "@/utils/seeds/loremIpsum";
import { useAtomValue } from "@zedux/react";
import { editorCanvasViewToClassPrefixKey } from "@/utils/tailwind/className";
import { ViewSelectionAtom } from "../../Label";
import { TbLetterA, TbMinus, TbAlignLeft } from "react-icons/tb";
import { Chip } from "@/chrome/primitives/Chip";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";

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
    propValues: node.data?.props,
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
    <Chip label="Sample" frame="bare">
      <div className="bg-neutral ml-auto flex w-fit shrink-0 items-center gap-1 rounded-md p-1">
        {buttons.map(({ icon: Icon, label, generate }) => (
          <button
            key={label}
            type="button"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={label}
            data-tooltip-place="top"
            className="text-neutral-content hover:bg-base-100 hover:text-base-content flex h-6 items-center justify-center rounded px-2 transition-colors"
            onClick={() => save(generate())}
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
    </Chip>
  );
};
