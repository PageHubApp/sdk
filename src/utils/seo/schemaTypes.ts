/**
 * Schema.org type registry for the JSON-LD builder.
 *
 * Each SchemaTypeDef describes the form layout for one schema.org @type:
 * which fields show up, how they render, and how to compile the user's
 * input into a valid JSON-LD object.
 *
 * Storage shape on the page node: seo.schema: SchemaEntry[]
 * Renderer emits one <script type="application/ld+json"> per entry.
 */

export type SchemaFieldKind =
  | "text"
  | "textarea"
  | "url"
  | "image"
  | "date"
  | "datetime"
  | "number"
  | "select"
  | "list"
  | "nested";

export interface SchemaFieldDef {
  /** schema.org property name (becomes the JSON key). */
  key: string;
  label: string;
  kind: SchemaFieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** For kind: "select" — option values. */
  options?: { label: string; value: string }[];
  /** For kind: "nested" — fields rendered as a sub-object. */
  nested?: SchemaFieldDef[];
  /** For kind: "nested" — adds {"@type": nestedType} to the compiled object. */
  nestedType?: string;
  /** For kind: "list" — shape of each item. */
  itemFields?: SchemaFieldDef[];
  /** For kind: "list" — adds {"@type": itemType} to each item. */
  itemType?: string;
  /** For kind: "list" — label for "Add item" button. */
  itemLabel?: string;
}

export type SchemaTypeKey =
  | "Organization"
  | "LocalBusiness"
  | "WebSite"
  | "WebPage"
  | "Article"
  | "BlogPosting"
  | "Product"
  | "FAQPage"
  | "BreadcrumbList"
  | "Event"
  | "Recipe"
  | "Review"
  | "VideoObject"
  | "HowTo";

export type SchemaGroup = "Business" | "Content" | "Commerce" | "Event" | "Media" | "Misc";

export interface SchemaTypeDef {
  type: SchemaTypeKey;
  label: string;
  group: SchemaGroup;
  description: string;
  fields: SchemaFieldDef[];
  /** One-line summary shown on the collapsed entry card. */
  summary: (fields: Record<string, any>) => string;
}

export interface SchemaEntryBuilder {
  kind: "builder";
  /** Stable id for React keys. */
  id: string;
  type: SchemaTypeKey;
  fields: Record<string, any>;
}

export interface SchemaEntryRaw {
  kind: "raw";
  id: string;
  json: string;
}

export type SchemaEntry = SchemaEntryBuilder | SchemaEntryRaw;

// ── Shared field fragments ───────────────────────────────────────────────────

const ADDRESS_FIELDS: SchemaFieldDef[] = [
  { key: "streetAddress", label: "Street address", kind: "text" },
  { key: "addressLocality", label: "City", kind: "text" },
  { key: "addressRegion", label: "State / region", kind: "text" },
  { key: "postalCode", label: "Postal code", kind: "text" },
  { key: "addressCountry", label: "Country code", kind: "text", placeholder: "US" },
];

const GEO_FIELDS: SchemaFieldDef[] = [
  { key: "latitude", label: "Latitude", kind: "number" },
  { key: "longitude", label: "Longitude", kind: "number" },
];

const AUTHOR_FIELDS: SchemaFieldDef[] = [
  { key: "name", label: "Name", kind: "text", required: true },
  { key: "url", label: "Profile URL", kind: "url" },
];

const PUBLISHER_FIELDS: SchemaFieldDef[] = [
  { key: "name", label: "Publisher name", kind: "text", required: true },
  {
    key: "logo",
    label: "Logo",
    kind: "nested",
    nestedType: "ImageObject",
    nested: [{ key: "url", label: "Logo URL", kind: "image", required: true }],
  },
];

const OFFER_FIELDS: SchemaFieldDef[] = [
  { key: "price", label: "Price", kind: "text", placeholder: "29.99", required: true },
  { key: "priceCurrency", label: "Currency", kind: "text", placeholder: "USD", required: true },
  { key: "url", label: "Buy URL", kind: "url" },
  {
    key: "availability",
    label: "Availability",
    kind: "select",
    options: [
      { label: "In stock", value: "https://schema.org/InStock" },
      { label: "Out of stock", value: "https://schema.org/OutOfStock" },
      { label: "Pre-order", value: "https://schema.org/PreOrder" },
      { label: "Discontinued", value: "https://schema.org/Discontinued" },
    ],
  },
];

// ── 14 schema type definitions ───────────────────────────────────────────────

export const SCHEMA_TYPES: SchemaTypeDef[] = [
  {
    type: "Organization",
    label: "Organization",
    group: "Business",
    description: "Your company. Place once site-wide so Google links your brand.",
    summary: f => f.name || "Untitled organization",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true, placeholder: "Acme Inc." },
      { key: "url", label: "Website URL", kind: "url", required: true },
      { key: "logo", label: "Logo", kind: "image", help: "Square, ideally 600×600 or larger." },
      { key: "email", label: "Contact email", kind: "text", placeholder: "hello@example.com" },
      { key: "telephone", label: "Phone", kind: "text" },
      {
        key: "address",
        label: "Address",
        kind: "nested",
        nestedType: "PostalAddress",
        nested: ADDRESS_FIELDS,
      },
      {
        key: "sameAs",
        label: "Social profile URLs",
        kind: "list",
        itemLabel: "Add profile",
        itemFields: [{ key: "value", label: "URL", kind: "url", required: true }],
      },
    ],
  },
  {
    type: "LocalBusiness",
    label: "Local Business",
    group: "Business",
    description: "Physical business location — gets you on Google Maps surfaces.",
    summary: f => f.name || "Untitled business",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "url", label: "Website URL", kind: "url", required: true },
      { key: "image", label: "Photo", kind: "image", required: true },
      { key: "telephone", label: "Phone", kind: "text" },
      { key: "priceRange", label: "Price range", kind: "text", placeholder: "$$" },
      {
        key: "address",
        label: "Address",
        kind: "nested",
        nestedType: "PostalAddress",
        nested: ADDRESS_FIELDS,
      },
      { key: "geo", label: "Geo coordinates", kind: "nested", nestedType: "GeoCoordinates", nested: GEO_FIELDS },
      {
        key: "openingHours",
        label: "Opening hours",
        kind: "list",
        itemLabel: "Add hours line",
        itemFields: [
          {
            key: "value",
            label: "Hours",
            kind: "text",
            placeholder: "Mo-Fr 09:00-17:00",
            required: true,
            help: 'Schema.org format — e.g. "Mo-Fr 09:00-17:00" or "Sa 10:00-14:00".',
          },
        ],
      },
    ],
  },
  {
    type: "WebSite",
    label: "Website",
    group: "Content",
    description: "Top-level site identity. Powers Google sitelinks search box.",
    summary: f => f.name || f.url || "Untitled website",
    fields: [
      { key: "name", label: "Site name", kind: "text", required: true },
      { key: "url", label: "Site URL", kind: "url", required: true },
      {
        key: "potentialAction",
        label: "Search action",
        kind: "nested",
        nestedType: "SearchAction",
        nested: [
          {
            key: "target",
            label: "Search URL template",
            kind: "text",
            placeholder: "https://example.com/search?q={search_term_string}",
            help: 'Include the literal "{search_term_string}" placeholder.',
          },
        ],
      },
    ],
  },
  {
    type: "WebPage",
    label: "Web Page",
    group: "Content",
    description: "Generic page description. Use Article/BlogPosting for editorial pages.",
    summary: f => f.name || "Untitled page",
    fields: [
      { key: "name", label: "Page name", kind: "text", required: true },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "url", label: "Canonical URL", kind: "url" },
      { key: "primaryImageOfPage", label: "Hero image URL", kind: "image" },
    ],
  },
  {
    type: "Article",
    label: "Article",
    group: "Content",
    description: "News/journalism. Enables top-stories carousel eligibility.",
    summary: f => f.headline || "Untitled article",
    fields: [
      { key: "headline", label: "Headline", kind: "text", required: true },
      { key: "image", label: "Hero image", kind: "image", required: true },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "datePublished", label: "Published", kind: "datetime", required: true },
      { key: "dateModified", label: "Last modified", kind: "datetime" },
      { key: "author", label: "Author", kind: "nested", nestedType: "Person", nested: AUTHOR_FIELDS },
      {
        key: "publisher",
        label: "Publisher",
        kind: "nested",
        nestedType: "Organization",
        nested: PUBLISHER_FIELDS,
      },
    ],
  },
  {
    type: "BlogPosting",
    label: "Blog Post",
    group: "Content",
    description: "Blog entries. Same shape as Article with a different @type.",
    summary: f => f.headline || "Untitled post",
    fields: [
      { key: "headline", label: "Headline", kind: "text", required: true },
      { key: "image", label: "Hero image", kind: "image", required: true },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "datePublished", label: "Published", kind: "datetime", required: true },
      { key: "dateModified", label: "Last modified", kind: "datetime" },
      { key: "author", label: "Author", kind: "nested", nestedType: "Person", nested: AUTHOR_FIELDS },
      {
        key: "publisher",
        label: "Publisher",
        kind: "nested",
        nestedType: "Organization",
        nested: PUBLISHER_FIELDS,
      },
    ],
  },
  {
    type: "Product",
    label: "Product",
    group: "Commerce",
    description: "Single product. Enables price/availability snippets in search.",
    summary: f => f.name || "Untitled product",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "description", label: "Description", kind: "textarea" },
      {
        key: "image",
        label: "Images",
        kind: "list",
        itemLabel: "Add image",
        itemFields: [{ key: "value", label: "Image", kind: "image", required: true }],
      },
      { key: "sku", label: "SKU", kind: "text" },
      { key: "brand", label: "Brand", kind: "nested", nestedType: "Brand", nested: [{ key: "name", label: "Brand name", kind: "text", required: true }] },
      { key: "offers", label: "Offer", kind: "nested", nestedType: "Offer", nested: OFFER_FIELDS },
    ],
  },
  {
    type: "FAQPage",
    label: "FAQ Page",
    group: "Content",
    description: "Question + answer pairs. Renders as an expandable list in search results.",
    summary: f => `${(f.mainEntity || []).length} question(s)`,
    fields: [
      {
        key: "mainEntity",
        label: "Questions",
        kind: "list",
        itemLabel: "Add question",
        itemType: "Question",
        itemFields: [
          { key: "name", label: "Question", kind: "text", required: true },
          {
            key: "acceptedAnswer",
            label: "Answer",
            kind: "nested",
            nestedType: "Answer",
            nested: [{ key: "text", label: "Answer text", kind: "textarea", required: true }],
          },
        ],
      },
    ],
  },
  {
    type: "BreadcrumbList",
    label: "Breadcrumbs",
    group: "Misc",
    description: "Trail of parent pages. Replaces the URL line in search results with named hops.",
    summary: f => `${(f.itemListElement || []).length} crumb(s)`,
    fields: [
      {
        key: "itemListElement",
        label: "Crumbs",
        kind: "list",
        itemLabel: "Add crumb",
        itemType: "ListItem",
        itemFields: [
          { key: "name", label: "Label", kind: "text", required: true },
          { key: "item", label: "URL", kind: "url", required: true },
        ],
      },
    ],
  },
  {
    type: "Event",
    label: "Event",
    group: "Event",
    description: "Concert, conference, webinar. Enables event rich result.",
    summary: f => f.name || "Untitled event",
    fields: [
      { key: "name", label: "Event name", kind: "text", required: true },
      { key: "startDate", label: "Start", kind: "datetime", required: true },
      { key: "endDate", label: "End", kind: "datetime" },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "image", label: "Image", kind: "image" },
      {
        key: "location",
        label: "Location",
        kind: "nested",
        nestedType: "Place",
        nested: [
          { key: "name", label: "Venue name", kind: "text", required: true },
          {
            key: "address",
            label: "Address",
            kind: "nested",
            nestedType: "PostalAddress",
            nested: ADDRESS_FIELDS,
          },
        ],
      },
      { key: "offers", label: "Ticket offer", kind: "nested", nestedType: "Offer", nested: OFFER_FIELDS },
    ],
  },
  {
    type: "Recipe",
    label: "Recipe",
    group: "Content",
    description: "Cooking recipe with ingredients and steps.",
    summary: f => f.name || "Untitled recipe",
    fields: [
      { key: "name", label: "Name", kind: "text", required: true },
      { key: "image", label: "Photo", kind: "image", required: true },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "recipeYield", label: "Yield", kind: "text", placeholder: "4 servings" },
      { key: "prepTime", label: "Prep time", kind: "text", placeholder: "PT15M", help: "ISO 8601 duration." },
      { key: "cookTime", label: "Cook time", kind: "text", placeholder: "PT30M" },
      {
        key: "recipeIngredient",
        label: "Ingredients",
        kind: "list",
        itemLabel: "Add ingredient",
        itemFields: [{ key: "value", label: "Ingredient", kind: "text", required: true }],
      },
      {
        key: "recipeInstructions",
        label: "Steps",
        kind: "list",
        itemLabel: "Add step",
        itemType: "HowToStep",
        itemFields: [{ key: "text", label: "Step", kind: "textarea", required: true }],
      },
    ],
  },
  {
    type: "Review",
    label: "Review",
    group: "Commerce",
    description: "Single review of a product, service, or place.",
    summary: f => f.reviewBody?.slice(0, 60) || "Untitled review",
    fields: [
      {
        key: "itemReviewed",
        label: "Item reviewed",
        kind: "nested",
        nestedType: "Thing",
        nested: [{ key: "name", label: "Name", kind: "text", required: true }],
      },
      {
        key: "reviewRating",
        label: "Rating",
        kind: "nested",
        nestedType: "Rating",
        nested: [
          { key: "ratingValue", label: "Rating value", kind: "number", required: true, placeholder: "5" },
          { key: "bestRating", label: "Best possible rating", kind: "number", placeholder: "5" },
        ],
      },
      { key: "author", label: "Author", kind: "nested", nestedType: "Person", nested: AUTHOR_FIELDS },
      { key: "reviewBody", label: "Review text", kind: "textarea" },
    ],
  },
  {
    type: "VideoObject",
    label: "Video",
    group: "Media",
    description: "Hosted video. Enables video thumbnail + duration in search.",
    summary: f => f.name || "Untitled video",
    fields: [
      { key: "name", label: "Title", kind: "text", required: true },
      { key: "description", label: "Description", kind: "textarea", required: true },
      { key: "thumbnailUrl", label: "Thumbnail", kind: "image", required: true },
      { key: "uploadDate", label: "Upload date", kind: "datetime", required: true },
      { key: "contentUrl", label: "Video URL", kind: "url" },
      { key: "embedUrl", label: "Embed URL", kind: "url" },
      { key: "duration", label: "Duration", kind: "text", placeholder: "PT2M30S", help: "ISO 8601 duration." },
    ],
  },
  {
    type: "HowTo",
    label: "How-To",
    group: "Content",
    description: "Step-by-step guide. Enables numbered-step rich result.",
    summary: f => f.name || "Untitled guide",
    fields: [
      { key: "name", label: "Title", kind: "text", required: true },
      { key: "description", label: "Description", kind: "textarea" },
      { key: "image", label: "Image", kind: "image" },
      { key: "totalTime", label: "Total time", kind: "text", placeholder: "PT1H" },
      {
        key: "step",
        label: "Steps",
        kind: "list",
        itemLabel: "Add step",
        itemType: "HowToStep",
        itemFields: [
          { key: "name", label: "Step name", kind: "text" },
          { key: "text", label: "Step text", kind: "textarea", required: true },
          { key: "image", label: "Step image", kind: "image" },
        ],
      },
    ],
  },
];

export const SCHEMA_TYPES_BY_KEY: Record<SchemaTypeKey, SchemaTypeDef> = SCHEMA_TYPES.reduce(
  (acc, def) => {
    acc[def.type] = def;
    return acc;
  },
  {} as Record<SchemaTypeKey, SchemaTypeDef>
);

export function getSchemaTypeDef(type: SchemaTypeKey): SchemaTypeDef | undefined {
  return SCHEMA_TYPES_BY_KEY[type];
}

/** Empty initial-values record for a type — primes the form. */
export function createEmptySchemaFields(def: SchemaTypeDef): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of def.fields) {
    if (f.kind === "list") out[f.key] = [];
    else if (f.kind === "nested") out[f.key] = {};
    else out[f.key] = "";
  }
  return out;
}
