/** Text — presets extracted from Text.craft.tsx. */
import { TbBlockquote, TbH1, TbH2, TbLetterT } from "react-icons/tb";
import { LoremIpsum } from "../../utils/seeds/loremIpsum";
import type { ComponentPreset } from "../../define/types";
import { registerPresets } from "../../define/catalogRegistry";

const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 3, min: 2 },
  wordsPerSentence: { max: 8, min: 4 },
});

const titleLorem = new LoremIpsum({
  wordsPerSentence: { max: 5, min: 3 },
});

const paragraphLorem = new LoremIpsum({
  sentencesPerParagraph: { max: 5, min: 4 },
  wordsPerSentence: { max: 14, min: 8 },
});

export const textPresets: ComponentPreset[] = [
      {
        label: "Title",
        icon: TbH1,
        description: "A big heading at the top of a section.",
        props: {
          text: titleLorem.generateWords(4),
          className: "text-4xl",
        },
      },
      {
        label: "Sub-title",
        icon: TbH2,
        description: "A smaller heading under the main one.",
        props: {
          text: lorem.generateSentences(1),
          className: "text-xl",
        },
      },
      {
        label: "Paragraph",
        icon: TbBlockquote,
        description: "A block of body copy.",
        props: {
          tagName: "p",
          text: paragraphLorem.generateParagraphs(1),
        },
      },
];

registerPresets("Text", textPresets);
