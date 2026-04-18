# Settings Panel — Property Registry System

Schema-driven sidebar. Every property defined as structured data. PropertyRenderer dispatches input types. PropertySection builds accordion sections. SDK consumers can register, override, and remove anything.

## Architecture

```
propertyDefs.ts          — Types: PropertyDef, PropertyInput, SectionDef
propertyRegistry.ts      — Public API: register, override, unregister, search
PropertyRenderer.tsx     — Renders a single property from its def (8 input types)
PropertySection.tsx      — Renders a section accordion from PropertyDefs
RegistrySettings.tsx     — Main shell (tabs, search, structural sections)
properties/              — Definition files (one per domain)
  sectionDefs.ts         — All section definitions (id, title, tab, icon, sortOrder)
  typography.tsx         — Font, size, weight, color, alignment + 12 advanced
  background.tsx         — Color, image, pattern, gradient + clip/blend
  appearance.ts          — Border, radius, shadow, opacity + ring/outline/divide
  effects.ts             — Transition, blur + transforms/filters/backdrop
  layout.tsx             — Size properties (width, height, min/max, aspect)
  display.tsx            — Position, cursor, overflow, offsets + 15 CSS utilities
  aria.ts                — ARIA labels, roles, focus, live regions
  interactions.tsx       — Action (custom) + hover styles
  advanced.tsx           — Layout body, spacing body, conditions, animations,
                           scroll effect, properties, AI context, import/export,
                           permissions
  AlignmentBody.tsx      — Flex/grid mode-dependent alignment controls
  SpacingBody.tsx         — Padding/margin with shorthand-first layout
```

## Tabs

| Tab          | Sections                                                                              |
| ------------ | ------------------------------------------------------------------------------------- |
| Component    | Component settings (MainTab), Modifiers                                               |
| Layout       | Alignment, Size, Spacing                                                              |
| Design       | Typography, Background, Appearance                                                    |
| Interactions | Action, Hover, Conditions, Animation, Tailwind Effects, Scroll Effect                 |
| Advanced     | Properties, ARIA, Modifiers, Classes, Display, AI Context, Import/Export, Permissions |

## Property Input Types

| Type              | Renders                                 | Example                                                 |
| ----------------- | --------------------------------------- | ------------------------------------------------------- |
| `tailwind-select` | Dropdown from TailwindStyles            | fontSize, fontWeight, order                             |
| `tailwind-radio`  | Pill selector from TailwindStyles       | textAlign, flexDirection                                |
| `universal`       | Value input (tailwind/calc/px/em/rem/%) | width, gap, padding, blur                               |
| `color`           | Color picker with prefix                | bgColor (bg-), textColor (text-), borderColor (border-) |
| `checkbox`        | Toggle on/off class                     | borderTop (border-t)                                    |
| `text`            | Text input                              | ariaLabel, element ID                                   |
| `select`          | Dropdown with explicit options          | role, tabIndex, ariaExpanded                            |
| `custom`          | React component                         | FontFamilyInput, ActionInput, GradientInput             |

## Adding a Property

Add to the relevant definition file in `properties/`:

```ts
{
  id: "myProp",
  label: "My Property",
  section: "typography",          // which section it belongs to
  keywords: ["my", "prop"],       // searchable keywords
  input: { type: "tailwind-select", tailwindKey: "myProp" },
  sortOrder: 50,                  // position within section
  inline: true,                   // label + input on same row
}
```

Advanced toggle (flat):

```ts
{
  ...
  advancedGroup: "typography",    // hidden behind "More typography" toggle
  sortOrder: 150,
}
```

Conditional visibility:

```ts
{
  ...
  showWhen: (className) => /\babsolute\b/.test(className),
}
```

## Advanced Sub-sections — Grouping a long "More" list

When a section has many advanced properties that cluster into distinct concepts (Typography → Spacing / Decoration / Wrapping / Other, Effects → Transform / Filter / Backdrop, Display → Behavior / Page Breaks / List / Table / SVG), flat rendering becomes a 15-row dump. Group them.

**Step 1** — assign each property a meaningful `advancedGroup` id:

```ts
{ id: "lineHeight",   label: "Line Height",   advancedGroup: "spacing", ... }
{ id: "tracking",     label: "Tracking",      advancedGroup: "spacing", ... }
{ id: "textDecoration", label: "Line",        advancedGroup: "decoration", ... }
{ id: "decorationStyle", label: "Style",      advancedGroup: "decoration", ... }
```

**Step 2** — declare the sub-sections on the `SectionDef`:

```ts
{
  id: "typography",
  title: "Typography",
  tab: "design",
  advancedSubsections: [
    { id: "spacing",    title: "Spacing" },
    { id: "decoration", title: "Decoration" },
    { id: "wrapping",   title: "Wrapping" },
    { id: "other",      title: "Other", defaultOpen: false },
  ],
  ...
}
```

Each sub-section renders as a nested collapsible `ToolbarSection` (no card chrome, `accordionPassive` — does NOT participate in the global toggle-all). `columns` controls its grid (default 1). `defaultOpen` defaults to true.

**Orphan group** — properties whose `advancedGroup` doesn't match any declared sub-section id render at the bottom as a catch-all "Other" group. This is intentional — dropping properties silently hides bugs.

**`skipAdvancedToggle: true`** — drops the outer "More X properties" toggle entirely so the sub-sections render directly inside the section body. Use when the section has NO flat main fields and the sub-sections ARE its content (see Ring & Outline — parallel Ring + Outline stacks with no top-level main fields).

**`advancedColumns: number`** — column count for flat (non-grouped) advanced mode. Ignored when `advancedSubsections` is set.

## Label Policy

Labels are read INSIDE the section / sub-section header, so drop redundant prefixes:

| Section context         | Original label          | Shortened | Why                              |
| ----------------------- | ----------------------- | --------- | -------------------------------- |
| BORDER                  | "Border Width"          | "Width"   | Header says BORDER               |
| BACKGROUND              | "Background Image"      | "Image"   | Header says BACKGROUND           |
| TYPOGRAPHY              | "Font Family"           | "Family"  | Header says TYPOGRAPHY           |
| BORDER > Per-side       | "Border Top"            | "Top"     | Sub-section says Per-side        |
| BORDER > Divide         | "Divide X"              | "X"       | Sub-section says Divide          |
| RING & OUTLINE > Ring   | "Ring Width"            | "Width"   | Sub-section says Ring            |
| EFFECTS > Backdrop      | "Backdrop Brightness"   | "Brightness" | Sub-section says Backdrop     |
| DISPLAY > Page Breaks   | "Break Before"          | "Before"  | Sub-section says Page Breaks     |
| DISPLAY > SVG           | "SVG Stroke"            | "Stroke"  | Sub-section says SVG             |

**Keep prefixes where they distinguish concepts in the same section**: `Ring Width` vs `Outline Width` can coexist in a "Ring & Outline" section because they're two parallel concepts; dropping to just "Width" twice would be ambiguous. Same for "Decoration Style" / "Decoration Thickness" inside a Decoration sub-group — both sub-modify Decoration and need the prefix.

## Adding a Section

In `sectionDefs.ts`:

```ts
{
  id: "my-section",
  title: "My Section",
  tab: "design",                  // which tab
  icon: React.createElement(TbIcon),
  keywords: ["my", "section"],
  sortOrder: 35,                  // position within tab
  help: "Tooltip text.",
}
```

## Adding a Custom Component Property

For complex UIs that can't be expressed as standard inputs:

```ts
const LazyMyComponent = React.lazy(() =>
  import("./MyComponent").then(m => ({ default: m.MyComponent }))
);

{
  id: "myCustom",
  label: "My Custom",
  section: "my-section",
  keywords: ["custom"],
  input: {
    type: "custom",
    component: () => (
      <React.Suspense fallback={null}>
        <LazyMyComponent />
      </React.Suspense>
    ),
  },
  sortOrder: 0,
}
```

**Important:** Custom components render the BODY only. The section accordion wrapper (title, icon, help) is provided by PropertySection. Do NOT render your own `<ToolbarSection>` wrapper.

## SDK Consumer API

```ts
import {
  registerProperties,
  registerSectionDef,
  overrideProperty,
  unregisterProperty,
  unregisterSectionDef,
  getProperties,
  searchProperties,
} from "@pagehub/sdk";

// Add properties to an existing section
registerProperties([
  { id: "myProp", label: "My Prop", section: "typography", ... }
]);

// Add a new section
registerSectionDef({
  id: "my-plugin",
  title: "My Plugin",
  tab: "advanced",
  keywords: ["plugin"],
  sortOrder: 50,
});

// Override an existing property's renderer
overrideProperty("fontSize", {
  input: { type: "custom", component: MyFancySlider },
});

// Remove a property
unregisterProperty("backdropSepia");

// Search
const results = searchProperties("padding");
// → Map<SectionId, PropertyDef[]>
```

## Property Definition Reference

```ts
interface PropertyDef {
  id: string; // unique key
  label: string; // UI label
  section: SectionId; // which section
  keywords: string[]; // search keywords
  input: PropertyInput; // how to render (see input types above)
  propKey?: string; // override prop key (default: id)
  propType?: string; // "class" | "component" | "root" (default: "class")
  index?: string; // responsive/state index (e.g. "hover")
  hideKey?: HideKey; // hidden when component disables this key
  sortOrder?: number; // position within section (default: 100)
  searchOnly?: boolean; // only in search results, not normal view
  inline?: boolean; // label + input on same row
  showWhen?: (className, props) => boolean; // conditional visibility
  advancedGroup?: string; // behind "More X" toggle; groups by id when
                          // SectionDef.advancedSubsections is set
  help?: string; // tooltip
}
```

```ts
interface SectionDef {
  id: SectionId;
  title: string;
  tab: SettingsTab;
  icon?: ReactNode;
  keywords: string[];
  hideKey?: HideKey;
  sortOrder: number;
  help?: string;
  searchOnly?: boolean;
  defaultOpen?: boolean;
  advancedColumns?: number;              // grid cols for flat advanced (ignored w/ subsections)
  advancedSubsections?: SectionAdvancedSubsection[];
  skipAdvancedToggle?: boolean;          // when grouped: render subsections directly,
                                         //  no outer "More X" toggle
}

interface SectionAdvancedSubsection {
  id: string;          // matches PropertyDef.advancedGroup
  title: string;       // nested sub-section header
  columns?: number;    // default 1
  defaultOpen?: boolean; // default true
}
```

## Rules

1. **Standard inputs use schema types** — color, select, radio, universal, text, checkbox. Never lazy-import a component for something PropertyRenderer handles.
2. **Custom components provide body only** — PropertySection owns the accordion wrapper. No `<ToolbarSection>` in custom components.
3. **No nesting top-level sections** — each section is its own accordion. Sub-sections (nested ToolbarSection) inside a body are fine.
4. **hideKey filtering happens at render time** — sections stay in the tree, return null content when hidden. No tree removal.
5. **Module-level lazy imports** — stable references. Never create `React.lazy()` inside render.
