import React from "react";
import Link from "next/link";
import { TbTrash } from "react-icons/tb";
import { StandaloneImagePicker } from "../StandaloneImagePicker";

interface BasicTabProps {
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

export function BasicTab({
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
    <div className="space-y-6">
      {/* Page Name & URL - Same Line */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="page-name" className="toolbar-label mb-2 block font-medium">
            Page Name
          </label>
          <input
            id="page-name"
            type="text"
            value={pageName}
            onChange={e => onPageNameChange(e.target.value)}
            className="border-base-300 focus:ring-ring w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
            placeholder="Enter page name"
          />
        </div>

        <div>
          <label htmlFor="page-slug" className="toolbar-label mb-2 block font-medium">
            URL Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-neutral-content text-sm">/</span>
            <input
              id="page-slug"
              type="text"
              value={isHomePage ? "" : pageSlug}
              onChange={e => onSlugChange(e.target.value)}
              disabled={isHomePage}
              className="border-base-300 focus:ring-primary disabled:bg-neutral disabled:text-neutral-content flex-1 rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none"
              placeholder={isHomePage ? "home" : "page-url"}
            />
          </div>
        </div>
      </div>

      {/* Page Image */}
      <div>
        <p className="toolbar-label mb-2 block font-medium">Page Image</p>
        <StandaloneImagePicker
          value={pageImage}
          onChange={setPageImage}
          label="Upload Image"
          help="Featured image for this page"
        />
      </div>

      <div className="flex gap-2">
        {/* Home Page Toggle */}
        <div className="border-base-300 bg-neutral flex w-full items-center justify-between rounded-lg border p-4">
          <div>
            <div className="toolbar-label font-medium">Home Page</div>
            <div className="text-neutral-content mt-1 text-xs">Set as root URL (/)</div>
          </div>
          <button
            type="button"
            onClick={() => setIsHomePage(!isHomePage)}
            className={`focus:ring-ring relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
              isHomePage ? "bg-primary" : "bg-neutral"
            }`}
          >
            <span
              className={`bg-base-100 inline-block size-4 rounded-full transition-transform ${
                isHomePage ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* 404 Page — paid */}
        <div
          className={`border-base-300 bg-neutral flex w-full flex-col justify-between rounded-lg border p-4 ${
            !allowCustom404Page ? "opacity-80" : ""
          }`}
        >
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              <div className="toolbar-label font-medium">404 Page</div>
              <div className="text-neutral-content mt-1 text-xs">
                {allowCustom404Page
                  ? "Show this page when the URL does not match any page"
                  : "Available on paid plans — custom page for broken or unknown links"}
              </div>
            </div>
            {allowCustom404Page ? (
              <button
                type="button"
                onClick={() => setIs404Page(!is404Page)}
                className={`focus:ring-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
                  is404Page ? "bg-primary" : "bg-neutral"
                }`}
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
            <Link href="/pricing" className="text-primary mt-3 text-sm font-medium hover:underline">
              View plans
            </Link>
          ) : null}
        </div>
      </div>

      {/* Delete Page Section */}
      <div className="border-base-300 border-t pt-6">
        <div className="border-error/20 bg-error/5 rounded-lg border p-4">
          <div className="mb-3">
            <h3 className="text-error text-sm font-medium">Danger Zone</h3>
            <p className="text-neutral-content mt-1 text-xs">
              Once you delete a page, there is no going back.
            </p>
          </div>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="border-error text-error hover:bg-error hover:text-error-content flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
            >
              <TbTrash className="size-4" />
              Delete Page
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-neutral-content text-sm">
                Are you sure you want to delete &ldquo;{pageName}&rdquo;? This action cannot be
                undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="border-base-300 text-base-content hover:bg-neutral rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDeletePage}
                  className="bg-error text-error-content hover:bg-error/90 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  Yes, Delete Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
