export function EditorLoader() {
  // Detect dark mode from localStorage or system preference before React hydrates
  const isDark =
    typeof window !== "undefined" &&
    (localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches));

  return (
    <div
      suppressHydrationWarning
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: isDark ? "#94a3b8" : "#64748b",
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
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
