import React from "react";
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
            className="w-full rounded-lg border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter page name"
          />
        </div>

        <div>
          <label htmlFor="page-slug" className="toolbar-label mb-2 block font-medium">
            URL Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/</span>
            <input
              id="page-slug"
              type="text"
              value={isHomePage ? "" : pageSlug}
              onChange={e => onSlugChange(e.target.value)}
              disabled={isHomePage}
              className="flex-1 rounded-lg border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground"
              placeholder={isHomePage ? "home" : "page-url"}
            />
          </div>
        </div>
      </div>

      {/* Page Image */}
      <div>
        <p className="toolbar-label mb-2 block font-medium">
          Page Image
        </p>
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
            <div className="toolbar-label font-medium">Home Page</div>
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
            <div className="toolbar-label font-medium">404 Page</div>
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
                  onClick={onDeletePage}
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
  );
}
