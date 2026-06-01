/**
 * PageHub SDK base error class.
 *
 * All host-catchable SDK throws should extend `PageHubError` so consumers can
 * branch on `error.code` instead of regex-matching messages. Internal asserts
 * ("should never happen") stay as raw `Error` since hosts can't meaningfully
 * recover from them.
 *
 * The canonical existing typed errors (`MediaUploadError`, `SaveConflictError`,
 * `SaveEmptyError`, `SaveFailedError`) all extend this base so they share one
 * hierarchy — `if (e instanceof PageHubError) { ... }` catches them all.
 *
 * Shape mirrors `MediaUploadError`:
 *   - `name`   — the subclass name (so devtools show "BlocksProviderError" etc.)
 *   - `code`   — SCREAMING_SNAKE_CASE, domain-prefixed (`BLOCKS_*`, `MEDIA_*`)
 *   - `hint`   — optional remediation pointer ("did you forget to X?")
 *
 * See docs/sdk/extensibility.md for the full code table.
 */
export interface PageHubErrorInit {
  code: string;
  message: string;
  hint?: string;
}

export class PageHubError extends Error {
  readonly code: string;
  readonly hint?: string;

  /**
   * Construct via object — preferred call style:
   *   throw new PageHubError({ code: "BLOCKS_PROVIDER_INVALID", message: "..." });
   *
   * Positional form is accepted for call-site brevity at deep stacks:
   *   throw new PageHubError("BLOCKS_PROVIDER_INVALID", "...", "did you ...?");
   */
  constructor(init: PageHubErrorInit);
  constructor(code: string, message: string, hint?: string);
  constructor(initOrCode: PageHubErrorInit | string, message?: string, hint?: string) {
    const opts: PageHubErrorInit =
      typeof initOrCode === "string"
        ? { code: initOrCode, message: message ?? "", hint }
        : initOrCode;
    super(opts.message);
    this.name = "PageHubError";
    this.code = opts.code;
    if (opts.hint !== undefined) this.hint = opts.hint;
  }
}

// ─── Domain subclasses ─────────────────────────────────────────────────────
//
// Use a subclass when a domain accumulates ≥3 related codes so consumers can
// branch on `e instanceof BlocksProviderError` without checking every code.
// Single-shot domains throw `PageHubError` directly.

/** Thrown by `defineComponent()` and friends when a registered component
 *  definition is malformed (missing `name`, bad shape, duplicate, etc). */
export class ComponentDefinitionError extends PageHubError {
  constructor(init: PageHubErrorInit) {
    super(init);
    this.name = "ComponentDefinitionError";
  }
}

/** Thrown by the catalog registry (`registerPresets`, `registerModifiers`,
 *  `registerCatalogFilter`) when host inputs fail validation. */
export class CatalogRegistryError extends PageHubError {
  constructor(init: PageHubErrorInit) {
    super(init);
    this.name = "CatalogRegistryError";
  }
}

/** Thrown by `registerBlocksProvider` and the default HTTP provider when host
 *  input is malformed. */
export class BlocksProviderError extends PageHubError {
  constructor(init: PageHubErrorInit) {
    super(init);
    this.name = "BlocksProviderError";
  }
}

/** Thrown by `PageHub.init()` / `<PageHubEditor>` / `PageHubViewer.init()`
 *  when host config is malformed (missing callbacks, container not found). */
export class ConfigError extends PageHubError {
  constructor(init: PageHubErrorInit) {
    super(init);
    this.name = "ConfigError";
  }
}

/** Thrown by `sdk.commands.register` / `.replace` when a command definition
 *  is malformed or collides. Codes: `COMMANDS_BAD_ID`, `COMMANDS_NO_RUN`,
 *  `COMMANDS_DUPLICATE`, `COMMANDS_NOT_FOUND` (replace on missing id). */
export class CommandRegistryError extends PageHubError {
  constructor(init: PageHubErrorInit) {
    super(init);
    this.name = "CommandRegistryError";
  }
}

/** Thrown by `sdk.slots.register` / `.contribute` when a slot definition or
 *  contribution is malformed. Codes: `SLOTS_BAD_ID`, `SLOTS_BAD_CONTRIBUTION`,
 *  `SLOTS_NO_RENDER`, `SLOTS_UNDEFINED_SLOT`. */
export class SlotRegistryError extends PageHubError {
  constructor(init: PageHubErrorInit) {
    super(init);
    this.name = "SlotRegistryError";
  }
}

/** Thrown by `sdk.menus.contribute` when items input is malformed.
 *  Codes: `MENUS_BAD_ITEMS`. */
export class MenuRegistryError extends PageHubError {
  constructor(init: PageHubErrorInit) {
    super(init);
    this.name = "MenuRegistryError";
  }
}

/** Thrown by `sdk.keybindings.register` when a binding is malformed.
 *  Codes: `KEYBINDINGS_NO_COMMAND`, `KEYBINDINGS_NO_KEY`. */
export class KeybindingRegistryError extends PageHubError {
  constructor(init: PageHubErrorInit) {
    super(init);
    this.name = "KeybindingRegistryError";
  }
}
