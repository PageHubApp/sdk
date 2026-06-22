/**
 * Canonical reactive-state namespace — the SINGLE source for every state-key,
 * state-prefix, and variable-prefix string literal the SDK reads or writes.
 *
 * Why this exists: these literals (`"url:"`, `"cart:open"`, `"auth:status"`,
 * the `state.`/`auth.`/`item.`/`connector.`/`variables.` var prefixes) used to
 * live as bare strings scattered across ~12 files. A single typo (`"cart-open"`)
 * fails silently — the writer and the reader just never agree. Sourcing every
 * consumer from here makes that class of bug a typecheck error instead.
 *
 * Static-publish runtime chunks (`render/static/runtime/chunks/*`) are
 * serialized to standalone browser strings via `stringifyChunk` and minified in
 * isolation, so they CANNOT import this module — an imported identifier would be
 * a free/undefined variable in the emitted IIFE. Instead the assembler
 * (`staticPublishRuntime.ts`) stamps these values into the IIFE preamble as
 * `var PH_*` globals (declared ambient in `chunks/runtime-globals.d.ts`), built
 * FROM the constants below. The constant is still the one source; the assembler
 * injects the value. See `staticPublishRuntime.ts` getStaticPublishRuntimeScript.
 */

/** Reactive-state key PREFIXES (key namespace, colon-delimited). */
export const STATE_PREFIX = {
  /** URL query ↔ state mirror — `url:<param>`. */
  url: "url:",
} as const;
// NOTE: the `connector:<id>:*` keys (e.g. `connector:abc:totalPages` written by
// `dataSource.publishStateKeys`) are composed by authors in block JSON, not by
// SDK code — there is no SDK consumer of a `"connector:"` prefix literal, so it
// is intentionally absent here (keeping this registry to keys the SDK owns).

/** Reactive-state KEYS (fully-qualified registry entries the SDK reads/writes). */
export const STATE_KEY = {
  /** Cart drawer visibility — `"shown"` | `"hidden"`. */
  cartOpen: "cart:open",
  /** Total cart line quantity (badge text). */
  cartCount: "cart:count",
  /** Cart subtotal (minor units summed). */
  cartTotal: "cart:total",
  /** Serialized cart line array. */
  cartItemsJson: "cart:items-json",
  /** Add-to-cart validation error message (empty string = no error). */
  cartError: "cart:error",
  /** Nonce bumped on each add-to-cart so subscribers rerun. */
  cartAddTick: "cart:add-tick",
  /** Serialized `{ item, quantity }` payload for the latest add. */
  cartAddPayload: "cart:add-payload",
  /** Nonce bumped on each checkout click. */
  cartCheckoutTick: "cart:checkout-tick",
  /** Auth status mirror — `"logged-in"` | `"logged-out"`. */
  authStatus: "auth:status",
} as const;

/**
 * Author-facing EXAMPLE keys surfaced as editor-input placeholders. Not
 * functional SDK consumers (the real keys are author-typed in block JSON) —
 * centralized here so the documented namespace lives in one file.
 */
export const STATE_KEY_EXAMPLE = {
  /** PDP variant-match output key (CartSubForm `variantMatchStateKey` hint). */
  pdpCurrentMatchingVariant: "pdp:current:matching-variant",
  /** Computed-binding output key hint (ComputedBindingChip). */
  pdpMatchingVariant: "pdp:matching-variant",
} as const;

/** Variable-interpolation PREFIXES (dot-delimited, used by `replaceVariables`). */
export const VAR_PREFIX = {
  state: "state.",
  auth: "auth.",
  item: "item.",
  connector: "connector.",
  variables: "variables.",
} as const;
