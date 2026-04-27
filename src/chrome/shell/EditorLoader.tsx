import { phStorage } from "../../utils/phStorage";

export function EditorLoader() {
  // Detect dark mode from localStorage or system preference before React hydrates
  const isDark =
    typeof window !== "undefined" &&
    (phStorage.get("theme") === "dark" ||
      (!phStorage.get("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches));

  // NOTE: Hex values are intentional. This loader renders BEFORE the React tree
  // mounts and BEFORE design-system CSS variables (--base-100, --base-content,
  // etc.) are injected by the runtime theme pipeline (designSystemVars.ts).
  // Referencing var(--base-100) here would resolve to nothing on first paint.
  // The values mirror Tailwind slate-400 / slate-500 / black / white as a neutral
  // pre-theme baseline — they intentionally do not track per-site theme overrides.
  return (
    <div
      suppressHydrationWarning
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: isDark ? "#94a3b8" : "#64748b", // slate-400 / slate-500
        backgroundColor: isDark ? "#000000" : "#ffffff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            margin: "0 auto 12px",
            border: "3px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        Loading editor...
      </div>
    </div>
  );
}
