import React from "react";
import { TbChevronDown } from "react-icons/tb";
import { StandaloneImagePicker } from "../StandaloneImagePicker";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsCollapsibleShellClass,
  settingsCollapsibleTriggerClass,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";
import {
  settingsModalSelectClass,
  settingsMultilineInputClass,
} from "../settings/settingsControlClasses";

interface SEOTabProps {
  inputClass: string;
  selectClass: string;
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
  inputClass,
  selectClass,
  pageTitle,
  setPageTitle,
  pageDescription,
  setPageDescription,
  pageKeywords,
  setPageKeywords,
  pageAuthor,
  setPageAuthor,
  ogExpanded,
  setOgExpanded,
  ogTitle,
  setOgTitle,
  ogDescription,
  setOgDescription,
  ogImage,
  setOgImage,
  ogType,
  setOgType,
  twitterExpanded,
  setTwitterExpanded,
  twitterCard,
  setTwitterCard,
  twitterSite,
  setTwitterSite,
  twitterCreator,
  setTwitterCreator,
}: SEOTabProps) {
  const multiline = settingsMultilineInputClass(inputClass);
  const selectField = settingsModalSelectClass(selectClass);

  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="SEO"
        description="Defaults for search and sharing. Open Graph and Twitter blocks override meta fields when expanded and filled."
      />

      <SettingsFormCard title="Search">
        <SettingsFormField
          label="Meta title"
          htmlFor="meta-title"
          hint="Roughly 50–60 characters works well in results."
        >
          <textarea
            id="meta-title"
            value={pageTitle}
            onChange={e => setPageTitle(e.target.value)}
            rows={2}
            className={multiline}
            placeholder="Page title"
          />
        </SettingsFormField>

        <SettingsFormField
          label="Meta description"
          htmlFor="meta-description"
          hint="Roughly 150–160 characters for snippets."
        >
          <textarea
            id="meta-description"
            value={pageDescription}
            onChange={e => setPageDescription(e.target.value)}
            rows={3}
            className={multiline}
            placeholder="Meta description"
          />
        </SettingsFormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsFormField label="Keywords" htmlFor="page-keywords">
            <input
              id="page-keywords"
              type="text"
              value={pageKeywords}
              onChange={e => setPageKeywords(e.target.value)}
              className={inputClass}
              placeholder="keyword1, keyword2"
            />
          </SettingsFormField>
          <SettingsFormField label="Author" htmlFor="page-author">
            <input
              id="page-author"
              type="text"
              value={pageAuthor}
              onChange={e => setPageAuthor(e.target.value)}
              className={inputClass}
              placeholder="Author name"
            />
          </SettingsFormField>
        </div>
      </SettingsFormCard>

      <div className={settingsCollapsibleShellClass}>
        <button
          type="button"
          onClick={() => setOgExpanded(!ogExpanded)}
          className={settingsCollapsibleTriggerClass}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base-content text-sm font-semibold">Open Graph</span>
            <span className="bg-base-300/60 text-neutral-content rounded-full px-2 py-0.5 text-xs font-medium">
              Optional
            </span>
          </div>
          <TbChevronDown
            className={`text-neutral-content size-5 shrink-0 transition-transform ${ogExpanded ? "rotate-180" : ""}`}
          />
        </button>

        {ogExpanded ? (
          <div className="border-base-300 bg-base-100 space-y-4 border-t p-5">
            <SettingsFormField
              label="OG title"
              htmlFor="og-title"
              hint="Leave empty to reuse meta title."
            >
              <input
                id="og-title"
                type="text"
                value={ogTitle}
                onChange={e => setOgTitle(e.target.value)}
                className={inputClass}
                placeholder="Social title"
              />
            </SettingsFormField>

            <SettingsFormField label="OG description" htmlFor="og-description">
              <textarea
                id="og-description"
                value={ogDescription}
                onChange={e => setOgDescription(e.target.value)}
                rows={2}
                className={multiline}
                placeholder="Leave empty to reuse meta description"
              />
            </SettingsFormField>

            <SettingsFormField label="OG image">
              <StandaloneImagePicker
                value={ogImage}
                onChange={setOgImage}
                label="Upload OG image"
                help="Recommended 1200×630px."
              />
            </SettingsFormField>

            <SettingsFormField label="OG type" htmlFor="og-type">
              <select
                id="og-type"
                value={ogType}
                onChange={e => setOgType(e.target.value)}
                className={selectField}
              >
                <option value="website">Website</option>
                <option value="article">Article</option>
                <option value="product">Product</option>
                <option value="profile">Profile</option>
              </select>
            </SettingsFormField>
          </div>
        ) : null}
      </div>

      <div className={settingsCollapsibleShellClass}>
        <button
          type="button"
          onClick={() => setTwitterExpanded(!twitterExpanded)}
          className={settingsCollapsibleTriggerClass}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base-content text-sm font-semibold">Twitter / X card</span>
            <span className="bg-base-300/60 text-neutral-content rounded-full px-2 py-0.5 text-xs font-medium">
              Optional
            </span>
          </div>
          <TbChevronDown
            className={`text-neutral-content size-5 shrink-0 transition-transform ${
              twitterExpanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {twitterExpanded ? (
          <div className="border-base-300 bg-base-100 space-y-4 border-t p-5">
            <SettingsFormField label="Card type" htmlFor="twitter-card">
              <select
                id="twitter-card"
                value={twitterCard}
                onChange={e => setTwitterCard(e.target.value)}
                className={selectField}
              >
                <option value="summary_large_image">Summary large image</option>
                <option value="summary">Summary</option>
              </select>
            </SettingsFormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsFormField label="Site" htmlFor="twitter-site">
                <input
                  id="twitter-site"
                  type="text"
                  value={twitterSite}
                  onChange={e => setTwitterSite(e.target.value)}
                  className={inputClass}
                  placeholder="@yourusername"
                />
              </SettingsFormField>
              <SettingsFormField label="Creator" htmlFor="twitter-creator">
                <input
                  id="twitter-creator"
                  type="text"
                  value={twitterCreator}
                  onChange={e => setTwitterCreator(e.target.value)}
                  className={inputClass}
                  placeholder="@authorusername"
                />
              </SettingsFormField>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
