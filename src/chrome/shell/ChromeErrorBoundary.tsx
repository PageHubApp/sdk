import React from "react";
import { phStorage } from "../../utils/phStorage";
import { sdkLog } from "../../utils/logger";

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

interface Props {
  children: React.ReactNode;
  /** Optional label so multi-region boundaries surface where the throw came from. */
  region?: string;
  /** Custom fallback. Receives the error + a reset callback that remounts children. */
  fallback?: (ctx: { error: Error; reset: () => void; region?: string }) => React.ReactNode;
}

/**
 * Top-level boundary for the editor chrome. Catches throws from Toolbar, Viewport,
 * dialogs, catalog loading, controllers — anything inside the editor's React tree
 * that would otherwise white-screen the host page.
 *
 * Renders pre-theme inline styles (mirrors `EditorLoader`) because by the time
 * this fires we can't trust that the theme CSS pipeline mounted correctly.
 */
export class ChromeErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    sdkLog.error(
      `[PageHub] Editor chrome crashed${this.props.region ? ` in ${this.props.region}` : ""}:`,
      error,
      info.componentStack
    );
  }

  reset = () => {
    this.setState(s => ({ hasError: false, error: null, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (!this.state.hasError || !this.state.error) {
      // resetKey forces children to remount on reset so stuck refs/state clear.
      return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
    }

    if (this.props.fallback) {
      return this.props.fallback({
        error: this.state.error,
        reset: this.reset,
        region: this.props.region,
      });
    }

    return <DefaultFallback error={this.state.error} reset={this.reset} region={this.props.region} />;
  }
}

function DefaultFallback({
  error,
  reset,
  region,
}: {
  error: Error;
  reset: () => void;
  region?: string;
}) {
  const isDark =
    typeof window !== "undefined" &&
    (phStorage.get("theme") === "dark" ||
      (!phStorage.get("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches));

  const bg = isDark ? "#000000" : "#ffffff";
  const fg = isDark ? "#e2e8f0" : "#0f172a";
  const muted = isDark ? "#94a3b8" : "#64748b";
  const accent = isDark ? "#fb7185" : "#e11d48";
  const buttonBg = isDark ? "#1e293b" : "#f1f5f9";
  const buttonHover = isDark ? "#334155" : "#e2e8f0";

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        backgroundColor: bg,
        color: fg,
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            width: 40,
            height: 40,
            margin: "0 auto 16px",
            borderRadius: "50%",
            backgroundColor: accent,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          !
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>
          The editor hit an error{region ? ` in ${region}` : ""}
        </h2>
        <p style={{ margin: "0 0 20px", color: muted, fontSize: 14, lineHeight: 1.5 }}>
          Your work isn&apos;t lost — the last save is safe. Try reloading the editor; if it keeps
          happening, report the message below.
        </p>
        <pre
          style={{
            textAlign: "left",
            background: buttonBg,
            color: fg,
            padding: 12,
            borderRadius: 6,
            fontSize: 12,
            lineHeight: 1.4,
            margin: "0 0 20px",
            maxHeight: 160,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error.message || String(error)}
        </pre>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = buttonHover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = buttonBg)}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: fg,
              backgroundColor: buttonBg,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = buttonHover)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = buttonBg)}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: fg,
              backgroundColor: buttonBg,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
