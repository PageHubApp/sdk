/**
 * Text — Component definition via defineComponent()
 */
import { TextMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/TextMainTab";
import { defineComponent } from "../define";
import { LoremIpsum } from "../utils/data/loremIpsum";
import { ariaAttrs, getInlineStyle, staticClasses, tag, type ToHTMLFn } from "../utils/static-html";
import { HoverNodeController } from "./editor-chrome";
import { Text } from "./Text";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  const style = getInlineStyle(props);
  const text = props.text || "";

  if (props.url && typeof props.url === "string") {
    return tag("a", {
      href: props.url,
      target: props.urlTarget || undefined,
      rel: /^https?:\/\//.test(props.url) ? "noopener noreferrer" : undefined,
      class: cls || undefined,
      style: style || undefined,
      ...ariaAttrs(props),
    }, text);
  }

  return tag(props.tagName || "div", {
    class: cls || undefined,
    style: style || undefined,
    ...ariaAttrs(props),
  }, text);
};

const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 3, min: 2 },
  wordsPerSentence: { max: 8, min: 4 },
});

export const TextDef = defineComponent({
  name: "Text",
  component: Text,
  icon: "FaFont",
  category: "Basic",
  settings: TextMainTab,
  toHTML,
  disable: [
    "bgColor", "background", "pattern", "border",
    "shadow", "radius", "opacity", "cursor", "accessibility",
  ],
  hoverClickVariant: "text",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
  tools: (props) => [
    <HoverNodeController
      key="textHoverController"
      position="top"
      align="start"
      placement="end"
      alt={{
        position: "bottom",
        align: "start",
        placement: "start",
      }}
    />,
  ],
  presets: [
    {
      label: "Title",
      icon: "MdShortText",
      props: {
        text: lorem.generateSentences(1),
        className: "text-2xl md:text-4xl",
      },
    },
    {
      label: "Sub-title",
      icon: "MdShortText",
      props: {
        text: lorem.generateSentences(1),
        className: "text-lg md:text-xl",
      },
    },
    {
      label: "Paragraph",
      icon: "BsBodyText",
      props: {
        tagName: "p",
        text: lorem.generateParagraphs(1),
      },
    },
  ],
}, { __internal: true });
