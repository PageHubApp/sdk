import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../Viewport/lib";

import { ViewAtom } from "../../../Viewport/atoms";
import { LoremIpsum } from "../../../../utils/data/loremIpsum";
import { useAtomValue } from "@zedux/react";
import { editorCanvasViewToClassPrefixKey } from "../../../../utils/tailwind/className";
import { ViewSelectionAtom } from "../../Label";
import { Wrap } from "../../ToolbarStyle";

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

  return (
    <Wrap
      props={{
        ...propValues,
        label: "Generate Text",
        labelHide: true,
      }}
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">Fill with placeholder text</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            className="btn btn-secondary btn-sm flex-1"
            onClick={() => save(capitalizeFirstLetter(lorem.generateWords(1)))}
          >
            Word
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm flex-1"
            onClick={() => save(lorem.generateSentences(1))}
          >
            Sentence
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm flex-1"
            onClick={() => save(lorem.generateParagraphs(1))}
          >
            Paragraph
          </button>
        </div>
      </div>
    </Wrap>
  );
};
