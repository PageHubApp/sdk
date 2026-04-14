import { useEffect, useState } from "react";
import { TbSearch } from "react-icons/tb";
import { AllStyles } from "@/utils/tailwind";
import { toolbarInputNoAutocompleteProps } from "../../toolbarInputAttrs";
import { BgWrap, CardLight } from "../../ToolbarStyle";
import { BREAKPOINT_PREFIXES } from "./classItemUtils";

interface ClassSearchInputProps {
  classes: string[];
  onSave: (input?: string) => void;
  classInput: string;
  setClassInput: (v: string) => void;
}

export function ClassSearchInput({
  classes,
  onSave,
  classInput,
  setClassInput,
}: ClassSearchInputProps) {
  const [matches, setMatches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (classInput.length < 2) return;

    const hasBreakpoint = BREAKPOINT_PREFIXES.some(bp => classInput.startsWith(bp));
    let results: string[];

    if (hasBreakpoint) {
      const breakpoint = BREAKPOINT_PREFIXES.find(bp => classInput.startsWith(bp))!;
      const classAfter = classInput.substring(breakpoint.length);
      results = AllStyles.filter(s => s?.includes(classAfter)).map(cls => `${breakpoint}${cls}`);
    } else {
      const baseMatches = AllStyles.filter(s => s?.includes(classInput));
      const responsive = baseMatches
        .slice(0, 5)
        .flatMap(cls => BREAKPOINT_PREFIXES.map(bp => `${bp}${cls}`));
      results = [...baseMatches, ...responsive];
    }

    setMatches(results.filter(item => !classes?.includes(item)).slice(0, 4));
    setSelectedIndex(0);
  }, [classInput]);

  const searched = !!(classInput && matches.length);

  return (
    <>
      <label htmlFor="class-search-input" className="text-base-content sr-only text-sm font-medium">
        Search
      </label>
      <BgWrap>
        <div className="relative flex min-h-8 w-full items-stretch">
          <input
            type="text"
            id="class-search-input"
            role="searchbox"
            className="input-plain h-8 min-h-8 flex-1 pr-10! text-xs"
            placeholder="Class Search"
            required
            value={classInput}
            onChange={e => setClassInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Tab" && matches.length > 0) {
                e.preventDefault();
                const hasBreakpoint = BREAKPOINT_PREFIXES.some(bp => classInput.startsWith(bp));
                if (hasBreakpoint) {
                  const resp = matches.find(m => m.startsWith(classInput.split(":")[0] + ":"));
                  setClassInput(resp || matches[0]);
                } else {
                  setClassInput(matches[0]);
                }
              }
              if (e.key === "ArrowDown" && matches.length > 0) {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, matches.length - 1));
              }
              if (e.key === "ArrowUp" && matches.length > 0) {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
              }
              if (e.key === "Enter" && matches.length > 0 && selectedIndex > 0) {
                e.preventDefault();
                setClassInput(matches[selectedIndex]);
              }
            }}
            onKeyUp={e => {
              if (e.key === "Enter") onSave();
            }}
            {...toolbarInputNoAutocompleteProps}
          />
          {classInput?.length > 0 && matches.length > 0 && matches[0].startsWith(classInput) && (
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center pr-10 pl-2">
              <span className="invisible">{classInput}</span>
              <span className="text-neutral-content font-mono">
                {matches[0].slice(classInput.length)}
              </span>
            </div>
          )}
          <button
            type="button"
            className="btn-search"
            onClick={() => onSave()}
            aria-label="Apply class"
          >
            <TbSearch className="size-3.5" aria-hidden />
          </button>
        </div>
      </BgWrap>

      {searched && (
        <div className="ph-panel-soft absolute top-10 z-50 w-full overflow-hidden">
          <div className="scrollbar-light flex max-h-60 w-full flex-wrap gap-2 overflow-auto p-2">
            {matches.map((mat, k) => (
              <CardLight
                key={k}
                value={mat}
                onClick={() => onSave(mat)}
                className={
                  k === selectedIndex
                    ? "bg-accent text-accent-content ring-accent rounded-lg ring-2"
                    : ""
                }
              />
            ))}
          </div>
          {matches.length > 0 && (
            <div className="border-base-300 bg-neutral/50 text-neutral-content border-t p-2 text-xs">
              <div className="flex flex-wrap gap-1">
                <span>
                  Press{" "}
                  <kbd className="bg-base-200 text-base-content rounded-lg border px-1.5 py-0.5">
                    Tab
                  </kbd>{" "}
                  to complete
                </span>
                <span>
                  Use{" "}
                  <kbd className="bg-base-200 text-base-content rounded-lg border px-1.5 py-0.5">
                    ↑↓
                  </kbd>{" "}
                  to navigate
                </span>
                <span>
                  Press{" "}
                  <kbd className="bg-base-200 text-base-content rounded-lg border px-1.5 py-0.5">
                    Enter
                  </kbd>{" "}
                  to select
                </span>
              </div>
              <div className="mt-1">
                Unprefixed classes are the base layer (mobile-first). Prefix with{" "}
                {["sm:", "md:", "lg:", "xl:", "2xl:"].map((bp, i, arr) => (
                  <span key={bp}>
                    <kbd className="bg-base-200 text-base-content rounded-lg border px-1.5 py-0.5">
                      {bp}
                    </kbd>
                    {i < arr.length - 1 ? ", " : " "}
                  </span>
                ))}
                for overrides from that min-width breakpoint and up.
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
