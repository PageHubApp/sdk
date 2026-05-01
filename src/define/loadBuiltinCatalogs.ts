/**
 * Eager-load every built-in component catalog (presets + modifiers) so the
 * editor can read them via `getPresets(name)` / `getModifiers(name)` after
 * mount. Each catalog file self-registers at module load via
 * `registerPresets("X", xPresets)` / `registerModifiers("X", xModifiers)`,
 * so a side-effect dynamic import is enough.
 *
 * Viewer / static-renderer never call this — their bundles drop all preset
 * code and the registry stays empty there.
 */
export async function loadBuiltinCatalogs(): Promise<void> {
  await Promise.all([
    import("../components/Audio/Audio.presets"),
    import("../components/Button/Button.modifiers"),
    import("../components/Button/Button.presets"),
    import("../components/Container/Container.modifiers"),
    import("../components/Container/Container.presets"),
    import("../components/Embed/Embed.presets"),
    import("../components/Form/Form.presets"),
    import("../components/FormElement/FormElement.modifiers"),
    import("../components/FormElement/FormElement.presets"),
    import("../components/Icon/Icon.presets"),
    import("../components/Image/Image.modifiers"),
    import("../components/Image/Image.presets"),
    import("../components/Link/Link.modifiers"),
    import("../components/Link/Link.presets"),
    import("../components/Map/Map.presets"),
    import("../components/Text/Text.modifiers"),
    import("../components/Text/Text.presets"),
    import("../components/Video/Video.presets"),
  ]);
}
