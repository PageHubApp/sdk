// ─── Locale ───────────────────────────────────────────────────────────────────

export interface PageHubLocale {
  /** ISO language code (e.g. 'en', 'fr', 'de') */
  language?: string;
  /** Override specific UI strings */
  strings?: Record<string, string>;
}
