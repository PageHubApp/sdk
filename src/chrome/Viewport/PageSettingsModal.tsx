import { ROOT_NODE, useEditor } from "@craftjs/core";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { TbX } from "react-icons/tb";

import sluggit from "slug";
import { useSDK } from "../../context";
import { BasicTab } from "./PageSettings/BasicTab";
import { SEOTab } from "./PageSettings/SEOTab";
import { AdvancedTab } from "./PageSettings/AdvancedTab";

interface PageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string | null;
}

export function PageSettingsModal({ isOpen, onClose, pageId }: PageSettingsModalProps) {
  const { actions, query } = useEditor();
  const { features } = useSDK();
  const allowCustom404Page = !!features.custom404Page;
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
  const [headCode, setHeadCode] = useState("");
  const [bodyClass, setBodyClass] = useState("");
  const [jsonLd, setJsonLd] = useState("");
  const [pagePassword, setPagePassword] = useState("");
  const [themeOverrides, setThemeOverrides] = useState<Array<{ varName: string; value: string }>>(
    []
  );

  useEffect(() => {
    if (isOpen && pageId) {
      try {
        const node = query.node(pageId).get();
        if (node) {
          const props = node.data.props;
          const custom = node.data.custom;

          setPageName(custom?.displayName || "Untitled Page");
          setIsHomePage(props.isHomePage || false);
          setIs404Page(allowCustom404Page ? !!props.is404Page : false);

          const generatedSlug = sluggit(custom?.displayName || "untitled-page", "-");
          setPageSlug(generatedSlug);
          setAutoSlug(true);

          setPageTitle(props.pageTitle || "");
          setPageDescription(props.pageDescription || "");
          setPageKeywords(props.pageKeywords || "");
          setPageAuthor(props.pageAuthor || "");
          setPageImage(props.pageImage || "");

          setOgTitle(props.ogTitle || "");
          setOgDescription(props.ogDescription || "");
          setOgImage(props.ogImage || "");
          setOgType(props.ogType || "website");

          setTwitterCard(props.twitterCard || "summary_large_image");
          setTwitterSite(props.twitterSite || "");
          setTwitterCreator(props.twitterCreator || "");

          setCanonicalUrl(props.canonicalUrl || "");
          setHeadCode(props.headCode || "");
          setBodyClass(props.bodyClass || "");
          setJsonLd(props.jsonLd || "");
          setPagePassword(props.pagePassword || "");
          setThemeOverrides(props.themeOverrides || []);
        }
      } catch (e) {
        console.error("Error loading page settings:", e);
      }
    }
  }, [isOpen, pageId, query, allowCustom404Page]);

  const handleSave = () => {
    if (!pageId) return;

    try {
      const effective404 = allowCustom404Page && is404Page;

      if (effective404) {
        try {
          const root = query.node(ROOT_NODE).get();
          for (const id of root?.data?.nodes || []) {
            if (id === pageId) continue;
            const child = query.node(id).get();
            if (child?.data?.props?.type === "page" && child?.data?.props?.is404Page) {
              actions.setProp(id, p => {
                p.is404Page = false;
              });
            }
          }
        } catch (e) {
          console.error("Error clearing other 404 pages:", e);
        }
      }

      actions.setCustom(pageId, custom => {
        custom.displayName = pageName;
      });

      actions.setProp(pageId, props => {
        props.isHomePage = isHomePage;
        props.is404Page = effective404;

        props.pageTitle = pageTitle;
        props.pageDescription = pageDescription;
        props.pageKeywords = pageKeywords;
        props.pageAuthor = pageAuthor;
        props.pageImage = pageImage;

        props.ogTitle = ogTitle;
        props.ogDescription = ogDescription;
        props.ogImage = ogImage;
        props.ogType = ogType;

        props.twitterCard = twitterCard;
        props.twitterSite = twitterSite;
        props.twitterCreator = twitterCreator;

        props.canonicalUrl = canonicalUrl;
        props.headCode = headCode;
        props.bodyClass = bodyClass;
        props.jsonLd = jsonLd;
        props.pagePassword = pagePassword;
        props.themeOverrides = themeOverrides;
      });

      onClose();
    } catch (e) {
      console.error("Error saving page settings:", e);
    }
  };

  const handlePageNameChange = (newName: string) => {
    setPageName(newName);
    if (autoSlug) {
      const generatedSlug = sluggit(newName || "untitled-page", "-");
      setPageSlug(generatedSlug);
    }
  };

  const handleSlugChange = (newSlug: string) => {
    setPageSlug(newSlug);
    setAutoSlug(false);
  };

  const handleDeletePage = () => {
    if (!pageId) return;
    try {
      actions.delete(pageId);
      onClose();
    } catch (e) {
      console.error("Error deleting page:", e);
    }
  };

  if (!isOpen || !pageId) return null;

  const tabClass = (tab: string) =>
    `flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
      activeTab === tab
        ? "border-b-2 border-primary bg-base-100 text-primary"
        : "text-neutral-content hover:text-base-content"
    }`;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div className="pagehub-sdk-root ph-modal-backdrop z-9997" onClick={onClose} />

      {/* Modal */}
      <div className="pagehub-sdk-root ph-modal-surface fixed inset-0 z-9998 mx-auto my-10 max-h-[750px] w-[calc(100%-80px)] max-w-3xl overflow-hidden rounded-xl!">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-base-300 bg-accent text-accent-content flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base-content text-2xl font-bold">Page Settings</h2>
            <button
              onClick={onClose}
              className="text-neutral-content hover:bg-neutral hover:text-base-content rounded-lg p-2 text-2xl"
            >
              <TbX />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-base-300 bg-neutral flex border-b">
            <button onClick={() => setActiveTab("basic")} className={tabClass("basic")}>
              Basic
            </button>
            <button onClick={() => setActiveTab("seo")} className={tabClass("seo")}>
              SEO
            </button>
            <button onClick={() => setActiveTab("advanced")} className={tabClass("advanced")}>
              Advanced
            </button>
          </div>

          {/* Content */}
          <div className="scrollbar-light bg-base-100 text-base-content flex-1 space-y-4 overflow-y-auto p-6">
            {activeTab === "basic" && (
              <BasicTab
                pageName={pageName}
                onPageNameChange={handlePageNameChange}
                pageSlug={pageSlug}
                onSlugChange={handleSlugChange}
                isHomePage={isHomePage}
                setIsHomePage={setIsHomePage}
                is404Page={is404Page}
                setIs404Page={setIs404Page}
                allowCustom404Page={allowCustom404Page}
                pageImage={pageImage}
                setPageImage={setPageImage}
                showDeleteConfirm={showDeleteConfirm}
                setShowDeleteConfirm={setShowDeleteConfirm}
                onDeletePage={handleDeletePage}
              />
            )}

            {activeTab === "seo" && (
              <SEOTab
                pageTitle={pageTitle}
                setPageTitle={setPageTitle}
                pageDescription={pageDescription}
                setPageDescription={setPageDescription}
                pageKeywords={pageKeywords}
                setPageKeywords={setPageKeywords}
                pageAuthor={pageAuthor}
                setPageAuthor={setPageAuthor}
                ogExpanded={ogExpanded}
                setOgExpanded={setOgExpanded}
                ogTitle={ogTitle}
                setOgTitle={setOgTitle}
                ogDescription={ogDescription}
                setOgDescription={setOgDescription}
                ogImage={ogImage}
                setOgImage={setOgImage}
                ogType={ogType}
                setOgType={setOgType}
                twitterExpanded={twitterExpanded}
                setTwitterExpanded={setTwitterExpanded}
                twitterCard={twitterCard}
                setTwitterCard={setTwitterCard}
                twitterSite={twitterSite}
                setTwitterSite={setTwitterSite}
                twitterCreator={twitterCreator}
                setTwitterCreator={setTwitterCreator}
              />
            )}

            {activeTab === "advanced" && (
              <AdvancedTab
                canonicalUrl={canonicalUrl}
                setCanonicalUrl={setCanonicalUrl}
                headCode={headCode}
                setHeadCode={setHeadCode}
                bodyClass={bodyClass}
                setBodyClass={setBodyClass}
                jsonLd={jsonLd}
                setJsonLd={setJsonLd}
                pagePassword={pagePassword}
                setPagePassword={setPagePassword}
                themeOverrides={themeOverrides}
                setThemeOverrides={setThemeOverrides}
              />
            )}
          </div>

          {/* Footer */}
          <div className="border-base-300 bg-neutral flex gap-3 border-t p-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="btn btn-primary flex-1">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
