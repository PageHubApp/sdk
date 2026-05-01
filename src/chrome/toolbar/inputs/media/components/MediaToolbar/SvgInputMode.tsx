interface SvgInputModeProps {
  svgInput: string;
  setSvgInput: (v: string) => void;
  handleAddSvg: () => void;
}

export function SvgInputMode({ svgInput, setSvgInput, handleAddSvg }: SvgInputModeProps) {
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <textarea
          value={svgInput}
          onChange={e => setSvgInput(e.target.value)}
          placeholder="<svg>...</svg>"
          className="input-dialog placeholder:text-neutral-content min-h-[4.5rem] flex-1 resize-none font-mono text-xs"
          rows={3}
          autoFocus
        />
        <button
          type="button"
          onClick={handleAddSvg}
          disabled={!svgInput.trim()}
          className="btn btn-primary text-sm!"
        >
          Add
        </button>
      </div>
      <p className="text-neutral-content mt-1.5 ml-0.5 text-xs">
        Find SVGs @{" "}
        <a
          href="https://www.svgrepo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary underline"
        >
          svgrepo.com
        </a>
      </p>
    </div>
  );
}
