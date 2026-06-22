// Ambient declarations for symbols that live in the static-publish runtime
// IIFE scope. Each chunk authored via `stringifyChunk(fn)` references these
// freely; tsc verifies they all exist. Anything new added to the preamble or
// to a chunk's exported surface must be added here.
//
// These are NOT real module exports — they only exist at runtime inside the
// concatenated `<script>` emitted by `getStaticPublishRuntimeScript()`.

export {};

declare global {
  // ───── Preamble (staticPublishRuntime.ts) ─────────────────────────────────
  const PAGE_ID: string;
  const PUBLIC_DATA_ENDPOINT: string;
  const MOBILE: number;
  // Reactive-state keys/prefixes — stamped into the preamble from the canonical
  // `utils/state/keys` module (see staticPublishRuntime.ts). Chunks can't import
  // (they're stringified + minified in isolation), so the value is injected here
  // as a global and the single source stays in keys.ts.
  const PH_URL_PREFIX: string;
  const PH_CART_OPEN: string;
  const PH_CART_COUNT: string;
  const PH_CART_TOTAL: string;
  const PH_CART_ITEMS_JSON: string;
  const PH_CART_ERROR: string;
  const PH_AUTH_STATUS: string;
  const Alpine: any;
  const _store: { entries: Record<string, any>; revision: number };
  const _shownStack: string[];
  // Cross-chunk function registry — see staticPublishRuntime.ts preamble for
  // the why. Definer chunks write functions here via STRING property names;
  // caller chunks destructure at the top of their body. Property keys survive
  // minifier identifier-mangling because they're strings, not bindings.
  const __phRT: Record<string, any>;
  // `let` (not const) — state.ts reassigns this once on first ESC handler install.
  // eslint-disable-next-line no-var
  var _escInstalled: boolean;

  // ───── state.ts ───────────────────────────────────────────────────────────
  type StatePatch = {
    kind?: "value" | "visibility";
    value?: unknown;
    source?: string;
    lastWriter?: string;
  };
  type StateEntry = StatePatch & { key: string };

  function getState(key: string): StateEntry | undefined;
  function getStateValue(key: string): unknown;
  function setState(key: string, patch: StatePatch, writer?: string): void;
  function deleteState(key: string): void;
  function setVisibility(
    key: string,
    value: "shown" | "hidden",
    writer?: string
  ): void;
  function listStates(): StateEntry[];
  function subscribe(
    keyOrFn: string | (() => void),
    fn?: () => void
  ): () => void;
  function seedFromWindow(): void;
  function mountUrlBridge(): void;
  function installEsc(): void;

  // ───── items.ts ───────────────────────────────────────────────────────────
  function walkItem(obj: any, parts: string[]): unknown;
  function interpolateItem(raw: string, item: unknown): string;
  function resolveActionKey(raw: string, item: unknown): string;
  function readItemContext(el: Element): unknown;
  function showEl(el: HTMLElement, method?: string): void;
  function hideEl(el: HTMLElement, method?: string): void;
  function toggleEl(el: HTMLElement, method?: string): void;
  function applyShowHide(action: any): void;
  function revertShowHide(action: any): void;
  function hasUnresolvedItemToken(s: string): boolean;
  function runComputed(binding: any, interp: (s: string) => string): string;
  function toAxisArray(value: unknown): string[];
  function axisToSlot(axes: string[]): string;
  function parseVariantMap(raw: string): any;

  // ───── conditions.ts / clientScript.ts ───────────────────────────────────
  // `evalCond` / `evalAll` / `evalGroups` (clientScript.ts) and
  // `actionGatePasses` (conditions.ts) are NOT hoisted globals — they are
  // published to `__phRT` by string key and read back via `__phRT.<name>` or
  // a `const { … } = __phRT` destructure. No ambient declarations: that would
  // falsely permit free-global references that don't exist at runtime.

  // ───── aux.ts ─────────────────────────────────────────────────────────────
  function detectCustomerToken(): void;
  function ensureAnalyticsStubs(): void;
  function fireAnalytics(event: string, params?: Record<string, unknown>): void;
  type ConversionConfig = {
    provider: "google-ads" | "ga4" | "meta";
    eventName?: string;
    sendTo?: string;
    value?: number;
    currency?: string;
  };
  function fireConversion(
    c: ConversionConfig | null | undefined,
    opts?: { navigate?: () => void }
  ): void;
  function loadLeaflet(): Promise<unknown>;
  function mountMaps(): void;

  // ───── cart.ts ────────────────────────────────────────────────────────────
  function readCartFromStorage(): any[];
  function writeCartToStorage(items: any[]): void;
  function recomputeCartState(items: any[]): void;
  function addToCart(item: any, qty: number): void;
  function setCartQuantity(priceId: string, qty: number): void;
  function removeCartItem(priceId: string): void;
  function cartCheckout(): void;
  function escapeHTML(s: unknown): string;
  function renderCartItems(el: Element, c: any): void;

  // ───── window extensions (used by chunks) ────────────────────────────────
  interface Window {
    __PH_STATE__?: Record<string, any>;
    __PH_AUTH__?: Record<string, any>;
    __PH_COMPANY__?: Record<string, any>;
    __PH_RUNTIME__?: Record<string, any>;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: any;
    L?: any;
    __phSetData?: (key: string, value: any) => void;
    __phGetData?: (key: string) => any;
    __PH_CONNECTOR__?: Record<string, Record<string, any[]>>;
  }
}
