// ── Built-in page-settings tab descriptors ──────────────────────────────────

import { useMemo } from "react";
import sluggit from "slug";
import {
  TbAdjustments,
  TbBrandTwitter,
  TbCode,
  TbJson,
  TbLock,
  TbPaint,
  TbPhoto,
  TbSearch,
  TbSettings,
} from "react-icons/tb";
import { listPageNodeIds } from "../../../../utils/page/pageManagement";
import { AccessTab } from "./AccessTab";
import { AdvancedTab } from "./AdvancedTab";
import { BasicTab } from "./BasicTab";
import { HeadCodeTab } from "./HeadCodeTab";
import { OpenGraphTab } from "./OpenGraphTab";
import { SchemaTab } from "./SchemaTab";
import { SEOTab } from "./SEOTab";
import { ThemeOverridesTab } from "./ThemeOverridesTab";
import { TwitterCardTab } from "./TwitterCardTab";
import { type SettingsTabDefinition } from "../settings/types";
import type { PageSettingsDraft, PageSettingsTabContext } from "./types";

interface UseBuiltInTabsParams {
  actions: any;
  query: any;
  autoSlug: boolean;
  pageSlug: string;
  setPageSlug: (slug: string) => void;
  setAutoSlug: (auto: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  onClose: () => void;
}

/**
 * The 9 built-in tab descriptors for the page-settings modal. Mostly mechanical
 * "pass draft.X + updateField" plumbing into the extracted Tab bodies; the
 * `basic` tab owns the delete handler + slug/autoSlug closures, and `access`
 * computes its `pages` list via `listPageNodeIds(query)` inside `render` (kept
 * there so it reflects current tree state on each open — do NOT lift to a memo).
 */
export function useBuiltInTabs({
  actions,
  query,
  autoSlug,
  pageSlug,
  setPageSlug,
  setAutoSlug,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onClose,
}: UseBuiltInTabsParams): Array<SettingsTabDefinition<PageSettingsDraft, PageSettingsTabContext>> {
  return useMemo<Array<SettingsTabDefinition<PageSettingsDraft, PageSettingsTabContext>>>(
    () => [
      {
        key: "basic",
        label: "Basic",
        order: 100,
        icon: <TbSettings />,
        render: ctx => (
          <BasicTab
            inputClass={ctx.inputClass}
            pageName={ctx.draft.pageName}
            onPageNameChange={newName => {
              ctx.updateField("pageName", newName);
              if (autoSlug) {
                const slug = sluggit(newName || "untitled-page", "-");
                setPageSlug(slug);
                ctx.updateField("pageSlug", "");
              }
            }}
            pageSlug={pageSlug}
            onSlugChange={newSlug => {
              setPageSlug(newSlug);
              setAutoSlug(false);
              ctx.updateField("pageSlug", newSlug);
            }}
            isHomePage={ctx.draft.isHomePage}
            setIsHomePage={value => ctx.updateField("isHomePage", value)}
            is404Page={ctx.draft.is404Page}
            setIs404Page={value => ctx.updateField("is404Page", value)}
            allowCustom404Page={ctx.allowCustom404Page}
            pageImage={ctx.draft.pageImage}
            setPageImage={value => ctx.updateField("pageImage", value)}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            onDeletePage={() => {
              if (!ctx.pageId) return;
              try {
                actions.delete(ctx.pageId);
              } catch {
                /* not in tree */
              }
              window.dispatchEvent(
                new CustomEvent("pagehub:page-deleted", { detail: { pageId: ctx.pageId } })
              );
              onClose();
            }}
          />
        ),
      },
      {
        key: "seo",
        label: "SEO",
        order: 200,
        icon: <TbSearch />,
        render: ctx => (
          <SEOTab
            inputClass={ctx.inputClass}
            pageTitle={ctx.draft.pageTitle}
            setPageTitle={value => ctx.updateField("pageTitle", value)}
            pageDescription={ctx.draft.pageDescription}
            setPageDescription={value => ctx.updateField("pageDescription", value)}
            pageKeywords={ctx.draft.pageKeywords}
            setPageKeywords={value => ctx.updateField("pageKeywords", value)}
            pageAuthor={ctx.draft.pageAuthor}
            setPageAuthor={value => ctx.updateField("pageAuthor", value)}
          />
        ),
      },
      {
        key: "open-graph",
        label: "Open Graph",
        order: 210,
        icon: <TbPhoto />,
        render: ctx => (
          <OpenGraphTab
            inputClass={ctx.inputClass}
            selectClass={ctx.selectClass}
            ogTitle={ctx.draft.ogTitle}
            setOgTitle={value => ctx.updateField("ogTitle", value)}
            ogDescription={ctx.draft.ogDescription}
            setOgDescription={value => ctx.updateField("ogDescription", value)}
            ogImage={ctx.draft.ogImage}
            setOgImage={value => ctx.updateField("ogImage", value)}
            ogType={ctx.draft.ogType}
            setOgType={value => ctx.updateField("ogType", value)}
          />
        ),
      },
      {
        key: "twitter",
        label: "Twitter / X",
        order: 220,
        icon: <TbBrandTwitter />,
        render: ctx => (
          <TwitterCardTab
            inputClass={ctx.inputClass}
            selectClass={ctx.selectClass}
            twitterCard={ctx.draft.twitterCard}
            setTwitterCard={value => ctx.updateField("twitterCard", value)}
            twitterSite={ctx.draft.twitterSite}
            setTwitterSite={value => ctx.updateField("twitterSite", value)}
            twitterCreator={ctx.draft.twitterCreator}
            setTwitterCreator={value => ctx.updateField("twitterCreator", value)}
          />
        ),
      },
      {
        key: "advanced",
        label: "Advanced",
        order: 300,
        icon: <TbAdjustments />,
        render: ctx => (
          <AdvancedTab
            inputClass={ctx.inputClass}
            canonicalUrl={ctx.draft.canonicalUrl}
            setCanonicalUrl={value => ctx.updateField("canonicalUrl", value)}
            bodyClass={ctx.draft.bodyClass}
            setBodyClass={value => ctx.updateField("bodyClass", value)}
            pagePassword={ctx.draft.pagePassword}
            setPagePassword={value => ctx.updateField("pagePassword", value)}
            hideHeader={!!ctx.draft.hideHeader}
            setHideHeader={value => ctx.updateField("hideHeader", value)}
            hideFooter={!!ctx.draft.hideFooter}
            setHideFooter={value => ctx.updateField("hideFooter", value)}
            hideChrome={!!ctx.draft.hideChrome}
            setHideChrome={value => ctx.updateField("hideChrome", value)}
          />
        ),
      },
      {
        key: "head-code",
        label: "Custom code",
        order: 310,
        icon: <TbCode />,
        render: ctx => (
          <HeadCodeTab
            headCode={ctx.draft.headCode}
            setHeadCode={value => ctx.updateField("headCode", value)}
          />
        ),
      },
      {
        key: "schema",
        label: "Schema",
        order: 320,
        icon: <TbJson />,
        render: ctx => (
          <SchemaTab
            schema={Array.isArray(ctx.draft.schema) ? ctx.draft.schema : []}
            setSchema={value => ctx.updateField("schema", value)}
            inputClass={ctx.inputClass}
          />
        ),
      },
      {
        key: "theme",
        label: "Theme",
        order: 330,
        icon: <TbPaint />,
        render: ctx => (
          <ThemeOverridesTab
            inputClass={ctx.inputClass}
            themeOverrides={ctx.draft.themeOverrides}
            setThemeOverrides={value => ctx.updateField("themeOverrides", value)}
          />
        ),
      },
      {
        key: "access",
        label: "Access",
        order: 400,
        icon: <TbLock />,
        render: ctx => {
          const pageIds = listPageNodeIds(query);
          const pages = pageIds
            .filter(id => id !== ctx.pageId)
            .map(id => {
              const node = query.node(id).get();
              return { id, name: node?.data?.custom?.displayName || id };
            });
          return (
            <AccessTab
              inputClass={ctx.inputClass}
              selectClass={ctx.selectClass}
              conditionGroups={ctx.draft.conditionGroups || []}
              setConditionGroups={value => ctx.updateField("conditionGroups", value)}
              pageConditionFailAction={ctx.draft.pageConditionFailAction || ""}
              setPageConditionFailAction={value =>
                ctx.updateField("pageConditionFailAction", value)
              }
              pageConditionRedirectUrl={ctx.draft.pageConditionRedirectUrl || ""}
              setPageConditionRedirectUrl={value =>
                ctx.updateField("pageConditionRedirectUrl", value)
              }
              pageConditionFallbackPageId={ctx.draft.pageConditionFallbackPageId || ""}
              setPageConditionFallbackPageId={value =>
                ctx.updateField("pageConditionFallbackPageId", value)
              }
              pages={pages}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actions, autoSlug, onClose, pageSlug, showDeleteConfirm]
  );
}
