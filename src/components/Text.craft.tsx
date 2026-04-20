/**
 * Text — Component definition via defineComponent()
 */
import { BsBodyText } from "react-icons/bs";
import { FaFont } from "react-icons/fa";
import { MdShortText } from "react-icons/md";
import { TextMainTab } from "../chrome/toolbar/unified-settings/mainTabs/TextMainTab";
import { defineComponent } from "../define";
import { LoremIpsum } from "../utils/data/loremIpsum";
import { migrateAction, actionToHref, actionTarget } from "../utils/action";
import { ariaAttrs, getInlineStyle, staticClasses, tag, type ToHTMLFn } from "../utils/static-html";
import { HoverNodeController } from "./editor-chrome";
import { Text } from "./Text";

// Guard against corrupted tagName data (e.g. `p, "text": "..."` from bad MCP writes)
const sanitizeTagName = (raw: unknown): string => {
  if (typeof raw !== "string") return "div";
  if (raw === "Textfit") return raw;
  const clean = raw.split(/[,\s]/)[0].toLowerCase();
  return /^[a-z][a-z0-9]*$/.test(clean) ? clean : "div";
};

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  const style = getInlineStyle(props);
  const text = props.text || "";
  const safeName = sanitizeTagName(props.tagName);

  const action = migrateAction(props);
  const href = actionToHref(action);
  const target = actionTarget(action);

  if (href) {
    const linkTag = tag(
      "a",
      {
        href,
        target: target || undefined,
        rel: /^https?:\/\//.test(href) ? "noopener noreferrer" : undefined,
      },
      text
    );
    // Wrap the <a> inside the original tagName so className and semantic structure are preserved
    return tag(
      safeName,
      {
        class: cls || undefined,
        style: style || undefined,
        ...ariaAttrs(props),
      },
      linkTag
    );
  }

  if (props.tagName === "Textfit") {
    // AutoTextSize is JS-only — use a reasonable clamp for static HTML
    // Strip vw-based text-[] classes that blow up in scaled preview containers
    const fitCls = cls.replace(/text-\[clamp\([^\]]*vw[^\]]*\)\]/g, "").trim();
    // AutoTextSize is JS-only. Use cqw so text scales with the preview container
    // (ancestor needs container-type: inline-size — set on the preview wrapper).
    // Heuristic targets the live AutoTextSize behavior: shorter words get
    // proportionally larger fonts so they fill the width. Cap kept low because
    // Textfit nodes often live inside half-width columns — a single short word
    // at high cqw overflows the column and wraps mid-word.
    const plainText = text.replace(/<[^>]*>/g, "").trim();
    const charCount = plainText.length || 1;
    const cqw = Math.min(50 / charCount, 7).toFixed(1);
    const fitStyle = [style, `font-size: ${cqw}cqw; width: 100%`].filter(Boolean).join("; ");

    return tag(
      "div",
      {
        class: fitCls || undefined,
        style: fitStyle,
        ...ariaAttrs(props),
      },
      text
    );
  }

  return tag(
    safeName,
    {
      class: cls || undefined,
      style: style || undefined,
      ...ariaAttrs(props),
    },
    text
  );
};

const lorem = new LoremIpsum({
  sentencesPerParagraph: { max: 3, min: 2 },
  wordsPerSentence: { max: 8, min: 4 },
});

export const TextDef = defineComponent(
  {
    name: "Text",
    component: Text,
    icon: FaFont,
    category: "Content",
    settings: TextMainTab,
    defaultProps: {
      richTextMode: "full",
    },
    toHTML,
    disable: [
      "bgColor",
      "background",
      "pattern",
      "border",
      "shadow",
      "radius",
      "opacity",
      "cursor",
      "accessibility",
    ],
    hoverClickVariant: "text",
    rules: {
      canDrag: () => true,
      canMoveIn: () => false,
    },
    tools: [],
    presets: [
      {
        label: "Title",
        icon: MdShortText,
        description: "Large heading text.",
        props: {
          text: lorem.generateSentences(1),
          className: "text-2xl md:text-4xl",
        },
      },
      {
        label: "Sub-title",
        icon: MdShortText,
        description: "Secondary heading text.",
        props: {
          text: lorem.generateSentences(1),
          className: "text-lg md:text-xl",
        },
      },
      {
        label: "Paragraph",
        icon: BsBodyText,
        description: "Body text block.",
        props: {
          tagName: "p",
          text: lorem.generateParagraphs(1),
        },
      },
    ],
    modifiers: [
      // Composite patterns (real CSS classes via @utility in daisyui-spatial)
      {
        name: "body-text",
        label: "Body",
        category: "Pattern",
        description:
          "Standard paragraph text — comfortable reading size, normal weight, relaxed line height",
      },
      {
        name: "section-heading",
        label: "Heading",
        category: "Pattern",
        description:
          "Bold section heading — typically h2 size with heading font and tight line height",
      },
      {
        name: "eyebrow",
        label: "Eyebrow",
        category: "Pattern",
        description:
          "Small uppercase label above a heading — wide letter spacing, muted color, small size",
      },
      {
        name: "subhead",
        label: "Subhead",
        category: "Pattern",
        description:
          "Secondary heading below the main title — larger than body but smaller than the heading",
      },
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
      {
        name: "uppercase",
        label: "Uppercase",
        category: "Style",
        description: "Transforms all text to ALL CAPS",
      },
      { name: "italic", label: "Italic", category: "Style", description: "Italicizes the text" },
      {
        name: "tracking-wide",
        label: "Wide Track",
        category: "Style",
        description: "Slightly increased letter spacing — good for subheadings",
      },
      {
        name: "tracking-widest",
        label: "Widest Track",
        category: "Style",
        description: "Very wide letter spacing — classic eyebrow/label treatment",
      },
      {
        name: "leading-tight",
        label: "Tight Lines",
        category: "Style",
        description: "Tighter line height — good for large headings",
      },
      {
        name: "leading-relaxed",
        label: "Relaxed Lines",
        category: "Style",
        description: "Looser line height — improves readability for body copy",
      },
      // DaisyUI
      {
        name: "link",
        label: "Link",
        category: "DaisyUI",
        description: "Styles the text as a hyperlink with underline",
      },
      {
        name: "link-primary",
        label: "Link Primary",
        category: "DaisyUI",
        description: "Link styled in the primary brand color",
      },
      {
        name: "link-hover",
        label: "Link Hover",
        category: "DaisyUI",
        description: "Underline appears only on hover — cleaner look for nav links",
      },
      // Color
      {
        name: "text-primary",
        label: "Primary",
        category: "Color",
        description: "Primary brand color",
        exclusive: true,
      },
      {
        name: "text-accent",
        label: "Accent",
        category: "Color",
        description: "Accent color — good for highlights and callouts",
        exclusive: true,
      },
      {
        name: "text-neutral-content",
        label: "Muted",
        category: "Color",
        description: "Muted secondary text — only use on bg-neutral surfaces",
        exclusive: true,
      },
      {
        name: "opacity-70",
        label: "Faded",
        category: "Color",
        description: "Reduces opacity to 70% — softens text without changing color",
        exclusive: true,
      },
      // Font family
      {
        name: "font-heading",
        label: "Heading Font",
        category: "Font",
        description: "Uses the heading typeface defined in the design system",
        exclusive: true,
      },
      {
        name: "font-body",
        label: "Body Font",
        category: "Font",
        description: "Uses the body typeface defined in the design system",
        exclusive: true,
      },
    ],
  },
  { __internal: true }
);
