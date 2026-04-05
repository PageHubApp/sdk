/**
 * Centralized Presets Configuration for All Selectors
 *
 * This file defines all preset styles, sizes, and options for selector components.
 * Edit this file to add, modify, or remove presets across the entire application.
 */

// Type definitions for presets
export type PresetItem = {
  title: string;
  var: string;
  className?: string;
  root?: Record<string, string>;
};

export type PresetGroup = {
  label: string;
  type?: "select" | "select" | "radio";
  propKey?: string;
  propType?: string;
  help?: string;
  items: PresetItem[];
};

// ============================================================================
// CONTAINER PRESETS
// ============================================================================

export const containerPresets = {
  padding: {
    label: "Padding",
    type: "select" as const,
    propKey: "presetPadding",
    propType: "root",
    help: "Adjust the inner spacing of the container",
    items: [
    {
      title: "No padding",
      var: "pad-none",
    },
    {
      title: "Small Padding",
      var: "pad-sm",
      className: "px-3 py-3 md:px-5 md:py-5",
    },
    {
      title: "Medium Padding",
      var: "pad-md",
      className: "px-6 py-6 md:px-12 md:py-12",
    },
    {
      title: "Large Padding (Design System)",
      var: "pad-lg",
      className: "px-(--container-padding-x) py-(--container-padding-y)",
    },
    {
      title: "Section Gap",
      var: "pad-section",
      className: "px-(--section-gap) py-(--section-gap)",
    },
    {
      title: "Extra Large Padding",
      var: "pad-xl",
      className: "px-24 py-24 md:px-48 md:py-48",
    },
    ],
  },

  width: {
    label: "Width",
    type: "select" as const,
    propKey: "preset",
    propType: "root",
    items: [
    {
      title: "Quarter",
      var: "size-1/4",
      className: "w-full md:w-1/4",
    },
    {
      title: "Third",
      var: "size-1/3",
      className: "w-full md:w-1/3",
    },
    {
      title: "Half",
      var: "size-1/2",
      className: "w-full md:w-1/2",
    },
    {
      title: "Two Thirds",
      var: "size-2/3",
      className: "w-full md:w-2/3",
    },
    {
      title: "Three Quarters",
      var: "size-3/4",
      className: "w-full md:w-3/4",
    },
    {
      title: "Full",
      var: "size-full",
      className: "w-full md:w-full",
    },
    {
      title: "Wide Middle",
      var: "size-wide-middle",
      className: "w-full mx-2 md:w-10/12 md:mx-auto",
    },
    ],
  },

  height: {
    label: "Height",
    type: "select" as const,
    propKey: "presetHeight",
    propType: "root",
    items: [
    {
      title: "Auto",
      var: "height-auto",
    },
    {
      title: "Screen",
      var: "height-screen",
      className: "h-screen md:h-screen",
    },
    {
      title: "Half Screen",
      var: "height-half",
      className: "h-[50vh] md:h-[50vh]",
    },
    {
      title: "Quarter Screen",
      var: "height-quarter",
      className: "h-[25vh] md:h-[25vh]",
    },
    {
      title: "Three Quarters",
      var: "height-three-quarters",
      className: "h-[75vh] md:h-[75vh]",
    },
    {
      title: "Fit Content",
      var: "height-fit",
      className: "h-fit md:h-fit",
    },
    ],
  },

  maxWidth: {
    label: "Max Width",
    type: "select" as const,
    propKey: "presetMaxWidth",
    propType: "root",
    items: [
    {
      title: "Small",
      var: "max-w-sm",
      className: "max-w-sm",
    },
    {
      title: "Medium",
      var: "max-w-md",
      className: "max-w-md",
    },
    {
      title: "Large",
      var: "max-w-lg",
      className: "max-w-lg",
    },
    {
      title: "Extra Large",
      var: "max-w-xl",
      className: "max-w-xl",
    },
    {
      title: "2XL",
      var: "max-w-2xl",
      className: "max-w-2xl",
    },
    {
      title: "3XL",
      var: "max-w-3xl",
      className: "max-w-3xl",
    },
    {
      title: "4XL",
      var: "max-w-4xl",
      className: "max-w-4xl",
    },
    {
      title: "5XL",
      var: "max-w-5xl",
      className: "max-w-5xl",
    },
    {
      title: "6XL",
      var: "max-w-6xl",
      className: "max-w-6xl",
    },
    {
      title: "7XL",
      var: "max-w-7xl",
      className: "max-w-7xl",
    },
    {
      title: "Content Width (Design System)",
      var: "max-w-content",
      className: "max-w-(--content-width)",
    },
    {
      title: "Full Width",
      var: "max-w-full",
      className: "max-w-full",
    },
    {
      title: "Screen Width",
      var: "max-w-screen",
      className: "max-w-(--breakpoint-2xl)",
    },
    ],
  },

  flexDirection: {
    label: "Flex Direction",
    type: "select" as const,
    propKey: "presetType",
    propType: "root",
    items: [
    {
      title: "Columns",
      var: "flexDirection",
      className: "flex-col",
    },
    {
      title: "Rows",
      var: "flexDirection",
      className: "flex-col md:flex-row",
    },
    {
      title: "Reverse Columns",
      var: "flexDirection",
      className: "flex-col-reverse",
    },
    {
      title: "Reverse Rows",
      var: "flexDirection",
      className: "flex-col-reverse md:flex-row-reverse",
    },
    ],
  },

  backgroundPatterns: {
    label: "Background Patterns",
    type: "select" as const,
    propKey: "preset",
    propType: "root",
    items: [
    {
      title: "Hero 1",
      var: "hero-1",
      className: "from-(--background) to-(--primary)",
      root: {
        pattern: "wiggle",
        patternColorA: "var(--muted)",
        patternColorB: "var(--muted)",
      },
    },
    {
      title: "Hero 2",
      var: "hero-2",
      className: "from-(--background) to-(--primary)",
      root: {
        pattern: "wiggle",
        patternColorA: "var(--muted)",
        patternColorB: "var(--muted)",
      },
    },
    ],
  },

  layouts: {
    label: "Container Layouts",
    type: "select" as const,
    propKey: "presetLayout",
    propType: "root",
    help: "Choose from common container layouts and patterns",
    items: [
    {
      title: "Plain Container",
      var: "plain-container",
    },
    {
      title: "Section",
      var: "section",
      className: "w-full md:w-full",
    },
    {
      title: "Content",
      var: "content",
      className: "w-full px-(--container-padding-x) py-(--container-padding-y) md:mx-auto md:max-w-(--content-width)",
    },
    {
      title: "Content Default",
      var: "content-default",
    },
    {
      title: "Card Container",
      var: "card-container",
      className: "bg-(--card) rounded-(--radius) shadow-(--shadow-style) px-(--container-padding-x) py-(--container-padding-y) border border-(--border-color) md:px-(--container-padding-x) md:py-(--container-padding-y)",
    },
    {
      title: "Glass Card",
      var: "glass-card",
      className: "bg-[var(--card)/10] backdrop-blur-md rounded-(--radius) border border-[var(--border-color)/20] px-(--container-padding-x) py-(--container-padding-y) md:px-(--container-padding-x) md:py-(--container-padding-y)",
    },
    {
      title: "Hero Section",
      var: "hero-section",
      className: "min-h-[400px] flex flex-col justify-center items-center px-(--section-gap) py-(--section-gap) text-center md:min-h-[600px] md:px-(--section-gap) md:py-(--section-gap)",
    },
    {
      title: "Content Box",
      var: "content-box",
      className: "max-w-(--content-width) mx-auto px-(--container-padding-x) py-(--container-padding-y)",
    },
    {
      title: "Sidebar Layout",
      var: "sidebar-layout",
      className: "flex flex-col gap-(--gap) md:flex-row md:gap-(--gap)",
    },
    {
      title: "Grid Container",
      var: "grid-container",
      className: "grid grid-cols-1 gap-(--gap) md:grid-cols-3 md:gap-(--gap)",
    },
    {
      title: "Feature Grid",
      var: "feature-grid",
      className: "grid grid-cols-1 gap-(--gap) px-(--section-gap) py-(--section-gap) md:grid-cols-2 md:gap-(--gap) md:px-(--section-gap) md:py-(--section-gap)",
    },
    {
      title: "Testimonial Container",
      var: "testimonial-container",
      className: "bg-(--card) rounded-(--radius) px-(--container-padding-x) py-(--container-padding-y) text-center border-l-4 border-(--primary)",
    },
    {
      title: "CTA Container",
      var: "cta-container",
      className: "bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--container-padding-x) py-(--container-padding-y) text-center",
    },
    {
      title: "Stats Container",
      var: "stats-container",
      className: "grid grid-cols-2 gap-(--gap) px-(--section-gap) py-(--section-gap) md:grid-cols-4 md:gap-(--gap) md:px-(--section-gap) md:py-(--section-gap)",
    },
    {
      title: "Pricing Card",
      var: "pricing-card",
      className: "bg-(--card) rounded-(--radius) shadow-(--shadow-style) border-2 border-(--border-color) px-(--container-padding-x) py-(--container-padding-y) text-center relative",
    },
    {
      title: "Team Card",
      var: "team-card",
      className: "bg-(--card) rounded-(--radius) shadow-(--shadow-style) overflow-hidden text-center",
    },
    {
      title: "Blog Post",
      var: "blog-post",
      className: "max-w-(--content-width) mx-auto px-(--container-padding-x) py-(--container-padding-y)",
    },
    {
      title: "Contact Form",
      var: "contact-form",
      className: "bg-(--card) rounded-(--radius) shadow-(--shadow-style) px-(--container-padding-x) py-(--container-padding-y) max-w-md mx-auto",
    },
    {
      title: "Navigation Bar",
      var: "navigation-bar",
      className: "bg-(--card) shadow-(--shadow-style) px-(--section-gap) py-(--section-gap) flex items-center justify-between md:px-(--section-gap)",
    },
    {
      title: "Footer Container",
      var: "footer-container",
      className: "bg-(--footer-bg) text-(--footer-text) px-(--section-gap) py-(--section-gap)",
    },
    {
      title: "Image Gallery Container",
      var: "image-gallery-container",
      className: "flex flex-col justify-center items-center w-full gap-(--container-gap) h-auto px-(--container-padding-x) py-(--container-padding-y) md:px-(--container-padding-x) md:py-(--container-padding-y)",
    },
    {
      title: "Image Gallery Row",
      var: "image-gallery-row",
      className: "flex flex-row w-full gap-4 h-[400px] relative overflow-hidden md:h-[500px]",
    },
    ],
  },

  spacing: {
    label: "Spacing Patterns",
    type: "select" as const,
    propKey: "presetSpacing",
    propType: "root",
    help: "Common spacing patterns for different content types",
    items: [
    {
      title: "Tight Spacing",
      var: "spacing-tight",
      className: "px-(--container-padding-x) py-(--container-padding-y) gap-(--gap) md:px-(--container-padding-x) md:py-(--container-padding-y) md:gap-(--gap)",
    },
    {
      title: "Comfortable",
      var: "spacing-comfortable",
      className: "px-(--container-padding-x) py-(--container-padding-y) gap-(--gap) md:px-(--container-padding-x) md:py-(--container-padding-y) md:gap-(--gap)",
    },
    {
      title: "Generous",
      var: "spacing-generous",
      className: "px-(--section-gap) py-(--section-gap) gap-(--gap) md:px-(--section-gap) md:py-(--section-gap) md:gap-(--gap)",
    },
    {
      title: "Section Spacing",
      var: "spacing-section",
      className: "px-(--section-gap) py-(--section-gap) gap-(--gap) md:px-(--section-gap) md:py-(--section-gap) md:gap-(--gap)",
    },
    ],
  },
};

// ============================================================================
// BACKGROUND IMAGE PRESETS
// ============================================================================

export const backgroundImagePresets = {
  styles: {
    label: "Background Image Style",
    type: "select" as const,
    propKey: "presetBackgroundStyle",
    propType: "class",
    help: "Choose from common background image styles",
    items: [
    {
      title: "Cover - Center",
      var: "bg-cover-center",
      className: "bg-cover bg-center bg-no-repeat md:bg-cover md:bg-center md:bg-no-repeat",
    },
    {
      title: "Cover - Top Left",
      var: "bg-cover-top-left",
      className: "bg-cover bg-top-left bg-no-repeat md:bg-cover md:bg-top-left md:bg-no-repeat",
    },
    {
      title: "Cover - Top Center",
      var: "bg-cover-top",
      className: "bg-cover bg-top bg-no-repeat md:bg-cover md:bg-top md:bg-no-repeat",
    },
    {
      title: "Cover - Top Right",
      var: "bg-cover-top-right",
      className: "bg-cover bg-top-right bg-no-repeat md:bg-cover md:bg-top-right md:bg-no-repeat",
    },
    {
      title: "Cover - Left",
      var: "bg-cover-left",
      className: "bg-cover bg-left bg-no-repeat md:bg-cover md:bg-left md:bg-no-repeat",
    },
    {
      title: "Cover - Right",
      var: "bg-cover-right",
      className: "bg-cover bg-right bg-no-repeat md:bg-cover md:bg-right md:bg-no-repeat",
    },
    {
      title: "Cover - Bottom Left",
      var: "bg-cover-bottom-left",
      className: "bg-cover bg-bottom-left bg-no-repeat md:bg-cover md:bg-bottom-left md:bg-no-repeat",
    },
    {
      title: "Cover - Bottom Center",
      var: "bg-cover-bottom",
      className: "bg-cover bg-bottom bg-no-repeat md:bg-cover md:bg-bottom md:bg-no-repeat",
    },
    {
      title: "Cover - Bottom Right",
      var: "bg-cover-bottom-right",
      className: "bg-cover bg-bottom-right bg-no-repeat md:bg-cover md:bg-bottom-right md:bg-no-repeat",
    },
    {
      title: "Fixed Parallax - Center",
      var: "bg-fixed-center",
      className: "bg-cover bg-center bg-no-repeat bg-fixed md:bg-cover md:bg-center md:bg-no-repeat md:bg-fixed",
    },
    {
      title: "Fixed Parallax - Top",
      var: "bg-fixed-top",
      className: "bg-cover bg-top bg-no-repeat bg-fixed md:bg-cover md:bg-top md:bg-no-repeat md:bg-fixed",
    },
    {
      title: "Fixed Parallax - Bottom",
      var: "bg-fixed-bottom",
      className: "bg-cover bg-bottom bg-no-repeat bg-fixed md:bg-cover md:bg-bottom md:bg-no-repeat md:bg-fixed",
    },
    {
      title: "Contain - Centered",
      var: "bg-contain-centered",
      className: "bg-contain bg-center bg-no-repeat md:bg-contain md:bg-center md:bg-no-repeat",
    },
    {
      title: "Tile Pattern",
      var: "bg-tile",
      className: "bg-auto bg-top-left bg-repeat md:bg-auto md:bg-top-left md:bg-repeat",
    },
    ],
  },

  layouts: {
    label: "Layouts",
    type: "select" as const,
    propKey: "presetLayout",
    propType: "component",
    help: "Choose from common background image layouts",
    items: [
    {
      title: "Hero Section",
      var: "hero-section",
      className: "h-96 min-h-[400px] flex flex-col justify-center items-center bg-cover bg-center bg-fixed px-4 py-16 md:h-[600px] md:min-h-[600px] md:px-8 md:py-24",
    },
    {
      title: "Full Screen",
      var: "full-screen",
      className: "h-screen min-h-screen flex flex-col justify-center items-center bg-cover bg-center bg-fixed px-4 py-8 md:px-8 md:py-16",
    },
    {
      title: "Card Style",
      var: "card-style",
      className: "h-64 min-h-[300px] flex flex-col justify-end items-start bg-cover bg-center px-6 py-8 rounded-xl md:h-80 md:min-h-[350px] md:px-8 md:py-10",
    },
    {
      title: "Wide Banner",
      var: "wide-banner",
      className: "h-48 min-h-[200px] flex flex-row justify-center items-center bg-cover bg-center px-4 py-8 md:h-64 md:min-h-[250px] md:px-8 md:py-12",
    },
    {
      title: "Overlay Content",
      var: "overlay-content",
      className: "h-80 min-h-[400px] flex flex-col justify-center items-center bg-cover bg-center bg-fixed px-4 py-16 relative md:h-[500px] md:min-h-[500px] md:px-8 md:py-20",
    },
    {
      title: "Parallax",
      var: "parallax",
      className: "h-96 min-h-[400px] flex flex-col justify-center items-center bg-cover bg-center bg-fixed bg-no-repeat px-4 py-16 md:h-[600px] md:min-h-[600px] md:px-8 md:py-24",
    },
    {
      title: "Fixed Background",
      var: "fixed-background",
      className: "h-screen min-h-screen flex flex-col justify-center items-center bg-cover bg-center bg-fixed bg-no-repeat px-4 py-8 md:px-8 md:py-16",
    },
    ],
  },

  overlays: {
    label: "Overlays",
    type: "select" as const,
    propKey: "presetOverlay",
    propType: "root",
    help: "Add overlays to improve text readability over background images",
    items: [
    {
      title: "Dark Overlay",
      var: "dark-overlay",
      className: "bg-linear-to-b from-black/50 to-black/30",
    },
    {
      title: "Light Overlay",
      var: "light-overlay",
      className: "bg-linear-to-b from-white/50 to-white/30",
    },
    {
      title: "Primary Overlay",
      var: "primary-overlay",
      className: "bg-linear-to-b from-[var(--primary)/60] to-[var(--primary)/40]",
    },
    {
      title: "Subtle Dark",
      var: "subtle-dark",
      className: "bg-linear-to-b from-black/30 to-black/10",
    },
    {
      title: "Subtle Light",
      var: "subtle-light",
      className: "bg-linear-to-b from-white/30 to-white/10",
    },
    {
      title: "No Overlay",
      var: "no-overlay",
    },
    ],
  },

  content: {
    label: "Positioning",
    type: "select" as const,
    propKey: "presetContent",
    propType: "mobile",
    help: "Position content over the background image",
    items: [
    {
      title: "Center Content",
      var: "center-content",
      className: "justify-center items-center text-center",
    },
    {
      title: "Top Left",
      var: "top-left",
      className: "justify-start items-start text-left",
    },
    {
      title: "Top Right",
      var: "top-right",
      className: "justify-end items-start text-right",
    },
    {
      title: "Bottom Left",
      var: "bottom-left",
      className: "justify-start items-end text-left",
    },
    {
      title: "Bottom Right",
      var: "bottom-right",
      className: "justify-end items-end text-right",
    },
    {
      title: "Bottom Center",
      var: "bottom-center",
      className: "justify-center items-end text-center",
    },
    ],
  },
};

// ============================================================================
// TEXT PRESETS
// ============================================================================

export const textPresets = {
  styles: {
    label: "Text Styles",
    type: "select" as const,
    propKey: "presetStyle",
    propType: "root",
    help: "Choose from professionally designed text styles",
    items: [
    {
      title: "Hero Title",
      var: "hero-title",
      className: "text-5xl font-bold text-center tracking-tight leading-tight md:text-7xl font-(--heading-font-family)",
      root: {
        tagName: "h1",
      },
    },
    {
      title: "Page Title",
      var: "page-title",
      className: "text-4xl font-bold tracking-tight leading-tight md:text-6xl font-(--heading-font-family)",
      root: {
        tagName: "h1",
      },
    },
    {
      title: "Section Heading",
      var: "section-heading",
      className: "text-3xl font-bold tracking-tight md:text-4xl font-(--heading-font-family)",
      root: {
        tagName: "h2",
      },
    },
    {
      title: "Card Heading",
      var: "card-heading",
      className: "text-xl font-bold leading-snug md:text-2xl font-(--heading-font-family)",
      root: {
        tagName: "h3",
      },
    },
    {
      title: "Body Text",
      var: "body-text",
      className: "text-base font-normal leading-relaxed md:text-lg font-(--body-font-family)",
      root: {
        tagName: "p",
      },
    },
    {
      title: "Lead Paragraph",
      var: "lead-paragraph",
      className: "text-lg font-normal leading-relaxed md:text-xl font-(--body-font-family)",
      root: {
        tagName: "p",
      },
    },
    {
      title: "Quote / Pullquote",
      var: "quote",
      className: "text-2xl font-normal italic leading-relaxed text-center md:text-3xl font-(--body-font-family)",
      root: {
        tagName: "blockquote",
      },
    },
    {
      title: "Button Text",
      var: "button-text",
      className: "text-sm font-bold tracking-wide uppercase md:text-base font-(--heading-font-family)",
      root: {
        tagName: "span",
      },
    },
    {
      title: "Caption / Small",
      var: "caption",
      className: "text-sm font-normal leading-snug font-(--body-font-family)",
      root: {
        tagName: "p",
      },
    },
    {
      title: "Overline / Label",
      var: "overline",
      className: "text-xs font-bold tracking-widest uppercase font-(--heading-font-family)",
      root: {
        tagName: "span",
      },
    },
    {
      title: "Eyebrow / Kicker",
      var: "eyebrow",
      className: "text-sm font-bold tracking-wider uppercase font-(--heading-font-family)",
      root: {
        tagName: "span",
      },
    },
    {
      title: "Subtitle / Subheading",
      var: "subtitle",
      className: "text-lg font-normal leading-normal md:text-xl font-(--body-font-family)",
      root: {
        tagName: "p",
      },
    },
    {
      title: "Feature Number",
      var: "feature-number",
      className: "text-6xl font-bold leading-none tracking-tighter md:text-8xl font-(--heading-font-family)",
      root: {
        tagName: "div",
      },
    },
    {
      title: "Testimonial Text",
      var: "testimonial",
      className: "text-lg font-normal italic leading-relaxed md:text-xl font-(--body-font-family)",
      root: {
        tagName: "p",
      },
    },
    ],
  },

  sizes: {
    label: "Text Sizes",
    type: "select" as const,
    propKey: "preset",
    propType: "root",
    help: "Choose from predefined text sizes",
    items: [
    {
      title: "Display Large",
      var: "display-lg",
      className: "text-6xl font-bold",
      root: {
        tagName: "h1",
      },
    },
    {
      title: "Display",
      var: "display",
      className: "text-5xl font-bold",
      root: {
        tagName: "h1",
      },
    },
    {
      title: "Heading 1",
      var: "h1",
      className: "text-4xl font-bold",
      root: {
        tagName: "h1",
      },
    },
    {
      title: "Heading 2",
      var: "h2",
      className: "text-3xl font-bold",
      root: {
        tagName: "h2",
      },
    },
    {
      title: "Heading 3",
      var: "h3",
      className: "text-2xl font-semibold",
      root: {
        tagName: "h3",
      },
    },
    {
      title: "Heading 4",
      var: "h4",
      className: "text-xl font-semibold",
      root: {
        tagName: "h4",
      },
    },
    {
      title: "Heading 5",
      var: "h5",
      className: "text-lg font-medium",
      root: {
        tagName: "h5",
      },
    },
    {
      title: "Heading 6",
      var: "h6",
      className: "text-base font-medium",
      root: {
        tagName: "h6",
      },
    },
    {
      title: "Body Large",
      var: "body-lg",
      className: "text-lg font-normal",
      root: {
        tagName: "p",
      },
    },
    {
      title: "Body",
      var: "body",
      className: "text-base font-normal",
      root: {
        tagName: "p",
      },
    },
    {
      title: "Body Small",
      var: "body-sm",
      className: "text-sm font-normal",
      root: {
        tagName: "p",
      },
    },
    {
      title: "Caption",
      var: "caption",
      className: "text-xs font-normal",
      root: {
        tagName: "p",
      },
    },
    ],
  },
};

// ============================================================================
// BUTTON PRESETS
// ============================================================================

export const buttonPresets = {
  sizes: {
    label: "Size",
    type: "select" as const,
    propKey: "presetSize",
    propType: "root",
    items: [
    {
      title: "Small",
      var: "btn-sm",
      className: "px-3 py-1.5 text-sm",
    },
    {
      title: "Medium",
      var: "btn-md",
      className: "px-4 py-2 text-base",
    },
    {
      title: "Large",
      var: "btn-lg",
      className: "px-6 py-3 text-lg",
    },
    {
      title: "Extra Large",
      var: "btn-xl",
      className: "px-8 py-4 text-xl",
    },
    ],
  },

  styles: {
    label: "Style",
    type: "select" as const,
    propKey: "presetStyle",
    propType: "root",
    items: [
    {
      title: "Primary",
      var: "btn-primary",
      className: "px-(--button-padding-x) py-(--button-padding-y) bg-(--primary) text-(--primary-foreground) rounded-(--radius) shadow-(--shadow-style)",
    },
    {
      title: "Secondary",
      var: "btn-secondary",
      className: "px-(--button-padding-x) py-(--button-padding-y) bg-(--secondary) text-(--secondary-foreground) rounded-(--radius)",
    },
    {
      title: "Outline",
      var: "btn-outline",
      className: "px-(--button-padding-x) py-(--button-padding-y) bg-transparent text-(--primary) border border-(--primary) rounded-(--radius)",
    },
    {
      title: "Ghost",
      var: "btn-ghost",
      className: "px-(--button-padding-x) py-(--button-padding-y) bg-transparent text-(--primary)",
    },
    ],
  },
};

// ============================================================================
// SPACER PRESETS
// ============================================================================

export const spacerPresets = {
  heights: {
    label: "Height",
    type: "select" as const,
    propKey: "presetHeight",
    propType: "root",
    items: [
    {
      title: "Extra Small",
      var: "spacer-xs",
      className: "h-2",
    },
    {
      title: "Small",
      var: "spacer-sm",
      className: "h-4",
    },
    {
      title: "Medium",
      var: "spacer-md",
      className: "h-8",
    },
    {
      title: "Large",
      var: "spacer-lg",
      className: "h-16",
    },
    {
      title: "Extra Large",
      var: "spacer-xl",
      className: "h-24",
    },
    {
      title: "2XL",
      var: "spacer-2xl",
      className: "h-32",
    },
    ],
  },
};

// ============================================================================
// IMAGE PRESETS
// ============================================================================

export const imagePresets = {
  aspectRatios: {
    label: "Aspect Ratio",
    type: "select" as const,
    propKey: "presetAspectRatio",
    propType: "mobile",
    items: [
    {
      title: "Square",
      var: "aspect-square",
      className: "aspect-square",
    },
    {
      title: "Video (16:9)",
      var: "aspect-video",
      className: "aspect-video",
    },
    {
      title: "Portrait (3:4)",
      var: "aspect-3/4",
      className: "aspect-3/4",
    },
    {
      title: "Landscape (4:3)",
      var: "aspect-4/3",
      className: "aspect-4/3",
    },
    ],
  },

  sizes: {
    label: "Image Size",
    type: "select" as const,
    propKey: "presetSize",
    propType: "mobile",
    items: [
    {
      title: "Logo Small",
      var: "logo-sm",
      className: "w-8 h-8 md:w-10 md:h-10",
    },
    {
      title: "Logo",
      var: "logo",
      className: "w-12 h-12 md:w-16 md:h-16",
    },
    {
      title: "Small",
      var: "w-24-h-24",
      className: "w-24 h-24",
    },
    {
      title: "Medium",
      var: "w-48-h-48",
      className: "w-48 h-48",
    },
    {
      title: "Large",
      var: "w-64-h-64",
      className: "w-64 h-64",
    },
    {
      title: "Full Width",
      var: "w-full-h-auto",
      className: "w-full h-auto",
    },
    {
      title: "Gallery Image Small",
      var: "gallery-image-sm",
      className: "w-8 h-8 m-3 drop-shadow-md md:w-10 md:h-10 md:m-3",
    },
    {
      title: "Gallery Image Medium",
      var: "gallery-image-md",
      className: "w-16 h-16 m-3 drop-shadow-md md:w-20 md:h-20 md:m-3",
    },
    {
      title: "Gallery Image Large",
      var: "gallery-image-lg",
      className: "w-24 h-24 m-3 drop-shadow-md md:w-32 md:h-32 md:m-3",
    },
    ],
  },
};

// ============================================================================
// FORM PRESETS
// ============================================================================

export const formPresets = {
  inputSizes: {
    label: "Input Size",
    type: "select" as const,
    propKey: "presetInputSize",
    propType: "root",
    items: [
    {
      title: "Small",
      var: "input-sm",
      className: "px-2 py-1 text-sm",
    },
    {
      title: "Medium",
      var: "input-md",
      className: "px-3 py-2 text-base",
    },
    {
      title: "Large",
      var: "input-lg",
      className: "px-4 py-3 text-lg",
    },
    ],
  },
};

// ============================================================================
// DIVIDER PRESETS
// ============================================================================

export const dividerPresets = {
  thickness: {
    label: "Thickness",
    type: "select" as const,
    propKey: "presetThickness",
    propType: "root",
    help: "Adjust the thickness of the divider",
    items: [
    {
      title: "Hair",
      var: "divider-hair",
      className: "h-px",
    },
    {
      title: "Thin",
      var: "divider-thin",
      className: "h-0.5",
    },
    {
      title: "Regular",
      var: "divider-regular",
      className: "h-1",
    },
    {
      title: "Medium",
      var: "divider-medium",
      className: "h-2",
    },
    {
      title: "Thick",
      var: "divider-thick",
      className: "h-4",
    },
    {
      title: "Extra Thick",
      var: "divider-xthick",
      className: "h-8",
    },
    ],
  },
};

// ============================================================================
// FORM ELEMENT PRESETS
// ============================================================================

export const formElementPresets = {
  size: {
    label: "Input Size",
    type: "select" as const,
    propKey: "presetSize",
    propType: "root",
    help: "Adjust the size of form inputs",
    items: [
    {
      title: "Small",
      var: "input-sm",
      className: "px-2 py-1 text-sm",
    },
    {
      title: "Medium",
      var: "input-md",
      className: "px-3 py-2 text-base",
    },
    {
      title: "Large",
      var: "input-lg",
      className: "px-4 py-3 text-lg",
    },
    ],
  },

  style: {
    label: "Input Style",
    type: "select" as const,
    propKey: "presetStyle",
    propType: "root",
    items: [
    {
      title: "Outlined",
      var: "input-outlined",
      className: "border border-(--border-color) bg-(--card) rounded-(--radius)",
    },
    {
      title: "Filled",
      var: "input-filled",
      className: "border-0 bg-(--muted) rounded-(--radius)",
    },
    {
      title: "Underlined",
      var: "input-underlined",
      className: "border-0 border-b border-(--border-color) bg-transparent rounded-none",
    },
    ],
  },
};

// ============================================================================
// EXPORT ALL PRESETS
// ============================================================================

export const selectorPresets = {
  container: containerPresets,
  backgroundImage: backgroundImagePresets,
  text: textPresets,
  button: buttonPresets,
  spacer: spacerPresets,
  image: imagePresets,
  form: formPresets,
  divider: dividerPresets,
  formElement: formElementPresets,
};
