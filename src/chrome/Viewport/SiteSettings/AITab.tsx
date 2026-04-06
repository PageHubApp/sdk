import React from "react";
import { TbInfoCircle } from "react-icons/tb";

interface AITabProps {
  inputClass: string;
  aiPrompt: string;
  setAiPrompt: (v: string) => void;
  aiStyleTags: string[];
  setAiStyleTags: (v: string[]) => void;
}

export function AITab({ inputClass, aiPrompt, setAiPrompt, aiStyleTags, setAiStyleTags }: AITabProps) {
  return (
    <div className="space-y-6">
      <div className="mb-4 space-y-2">
        <h3 className="text-lg font-semibold text-foreground">AI Content Generator</h3>
        <p className="text-sm text-muted-foreground">
          Customize how AI improves your content with a custom prompt and style
          preferences
        </p>
      </div>

      <div>
        <label htmlFor="ai-prompt" className="toolbar-label mb-2 block font-medium">
          Custom AI Prompt
        </label>
        <textarea
          id="ai-prompt"
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
          rows={3}
          maxLength={200}
          className={inputClass}
          placeholder="Make the copy more engaging, clear, and compelling while keeping the same core message..."
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Brief instructions for how AI should improve your content
          </p>
          <span className="text-xs text-muted-foreground">{aiPrompt.length}/200</span>
        </div>
      </div>

      <div>
        <p className="toolbar-label mb-3 block font-medium">
          Style Tags
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
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
            ].map(tag => (
              <label key={tag} className="flex cursor-pointer items-center space-x-2">
                <input
                  type="checkbox"
                  checked={aiStyleTags.includes(tag)}
                  onChange={e => {
                    if (e.target.checked) {
                      setAiStyleTags([...aiStyleTags, tag]);
                    } else {
                      setAiStyleTags(aiStyleTags.filter(t => t !== tag));
                    }
                  }}
                  className="rounded-lg border-border text-accent focus:ring-ring"
                />
                <span className="text-sm capitalize text-foreground">{tag}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Select style preferences to guide AI content generation
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted p-4">
        <div className="flex gap-3">
          <TbInfoCircle className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">
              Your custom prompt and selected style tags will be used by the AI wand tool
              in the text editor to improve your content. Leave the prompt empty to use
              default behavior.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
