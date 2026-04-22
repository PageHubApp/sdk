// ─── Media Manager utility functions (pure, no React dependencies) ───

import { DEFAULT_IMAGE_ACCEPT } from "@/utils/media/registry";

export type SortField = "name" | "size" | "createdAt" | "order";
export type SortDirection = "asc" | "desc";
export type AddMode = "upload" | "url" | "svg" | "ai";

/** Logical kind of a media item, derived from `type` + `metadata.contentType`.
 *  Drives badges, filter chips, and same-kind replace `accept`. */
export type MediaKind = "image" | "video" | "audio" | "pdf" | "archive" | "other";

export const MEDIA_KIND_LABELS: Record<MediaKind, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  archive: "Archive",
  other: "File",
};

export interface MediaDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface MediaMetadata {
  title?: string;
  alt?: string;
  description?: string;
  url?: string;
  svg?: string;
  size?: number;
  dimensions?: MediaDimensions;
  originalUrl?: string;
  isVariant?: boolean;
  aiGenerated?: boolean;
  aiPrompt?: string;
  source?: string;
  /** For `type: "r2"`, the ready-to-use public URL (avoids re-deriving at render). */
  deliveryURL?: string;
  /** The original MIME type — helpful for `r2` media (video/audio/pdf) where
   *  the type prefix changes how we render it. */
  contentType?: string;
  /** Optional single-level folder assignment. */
  folderId?: string;
}

export interface MediaItem {
  id: string;
  type?: "cdn" | "url" | "svg" | "r2";
  cdnId?: string;
  order?: number;
  uploadedAt?: number;
  createdAt?: number;
  metadata?: MediaMetadata;
}

export interface MediaFolder {
  id: string;
  name: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface UploadProgress {
  current: number;
  total: number;
  currentFile: string;
  completedFiles: string[];
}

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  credits: number;
}

/** Classify a media item by kind. CDN/URL/SVG entries are images; r2 entries
 *  are routed by `metadata.contentType`. */
export function getMediaKind(media: Pick<MediaItem, "type" | "metadata">): MediaKind {
  const ct = media.metadata?.contentType || "";
  if (media.type === "svg" || media.type === "cdn" || media.type === "url") return "image";
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("video/")) return "video";
  if (ct.startsWith("audio/")) return "audio";
  if (ct === "application/pdf") return "pdf";
  if (ct === "application/zip") return "archive";
  return "other";
}

/** `<input accept>` for replacing a specific media item — restricts the
 *  picker to the same kind so users can't accidentally swap an image for a
 *  video (which would break any node still rendering it as an `<img>`). */
export function getReplaceAccept(item: Pick<MediaItem, "type" | "metadata">): string {
  switch (getMediaKind(item)) {
    case "image":
      return DEFAULT_IMAGE_ACCEPT;
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    case "pdf":
      return "application/pdf";
    case "archive":
      return "application/zip";
    default:
      return "*/*";
  }
}

/** Format byte count to human-readable string */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/** Sort media items by field and direction */
export function sortMedia(
  media: MediaItem[],
  sortField: SortField,
  sortDirection: SortDirection
): MediaItem[] {
  return [...media].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case "name":
        aValue = a.metadata?.title || a.id;
        bValue = b.metadata?.title || b.id;
        break;
      case "size":
        aValue = a.metadata?.size || 0;
        bValue = b.metadata?.size || 0;
        break;
      case "createdAt":
        aValue = a.uploadedAt || a.createdAt || 0;
        bValue = b.uploadedAt || b.createdAt || 0;
        break;
      case "order":
        aValue = a.order || 0;
        bValue = b.order || 0;
        break;
      default:
        return 0;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });
}

/** Clean SVG markup: strip XML declaration, DOCTYPE, comments, dimensions, and replace black fills with currentColor */
export function cleanSvg(svg: string): string {
  let cleaned = svg.trim();

  // Remove XML declaration
  cleaned = cleaned.replace(/<\?xml[^?]*\?>/gi, "");

  // Remove DOCTYPE
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, "");

  // Remove comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  // Extract only the SVG tag and its contents
  const svgMatch = cleaned.match(/<svg[\s\S]*<\/svg>/i);
  if (svgMatch) {
    cleaned = svgMatch[0];
  }

  // Remove width and height attributes from SVG tag
  cleaned = cleaned.replace(/\s*(width|height)\s*=\s*["'][^"']*["']/gi, "");

  // Replace black fills with currentColor to make SVG themeable
  cleaned = cleaned.replace(/fill\s*=\s*["']#000000["']/gi, 'fill="currentColor"');
  cleaned = cleaned.replace(/fill\s*=\s*["']#000["']/gi, 'fill="currentColor"');
  cleaned = cleaned.replace(/fill\s*=\s*["']black["']/gi, 'fill="currentColor"');
  cleaned = cleaned.replace(/fill\s*=\s*["']rgb\(0,\s*0,\s*0\)["']/gi, 'fill="currentColor"');
  cleaned = cleaned.replace(/fill\s*=\s*["']rgba\(0,\s*0,\s*0,\s*1\)["']/gi, 'fill="currentColor"');

  return cleaned.trim();
}

/** Prompt templates for AI image generation */
export const AI_PROMPT_TEMPLATES = [
  "Professional headshot, clean background",
  "Minimalist logo, simple design",
  "Product photography, white background",
  "Tech startup logo, modern",
  "Food photography, appetizing",
  "Nature landscape, realistic",
  "Hero banner, abstract gradient",
  "Hero banner, geometric shapes",
  "Isometric illustration, tech office",
  "Flat illustration, friendly characters",
  "3D abstract shapes, soft lighting",
  "Abstract waves, subtle gradient",
  "Glassmorphism background, soft blur",
  "Neumorphism cards, soft shadows",
  "Gradient mesh background, vibrant",
  "Pattern background, subtle dots",
  "Pattern background, diagonal lines",
  "Organic blob shapes, pastel",
  "Minimal abstract texture, noise",
  "Dark mode abstract background",
  "App screenshot mockup, laptop",
  "Mobile app mockup, phone in hand",
  "Dashboard UI, clean analytics",
  "SaaS dashboard, metrics and charts",
  "Ecommerce product grid, minimal",
  "Pricing table illustration, modern",
  "Testimonial cards, portraits",
  "FAQ illustration, outline style",
  "404 illustration, playful",
  "Team group photo, studio lighting",
  "Founder portrait, natural light",
  "Coworking office, bright and airy",
  "Startup workspace, laptops and plants",
  "Conference room, glass walls",
  "Customer support, headset smiling",
  "Remote work desk, aesthetic",
  "Brainstorm session, sticky notes",
  "Casual meeting, modern office",
  "Fitness trainer, gym environment",
  "Yoga class, calm studio",
  "Healthcare doctor portrait, clinic",
  "Dentist office, clean and bright",
  "Real estate exterior, modern home",
  "Real estate interior, staged living room",
  "Construction site, safety gear",
  "Restaurant plated dish, top down",
  "Coffee shop, latte art",
  "Hotel lobby, boutique style",
  "Travel destination, scenic city",
  "Education classroom, modern",
  "Nonprofit volunteers, community event",
  "Law firm, professional office",
  "Finance advisor, trustworthy portrait",
  "Beauty product flat lay, soft light",
  "Barber shop, lifestyle portrait",
  "Product hero, floating shadows",
  "Product lifestyle, on desk",
  "Product detail macro, texture",
  "Clothing on mannequin, studio",
  "Sneaker on pedestal, dramatic",
  "Jewelry on silk, elegant",
  "Cosmetics smear swatches, clean",
  "Packaging box mockup, premium",
  "Bottle mockup, glossy label",
  "Book cover mockup, minimal",
  "Icon set, outlined, consistent",
  "Icon set, filled, rounded",
  "App store badges, minimal style",
  "Social media preview image, bold title",
  "Email newsletter header, clean",
  "Call to action button set, variants",
  "Steps illustration, 1\u20132\u20133 process",
  "Roadmap timeline, modern",
  "Onboarding illustrations, friendly",
  "Security shield icon, trustworthy",
  "Map pin illustration, minimal",
  "Location hero, aerial city",
  "Customer collage, diverse portraits",
  "Before and after, product result",
  "Award badge, premium gold",
  "Trust badges, payment logos style",
  "Contact section, phone and chat",
  "Newsletter signup, envelope graphic",
  "Careers banner, happy team",
  "Coming soon, teaser background",
] as const;
