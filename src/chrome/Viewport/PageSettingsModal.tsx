// @ts-nocheck
import { useEditor } from "@craftjs/core";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { TbChevronDown, TbTrash, TbX } from "react-icons/tb";
import { StandaloneImagePicker } from "./StandaloneImagePicker";

import sluggit from "slug";

interface PageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string | null;
}

export const PageSettingsModal = ({ isOpen, onClose, pageId }: PageSettingsModalProps) => {
  const { actions, query } = useEditor();
  const [pageName, setPageName] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [isHomePage, setIsHomePage] = useState(false);
  const [is404Page, setIs404Page] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<"basic" | "seo" | "advanced">("basic");
  const [ogExpanded, setOgExpanded] = useState(false);
  const [twitterExpanded, setTwitterExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // SEO Fields
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [pageKeywords, setPageKeywords] = useState("");
  const [pageAuthor, setPageAuthor] = useState("");
  const [pageImage, setPageImage] = useState("");

  // Open Graph
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [ogType, setOgType] = useState("website");

  // Twitter
  const [twitterCard, setTwitterCard] = useState("summary_large_image");
  const [twitterSite, setTwitterSite] = useState("");
  const [twitterCreator, setTwitterCreator] = useState("");

  // Advanced
  const [canonicalUrl, setCanonicalUrl] = useState("");

  useEffect(() => {
    if (isOpen && pageId) {
      try {
        const node = query.node(pageId).get();
        if (node) {
          const props = node.data.props;
          const custom = node.data.custom;

          setPageName(custom?.displayName || "Untitled Page");
          setIsHomePage(props.isHomePage || false);
          setIs404Page(props.is404Page || false);

          // Generate slug from display name
          const generatedSlug = sluggit(custom?.displayName || "untitled-page", "-");
          setPageSlug(generatedSlug);
          setAutoSlug(true);

          // SEO
          setPageTitle(props.pageTitle || "");
          setPageDescription(props.pageDescription || "");
          setPageKeywords(props.pageKeywords || "");
          setPageAuthor(props.pageAuthor || "");
          setPageImage(props.pageImage || "");

          // Open Graph
          setOgTitle(props.ogTitle || "");
          setOgDescription(props.ogDescription || "");
          setOgImage(props.ogImage || "");
          setOgType(props.ogType || "website");

          // Twitter
          setTwitterCard(props.twitterCard || "summary_large_image");
          setTwitterSite(props.twitterSite || "");
          setTwitterCreator(props.twitterCreator || "");

          // Advanced
          setCanonicalUrl(props.canonicalUrl || "");
        }
      } catch (e) {
        console.error("Error loading page settings:", e);
      }
    }
  }, [isOpen, pageId, query]);

  const handleSave = () => {
    if (!pageId) return;

    try {
      // Update display name
      actions.setCustom(pageId, custom => {
        custom.displayName = pageName;
      });

      // Update all props
      actions.setProp(pageId, props => {
        props.isHomePage = isHomePage;
        props.is404Page = is404Page;

        // SEO
        props.pageTitle = pageTitle;
        props.pageDescription = pageDescription;
        props.pageKeywords = pageKeywords;
        props.pageAuthor = pageAuthor;
        props.pageImage = pageImage;

        // Open Graph
        props.ogTitle = ogTitle;
        props.ogDescription = ogDescription;
        props.ogImage = ogImage;
        props.ogType = ogType;

        // Twitter
        props.twitterCard = twitterCard;
        props.twitterSite = twitterSite;
        props.twitterCreator = twitterCreator;

        // Advanced
        props.canonicalUrl = canonicalUrl;
      });

      onClose();
    } catch (e) {
      console.error("Error saving page settings:", e);
    }
  };

  const handlePageNameChange = (newName: string) => {
    setPageName(newName);

    // Auto-generate slug if enabled
    if (autoSlug) {
      const generatedSlug = sluggit(newName || "untitled-page", "-");
      setPageSlug(generatedSlug);
    }
  };

  const handleSlugChange = (newSlug: string) => {
    setPageSlug(newSlug);
    setAutoSlug(false); // Disable auto-slug once user manually edits
  };

  const handleDeletePage = () => {
    if (!pageId) return;

    try {
      // Delete the page node
      actions.delete(pageId);
      onClose();
    } catch (e) {
      console.error("Error deleting page:", e);
    }
  };

  if (!isOpen || !pageId) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-9997 bg-background/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-9998 mx-auto my-10 max-h-[750px] w-[calc(100%-80px)] max-w-3xl overflow-hidden rounded-xl border border-border bg-background shadow-xl"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-accent px-4 py-3 text-accent-foreground">
            <h2 className="text-2xl font-bold text-foreground">Page Settings</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-2xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <TbX />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border bg-muted">
            <button
              onClick={() => setActiveTab("basic")}
              className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "basic"
                  ? "border-b-2 border-primary bg-background text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setActiveTab("seo")}
              className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "seo"
                  ? "border-b-2 border-primary bg-background text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              SEO
            </button>
            <button
              onClick={() => setActiveTab("advanced")}
              className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "advanced"
                  ? "border-b-2 border-primary bg-background text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Advanced
            </button>
          </div>

          {/* Content */}
          <div className="scrollbar flex-1 space-y-4 overflow-y-auto bg-background p-6 text-foreground">
            {/* Basic Tab */}
            {activeTab === "basic" && (
              <div className="space-y-6">
                {/* Page Name & URL - Same Line */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Page Name
                    </label>
                    <input
                      type="text"
                      value={pageName}
                      onChange={e => handlePageNameChange(e.target.value)}
                      className="w-full rounded-lg border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Enter page name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      URL Slug
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/</span>
                      <input
                        type="text"
                        value={isHomePage ? "" : pageSlug}
                        onChange={e => handleSlugChange(e.target.value)}
                        disabled={isHomePage}
                        className="flex-1 rounded-lg border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
                        placeholder={isHomePage ? "home" : "page-url"}
                      />
                    </div>
                  </div>
                </div>

                {/* Page Image */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Page Image
                  </label>
                  <StandaloneImagePicker
                    value={pageImage}
                    onChange={setPageImage}
                    label="Upload Image"
                    help="Featured image for this page"
                  />
                </div>

                <div className="flex gap-2">
                  {/* Home Page Toggle */}
                  <div className="flex w-full items-center justify-between rounded-lg border border-border bg-muted p-4">
                    <div>
                      <div className="text-sm font-medium text-foreground">Home Page</div>
                      <div className="mt-1 text-xs text-muted-foreground">Set as root URL (/)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsHomePage(!isHomePage)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        isHomePage ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block size-4 rounded-full bg-background transition-transform ${
                          isHomePage ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* 404 Page Toggle */}
                  <div className="flex w-full items-center justify-between rounded-lg border border-border bg-muted p-4">
                    <div>
                      <div className="text-sm font-medium text-foreground">404 Page</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Show when route not found
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIs404Page(!is404Page)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        is404Page ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block size-4 rounded-full bg-background transition-transform ${
                          is404Page ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Delete Page Section */}
                <div className="border-t border-border pt-6">
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Once you delete a page, there is no going back.
                      </p>
                    </div>

                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 rounded-lg border border-destructive px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <TbTrash className="size-4" />
                        Delete Page
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Are you sure you want to delete &ldquo;{pageName}&rdquo;? This action
                          cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDeletePage}
                            className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
                          >
                            Yes, Delete Page
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === "seo" && (
              <div className="space-y-6">
                {/* Basic SEO */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Meta Title
                    </label>
                    <textarea
                      value={pageTitle}
                      onChange={e => setPageTitle(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Page title (50-60 characters)"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      Meta Description
                    </label>
                    <textarea
                      value={pageDescription}
                      onChange={e => setPageDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Meta description (150-160 characters)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Keywords
                      </label>
                      <input
                        type="text"
                        value={pageKeywords}
                        onChange={e => setPageKeywords(e.target.value)}
                        className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="keyword1, keyword2"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Author
                      </label>
                      <input
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
                      <span className="text-sm font-medium text-foreground">
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
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          OG Title
                        </label>
                        <input
                          type="text"
                          value={ogTitle}
                          onChange={e => setOgTitle(e.target.value)}
                          className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Leave empty to use page title"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          OG Description
                        </label>
                        <textarea
                          value={ogDescription}
                          onChange={e => setOgDescription(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Leave empty to use page description"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          OG Image
                        </label>
                        <StandaloneImagePicker
                          value={ogImage}
                          onChange={setOgImage}
                          label="Upload OG Image"
                          help="Recommended: 1200x630px"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          OG Type
                        </label>
                        <select
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
                      <span className="text-sm font-medium text-foreground">Twitter/X Card</span>
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
                        <label className="mb-2 block text-sm font-medium text-foreground">
                          Card Type
                        </label>
                        <select
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
                          <label className="mb-2 block text-sm font-medium text-foreground">
                            Site
                          </label>
                          <input
                            type="text"
                            value={twitterSite}
                            onChange={e => setTwitterSite(e.target.value)}
                            className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="@yourusername"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">
                            Creator
                          </label>
                          <input
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
            )}

            {/* Advanced Tab */}
            {activeTab === "advanced" && (
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Canonical URL
                  </label>
                  <input
                    type="text"
                    value={canonicalUrl}
                    onChange={e => setCanonicalUrl(e.target.value)}
                    className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Leave empty for auto-generated"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Specify a canonical URL to prevent duplicate content issues
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-border bg-muted p-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2 font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary"
            >
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
