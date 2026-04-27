# Settings Panel — Property Registry System

Schema-driven sidebar. Every property defined as structured data. PropertyRenderer dispatches input types. PropertySection builds accordion sections. SDK consumers can register, override, and remove anything.

## Architecture

```
propertyDefs.ts          — Types: PropertyDef, PropertyInput, SectionDef, ShorthandMode
propertyRegistry.ts      — Public API: register, override, unregister, search
PropertyRenderer.tsx     — Renders a single property from its def (10 input types)
PropertySection.tsx      — Renders a section accordion from PropertyDefs
AccordionAddMenu.tsx     — `+` picker for non-pinned properties
RegistrySettings.tsx     — Main shell (tabs, search, structural sections)
inputs/shorthand/        — ShorthandInput (uniform/split mode toggle)
properties/              — Definition files (one per domain)
  sectionDefs.ts         — All section definitions (id, title, tab, icon, sortOrder)
  typography.ts          — Font, size, weight, color, alignment + advanced
  background.ts          — Color, image, pattern, gradient + clip/blend
  appearance.ts          — Styles section: opacity, shadow, radius + Border / Ring /
                           Outline / Divide bundles
  effects.ts             — Six popover-mode rows under the unified `effects`
                           section (Animation, Scroll Effect, Transition,
                           Transform, Filter, Backdrop). All share the
                           `EffectRowInputPopover` trigger; per-id behavior
                           lives in `effects-builder/effectTypes.tsx`.
  layout.ts              — Size properties (width, height, min/max, aspect)
  display.ts             — Position, inset (shorthand), order + behavior props
                           moved to Styles (visibility, overflow, cursor, z-index,
                           pointer-events, user-select)
  aria.ts                — ARIA labels, roles, focus, live regions
  alignment.ts           — Layout direction, gap, align/justify, padding, margin
  interactions.ts        — Action (custom) + hover styles
  advanced.ts            — Padding/margin shorthand, conditions, animations,
                           scroll effect, properties, AI context, import/export,
                           permissions
```

## Tabs

| Tab          | Sections                                                                              |
| ------------ | ------------------------------------------------------------------------------------- |
| Component    | Component settings (MainTab), Action, Data source                                     |
| Layout       | Layout (direction, gap, align, padding, margin), Size                                 |
| Design       | Typography, Background, Styles, Effects (unified)                                     |
| Interactions | Hover, Conditions, Overflow                                                           |
| Advanced     | Properties, ARIA, Modifiers, Classes, Display, AI Context, Import/Export, Permissions |

The **Effects** section is a multi-row popover-mode section: one accordion with six popover-mode rows (Animation, Scroll Effect, Transition, Transform, Filter, Backdrop) sharing one trigger component. Storage stays split (root.animation\*, container scrollEffect props, className tokens). Standard `+` in the section header for adding; chip per active row in body. See [editor-popover-pattern.md §7](../../../../../docs/sdk/editor-popover-pattern.md#7-multi-row-popover-mode-sections).

## Visibility model — Framer-style add/remove

Properties are hidden by default unless `pinned: true`. The `+` button in each section header opens a searchable picker listing all addable properties. A non-pinned property becomes visible when:

1. It has a value (checked via `propertyHasValue`).
2. It was just added in this session (`SessionAddedAtom`).
3. It's in `node.props.toolbarOrder` (persisted click order).

User-added rows append to the bottom of the section in click order, surviving reload. Properties without a clean default value (e.g. `tailwind-select`/`tailwind-radio`) are session-only — if the user navigates away without setting a value, the row disappears next session. Properties whose `+Add` writes a default value persist via `hasValue`.

**Empty sections** — when a section has no pinned, no in-order, and no with-value properties, the accordion is forced closed (`enabled={false}` propagates to `isOpen={false}` in `ToolbarSection`). Clicking the title opens the picker instead of toggling. If the section has no candidates at all, it doesn't render.

## Property Input Types

| Type              | Renders                                 | Example                                                 |
| ----------------- | --------------------------------------- | ------------------------------------------------------- |
| `tailwind-select` | Dropdown from TailwindStyles            | fontSize, fontWeight, order                             |
| `tailwind-radio`  | Pill selector from TailwindStyles       | textAlign, flexDirection                                |
| `universal`       | Value input (tailwind/calc/px/em/rem/%) | width, blur, ring                                       |
| `color`           | Color picker with prefix                | bgColor (bg-), textColor (text-), borderColor (border-) |
| `checkbox`        | Toggle on/off class                     | borderTop (border-t)                                    |
| `text`            | Text input                              | ariaLabel, element ID                                   |
| `select`          | Dropdown with explicit options          | role, tabIndex, ariaExpanded                            |
| `shorthand`       | Mode-toggle row (uniform / X-Y / sides) | gap, padding, margin, borderRadius                      |
| `multi-toggle`    | Segmented row of independent toggles    | emphasis (bold / italic / underline / strike)           |
| `bundle`          | Chip + floating popover                 | ring, outline                                           |
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
  pinned: true,                   // optional — always visible (skip the +Add gate)
}
```

Conditional visibility:

```ts
{
  ...
  showWhen: (className) => /\babsolute\b/.test(className),
}
```

Disambiguating `+Add` picker rows when several properties share a label (e.g. Ring "Width" vs Outline "Width"):

```ts
{ id: "ringWidth",    label: "Width",  groupLabel: "Ring",    ... }
{ id: "outlineWidth", label: "Width",  groupLabel: "Outline", ... }
```

The `groupLabel` renders in muted text on the right side of the picker row.

## Shorthand input — uniform / split mode

For properties with one logical concept and several Tailwind shorthand forms (gap, padding, margin, border-radius, inset, etc.) — one row, multiple modes. The toggle on the right shows one icon per mode; switching clears tags from every other mode so only one set of classes is ever live. Initial mode = the most-specific mode that has a value; else the first.

```ts
{
  id: "gap",
  label: "Gap",
  section: "alignment",
  input: {
    type: "shorthand",
    tailwindKey: "gap",
    varSelectorPrefix: "gap",
    modes: [
      {
        id: "uniform",
        icon: React.createElement(TbSquare, { className: "size-3.5" }),
        ariaLabel: "Uniform gap",
        tags: ["gap"],
        labels: [""],
      },
      {
        id: "axes",
        icon: React.createElement(TbSpacingHorizontal, { className: "size-3.5" }),
        ariaLabel: "Gap X & Y",
        tags: ["gap-x", "gap-y"],
        labels: ["X", "Y"],
        tailwindKeys: ["gapX", "gapY"],
      },
    ],
  },
  pinned: true,
}
```

For padding/margin add a third mode (`tags: ["pt","pr","pb","pl"]`, labels `["T","R","B","L"]`, `columns: 2`). For radius add a per-corner mode (`["rounded-tl","rounded-tr","rounded-br","rounded-bl"]`).

`columns` controls the grid layout of the expanded row (defaults to `tags.length`). Use `2` for 4-side splits so T/R sit on one row, B/L on another.

## Multi-toggle input — independent toggles in one row

For "text emphasis"-style controls where each option is independently on/off and crosses Tailwind class groups (Bold = `font-bold`/`fontWeight`, Italic = `italic`/`fontStyle`, Underline = `underline`/`textDecoration`, Strike = `line-through`/`textDecoration`). Renders inside the canonical `ToolbarSegmentedControl` track (`bg-neutral` rail, `bg-base-100 + shadow-sm` active chip — same look as the alignment radios) with a leading "None" segment that clears every toggle's class at the active view.

```ts
{
  id: "emphasis",
  label: "Style",
  section: "typography",
  inline: true,
  input: {
    type: "multi-toggle",
    toggles: [
      { icon: <TbBold className="size-3.5" />,          tooltip: "Bold",          propKey: "fontWeight",     className: "font-bold" },
      { icon: <TbItalic className="size-3.5" />,        tooltip: "Italic",        propKey: "fontStyle",      className: "italic" },
      { icon: <TbUnderline className="size-3.5" />,     tooltip: "Underline",     propKey: "textDecoration", className: "underline" },
      { icon: <TbStrikethrough className="size-3.5" />, tooltip: "Strikethrough", propKey: "textDecoration", className: "line-through" },
    ],
  },
}
```

Reads/writes go through the standard `getPropFinalValue` + `changeProp` plumbing per toggle, so each toggle respects breakpoint scope (`md:font-bold`, etc.) and the `dark:` variant the same as any other class input. Toggles that share a `propKey` (e.g. Underline + Strike both write to `textDecoration`) are mutually exclusive at write-time because `tailwind-merge` collapses the group — that's intentional, not a bug. `propertyHasValue` auto-shows the row when any toggle's class is on the node, so the +Add menu doesn't need to seed a default value.

## Bundle input — chip + floating popover

For *compound* properties that bundle several controls into one logical thing the user adds or removes as a unit (Ring, Outline, future Shadow stacks, gradients). The chip appears inline in the section. Clicking it opens a draggable, viewport-clamped `FloatingPanel` (`packages/sdk/src/chrome/floating/FloatingPanel.tsx`) anchored to the chip and docked on the side opposite the editor sidebar (`SideBarAtom`). The panel renders the bundle's child PropertyDefs via `PropertyRenderer`. Closing the panel doesn't persist position or size — every open is fresh from the trigger's bounding rect.

```ts
{
  id: "ring",
  label: "Ring",
  section: "styles",
  hideKey: "ringOutline",
  input: {
    type: "bundle",
    properties: [
      {
        id: "ringWidth",
        label: "Width",
        section: "styles",
        keywords: ["ring", "width"],
        input: {
          type: "universal",
          propTag: "ring",
          tailwindKey: "ringWidth",       // populates the dropdown options
          allowedTypes: RING_OUTLINE_TYPES,
          showVarSelector: true,
        },
        inline: true,
      },
      { id: "ringColor",       label: "Color",  input: { type: "color", prefix: "ring" }, inline: true },
      { id: "ringOffsetWidth", label: "Offset", input: { type: "universal", propTag: "ring-offset", tailwindKey: "ringOffsetWidth", ... }, inline: true },
    ],
    // icon? — optional. Omit when no semantically appropriate icon exists.
  },
}
```

**Visibility / auto-detect.** `propertyHasValue` recognizes bundles: a bundle "has a value" when any of its child PropertyDefs does. So a node already carrying `ring-2 ring-primary` automatically shows the Ring chip on selection — no need for `pinned` or `sessionAdded`.

**Add / Remove semantics.**
- `+Add` → bundle pushes a `sessionKey` entry into `SessionAddedAtom` and the panel auto-opens. No `defaultValue` is written; once the user picks a value inside the popover, `propertyHasValue` keeps the chip alive across reloads.
- The `X` on the chip strips every class the bundle owns across **every** scope (mobile / sm / md / dark / hover) by walking the className, matching each token's base via `classPropKeyMatches` against the child propKeys, and dropping matches. ALL in one atomic `setProp` so children don't race each other through the changeProp debounce.

**Chip preview.** When the bundle has a child with `input.type === "color"`, the chip shows a swatch on the left:
- If the active className contains a class matching that child's `prefix` (e.g. `ring-primary`), the swatch fills with the equivalent `bg-*` class (`bg-primary`).
- Else, transparent checker pattern (`TRANSPARENT_CHECKER_BG`).

When no color child exists and an `icon` is provided, the icon renders instead. Otherwise nothing — the chip body is just text.

**Chip body.** Synthesizes a summary from each child's current value: class children format their token via `formatTailwindDisplayLabel(value, propKey)` (e.g. `underline` → "Underline"), component / root children stringify primitive values. Joined with " · ", capped at 2 labels (so the chip stays one line). Falls back to "Add..." in muted text when no child has a value yet.

**Why this exists.** `+Add` for individual ring/outline props was ambiguous (Width / Color / Offset duplicated across both, even with `groupLabel` disambiguators). Bundles model it the way users think: "I want a Ring," not "I want a ring-width, then a ring-color, then a ring-offset."

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

For string-keyed lazy lookups, register the component in `customInputs.tsx` and reference it by string:

```ts
input: { type: "custom", component: "MyComponent" }
```

**Important:** Custom components render the BODY only. The section accordion wrapper (title, icon, help) is provided by PropertySection. Do NOT render your own `<ToolbarSection>` wrapper.

## hideKey enforcement

Both `SectionDef.hideKey` and `PropertyDef.hideKey` are honored. When a key is in the toolbar's `hide[]` array (delivered via `HiddenKeysAtom`):

- Sections whose `hideKey` matches return `null` from `PropertySection`.
- Properties whose `hideKey` matches are filtered out before split + visibility gating.
- The `+Add` picker filters them too — a hidden property cannot be added.

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
  id: string;              // unique key
  label: string;           // UI label
  section: SectionId;      // which section
  keywords: string[];      // search keywords
  input: PropertyInput;    // how to render
  propKey?: string;        // override prop key (default: id)
  propType?: string;       // "class" | "component" | "root" (default: "class")
  index?: string;          // responsive/state index (e.g. "hover")
  hideKey?: HideKey;       // hidden when key is in toolbar.hide[]
  sortOrder?: number;      // position within section (default: 100)
  searchOnly?: boolean;    // only in search results, not normal view
  inline?: boolean;        // label + input on same row
  showWhen?: (className, props) => boolean;
  groupLabel?: string;     // disambiguator shown in +Add picker (e.g. "Ring" vs "Outline")
  pinned?: boolean;        // always visible (skips the +Add gate)
  defaultValue?: string;   // value written when added via +Add picker
  help?: string;           // tooltip
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
}

interface ShorthandMode {
  id: string;              // "uniform" | "axes" | "sides" | "corners" | ...
  icon: ReactNode;
  ariaLabel: string;       // also used as tooltip + placeholder caption
  tags: string[];          // ["p"], ["px","py"], ["pt","pr","pb","pl"]
  labels: string[];        // matching labels per slot
  tailwindKeys?: string[]; // per-slot TailwindStyles keys
  columns?: number;        // grid column count for the expanded row
}

// Bundle input — chip + floating panel
type BundleInput = {
  type: "bundle";
  properties: PropertyDef[];   // children rendered inside the popover
  icon?: ReactNode;            // optional leading icon (omit when no semantic match)
};
```

## Rules

1. **Standard inputs use schema types** — color, select, radio, universal, text, checkbox, shorthand. Never lazy-import a component for something PropertyRenderer handles.
2. **Custom components provide body only** — PropertySection owns the accordion wrapper. No `<ToolbarSection>` in custom components.
3. **No nesting top-level sections** — each section is its own accordion. Sub-sections (nested `ToolbarSection`) inside a body are fine when needed.
4. **hideKey filtering happens at render time** — sections stay in the tree, return null content when hidden. No tree removal.
5. **Module-level lazy imports** — stable references. Never create `React.lazy()` inside render.
6. **Inline label width is canonical `w-20`** — set by `Wrap` in `ToolbarStyle.tsx`. Don't override unless you need a tighter row (per-axis split labels use `w-6`).
7. **Tooltips via react-tooltip data attrs** — never native `title=""`. Use `data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}` + `data-tooltip-content`.
