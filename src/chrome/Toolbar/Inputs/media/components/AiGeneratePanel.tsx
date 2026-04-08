import Image from "next/image";
import { TbPhoto, TbRefresh, TbSparkles } from "react-icons/tb";
import { AI_PROMPT_TEMPLATES } from "../utils/media-helpers";

const BLUR_PLACEHOLDER =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

interface AiGeneratePanelProps {
  aiPrompt: string;
  aiModel: string;
  aiError: string;
  aiSuccess: string;
  aiImagePreview: string | null;
  aiImageScale: number;
  aiImagePosition: { x: number; y: number };
  isGeneratingAi: boolean;
  isDragging: boolean;
  uploading: boolean;
  onPromptChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onGenerate: () => void;
  onSave: () => void;
  onScaleChange: (value: number) => void;
  onResetView: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onWheel: (e: React.WheelEvent) => void;
}

export function AiGeneratePanel({
  aiPrompt,
  aiModel,
  aiError,
  aiImagePreview,
  aiImageScale,
  aiImagePosition,
  isGeneratingAi,
  isDragging,
  uploading,
  onPromptChange,
  onModelChange,
  onGenerate,
  onSave,
  onScaleChange,
  onResetView,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
}: AiGeneratePanelProps) {
  return (
    <div className="mt-2">
      <div className="grid max-h-[400px] min-h-[300px] grid-cols-2 gap-4">
        {/* Left half - Controls */}
        <div className="space-y-4 overflow-y-auto pr-2">
          <div className="space-y-3 rounded-lg bg-neutral/30 p-3">
            <div>
              <label htmlFor="ai-model-select" className="mb-1 block text-xs font-semibold text-base-content">
                AI Model
              </label>
              <select
                id="ai-model-select"
                value={aiModel}
                onChange={e => onModelChange(e.target.value)}
                className="input-dialog-sm w-full py-1.5! focus:ring-2 focus:ring-primary"
              >
                <option value="gpt-image-1">GPT Image 1 (Best)</option>
                <option value="dall-e-3">DALL-E 3 (Creative)</option>
                <option value="dall-e-2">DALL-E 2 (Fast)</option>
              </select>
            </div>

            <div>
              <label htmlFor="ai-prompt-textarea" className="mb-1 block text-xs font-semibold text-base-content">
                Describe your image
              </label>
              <textarea
                id="ai-prompt-textarea"
                value={aiPrompt}
                onChange={e => onPromptChange(e.target.value)}
                placeholder="A modern tech startup logo with clean lines and blue colors..."
                className="input-dialog-sm min-h-[3.25rem] w-full resize-none py-1.5! focus:ring-2 focus:ring-primary"
                rows={2}
                autoFocus
                onKeyDown={e => e.stopPropagation()}
              />
            </div>

            {aiError && (
              <div className="rounded-lg border border-error bg-error/10 px-2 py-1 text-xs text-error">
                {aiError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onGenerate}
                disabled={!aiPrompt.trim() || isGeneratingAi}
                className="btn btn-primary btn-sm flex flex-1 items-center justify-center gap-1"
              >
                {isGeneratingAi ? (
                  <>
                    <TbRefresh className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TbSparkles />
                    Generate
                  </>
                )}
              </button>

              {aiImagePreview && (
                <button
                  onClick={onSave}
                  disabled={uploading}
                  className="btn btn-primary btn-sm flex items-center gap-1"
                >
                  <TbPhoto />
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Prompt templates */}
          <div className="space-y-2">
            <div className="flex max-h-[120px] min-h-[80px] flex-wrap gap-1 overflow-auto rounded-lg border border-base-300 bg-base-100 p-2">
              {AI_PROMPT_TEMPLATES.map(template => (
                <button
                  key={template}
                  onClick={() => onPromptChange(template)}
                  className="text-xxs whitespace-nowra inline-block rounded-lg border border-base-300 bg-base-100 px-1 py-0.5 text-neutral-content transition-colors hover:bg-neutral hover:text-base-content"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right half - Image Preview */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-base-content">Preview</h3>
            <div className="flex items-center gap-2">
              {aiImagePreview && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-neutral-content">Scale:</span>
                  <input
                    type="range"
                    min="25"
                    max="300"
                    value={aiImageScale}
                    onChange={e => onScaleChange(Number(e.target.value))}
                    className="slider h-2 w-16 cursor-pointer appearance-none rounded-lg bg-neutral"
                  />
                  <span className="w-8 text-xs text-neutral-content">{aiImageScale}%</span>
                  <button
                    onClick={onResetView}
                    className="px-1 text-xs text-neutral-content hover:text-base-content"
                    title="Reset view"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-base-300 bg-neutral/30"
            onWheel={onWheel}
          >
            {aiImagePreview ? (
              <div className="relative size-full overflow-hidden rounded-lg bg-neutral">
                <Image
                  src={aiImagePreview}
                  alt="AI Generated Preview"
                  fill
                  className={`origin-center select-none rounded-lg object-contain shadow-sm ${
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{
                    transform: `scale(${aiImageScale / 100}) translate(${aiImagePosition.x}px, ${aiImagePosition.y}px)`,
                  }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  draggable={false}
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                />
              </div>
            ) : (
              <div className="text-center text-neutral-content">
                <div className="mx-auto mb-2 w-fit rounded-full bg-neutral/50 p-3">
                  <TbPhoto className="text-4xl" />
                </div>
                <p className="text-base font-medium">No image generated yet</p>
                <p className="mt-1 text-xs">Enter a prompt and click Generate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
