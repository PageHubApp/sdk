// ─── Demo Blocks fixture ───────────────────────────────────────────────────
//
// A minimal in-memory BlocksProvider so the demo's Blocks panel has something
// to show without a backend. Two categories, two trivial blocks each. Each
// `structure` is the recursive `{ type, props, children }` shape that the
// SDK's buildCraftTreeFromStructure consumes when the user drags a block onto
// the canvas (NOT the flat CraftJS node-map saved templates use).
//
// Real consumers would replace this with REST / static-JSON / IndexedDB /
// whatever. See docs/sdk/host-constraints.md "Bring your own Blocks".

(function () {
  function section(children) {
    return {
      type: "Container",
      props: { className: "w-full py-12 px-6 bg-base-100 text-base-content" },
      children,
    };
  }

  function heading(text, level) {
    return {
      type: "Text",
      props: {
        text,
        tagName: level,
        className: level === "h1" ? "text-4xl font-bold" : "text-2xl font-semibold",
      },
    };
  }

  function paragraph(text) {
    return {
      type: "Text",
      props: { text, tagName: "p", className: "text-base mt-4" },
    };
  }

  function button(text) {
    return {
      type: "Button",
      props: { text, className: "btn btn-primary mt-4" },
    };
  }

  const BLOCKS = [
    {
      _id: "demo-hero-1",
      slug: "hero-simple",
      name: "Simple Hero",
      category: "hero",
      description: "A bare hero with one heading.",
      structure: section([heading("Build pages with PageHub.", "h1")]),
    },
    {
      _id: "demo-hero-2",
      slug: "hero-cta",
      name: "Hero + CTA",
      category: "hero",
      description: "Hero with a subtitle and primary call-to-action.",
      structure: section([
        heading("Drop blocks. Edit live.", "h1"),
        paragraph("A constrained editor mode powered by @pagehub/sdk."),
        button("Get started"),
      ]),
    },
    {
      _id: "demo-feature-1",
      slug: "feature-text",
      name: "Feature paragraph",
      category: "feature",
      description: "Body copy block.",
      structure: section([
        heading("Bring your own blocks", "h2"),
        paragraph("Email, blog, landing page — same editor."),
      ]),
    },
    {
      _id: "demo-feature-2",
      slug: "feature-callout",
      name: "Callout",
      category: "feature",
      description: "Short emphasized line.",
      structure: section([
        heading("Constrained but composable", "h2"),
        paragraph("Allowlist components, filter presets, register a blocks provider."),
        button("Learn more"),
      ]),
    },
  ];

  const CATEGORIES = [
    { id: "hero", name: "Hero", total: 2, subcategories: [], styles: [] },
    { id: "feature", name: "Feature", total: 2, subcategories: [], styles: [] },
  ];

  window.DEMO_BLOCKS_PROVIDER = {
    async listCategories() {
      return CATEGORIES;
    },
    async listBlocks(query) {
      let out = BLOCKS.slice();
      if (query.category) out = out.filter(b => b.category === query.category);
      if (query.search) {
        const q = query.search.toLowerCase();
        out = out.filter(b => b.name.toLowerCase().includes(q));
      }
      if (query.limit) out = out.slice(0, query.limit);
      return out;
    },
  };
})();
