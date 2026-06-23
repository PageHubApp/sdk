/**
 * @pagehub/sdk — Main entry point
 *
 * This is the public API surface of the SDK.
 *
 * Usage (vanilla JS / any framework):
 * ```js
 * import PageHub from '@pagehub/sdk';
 *
 * const editor = PageHub.init({
 *   container: '#pagehub-editor',
 *   callbacks: {
 *     onSave: (pageData) => fetch('/api/save', { method: 'POST', body: JSON.stringify(pageData) }),
 *     onLoad: async (pageId) => (await fetch(`/api/load/${pageId}`)).json(),
 *   },
 *   theme: { primaryColor: '#2563eb' },
 * });
 *
 * // Later...
 * editor.save();
 * editor.destroy();
 * ```
 *
 * Usage (React):
 * ```tsx
 * import { PageHubEditor, PageHubProvider } from '@pagehub/sdk';
 *
 * <PageHubProvider config={resolvedConfig} emitter={emitter}>
 *   <PageHubEditor resolver={myComponents} />
 * </PageHubProvider>
 * ```
 *
 * This file is a pure re-export barrel. The imperative `init()` builder + the
 * `PageHubInstance` factory live in `entry/init.ts`.
 */

// Global editor CSS is NOT imported here — Next.js forbids global CSS from packages (see
// https://nextjs.org/docs/messages/css-global). Vite emits `dist/editor.css` via
// `css/vite-editor-css-entry.ts`; npm users `import "@pagehub/sdk/editor.css"`. This app loads
// editor chrome via `styles/editor.css` in `pages/_app.tsx`.

// ─── Default + imperative entry ───────────────────────────────────────────────
// `entry/init` also carries the side-effect import that self-registers
// RegistrySettings with InspectorRegistry; importing it here keeps that running
// on first load of `@pagehub/sdk`.
import PageHub, { init } from "./entry/init";

// Default export — the PageHub namespace with .init()
export default PageHub;

// Make init available at top-level too
export { init };

// ─── Exports ────────────────────────────────────────────────────────────────

// Named exports for React usage
export { PageHubProvider, useSDK, useSDKSafe } from "./core/context";
export { useAiEnabled } from "./utils/hooks/useAiEnabled";
export { PageHubEditor } from "./editor";
export { resolveConfig } from "./config";
export { PageHubViewer, renderViewer } from "./viewer";

// Component registration API
export { defineComponent } from "./define/defineComponent";

// Plugin manifest API (P3 — extend without forking). `definePlugin` validates +
// freezes a manifest; the loaders apply each half. Server-half types live in the
// host app (lib/plugins/types.ts) — this barrel stays browser-safe.
export { definePlugin, definePlugins } from "./define/definePlugin";
export {
  applyEditorPlugins,
  resolvePluginOrder,
  assertNoSingleInstanceCollision,
} from "./define/pluginLoader";
export { EDITOR_SINGLE_INSTANCE_FIELDS } from "./define/pluginTypes";
export type {
  PluginManifestBase,
  EditorContributions,
  PluginSubmissionHandler,
  PluginClientDataFetcher,
} from "./define/pluginTypes";
export {
  createLiveDoc,
  createStaticDoc,
} from "./doc";
export type {
  ComponentTypeName,
  Doc,
  InsertTarget,
  NodeData,
  NodeInput,
  NodeRef,
  CraftQuery,
  CraftActions,
  FlatNodeMap,
} from "./doc";
export type {
  ResolvedComponentDef,
  PropSchema,
  ComponentPreset,
  ComponentModifier,
  PeerInheritConfig,
} from "./define/types";

// Catalog registry — register/override component presets + modifiers per name.
// Built-in catalogs self-register at editor mount via loadBuiltinCatalogs().
export {
  registerPresets,
  getPresets,
  registerModifiers,
  getModifiers,
  registerCatalogFilter,
  resetCatalogFilter,
  getCatalogFilter,
} from "./define/catalogRegistry";
export type {
  CatalogFilterKind,
  CatalogFilterPredicate,
  CatalogEntry,
} from "./define/catalogRegistry";

// Host constraints — restrict which components show in the toolbox / are accepted.
// See docs/sdk/host-constraints.md.
export {
  registerComponentAllowlist,
  resetComponentAllowlist,
  getComponentAllowlist,
  isComponentAllowed,
} from "./define/componentAllowlist";

// Compression helpers — needed when a host seeds initial page content at runtime
// (the SDK's load path expects an LZ-base64 compressed string).
export { compressAsync, decompressAsync } from "./utils/compressionAsync";

// Default palette + style guide — what a fresh PageHub site ships with.
// Standalone consumers should seed these on the ROOT Background's `theme` prop
// so the canvas uses the same neutral white/black tokens the real app does.
export {
  DEFAULT_PALETTE,
  DEFAULT_DARK_PALETTE,
  DEFAULT_STYLE_GUIDE,
  DEFAULT_BREAKPOINTS,
  DENSITY_STEPS,
} from "./utils/defaults";

// Blocks provider — host-injected source for the Blocks toolbox panel catalog.
// Default: HTTP fetcher at `/api/v1/components*` (PageHub cloud).
export {
  registerBlocksProvider,
  resetBlocksProvider,
  getBlocksProvider,
  defaultHttpProvider as defaultHttpBlocksProvider,
} from "./define/blocksProvider";
export type {
  BlocksProvider,
  BlocksProviderQuery,
  BlockCategory,
  BlockSubcategory,
  BlockItem,
} from "./define/blocksProvider";

// Type exports
export type {
  PageData,
  PageHubAIConfig,
  PageHubCallbacks,
  PageHubMediaEditAiActionsContext,
  PageHubMediaMetadataSuggestion,
  PageHubComponentDef,
  PageHubConfig,
  PageHubEvent,
  PageHubFeatures,
  PageHubInstance,
  PageHubLocale,
  PageHubTheme,
  PageSeo,
  SaveMeta,
  SaveResponse,
  SaveResult,
  SaveStatus,
} from "./types";

// Save error classes — value exports (consumers `instanceof` against these).
export { SaveConflictError, SaveEmptyError, SaveFailedError } from "./types";

// Typed error hierarchy — all SDK-throws-host-can-catch extend PageHubError.
// Consumers branch on `e instanceof PageHubError` and `e.code`. See
// docs/sdk/extensibility.md for the full code table.
export {
  BlocksProviderError,
  CatalogRegistryError,
  CommandRegistryError,
  ComponentDefinitionError,
  ConfigError,
  KeybindingRegistryError,
  MenuRegistryError,
  PageHubError,
  SlotRegistryError,
} from "./utils/errors";
export type { PageHubErrorInit } from "./utils/errors";

// SDK logger — hosts can silence or redirect every internal console call.
// See utils/logger.ts.
export {
  createScopedLogger,
  getSdkLogger,
  sdkLog,
  setSdkLogger,
} from "./utils/logger";
export type { SdkLogger, SdkLogLevel } from "./utils/logger";

// Alias
export type { PageSeo as PageHubSeo } from "./types";

// Nested node-prop namespaces — typed shapes for background, overflow, design, etc.
// `seo: PageSeo` (from "./types") is the canonical shape for seo.* props on ROOT + page Containers.
export type {
  BackgroundProps,
  OverflowProps,
  DesignProps,
  InjectProps,
  RelationProps,
  RichTextProps,
} from "./components/types";

// CDN configuration for advanced use
export { configureCdn } from "./utils/cdn";

// State registry — central reactive state surface (visibility, flags,
// selection, value). Wrappers write here; descendants read via conditions /
// stateModifiers / `{{state.X}}` interpolation. Direct hook access is rare
// (used by app-side cart provider / agent chat to bridge runtime hooks).
export {
  setState,
  getState,
  getStateValue,
  setVisibility,
  getVisibility,
  toggleVisibility,
  deleteState,
  useStateEntry,
  useStateValue,
  useGlobalStateTick,
} from "./utils/state/stateRegistry";
export type { StateEntry, StateKind, WriterSource } from "./utils/state/stateRegistry";

// URL ↔ state bridge — call once per viewer (from `useViewerSetup`) to mirror
// `URLSearchParams` ↔ `state["url:*"]`.
export { mountUrlQueryStateBridge, getUrlState } from "./utils/state/urlQueryBridge";

// Anchor context — wrappers (AgentFloatingBubble, AgentChat, CartDrawer, …)
// publish per-instance ids so descendant presets can reference them via
// `{{anchor.X}}` tokens in `id` / `action.target` / `state` condition keys.
/** @internal */
export { AnchorProvider } from "./utils/anchors/anchorContext";
/** @internal */
export { useAnchors } from "./utils/anchors/anchorContext";
/** @internal */
export { resolveAnchors } from "./utils/anchors/anchorContext";
/** @internal */
export { hasAnchorToken } from "./utils/anchors/anchorContext";
/** @internal */
export type { AnchorMap } from "./utils/anchors/anchorContext";

/** Default Craft resolver map and built-in `defineComponent` defs (extend / merge for custom blocks). */
export {
  BUILTIN_COMPONENT_DEFS,
  DEFAULT_CRAFT_RESOLVER,
  getBuiltinComponentDef,
} from "./core/componentRegistry";
export type { BuiltInCraftResolver } from "./core/componentRegistry";

/** API base URL for SDK fetches (set by `resolveConfig` / `PageHubProvider`; host may call `setPageHubApiBaseUrl` early). */
export { getPageHubApiBaseUrl, setPageHubApiBaseUrl } from "./core/apiConfig";

// Export ported selector components for React users
export { Audio } from "./components/Audio/Audio";
export { Background } from "./components/Background/Background";
export { Button } from "./components/Button/Button";
export { Container } from "./components/Container/Container";
export { Data } from "./components/Data/Data";
export { Embed } from "./components/Embed/Embed";
export { Footer } from "./components/Footer/Footer";
export { Form } from "./components/Form/Form";
export { FormElement } from "./components/FormElement/FormElement";
export { Header } from "./components/Header/Header";
export { Icon } from "./components/Icon/Icon";
export { Image } from "./components/Image/Image";
export { Link } from "./components/Link/Link";
export { Map } from "./components/Map/Map";
export { MapPoint } from "./components/MapPoint/MapPoint";
export { Text } from "./components/Text/Text";
export { Video } from "./components/Video/Video";

// Export store hooks for advanced use
/** @internal */
export { useView } from "./core/store";
/** @internal */
export { usePreview } from "./core/store";
/** @internal */
export { useEditorStore } from "./core/store";
/** @internal */
export type { ViewMode } from "./core/store";

/**
 * Main toolbar dock side + atom for integrations that need to mirror chrome.
 * @internal
 */
export { SideBarAtom } from "./utils/atoms";
/** @internal */
export { useEditorSidebarDockLeft } from "./utils/atoms";

/**
 * `React.lazy` helper for modules that use named exports. Used internally by
 * `*.craft.tsx` files to avoid repeating `.then(m => ({ default: m.X }))`.
 * @internal
 */
export { lazyNamed } from "./utils/lazyNamed";

// Static rendering lives behind the dedicated entry so it stays out of the
// editor bundle: import from "@pagehub/sdk/static-renderer".

// ─── Property Registry — public API for extending the settings sidebar ─────
export {
  registerProperties,
  overrideProperty,
  unregisterProperty,
  registerSectionDef,
  unregisterSectionDef,
  getSectionDefs,
  getSectionDef,
  getProperties,
  searchProperties,
} from "./chrome/toolbar/inspector/registry/propertyRegistry";

export type {
  PropertyDef,
  PropertyInput,
  SectionDef,
  SectionId,
  PropertyInputProps,
} from "./chrome/toolbar/inspector/registry/propertyDefs";

// ─── Command / Menu / Slot / Keybinding registries ─────────────────
//
// Public registry API for host integrations. Hosts build a bundle via
// `createRegistriesBundle()`, call `bundle.slots.contribute(...)` etc., then
// pass the bundle to `<PageHubProvider registries={bundle}>`.
export {
  SlotRenderer,
  useCommandContext,
  useMenuItems,
  useSlot,
  useSlotList,
  useOverlay,
  createRegistriesBundle,
  BUILTIN_COMMANDS,
  BUILTIN_SLOTS,
  BUILTIN_KEYBINDINGS,
} from "./registry";
export type {
  CommandDef,
  CommandContext,
  CommandRunContext,
  MenuItem,
  MenuLocation,
  ResolvedMenuItem,
  KeybindingDef,
  SlotDef,
  SlotContribution,
  SlotCardinality,
  SlotId,
  BuiltinSlotId,
  ResolvedContribution,
  CommandsRegistry,
  MenusRegistry,
  SlotsRegistry,
  KeybindingsRegistry,
  ContextRegistry,
  RegistriesBundle,
  SlotRendererProps,
  UseOverlayArgs,
} from "./registry";

// Canonical keyboard predicates (used by registry dispatcher + any surface
// that still mounts its own listeners during the Phase 2 transition).
export { isInsideTextEditingSurface } from "./utils/keyboard";
export { mountKeybindingDispatcher } from "./registry/dispatcher";
export type { KeybindingDispatcherOptions } from "./registry/dispatcher";

// Atoms lifted for the registry (still owned by the topbar surface in Wave A;
// Phase 2 wires them in).
/** @internal */
export {
  MediaManagerModalAtom,
  ModifiersModalAtom,
  ShowHiddenAtom,
} from "./utils/atoms";

// CSS compilation — server-side only, import from "@pagehub/sdk/compile-css"
// NOT re-exported here to avoid Next.js/Turbopack treating readFileSync CSS paths as global imports
