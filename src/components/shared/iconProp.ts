/**
 * Shared icon-prop shape + normalization for CTA-style components (Button, Link)
 * that render an icon next to their text via an `icon` prop.
 */

export interface IconProps {
  value?: string;
  only?: boolean;
  position?: string;
  size?: string;
  color?: string;
  gap?: string;
  shadow?: string;
}

/**
 * Legacy flat icon fields — pre-migration content stored `icon` as a bare
 * string with these sibling props instead of a nested {@link IconProps} object.
 */
export interface LegacyIconFields {
  iconPosition?: string;
  iconSize?: string;
  iconColor?: string;
  iconGap?: string;
  iconShadow?: string;
  iconOnly?: boolean;
}

/** `icon` may arrive as a structured object or a legacy bare string. */
export type IconPropInput = IconProps | string;

/**
 * Normalize the `icon` prop. When legacy content stored `icon` as a string,
 * lift the flat `icon*` sibling fields into an {@link IconProps} object using
 * the component's defaults. Already-structured icons pass through unchanged.
 */
export function normalizeIconProp(
  props: { icon?: IconPropInput } & LegacyIconFields,
  defaults: { position: string; size: string; gap: string }
): IconProps | undefined {
  const { icon } = props;
  if (typeof icon !== "string") return icon;
  return {
    value: icon,
    position: props.iconPosition || defaults.position,
    size: props.iconSize || defaults.size,
    color: props.iconColor,
    gap: props.iconGap || defaults.gap,
    shadow: props.iconShadow,
    only: props.iconOnly,
  };
}
