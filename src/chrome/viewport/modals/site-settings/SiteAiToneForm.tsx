import { normalizeDesignTags } from "../../../../utils/normalizeDesignTags";
import { Chip } from "@/chrome/primitives/Chip";
import { SettingsFormField, SettingsTabIntro } from "../settings/SettingsTabChrome";
import { settingsMultilineInputClass } from "../settings/settingsControlClasses";

export const SITE_AI_TONE_SUGGESTED_TAGS = [
  "engaging",
  "vibrant",
  "professional",
  "friendly",
  "clear",
  "compelling",
  "concise",
  "persuasive",
  "creative",
  "confident",
  "trustworthy",
  "modern",
] as const;

export interface SiteAiToneFormProps {
  /**
   * Site Settings: pass the modal field class — one bordered control, no wrapper.
   * Omit in the toolbar so fields use `input-wrapper` + `input-plain` (matches ToolbarItem).
   */
  inputClass?: string;
  /** Prefer string; non-strings from bad persisted JSON are coerced for display. */
  designNotes: unknown;
  setDesignNotes: (v: string) => void;
  designTags: string[];
  setDesignTags: (v: string[]) => void;
  /** When false, omits the top heading block (toolbar section supplies its own title). */
  showIntroHeading?: boolean;
  /** Prefix for label `htmlFor` / input ids (avoid duplicates when modal + toolbar both mount). */
  fieldIdPrefix?: string;
}

export function SiteAiToneForm({
  inputClass,
  designNotes,
  setDesignNotes,
  designTags,
  setDesignTags,
  showIntroHeading = true,
  fieldIdPrefix = "",
}: SiteAiToneFormProps) {
  const idNotes = `${fieldIdPrefix}design-notes`;
  const idTags = `${fieldIdPrefix}design-tags`;
  /** Persisted / Craft props must be strings — objects show as `[object Object]` in controlled inputs. */
  const notes =
    typeof designNotes === "string"
      ? designNotes
      : typeof designNotes === "number" && Number.isFinite(designNotes)
        ? String(designNotes)
        : "";
  /** Persisted props can be wrong shape until next save — never assume array. */
  const tags = Array.isArray(designTags) ? normalizeDesignTags(designTags) : [];
  const toggleSuggested = (tag: string) => {
    setDesignTags(
      normalizeDesignTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag])
    );
  };

  return (
    <div className="space-y-4">
      {showIntroHeading ? (
        <SettingsTabIntro
          title="Site AI tone"
          description="Notes and tags apply everywhere AI touches this site: assistant, section fills, text wand, and image tools. Nothing here appears on the published site."
        />
      ) : (
        <p className="text-neutral-content text-xs">
          Applies site-wide to AI tools. Not shown on the live site.
        </p>
      )}

      <div>
        {inputClass ? (
          <SettingsFormField
            label="Design notes"
            htmlFor={idNotes}
            hint="Up to 1200 characters. Be specific about voice, audience, and layout preferences."
          >
            <textarea
              id={idNotes}
              value={notes}
              onChange={e => setDesignNotes(e.target.value)}
              rows={showIntroHeading ? 5 : 4}
              maxLength={1200}
              className={settingsMultilineInputClass(inputClass)}
              placeholder="e.g. Dark editorial SaaS, generous whitespace, copy tone: confident but not hype…"
            />
          </SettingsFormField>
        ) : (
          <>
            <label htmlFor={idNotes} className="toolbar-label mb-2 block font-medium">
              Design notes
            </label>
            <Chip grow>
              <div className="flex w-full items-start gap-2">
                <textarea
                  id={idNotes}
                  value={notes}
                  onChange={e => setDesignNotes(e.target.value)}
                  rows={showIntroHeading ? 5 : 4}
                  maxLength={1200}
                  className="input-plain placeholder:text-neutral-content min-h-[4.5rem] w-full flex-1 resize-y py-2 text-sm"
                  placeholder="e.g. Dark editorial SaaS, generous whitespace, copy tone: confident but not hype…"
                />
              </div>
            </Chip>
          </>
        )}
        <p className="text-neutral-content mt-1 text-right text-xs">{notes.length}/1200</p>
      </div>

      <div>
        {inputClass ? (
          <SettingsFormField
            label="Tags"
            htmlFor={idTags}
            hint="Up to 24 tags; combined with the quick picks below."
          >
            <input
              id={idTags}
              type="text"
              value={tags.join(", ")}
              onChange={e => {
                const parsed = e.target.value
                  .split(/[,]+/)
                  .map(s => s.trim())
                  .filter(Boolean);
                setDesignTags(normalizeDesignTags(parsed));
              }}
              className={inputClass}
              placeholder="comma-separated: dark, minimal, fintech"
            />
          </SettingsFormField>
        ) : (
          <>
            <label htmlFor={idTags} className="toolbar-label mb-2 block font-medium">
              Tags
            </label>
            <Chip>
              <div className="flex w-full items-center gap-2">
                <input
                  id={idTags}
                  type="text"
                  value={tags.join(", ")}
                  onChange={e => {
                    const parsed = e.target.value
                      .split(/[,]+/)
                      .map(s => s.trim())
                      .filter(Boolean);
                    setDesignTags(normalizeDesignTags(parsed));
                  }}
                  className="input-plain placeholder:text-neutral-content h-8 min-h-8 w-full flex-1 text-sm"
                  placeholder="comma-separated: dark, minimal, fintech"
                />
              </div>
            </Chip>
          </>
        )}
        {!inputClass ? (
          <p className="text-neutral-content mt-1 text-xs">
            Up to 24 tags; combined with the quick picks below.
          </p>
        ) : null}
      </div>

      <div>
        <p className="toolbar-label mb-2 block font-medium">Quick picks</p>
        <div className="grid grid-cols-2 gap-2">
          {SITE_AI_TONE_SUGGESTED_TAGS.map(tag => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleSuggested(tag)}
                className={`focus-visible:ring-ring rounded-lg border px-2 py-1.5 text-left text-sm capitalize transition-[color,background-color,border-color] focus:outline-none focus-visible:ring-2 ${
                  on
                    ? "border-primary bg-primary text-primary-content font-medium"
                    : "border-base-300 bg-base-200/60 text-base-content hover:border-primary hover:bg-base-300/30"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
