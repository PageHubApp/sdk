/**
 * @pagehub/sdk — registry barrel.
 *
 * Single entry point for the command / menu / slot / keybinding / context
 * registries plus the React provider, hooks, and SlotRenderer.
 */

export { createCommandsRegistry } from "./commands";
export type { CommandsRegistry } from "./commands";

export { createMenusRegistry } from "./menus";
export type { MenusRegistry } from "./menus";

export { createSlotsRegistry } from "./slots";
export type { SlotsRegistry } from "./slots";

export { createKeybindingsRegistry, parseKey } from "./keybindings";
export type { KeybindingsRegistry, ParsedKey } from "./keybindings";

export { createContextRegistry, DEFAULT_CONTEXT } from "./context";
export type { ContextRegistry } from "./context";

export { RegistriesProvider, useRegistries, useRegistriesSafe } from "./provider";
export type { RegistriesBundle } from "./provider";

export { SlotRenderer } from "./SlotRenderer";
export type { SlotRendererProps } from "./SlotRenderer";

export {
  useCommandContext,
  useMenuItems,
  useSlot,
  useSlotList,
} from "./hooks";

export { applyEditorChromeSlotsShim, FIELD_TO_SLOT } from "./adapter";

export { BUILTIN_COMMANDS } from "./builtins/commands";
export { BUILTIN_SLOTS } from "./builtins/slots";
export { BUILTIN_KEYBINDINGS } from "./builtins/keybindings";

export type {
  CommandDef,
  CommandContext,
  CommandRunContext,
  CommandSelectionContext,
  CommandParentContext,
  CommandTiptapContext,
  CommandOverlayContext,
  CommandClipboardContext,
  MenuItem,
  MenuLocation,
  ResolvedMenuItem,
  KeybindingDef,
  SlotDef,
  SlotContribution,
  SlotCardinality,
  ResolvedContribution,
} from "./types";

// ─── Bootstrap helper ────────────────────────────────────────────────────

import { createCommandsRegistry } from "./commands";
import { createMenusRegistry } from "./menus";
import { createSlotsRegistry } from "./slots";
import { createKeybindingsRegistry } from "./keybindings";
import { createContextRegistry } from "./context";
import { BUILTIN_COMMANDS } from "./builtins/commands";
import { BUILTIN_SLOTS } from "./builtins/slots";
import { BUILTIN_KEYBINDINGS } from "./builtins/keybindings";

/**
 * Creates the five registries and pre-registers all builtin commands,
 * slots, and keybindings. The host (SDK boot) calls this once.
 */
export function createRegistriesBundle() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  const menus = createMenusRegistry({ commands, context });
  const slots = createSlotsRegistry({ context });
  const keybindings = createKeybindingsRegistry({ context });

  for (const def of BUILTIN_COMMANDS) commands.register(def);
  for (const def of BUILTIN_SLOTS) slots.register(def);
  for (const def of BUILTIN_KEYBINDINGS) keybindings.register(def);

  return { context, commands, menus, slots, keybindings };
}
