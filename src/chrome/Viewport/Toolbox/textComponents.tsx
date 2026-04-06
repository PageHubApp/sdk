import { LoremIpsum } from "../../../utils/data/loremIpsum";
import { BsBodyText } from "react-icons/bs";
import { MdShortText } from "react-icons/md";
import { Text } from "../../../components/Text";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 3,
    min: 2,
  },
  wordsPerSentence: {
    max: 8,
    min: 4,
  },
});

export const RenderTextComponent = ({ className, display }) => {
  const text = lorem.generateSentences(1);

  return (
    <RenderToolComponent
      element={Text}
      text={text}
      className={className}
      display={display}
      custom={{ displayName: "Title" }}
    />
  );
};

export const RenderParagraphComponent = props => {
  const text = lorem.generateParagraphs(1);
  return (
    <RenderToolComponent
      {...props}
      tagName="p"
      text={text}
      display={<ToolboxItemDisplay icon={BsBodyText} label="Paragraph" />}
      custom={{ displayName: "Paragraph" }}
    />
  );
};

export const TextComponents = [
  <RenderTextComponent
    key="1"
    className="text-2xl md:text-4xl"
    display={<ToolboxItemDisplay icon={MdShortText} label="Title" />}
  />,
  <RenderTextComponent
    key="2"
    className="text-lg md:text-xl"
    display={<ToolboxItemDisplay icon={MdShortText} label="Sub-title" />}
  />,
  <RenderParagraphComponent key="2" element={Text} />,
];

export const ParagraphComponents = [
  <RenderParagraphComponent key="1" element={Text} />,
  <RenderParagraphComponent key="2" element={Text} className="leading-10" />,
];

export const TextToolbox = {
  title: "Text",
  content: TextComponents,
};

export const ParagraphToolbox = {
  title: "Paragraphs",
  content: ParagraphComponents,
};

export const textToolboxItems = {
  title: "Text",
  items: [TextToolbox, ParagraphToolbox],
};
