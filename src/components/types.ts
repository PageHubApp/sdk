/**
 * @pagehub/sdk — Shared selector types
 *
 * Extracted from components/selectors/index.ts (main app).
 * These are the base interfaces that ALL selector components implement.
 */

/** @deprecated Style props are now className tokens. Kept for hover pseudo-state typing. */
export interface BaseStyleProps {
  flexDirection?: string;
  flexBase?: string;
  alignItems?: string;
  justifyContent?: string;
  flexGrow?: string;
  width?: string;
  maxWidth?: string;
  maxHeight?: string;
  minWidth?: string;
  minHeight?: string;
  lineHeight?: string;
  tracking?: string;
  height?: string;
  p?: string;
  m?: string;
  px?: string;
  py?: string;
  mx?: string;
  my?: string;
  ml?: string;
  mt?: string;
  mr?: string;
  mb?: string;
  marginTop?: string;
  pl?: string;
  pr?: string;
  pt?: string;
  pb?: string;
  display?: string;
  gap?: string;
  fontSize?: string;
  fontWeight?: string;
  objectFit?: string;
  aspectRatio?: string;
  transform?: string;
  wordBreak?: string;
  textOverflow?: string;
  indent?: string;
  textDecoration?: string;
  textAlign?: string;
  backgroundRepeat?: string;
  backgroundSize?: string;
  backgroundAttachment?: string;
  backgroundOrigin?: string;
  backgroundPosition?: string;
  overflow?: string;
  cursor?: string;
  position?: string;
  inset?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: string;
}

export const RootClassGenProps = [];

export interface RootStyleProps {
  style?: string;
  animation?: string;
  animationDuration?: string;
  animationDelay?: string;
  animationEasing?: string;
  animationTrigger?: string;
  animationCSSName?: string;
  pattern?: any;
  patternVerticalPosition?: string;
  patternHorizontalPosition?: string;
  patternStroke?: string;
  patternZoom?: string;
  patternColorA?: string;
  patternAngle?: string;
  patternColorB?: string;
  patternSpacingX?: string;
  patternSpacingY?: string;
  preset?: string;
  presetPadding?: string;
  presetMaxWidth?: string;
}

export interface BaseSelectorProps {
  belongsTo?: string;
  hasMany?: string[];
  relationType?: string;
  url?: string;
  urlTarget?: string;
  className?: string;
  tools?: any;

  root?: RootStyleProps;
  hover?: BaseStyleProps;
  activeTab?: number;
  children?: React.ReactNode;
  type?: string;
  custom?: object;
  displayName?: string;
  canDelete?: boolean;
  canEditName?: boolean;
  backgroundImage?: string;
  backgroundImageType?: string;
  backgroundPriority?: string;
  backgroundFetchPriority?: "high" | "low" | "auto" | "";
  backgroundLazy?: boolean;
  backgroundPlaceholder?: string;

  isLoading?: boolean;
  loaded?: boolean;
}

/**
 * Named color — used by the palette system.
 */
export interface NamedColor {
  name: string;
  color: string;
}
