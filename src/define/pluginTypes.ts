/**
 * Plugin manifest types (P3 — extend without forking).
 *
 * Browser-safe: this module references ONLY SDK editor/render types, never
 * Node / DB / hook / connector types. The plugin's SERVER half is opaque here
 * (`server?: object`) and is narrowed by the host app (`lib/plugins/types.ts`),
 * which CAN name Node types (`HookRegistration`, `ConnectorProvider`, endpoint
 * handlers, Mongoose models). This is the SDK data boundary drawn at the plugin
 * level: render/UI extension is editor (public SDK); secrets/DB/hooks are server
 * (private app). See docs/strategy/specs/p3-plugin-system.md §2.
 */
import type { ResolvedComponentDef, ComponentPreset, ComponentModifier } from "./types";
import type { BlocksProvider } from "./blocksProvider";
import type { MediaUploadHandler, MediaAcceptProvider } from "../utils/media/registry";
import type { registerSubmissionHandler } from "../utils/submissions";
import type { registerClientDataFetcher } from "../utils/design/variables";
import type { PropertyDef, SectionDef } from "../chrome/toolbar/inspector/registry/propertyDefs";
import type { RegistriesBundle } from "../registry";

/** Form-submission persistence handler — the param the SDK already accepts at runtime. */
export type PluginSubmissionHandler = Parameters<typeof registerSubmissionHandler>[0];
/** Client-side Data-node fetcher — the param the SDK already accepts at runtime. */
export type PluginClientDataFetcher = Parameters<typeof registerClientDataFetcher>[0];

/**
 * Browser-half contributions — applied by `applyEditorPlugins` before
 * `<PageHubEditor>` / `<PageHubViewer>` mounts. Every field maps to an existing
 * runtime `register*()` seam (P3 §5 promotion table); the loader is the single
 * caller of seams that today have scattered callers.
 */
export interface EditorContributions {
  /** Custom CraftJS components — merged into the live resolver (the host-door path, P3 §4). */
  components?: ResolvedComponentDef[];
  /** Named variant chips, keyed by component name. Composes with built-ins. */
  presets?: Record<string, ComponentPreset[]>;
  /** Modifier groups, keyed by component name. */
  modifiers?: Record<string, ComponentModifier[]>;
  /** Shared cross-component inspector inputs + their sections. */
  properties?: PropertyDef[];
  sections?: SectionDef[];
  /** Block-library source for the toolbox "Blocks" tab (single-instance). */
  blocksProvider?: BlocksProvider;
  /** Media upload pipeline + accept policy (single-instance). */
  mediaHandler?: MediaUploadHandler;
  mediaAccept?: MediaAcceptProvider;
  /** Form-submission persistence (single-instance). */
  submissionHandler?: PluginSubmissionHandler;
  /** Client-side data fetcher for Data nodes (single-instance). */
  clientDataFetcher?: PluginClientDataFetcher;
  /** Editor-chrome slots/commands/menus/keybindings onto the registries bundle.
   *  Receives the `createRegistriesBundle()` result (before the provider adds `tick`). */
  contributeRegistries?: (bundle: Omit<RegistriesBundle, "tick">) => void;
}

/**
 * The shared, browser-safe shape of a plugin manifest. `definePlugin` returns a
 * frozen object of (a subtype of) this. The host app extends it with a concrete
 * `server` shape — the SDK never references that shape, keeping this module free
 * of Node deps.
 */
export interface PluginManifestBase {
  /** Unique, reverse-DNS-ish id. `pagehub.*` / `ph.*` reserved for first-party. */
  id: string;
  /** Human label for admin UI / logs. */
  name: string;
  /** semver of THE PLUGIN (npm). SDK compat is a peerDependency range. */
  version: string;
  /** Plugin ids that must initialize before this one. Loader topo-sorts; cycles throw. */
  dependsOn?: string[];
  /** Browser half — applied by the editor/viewer loader. */
  editor?: EditorContributions;
  /** Node half — opaque here; narrowed by the host app (lib/plugins/types.ts). */
  server?: object;
}

/**
 * Single-instance editor fields. The loader inspects the manifest set BEFORE any
 * side effect fires and treats two plugins claiming the same one as a BOOT ERROR
 * (P3 §3 ordering / §7 decided) — never silent last-wins.
 */
export const EDITOR_SINGLE_INSTANCE_FIELDS = [
  "blocksProvider",
  "mediaHandler",
  "mediaAccept",
  "submissionHandler",
  "clientDataFetcher",
] as const;
