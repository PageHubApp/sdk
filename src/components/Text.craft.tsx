/**
 * Text — Component definition via defineComponent()
 */
import { BsBodyText } from "react-icons/bs";
import { FaFont } from "react-icons/fa";
import { MdShortText } from "react-icons/md";
import { TextMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/TextMainTab";
import { defineComponent } from "../define";
import { LoremIpsum } from "../utils/data/loremIpsum";
import { migrateAction, actionToHref, actionTarget } from "../utils/action";
import { ariaAttrs, getInlineStyle, staticClasses, tag, type ToHTMLFn } from "../utils/static-html";
import { HoverNodeController } from "./editor-chrome";
import { Text } from "./Text";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  const style = getInlineStyle(props);
  const text = props.text || "";

  const action = migrateAction(props);
  const href = actionToHref(action);
  const target = actionTarget(action);

  if (href) {
    const linkTag = tag("a", {
      href,
      target: target || undefined,
      rel: /^https?:\/\//.test(href) ? "noopener noreferrer" : undefined,
    }, text);
    // Wrap the <a> inside the original tagName so className and semantic structure are preserved
    return tag(props.tagName || "div", {
      class: cls || undefined,
      style: style || undefined,
      ...ariaAttrs(props),
    }, linkTag);
  }

  if (props.tagName === "Textfit") {
    // AutoTextSize is JS-only — use a reasonable clamp for static HTML
    // Strip vw-based text-[] classes that blow up in scaled preview containers
    const fitCls = cls.replace(/text-\[clamp\([^\]]*vw[^\]]*\)\]/g, "").trim();
    // AutoTextSize is JS-only. Use cqw so text scales with the preview container
    // (ancestor needs container-type: inline-size — set on the preview wrapper).
    // At 1280px viewport, container = 250% = 3200px; AutoTextSize computes ~128px.
    // 128/3200*100 ≈ 4cqw. Scale per char count so shorter words get bigger.
    const plainText = text.replace(/<[^>]*>/g, "").trim();
    const charCount = plainText.length || 1;
    const cqw = Math.min(40 / charCount, 5.5).toFixed(1);
    const fitStyle = [style, `font-size: ${cqw}cqw; width: 100%`].filter(Boolean).join("; ");

    return tag("div", {
      class: fitCls || undefined,
      style: fitStyle,
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
  icon: FaFont,
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
      icon: MdShortText,
      props: {
        text: lorem.generateSentences(1),
        className: "text-2xl md:text-4xl",
      },
    },
    {
      label: "Sub-title",
      icon: MdShortText,
      props: {
        text: lorem.generateSentences(1),
        className: "text-lg md:text-xl",
      },
    },
    {
      label: "Paragraph",
      icon: BsBodyText,
      props: {
        tagName: "p",
        text: lorem.generateParagraphs(1),
      },
    },
  ],
  modifiers: [
    // Composite patterns (real CSS classes via @utility in daisyui-spatial)
    { name: "body-text", label: "Body", category: "Pattern" },
    { name: "section-heading", label: "Heading", category: "Pattern" },
    { name: "eyebrow", label: "Eyebrow", category: "Pattern" },
    { name: "subhead", label: "Subhead", category: "Pattern" },
    // Size
    { name: "text-xs", label: "XS", category: "Size", exclusive: true },
    { name: "text-sm", label: "SM", category: "Size", exclusive: true },
    { name: "text-base", label: "Base", category: "Size", exclusive: true },
    { name: "text-lg", label: "LG", category: "Size", exclusive: true },
    { name: "text-xl", label: "XL", category: "Size", exclusive: true },
    { name: "text-2xl", label: "2XL", category: "Size", exclusive: true },
    { name: "text-3xl", label: "3XL", category: "Size", exclusive: true },
    { name: "text-4xl", label: "4XL", category: "Size", exclusive: true },
    { name: "text-5xl", label: "5XL", category: "Size", exclusive: true },
    // Weight
    { name: "font-light", label: "Light", category: "Weight", exclusive: true },
    { name: "font-normal", label: "Normal", category: "Weight", exclusive: true },
    { name: "font-medium", label: "Medium", category: "Weight", exclusive: true },
    { name: "font-semibold", label: "Semibold", category: "Weight", exclusive: true },
    { name: "font-bold", label: "Bold", category: "Weight", exclusive: true },
    { name: "font-extrabold", label: "Extra Bold", category: "Weight", exclusive: true },
    // Alignment
    { name: "text-left", label: "Left", category: "Align", exclusive: true },
    { name: "text-center", label: "Center", category: "Align", exclusive: true },
    { name: "text-right", label: "Right", category: "Align", exclusive: true },
    // Style
    { name: "uppercase", label: "Uppercase", category: "Style" },
    { name: "italic", label: "Italic", category: "Style" },
    { name: "tracking-wide", label: "Wide Track", category: "Style" },
    { name: "tracking-widest", label: "Widest Track", category: "Style" },
    { name: "leading-tight", label: "Tight Lines", category: "Style" },
    { name: "leading-relaxed", label: "Relaxed Lines", category: "Style" },
    // DaisyUI
    { name: "link", label: "Link", category: "DaisyUI" },
    { name: "link-primary", label: "Link Primary", category: "DaisyUI" },
    { name: "link-hover", label: "Link Hover", category: "DaisyUI" },
    // Color
    { name: "text-primary", label: "Primary", category: "Color", exclusive: true },
    { name: "text-accent", label: "Accent", category: "Color", exclusive: true },
    { name: "text-neutral-content", label: "Muted", category: "Color", exclusive: true },
    { name: "opacity-70", label: "Faded", category: "Color", exclusive: true },
    // Font family
    { name: "font-heading", label: "Heading Font", category: "Font", exclusive: true },
    { name: "font-body", label: "Body Font", category: "Font", exclusive: true },
  ],
}, { __internal: true });
