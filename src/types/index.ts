/**
 * @pagehub/sdk — Core type definitions
 *
 * These types define the public API surface of the SDK.
 * Customers implement callbacks; we provide the editor.
 *
 * This barrel re-exports the focused submodules so the import path stays
 * `@pagehub/sdk` / `../types` for every consumer. Concern map:
 * - page.ts       — PageData, PageSeo
 * - save.ts       — SaveResult, SaveResponse, SaveMeta, SaveStatus (types)
 * - callbacks.ts  — PageHubCallbacks
 * - theme.ts      — PageHubTheme
 * - features.ts   — PageHubFeatures + InspectorTabName + Blocks/Css feature shapes
 * - ai.ts         — PageHubAIConfig + media assistant slot context
 * - locale.ts     — PageHubLocale
 * - config.ts     — PageHubConfig
 * - instance.ts   — PageHubInstance
 * - events.ts     — PageHubEvent, PageHubEventMap
 *
 * Runtime that doesn't belong in a types module lives elsewhere and is
 * re-exported here for back-compat:
 * - core/saveErrors.ts     — SaveConflictError / SaveEmptyError / SaveFailedError
 * - registry/stubTypes.ts  — forward-declared registry stub interfaces
 */

export type { PageData, PageSeo } from "./page";
export type { SaveResult, SaveResponse, SaveMeta, SaveStatus } from "./save";
export { SaveConflictError, SaveEmptyError, SaveFailedError } from "../core/saveErrors";
export type { PageHubCallbacks } from "./callbacks";
export type { PageHubTheme } from "./theme";
export type {
  PageHubFeatures,
  InspectorTabName,
  BlocksPanelFeature,
  CssAllowlistFeature,
} from "./features";
export type {
  PageHubAIConfig,
  PageHubMediaMetadataSuggestion,
  PageHubMediaEditAiActionsContext,
} from "./ai";
export type { PageHubLocale } from "./locale";
export type { PageHubConfig } from "./config";
export type {
  PageHubCommandsRegistryStub,
  PageHubMenusRegistryStub,
  PageHubSlotsRegistryStub,
  PageHubKeybindingsRegistryStub,
  PageHubContextRegistryStub,
} from "../registry/stubTypes";
export type { PageHubInstance } from "./instance";
export type { PageHubEvent, PageHubEventMap } from "./events";

// ─── Component registration ─────────────────────────────────────────────────
// Types re-exported from define.ts — the canonical definitions live there.
// This re-export keeps the types barrel working for existing consumers.

export type {
  PageHubComponentDef,
  ResolvedComponentDef,
  PropSchema,
  ComponentPreset,
} from "../define/types";
