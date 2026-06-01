// ─── Theming ──────────────────────────────────────────────────────────────────

export interface PageHubTheme {
  /** Primary brand colour (hex, hsl, rgb) */
  primaryColor?: string;
  /** Secondary brand colour */
  secondaryColor?: string;
  /** Accent colour */
  accentColor?: string;
  /** Logo URL shown in the editor toolbar */
  logo?: string;
  /** Custom CSS variables to inject (key-value, no `--` prefix needed) */
  cssVariables?: Record<string, string>;
  /** Raw CSS to inject into the editor iframe */
  customCSS?: string;
  /** Dark mode preference */
  colorScheme?: "light" | "dark" | "system";
}
