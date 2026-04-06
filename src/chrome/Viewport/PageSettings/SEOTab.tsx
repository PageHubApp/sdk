import React from "react";
import { TbChevronDown } from "react-icons/tb";
import { StandaloneImagePicker } from "../StandaloneImagePicker";

interface SEOTabProps {
  pageTitle: string;
  setPageTitle: (v: string) => void;
  pageDescription: string;
  setPageDescription: (v: string) => void;
  pageKeywords: string;
  setPageKeywords: (v: string) => void;
  pageAuthor: string;
  setPageAuthor: (v: string) => void;
  ogExpanded: boolean;
  setOgExpanded: (v: boolean) => void;
  ogTitle: string;
  setOgTitle: (v: string) => void;
  ogDescription: string;
  setOgDescription: (v: string) => void;
  ogImage: string;
  setOgImage: (v: string) => void;
  ogType: string;
  setOgType: (v: string) => void;
  twitterExpanded: boolean;
  setTwitterExpanded: (v: boolean) => void;
  twitterCard: string;
  setTwitterCard: (v: string) => void;
  twitterSite: string;
  setTwitterSite: (v: string) => void;
  twitterCreator: string;
  setTwitterCreator: (v: string) => void;
}

export function SEOTab({
  pageTitle, setPageTitle,
  pageDescription, setPageDescription,
  pageKeywords, setPageKeywords,
  pageAuthor, setPageAuthor,
  ogExpanded, setOgExpanded,
  ogTitle, setOgTitle,
  ogDescription, setOgDescription,
  ogImage, setOgImage,
  ogType, setOgType,
  twitterExpanded, setTwitterExpanded,
  twitterCard, setTwitterCard,
  twitterSite, setTwitterSite,
  twitterCreator, setTwitterCreator,
}: SEOTabProps) {
  return (
    <div className="space-y-6">
      {/* Basic SEO */}
      <div className="space-y-4">
        <div>
          <label htmlFor="meta-title" className="toolbar-label mb-2 block font-medium">
            Meta Title
          </label>
          <textarea
            id="meta-title"
            value={pageTitle}
            onChange={e => setPageTitle(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Page title (50-60 characters)"
          />
        </div>

        <div>
          <label htmlFor="meta-description" className="toolbar-label mb-2 block font-medium">
            Meta Description
          </label>
          <textarea
            id="meta-description"
            value={pageDescription}
            onChange={e => setPageDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Meta description (150-160 characters)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="page-keywords" className="toolbar-label mb-2 block font-medium">
              Keywords
            </label>
            <input
              id="page-keywords"
              type="text"
              value={pageKeywords}
              onChange={e => setPageKeywords(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="keyword1, keyword2"
            />
          </div>

          <div>
            <label htmlFor="page-author" className="toolbar-label mb-2 block font-medium">
              Author
            </label>
            <input
              id="page-author"
              type="text"
              value={pageAuthor}
              onChange={e => setPageAuthor(e.target.value)}
              className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Author name"
            />
          </div>
        </div>
      </div>

      {/* Open Graph - Collapsible */}
      <div className="overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setOgExpanded(!ogExpanded)}
          className="flex w-full items-center justify-between bg-muted p-4 transition-colors hover:bg-muted/80"
        >
          <div className="flex items-center gap-2">
            <span className="toolbar-label font-medium">
              Open Graph (Social Media)
            </span>
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              Optional
            </span>
          </div>
          <TbChevronDown
            className={`text-muted-foreground transition-transform ${
              ogExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {ogExpanded && (
          <div className="space-y-4 border-t border-border bg-background p-4">
            <div>
              <label htmlFor="og-title" className="toolbar-label mb-2 block font-medium">
                OG Title
              </label>
              <input
                id="og-title"
                type="text"
                value={ogTitle}
                onChange={e => setOgTitle(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Leave empty to use page title"
              />
            </div>

            <div>
              <label htmlFor="og-description" className="toolbar-label mb-2 block font-medium">
                OG Description
              </label>
              <textarea
                id="og-description"
                value={ogDescription}
                onChange={e => setOgDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Leave empty to use page description"
              />
            </div>

            <div>
              <p className="toolbar-label mb-2 block font-medium">
                OG Image
              </p>
              <StandaloneImagePicker
                value={ogImage}
                onChange={setOgImage}
                label="Upload OG Image"
                help="Recommended: 1200x630px"
              />
            </div>

            <div>
              <label htmlFor="og-type" className="toolbar-label mb-2 block font-medium">
                OG Type
              </label>
              <select
                id="og-type"
                value={ogType}
                onChange={e => setOgType(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="website">Website</option>
                <option value="article">Article</option>
                <option value="product">Product</option>
                <option value="profile">Profile</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Twitter - Collapsible */}
      <div className="overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setTwitterExpanded(!twitterExpanded)}
          className="flex w-full items-center justify-between bg-muted p-4 transition-colors hover:bg-muted/80"
        >
          <div className="flex items-center gap-2">
            <span className="toolbar-label font-medium">Twitter/X Card</span>
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
              Optional
            </span>
          </div>
          <TbChevronDown
            className={`text-muted-foreground transition-transform ${
              twitterExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {twitterExpanded && (
          <div className="space-y-4 border-t border-border bg-background p-4">
            <div>
              <label htmlFor="twitter-card" className="toolbar-label mb-2 block font-medium">
                Card Type
              </label>
              <select
                id="twitter-card"
                value={twitterCard}
                onChange={e => setTwitterCard(e.target.value)}
                className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="summary_large_image">Summary Large Image</option>
                <option value="summary">Summary</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="twitter-site" className="toolbar-label mb-2 block font-medium">
                  Site
                </label>
                <input
                  id="twitter-site"
                  type="text"
                  value={twitterSite}
                  onChange={e => setTwitterSite(e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="@yourusername"
                />
              </div>

              <div>
                <label htmlFor="twitter-creator" className="toolbar-label mb-2 block font-medium">
                  Creator
                </label>
                <input
                  id="twitter-creator"
                  type="text"
                  value={twitterCreator}
                  onChange={e => setTwitterCreator(e.target.value)}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="@authorusername"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
