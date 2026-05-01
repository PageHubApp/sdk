import React from "react";
import { TbArrowLeft } from "react-icons/tb";
import { AutoHideScrollbar } from "../../../primitives/layout/AutoHideScrollbar";
import { CustomSectionsGrid } from "./CustomSectionsGrid";

export type MyBlockSection = {
  id: string;
  name: string;
  isCustom?: boolean;
  rootNodeId: string;
};

type MyBlocksCategoryViewProps = {
  sections: MyBlockSection[];
  onBack: () => void;
};

/**
 * Drill-in for user-saved blocks (`cat=ph-workspace-blocks`). Reuses the same grid as the old
 * “My Blocks” strip; header matches `CategoryDetailView` back row.
 */
export function MyBlocksCategoryView({ sections, onBack }: MyBlocksCategoryViewProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-base-300 flex items-center gap-2 border-b px-3 py-4">
        <button
          type="button"
          onClick={onBack}
          className="hover:bg-neutral cursor-pointer rounded-md p-1 transition-colors"
          aria-label="Back to categories"
        >
          <TbArrowLeft className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="text-sm font-medium">My blocks</div>
          <span className="text-neutral-content text-xs">{sections.length}</span>
        </div>
      </div>

      <AutoHideScrollbar className="flex-1">
        <div className="p-3 pt-1">
          {sections.length > 0 ? (
            <CustomSectionsGrid sections={sections} />
          ) : (
            <div className="flex min-h-[8rem] items-center justify-center">
              <p className="text-neutral-content text-sm">No saved blocks yet.</p>
            </div>
          )}
        </div>
        <div className="shrink-0" style={{ minHeight: "40vh" }} />
      </AutoHideScrollbar>
    </div>
  );
}
