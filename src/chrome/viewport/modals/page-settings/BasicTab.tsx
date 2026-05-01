import React from "react";
import Link from "next/link";
import { TbTrash } from "react-icons/tb";
import { StandaloneImagePicker } from "../../pickers/StandaloneImagePicker";
import {
  SettingsFormCard,
  SettingsFormField,
  SettingsTabIntro,
  settingsTabRootClass,
} from "../settings/SettingsTabChrome";

interface BasicTabProps {
  inputClass: string;
  pageName: string;
  onPageNameChange: (name: string) => void;
  pageSlug: string;
  onSlugChange: (slug: string) => void;
  isHomePage: boolean;
  setIsHomePage: (v: boolean) => void;
  is404Page: boolean;
  setIs404Page: (v: boolean) => void;
  /** Paid feature: custom 404 canvas for unknown URLs */
  allowCustom404Page: boolean;
  pageImage: string;
  setPageImage: (v: string) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
  onDeletePage: () => void;
}

const disabledInput =
  "disabled:cursor-not-allowed disabled:border-base-300/50 disabled:bg-base-300/30 disabled:text-neutral-content/70";

export function BasicTab({
  inputClass,
  pageName,
  onPageNameChange,
  pageSlug,
  onSlugChange,
  isHomePage,
  setIsHomePage,
  is404Page,
  setIs404Page,
  allowCustom404Page,
  pageImage,
  setPageImage,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onDeletePage,
}: BasicTabProps) {
  return (
    <div className={settingsTabRootClass}>
      <SettingsTabIntro
        title="Page basics"
        description="Name, URL, featured image, and whether this canvas is your home or custom 404 page."
      />

      <SettingsFormCard title="Name and URL">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsFormField label="Page name" htmlFor="page-name">
            <input
              id="page-name"
              type="text"
              value={pageName}
              onChange={e => onPageNameChange(e.target.value)}
              className={inputClass}
              placeholder="Enter page name"
            />
          </SettingsFormField>
          <SettingsFormField
            label="URL slug"
            htmlFor="page-slug"
            hint={isHomePage ? "Home uses / — no slug." : "Path segment after your domain."}
          >
            <div className="flex items-center gap-2">
              <span className="text-neutral-content shrink-0 text-sm">/</span>
              <input
                id="page-slug"
                type="text"
                value={isHomePage ? "" : pageSlug}
                onChange={e => onSlugChange(e.target.value)}
                disabled={isHomePage}
                className={`${inputClass} min-w-0 flex-1 ${disabledInput}`}
                placeholder={isHomePage ? "home" : "page-url"}
              />
            </div>
          </SettingsFormField>
        </div>
      </SettingsFormCard>

      <SettingsFormCard title="Featured image">
        <StandaloneImagePicker
          value={pageImage}
          onChange={setPageImage}
          label="Upload image"
          help="Used as this page’s featured image where the theme expects one."
        />
      </SettingsFormCard>

      <SettingsFormCard title="Behavior">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-base-300 bg-base-200/20 flex flex-col justify-between gap-3 rounded-xl border p-4">
            <div>
              <p className="text-base-content text-sm font-semibold">Home page</p>
              <p className="text-neutral-content mt-1 text-xs">
                Serve this canvas at the site root (/).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsHomePage(!isHomePage)}
              className={`focus:ring-ring relative ml-auto inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                isHomePage ? "bg-primary" : "bg-base-300"
              }`}
              aria-pressed={isHomePage}
            >
              <span
                className={`bg-base-100 inline-block size-4 rounded-full transition-transform ${
                  isHomePage ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div
            className={`border-base-300 bg-base-200/20 flex flex-col justify-between gap-3 rounded-xl border p-4 ${
              !allowCustom404Page ? "opacity-85" : ""
            }`}
          >
            <div className="flex w-full items-start justify-between gap-3">
              <div>
                <p className="text-base-content text-sm font-semibold">404 page</p>
                <p className="text-neutral-content mt-1 text-xs">
                  {allowCustom404Page
                    ? "Show this page when no other URL matches."
                    : "Available on paid plans — custom page for unknown links."}
                </p>
              </div>
              {allowCustom404Page ? (
                <button
                  type="button"
                  onClick={() => setIs404Page(!is404Page)}
                  className={`focus:ring-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                    is404Page ? "bg-primary" : "bg-base-300"
                  }`}
                  aria-pressed={is404Page}
                >
                  <span
                    className={`bg-base-100 inline-block size-4 rounded-full transition-transform ${
                      is404Page ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              ) : null}
            </div>
            {!allowCustom404Page ? (
              <Link href="/pricing" className="text-primary text-sm font-medium hover:underline">
                View plans
              </Link>
            ) : null}
          </div>
        </div>
      </SettingsFormCard>

      <SettingsFormCard title="Danger zone" variant="card" className="border-error/25 bg-error/5">
        <p className="text-neutral-content text-sm">
          Deleting a page cannot be undone. Linked navigation and published URLs may break.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-outline btn-error btn-sm gap-2"
          >
            <TbTrash className="size-4" />
            Delete page
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-base-content text-sm">
              Delete &ldquo;{pageName}&rdquo;? This cannot be undone.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button type="button" onClick={onDeletePage} className="btn btn-error btn-sm">
                Yes, delete page
              </button>
            </div>
          </div>
        )}
      </SettingsFormCard>
    </div>
  );
}
