/**
 * "New animation" / "Edit" buttons under the animation picker, plus the
 * lazy-loaded `SiteAnimationEditorPanel` they open. Creating an animation
 * also selects it on the current node (one undo step).
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useRef, useState } from "react";
import { TbPencil, TbPlus } from "react-icons/tb";
import type { SiteAnimation } from "@/utils/animations/siteAnimations";
import { SideBarAtom } from "@/utils/atoms";
import type { useSiteAnimations } from "./useSiteAnimations";

const SiteAnimationEditorPanel = lazy(() => import("./SiteAnimationEditorPanel"));

const EDITOR_WIDTH = 360;

const BUTTON_CLASS =
  "bg-base-200 text-base-content hover:bg-base-300 flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors";

type EditorState = { mode: "new" } | { mode: "edit"; anim: SiteAnimation };

interface Props {
  site: ReturnType<typeof useSiteAnimations>;
  /** The selected site animation, when the node uses one that exists. */
  editing?: SiteAnimation;
}

export function SiteAnimationActions({ site, editing }: Props) {
  const { id: nodeId } = useNode();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const sidebarLeft = useAtomValue(SideBarAtom);

  const computePosition = () => {
    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - EDITOR_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const initial = editor?.mode === "edit" ? editor.anim : null;

  return (
    <>
      <div ref={rowRef} className="mt-1.5 mb-2 flex gap-1.5">
        <button type="button" onClick={() => setEditor({ mode: "new" })} className={BUTTON_CLASS}>
          <TbPlus className="size-3.5" aria-hidden />
          New animation
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => setEditor({ mode: "edit", anim: editing })}
            className={BUTTON_CLASS}
          >
            <TbPencil className="size-3.5" aria-hidden />
            <span className="truncate">Edit “{editing.label}”</span>
          </button>
        )}
      </div>

      {editor && (
        <Suspense fallback={null}>
          <SiteAnimationEditorPanel
            key={initial?.key ?? "new"}
            initial={initial}
            existingKeys={site.animations.map(a => a.key)}
            usageCount={initial ? site.nodesUsing(initial.key).length : 0}
            initialPosition={computePosition()}
            onClose={() => setEditor(null)}
            onSave={anim => {
              site.save(anim, initial ? undefined : nodeId);
              setEditor(null);
            }}
            onDelete={
              initial
                ? () => {
                    site.remove(initial.key);
                    setEditor(null);
                  }
                : undefined
            }
          />
        </Suspense>
      )}
    </>
  );
}
