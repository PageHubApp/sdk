/**
 * Whether a toolbox preset's whole tree can go in an email: every component
 * allowlisted, no unsafe class, and only link actions. The catalog filter in
 * `emailEditorConfig()` runs this on each preset's `props` and `children`, so a
 * "Modal" or "Navbar" preset whose root is a plain Container but whose children
 * hold Icons, `btn` / `fixed` classes or show-hide actions is never offered.
 *
 * Editor-side, no server dependencies.
 */

import { isValidElement, type ReactNode } from "react";

type Props = Record<string, any>;

function componentName(type: unknown): string | null {
  if (typeof type === "string") return null; // host element (div, span …)
  const t = type as { craft?: { displayName?: string }; displayName?: string; name?: string };
  return t?.craft?.displayName || t?.displayName || t?.name || null;
}

function actionsAreLinks(action: unknown): boolean {
  if (!action) return true;
  const list = Array.isArray(action) ? action : [action];
  return list.every(a => (a as { type?: string })?.type === "link");
}

/** One node's own props: classes and actions. */
function propsAreEmailSafe(props: Props | undefined, unsafeClass: (cls: string) => boolean): boolean {
  if (!props) return true;
  if (typeof props.className === "string" && unsafeClass(props.className)) return false;
  return actionsAreLinks(props.action);
}

function treeIsEmailSafe(
  node: ReactNode,
  allowed: ReadonlySet<string>,
  unsafeClass: (cls: string) => boolean
): boolean {
  if (Array.isArray(node)) return node.every(n => treeIsEmailSafe(n, allowed, unsafeClass));
  if (!isValidElement(node)) return true;
  const props = node.props as Props;
  // Craft `<Element is={Component}>` names the component on `is`.
  const name = componentName(props.is ?? node.type);
  if (name && name !== "Element" && !allowed.has(name)) return false;
  if (!propsAreEmailSafe(props, unsafeClass)) return false;
  return treeIsEmailSafe(props.children as ReactNode, allowed, unsafeClass);
}

export function presetIsEmailSafe(
  preset: { props?: Props; children?: unknown },
  allowed: ReadonlySet<string>,
  unsafeClass: (cls: string) => boolean
): boolean {
  if (!actionsAreLinks(preset.props?.action)) return false;
  const children =
    typeof preset.children === "function" ? (preset.children as () => unknown)() : preset.children;
  return treeIsEmailSafe(children as ReactNode, allowed, unsafeClass);
}
