import React from "react";

interface IftarTickerProps {
  times: Record<string, string>;
  loading: boolean;
}

export default function IftarTicker({ times, loading }: IftarTickerProps) {
  const entries = Object.entries(times);

  return (
    <div
      className="relative w-full overflow-hidden flex items-center rounded-lg"
      style={{
        height: 44,
        background: "var(--ticker-bg)",
        border: "1px solid var(--border-color)",
      }}
    >
      {/* Pinned label */}
      <div
        className="shrink-0 flex items-center px-4 h-full text-xs font-semibold z-10 whitespace-nowrap rounded-l-lg"
        style={{ background: "var(--iut-green)", color: "#fff" }}
      >
        🌙 Iftar Times
      </div>

      {/* Marquee */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="h-3 w-48 mx-4 rounded-full"
            style={{ background: "var(--border-color)", animation: "shimmer 2s infinite" }} />
        ) : entries.length === 0 ? (
          <span className="mx-4 text-xs" style={{ color: "var(--text-muted)" }}>Loading times...</span>
        ) : (
          <div
            className="flex whitespace-nowrap"
            style={{ animation: "marquee 35s linear infinite" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = "paused")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.animationPlayState = "running")}
          >
            {[...entries, ...entries].map(([name, time], i) => (
              <span key={`${name}-${i}`} className="inline-flex items-center mx-4 text-xs gap-1">
                <span style={{
                  color: name === "Dhaka" ? "var(--iut-green)" : "var(--text-secondary)",
                  fontWeight: name === "Dhaka" ? 700 : 400,
                }}>
                  {name === "Dhaka" ? "⭐" : "📍"} {name}
                </span>
                <span style={{ color: "var(--text-muted)" }}>—</span>
                <span style={{
                  color: name === "Dhaka" ? "var(--accent-gold)" : "var(--text-primary)",
                  fontWeight: name === "Dhaka" ? 700 : 500,
                }}>
                  {time}
                </span>
                <span className="ml-3" style={{ color: "var(--border-color)" }}>|</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
