export interface PaletteColor {
  name: string;
  color: string;
}

export interface CustomFont {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
  /** Optional fields round-tripped by the typography preset editor. */
  color?: string;
  textDecoration?: string;
  textAlign?: string;
}

export interface StyleGuideState {
  radiusBox: string;
  radiusField: string;
  radiusSelector: string;
  sizeField: string;
  sizeSelector: string;
  depth: string;
  noise: string;
  buttonPadding: string;
  containerPadding: string;
  sectionGap: string;
  containerGap: string;
  contentWidth: string;
  // Spatial scale
  spaceXs: string;
  spaceSm: string;
  spaceMd: string;
  spaceLg: string;
  spaceXl: string;
  spacingDensity: string;
  shadowStyle: string;
  // Form inputs
  border: string;
  inputBorderColor: string;
  inputPadding: string;
  inputBgColor: string;
  inputTextColor: string;
  inputPlaceholderColor: string;
  inputFocusRing: string;
  inputFocusRingColor: string;
  // Links
  linkColor: string;
  linkHoverColor: string;
  linkUnderline: string;
  linkUnderlineOffset: string;
}
