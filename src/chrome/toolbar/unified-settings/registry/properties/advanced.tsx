/**
 * Advanced tab property definitions — Properties, AI Context, Import/Export, Permissions.
 *
 * These are all `type: "custom"` — complex interactive components that can't be
 * expressed as simple form inputs. But they're registered in the property system
 * so they're searchable, orderable, and overridable.
 */
import React from "react";
import { LoadingBarSuspenseFallback } from "../../../../primitives/LoadingBar";
import type { PropertyDef } from "../propertyDefs";

// Lazy component refs — stable module-level references
const LazyAlignmentBody = React.lazy(() =>
  import("./AlignmentBody").then(m => ({ default: m.AlignmentBody }))
);
const LazySpacingBody = React.lazy(() =>
  import("./SpacingBody").then(m => ({ default: m.SpacingBody }))
);
const LazyPropertiesInput = React.lazy(() =>
  import("../../../inputs/advanced/PropertiesInput").then(m => ({ default: m.PropertiesInput }))
);
const LazyNodeAiContextSection = React.lazy(() =>
  import("../../mainTabs/NodeAiContextSection").then(m => ({ default: m.NodeAiContextSection }))
);
const LazyComponentImportExport = React.lazy(() =>
  import("../../../inputs/advanced/ComponentImportExport").then(m => ({
    default: m.ComponentImportExport,
  }))
);
const LazyPermissionsSection = React.lazy(() =>
  import("../PermissionsSection").then(m => ({ default: m.PermissionsSection }))
);
const LazyConditionsInput = React.lazy(() =>
  import("../../../inputs/advanced/ConditionsInput").then(m => ({ default: m.ConditionsInput }))
);
const LazyAnimationsInput = React.lazy(() =>
  import("../../../inputs/advanced/AnimationsInput").then(m => ({ default: m.AnimationsInput }))
);
const LazyScrollEffectSection = React.lazy(() =>
  import("../../mainTabs/ContainerScrollEffectSection").then(m => ({
    default: m.ContainerScrollEffectSection,
  }))
);

export const advancedProperties: PropertyDef[] = [
  // ─── Alignment section (custom — mode-dependent flex/grid/block) ─
  {
    id: "alignment.body",
    label: "Alignment",
    section: "alignment",
    keywords: ["alignment", "flex", "grid", "direction", "gap", "align", "justify"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyAlignmentBody />
        </React.Suspense>
      ),
    },
    sortOrder: 0,
  },

  // ─── Spacing section (custom — shared type selector across all inputs) ─
  {
    id: "spacing.body",
    label: "Spacing",
    section: "spacing",
    keywords: ["padding", "margin", "spacing", "space", "inner", "outer"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazySpacingBody />
        </React.Suspense>
      ),
    },
    sortOrder: 0,
  },

  // ─── Properties section ──────────────────────────────────────────
  {
    id: "properties.elementId",
    label: "Element ID",
    section: "properties",
    keywords: ["id", "element", "html", "anchor", "link", "hash"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyPropertiesInput />
        </React.Suspense>
      ),
    },
    sortOrder: 0,
  },

  // ─── AI Context section ──────────────────────────────────────────
  {
    id: "aiContext",
    label: "AI Context",
    section: "ai-context",
    keywords: ["ai", "context", "notes", "tags", "description", "assistant", "prompt"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyNodeAiContextSection />
        </React.Suspense>
      ),
    },
    sortOrder: 0,
  },

  // ─── Import / Export section ─────────────────────────────────────
  {
    id: "importExport",
    label: "Import / Export",
    section: "import-export",
    keywords: ["json", "copy", "paste", "import", "export", "code", "clipboard"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyComponentImportExport />
        </React.Suspense>
      ),
    },
    hideKey: "importExport",
    sortOrder: 0,
  },

  // ─── Permissions section ─────────────────────────────────────────
  {
    id: "permissions",
    label: "Permissions",
    section: "permissions",
    keywords: ["permission", "lock", "drag", "delete", "drop", "move", "protect", "restrict"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyPermissionsSection />
        </React.Suspense>
      ),
    },
    sortOrder: 0,
  },

  // ─── Conditions section ─────────────────────────────────────────
  {
    id: "conditions",
    label: "Conditions",
    section: "conditions",
    keywords: [
      "condition",
      "visibility",
      "show",
      "hide",
      "url",
      "form",
      "device",
      "auth",
      "connector",
    ],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyConditionsInput />
        </React.Suspense>
      ),
    },
    sortOrder: 0,
  },

  // ─── Animations section ─────────────────────────────────────────
  {
    id: "animations",
    label: "Animation",
    section: "animations",
    keywords: [
      "animate",
      "motion",
      "entrance",
      "scroll",
      "framer",
      "css",
      "fade",
      "slide",
      "scale",
      "bounce",
      "spring",
    ],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyAnimationsInput />
        </React.Suspense>
      ),
    },
    hideKey: "animations",
    sortOrder: 0,
  },

  // ─── Scroll Effect section ──────────────────────────────────────
  {
    id: "scrollEffect",
    label: "Scroll Effect",
    section: "scroll-effect",
    keywords: ["scroll", "horizontal", "timeline", "pin", "gsap", "section", "parallax"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyScrollEffectSection />
        </React.Suspense>
      ),
    },
    showWhen: (_cls, props) => props._craftName === "Container",
    sortOrder: 0,
  },
];
