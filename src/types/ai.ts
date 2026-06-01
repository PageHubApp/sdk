// ─── AI Configuration ─────────────────────────────────────────────────────────

export interface PageHubAIConfig {
  /** Enable AI features (requires PageHub account). Default: false */
  enabled?: boolean;
}

// ─── Host-injected assistant panel (no AI implementation in the SDK) ─────────

export interface PageHubMediaMetadataSuggestion {
  title?: string;
  alt?: string;
  description?: string;
}

export interface PageHubMediaEditAiActionsContext {
  media: {
    id: string;
    type?: "cdn" | "url" | "svg" | "r2";
    cdnId?: string;
    metadata?: {
      title?: string;
      alt?: string;
      description?: string;
      url?: string;
      svg?: string;
      size?: number;
    };
  };
  imageUrl?: string;
  isGenerating: boolean;
  error: string;
  designNotes?: string;
  designTags?: string[];
  setGenerating: (value: boolean) => void;
  setError: (value: string) => void;
  applyMetadata: (metadata: PageHubMediaMetadataSuggestion) => void;
}
