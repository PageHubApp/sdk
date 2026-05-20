import React from "react";

/**
 * `React.lazy` shim for modules that use **named** exports instead of `default`.
 *
 * `React.lazy` requires a module with a `default` export. The SDK's settings
 * panels and overlays are named exports, so without this helper every
 * `.craft.tsx` file repeats the same boilerplate:
 *
 * ```ts
 * const Foo = React.lazy(() =>
 *   import("./mod").then(mod => ({ default: mod.Foo }))
 * );
 * ```
 *
 * That pattern is typo-bait — get the named export wrong and React renders an
 * empty component silently. `lazyNamed` centralizes the unwrap and throws a
 * helpful error if the export is missing.
 *
 * Note: the importer must be a plain `() => import("...")` arrow with a static
 * string so bundlers (Vite, Turbopack, esbuild) can statically analyze the
 * chunk graph. Do NOT pass a dynamic path.
 *
 * @example
 * const ContainerMainTab = lazyNamed(
 *   () => import("../../chrome/toolbar/inspector/mainTabs/ContainerMainTab"),
 *   "ContainerMainTab"
 * );
 *
 * @internal
 */
export function lazyNamed<T extends React.ComponentType<any> = React.ComponentType<any>>(
  importer: () => Promise<Record<string, any>>,
  exportName: string,
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const mod = await importer();
    const cmp = mod[exportName];
    if (!cmp) {
      const available = Object.keys(mod).filter((k) => k !== "default").join(", ") || "<none>";
      throw new Error(
        `[PageHub] lazyNamed: export "${exportName}" not found in module (available: ${available})`,
      );
    }
    return { default: cmp };
  });
}
