/**
 * SiteAnimationEditorPanel — create / edit / delete one of the site's own
 * animations (`ROOT.props.theme.animations`). Edits a local draft; nothing
 * touches the theme until Save. The draft's CSS is injected into a dedicated
 * `<style>` while the panel is open so the preview tile plays unsaved changes.
 *
 * The key (`site:<key>` on nodes) is derived from the name on create and is
 * fixed afterwards, so renaming never breaks nodes that use it.
 */
import { useMemo, useState } from "react";
import { TbTrash } from "react-icons/tb";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { ToolbarDropdown } from "@/chrome/toolbar/ToolbarDropdown";
import { EASING_LABELS, EASING_MAP } from "@/utils/animations/animations";
import {
  SITE_ANIMATION_MAX_ITERATIONS,
  SITE_ANIMATION_PREFIX,
  SITE_ANIMATION_STARTERS,
  generateSiteAnimationCSS,
  validateSiteAnimation,
  type SiteAnimation,
  type SiteAnimationDirection,
  type SiteAnimationTrigger,
} from "@/utils/animations/siteAnimations";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";
import { FieldLabel, PANEL_INPUT_CLASS, SelectField } from "../PanelFields";
import { AnimationPreviewTile } from "./AnimationPreviewTile";
import { SiteAnimationDeleteConfirm } from "./SiteAnimationDeleteConfirm";
import { SiteAnimationKeyframeList } from "./SiteAnimationKeyframeList";
import {
  emptyDraft,
  friendlyAnimationError,
  fromDraft,
  slugifyAnimationKey,
  toDraft,
  type SiteAnimationDraft,
} from "./siteAnimationDraft";
import { useDraftPreviewCSS } from "./useDraftPreviewCSS";

const PREVIEW_KEY = "ph-draft-preview";
const CUSTOM_EASING = "__custom__";
const BLANK_STARTER = "__blank__";

const TRIGGER_OPTIONS = [
  ["scroll", "When scrolled into view"],
  ["load", "On page load"],
  ["continuous", "Continuous"],
];
const EASING_OPTIONS = [
  ...Object.keys(EASING_MAP).map(k => [k, EASING_LABELS[k] ?? k]),
  [CUSTOM_EASING, "Custom curve"],
];
const REPEAT_OPTIONS = [
  ["infinite", "Forever"],
  ["1", "Once"],
  ...Array.from({ length: SITE_ANIMATION_MAX_ITERATIONS - 1 }, (_, i) => [
    String(i + 2),
    `${i + 2} times`,
  ]),
];
const DIRECTION_OPTIONS = [
  ["normal", "Forward"],
  ["reverse", "Backward"],
  ["alternate", "Forward, then back"],
  ["alternate-reverse", "Backward, then forward"],
];
const STARTER_OPTIONS = SITE_ANIMATION_STARTERS.map(s => [s.key, s.label]);

interface Props {
  /** The animation being edited; `null` creates a new one. */
  initial: SiteAnimation | null;
  /** Keys already defined on the site (for unique key derivation). */
  existingKeys: string[];
  /** Nodes currently using the edited animation (shown before delete). */
  usageCount: number;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  onSave: (anim: SiteAnimation) => void;
  onDelete?: () => void;
}

export default function SiteAnimationEditorPanel({
  initial,
  existingKeys,
  usageCount,
  initialPosition,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const isNew = !initial;
  const [draft, setDraft] = useState<SiteAnimationDraft>(() =>
    initial ? toDraft(initial) : emptyDraft()
  );
  const [customEasing, setCustomEasing] = useState(() => !(draft.easing in EASING_MAP));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [starterKey, setStarterKey] = useState(BLANK_STARTER);

  const update = <K extends keyof SiteAnimationDraft>(key: K, value: SiteAnimationDraft[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const candidate = useMemo<SiteAnimation>(() => {
    const anim = fromDraft(draft);
    return { ...anim, key: initial?.key ?? slugifyAnimationKey(anim.label, existingKeys) };
  }, [draft, initial, existingKeys]);
  const errors = useMemo(() => validateSiteAnimation(candidate), [candidate]);

  const previewCSS = useMemo(
    () => generateSiteAnimationCSS([{ ...candidate, key: PREVIEW_KEY }]),
    [candidate]
  );
  useDraftPreviewCSS(previewCSS);

  const startFrom = (key: string) => {
    setStarterKey(key);
    const starter = SITE_ANIMATION_STARTERS.find(s => s.key === key);
    const next = starter ? toDraft(starter) : emptyDraft();
    setDraft(next);
    setCustomEasing(!(next.easing in EASING_MAP));
  };

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title={isNew ? "New animation" : `Edit “${initial.label}”`}
      storageKey="site-animation-editor"
      autoSize={false}
      defaultWidth={360}
      defaultHeight={640}
      minWidth={320}
      maxWidth={560}
      minHeight={420}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
      bodyClassName="text-base-content flex flex-col gap-3 p-3 text-xs"
    >
      <AnimationPreviewTile
        props={{ root: { animation: `${SITE_ANIMATION_PREFIX}${PREVIEW_KEY}` } }}
        replayKey={previewCSS}
      />

      {isNew && (
        <SelectField
          id="site-animation-starter"
          label="Start from"
          value={starterKey}
          onChange={startFrom}
          options={[[BLANK_STARTER, "Blank"], ...STARTER_OPTIONS]}
        />
      )}

      <div>
        <FieldLabel htmlFor="site-animation-name">Name</FieldLabel>
        <input
          id="site-animation-name"
          type="text"
          value={draft.label}
          onChange={e => update("label", e.target.value)}
          placeholder="e.g. Line draw"
          className={PANEL_INPUT_CLASS}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SelectField
          id="site-animation-trigger"
          label="Starts"
          value={draft.trigger}
          onChange={v => update("trigger", v as SiteAnimationTrigger)}
          options={TRIGGER_OPTIONS}
        />
        <div>
          <FieldLabel htmlFor="site-animation-duration">Duration (seconds)</FieldLabel>
          <input
            id="site-animation-duration"
            type="number"
            min={0.05}
            max={30}
            step={0.05}
            value={Number.isFinite(draft.duration) ? draft.duration : ""}
            onChange={e => update("duration", e.target.valueAsNumber)}
            className={PANEL_INPUT_CLASS}
          />
        </div>
        <SelectField
          id="site-animation-easing"
          label="Easing"
          value={customEasing ? CUSTOM_EASING : draft.easing}
          onChange={v => {
            const custom = v === CUSTOM_EASING;
            setCustomEasing(custom);
            update("easing", custom ? "cubic-bezier(0.4, 0, 0.2, 1)" : v);
          }}
          options={EASING_OPTIONS}
        />
        <SelectField
          id="site-animation-repeat"
          label="Repeat"
          value={String(draft.iterations)}
          onChange={v => update("iterations", v === "infinite" ? "infinite" : Number(v))}
          options={REPEAT_OPTIONS}
        />
      </div>

      {customEasing && (
        <div>
          <FieldLabel htmlFor="site-animation-curve">Curve</FieldLabel>
          <input
            id="site-animation-curve"
            type="text"
            value={draft.easing}
            onChange={e => update("easing", e.target.value)}
            placeholder="cubic-bezier(0.4, 0, 0.2, 1)"
            className={`${PANEL_INPUT_CLASS} font-mono`}
          />
        </div>
      )}

      <SelectField
        id="site-animation-direction"
        label="Direction"
        value={draft.direction ?? "normal"}
        onChange={v => update("direction", v as SiteAnimationDirection)}
        options={DIRECTION_OPTIONS}
      />

      <div>
        <FieldLabel>Keyframes</FieldLabel>
        <SiteAnimationKeyframeList
          stops={draft.keyframes}
          onChange={keyframes => update("keyframes", keyframes)}
        />
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="text-error flex flex-col gap-0.5 text-[11px] leading-tight">
          {errors.map(e => (
            <li key={e}>{friendlyAnimationError(e)}</li>
          ))}
        </ul>
      )}

      {confirmingDelete && onDelete ? (
        <SiteAnimationDeleteConfirm
          label={initial?.label ?? ""}
          usageCount={usageCount}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={onDelete}
        />
      ) : (
        <div className="border-base-300/60 mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <div>
            {!isNew && onDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-error hover:bg-error/10 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
              >
                <TbTrash className="size-3.5" aria-hidden />
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-base-content hover:bg-base-200 rounded-md px-3 py-1 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={errors.length > 0}
              onClick={() => onSave(candidate)}
              className="bg-primary text-primary-content rounded-md px-3 py-1 text-xs font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isNew ? "Save and apply" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </FloatingPanel>
  );
}
