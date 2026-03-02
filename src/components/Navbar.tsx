import React from "react";

interface NavbarProps {
  isAuthenticated: boolean;
  studentName: string | null;
  onLogout: () => void;
  countdown: string;
  countdownLoading: boolean;
  currentView: string;
  onViewChange: (view: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const tabs = [
  { key: "menu", label: "🍽 Menu" },
  { key: "history", label: "📋 Orders" },
];

// Animated IUT Cafeteria Logo — hexagon + rotating ring + orbiting crescent
function IUTLogo({ size = 44, isDark = false }: { size?: number; isDark?: boolean }) {
  const primary = isDark ? "#b97be8" : "#166534";
  const secondary = isDark ? "#d8b4fe" : "#4ade80";
  const bg = isDark ? "#2a1a3e" : "#f0fdf4";
  const gold = isDark ? "#e9d5ff" : "#d97706";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0, overflow: "visible" }}
    >
      {/* Outer rotating ring */}
      <g style={{ transformOrigin: "50px 50px", animation: "logo-spin 8s linear infinite" }}>
        <circle cx="50" cy="50" r="46"
          fill="none"
          stroke={primary}
          strokeWidth="2"
          strokeDasharray="8 5"
          opacity="0.6"
        />
        {/* 6 tick marks on ring */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <line key={i}
            x1="50" y1="6" x2="50" y2="12"
            stroke={secondary}
            strokeWidth="2"
            strokeLinecap="round"
            style={{ transformOrigin: "50px 50px", transform: `rotate(${deg}deg)` }}
          />
        ))}
      </g>

      {/* Hexagon body */}
      <polygon
        points="50,14 82,32 82,68 50,86 18,68 18,32"
        fill={bg}
        stroke={primary}
        strokeWidth="2.5"
      />

      {/* Inner decorative hexagon */}
      <polygon
        points="50,22 74,36 74,64 50,78 26,64 26,36"
        fill="none"
        stroke={primary}
        strokeWidth="1"
        opacity="0.35"
      />

      {/* Pulsing center circle */}
      <circle cx="50" cy="50" r="14"
        fill={primary}
        opacity="0.15"
        style={{ animation: "logo-pulse 2.4s ease-in-out infinite", transformOrigin: "50px 50px" }}
      />

      {/* IUT monogram */}
      <text
        x="50" y="55"
        textAnchor="middle"
        fill={primary}
        fontSize="16"
        fontWeight="700"
        fontFamily="Poppins, sans-serif"
        letterSpacing="1"
      >
        IUT
      </text>

      {/* Orbiting crescent */}
      <g style={{ transformOrigin: "50px 50px", animation: "logo-orbit 5s linear infinite" }}>
        <circle cx="50" cy="50" r="3.5" fill={gold} />
        <circle cx="51.5" cy="50" r="2.2" fill={bg} />
      </g>
    </svg>
  );
}

export default function Navbar({
  isAuthenticated,
  studentName,
  onLogout,
  countdown,
  countdownLoading,
  currentView,
  onViewChange,
  isDark,
  onToggleTheme,
}: NavbarProps) {
  const isIftarTime = countdown === "🌙 Iftar Time!";

  return (
    <nav
      className="sticky top-0 z-50 transition-colors duration-300"
      style={{
        background: "var(--navbar-bg)",
        borderBottom: "1px solid var(--border-color)",
        boxShadow: isDark
          ? "0 2px 12px rgba(74,222,128,0.08)"
          : "0 2px 12px rgba(22,101,52,0.08)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Three-column layout: Logo | Iftar (centered) | Controls */}
        <div className="grid grid-cols-3 items-center gap-2">

          {/* ── Col 1: Logo ─────────────────────────────── */}
          <div className="flex items-center gap-3">
            <IUTLogo size={44} isDark={isDark} />
            <div>
              <h1
                className="text-lg font-bold leading-tight"
                style={{ color: "var(--iut-green)", fontFamily: "Poppins, sans-serif" }}
              >
                IUT Cafeteria
              </h1>
              <p className="text-[11px] leading-tight" style={{ color: "var(--text-secondary)" }}>
                Islamic University of Technology
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Fueling Engineers Since 1981
              </p>
            </div>
          </div>

          {/* ── Col 2: Iftar countdown — CENTERED ────────── */}
          <div className="flex items-center justify-center">
            {countdownLoading ? (
              <div
                className="h-6 w-44 rounded-full"
                style={{ background: "var(--border-color)", animation: "shimmer 2s infinite" }}
              />
            ) : isIftarTime ? (
              <span
                className="text-lg font-bold px-5 py-1.5 rounded-full"
                style={{
                  color: "var(--accent-gold)",
                  background: isDark ? "rgba(185,123,232,0.1)" : "rgba(217,119,6,0.1)",
                  animation: "pulse-gold 2s infinite",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                🌙 Iftar Time!
              </span>
            ) : (
              <span
                style={{
                  color: "var(--accent-gold)",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "13px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Dhaka iftar time&nbsp;:&nbsp;🌙&nbsp;{countdown}
              </span>
            )}
          </div>

          {/* ── Col 3: Controls ──────────────────────────── */}
          <div className="flex items-center justify-end gap-2">
            <a
              href="/admin"
              className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 hidden sm:block"
              style={{
                borderColor: "var(--accent-gold)",
                color: "var(--accent-gold)",
                background: "transparent",
              }}
            >
              ⚙️ Admin
            </a>

            <button
              className="theme-toggle"
              onClick={onToggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="icon">{isDark ? "☀️" : "🌙"}</span>
            </button>

            {isAuthenticated ? (
              <>
                <span
                  className="text-sm font-medium hidden sm:block"
                  style={{ color: "var(--iut-green)" }}
                >
                  👤 {studentName}
                </span>
                <button
                  onClick={onLogout}
                  className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
                  style={{
                    borderColor: "var(--danger)",
                    color: "var(--danger)",
                    background: "transparent",
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => onViewChange("login")}
                className="text-sm px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90"
                style={{ background: "var(--iut-green)", color: "#fff" }}
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────── */}
        {isAuthenticated && (
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1 -mb-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onViewChange(tab.key)}
                className="nav-tab-btn px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap"
                style={{
                  color: currentView === tab.key ? "var(--iut-green)" : "var(--text-secondary)",
                  borderBottom: currentView === tab.key
                    ? "2px solid var(--iut-green)"
                    : "2px solid transparent",
                  background: currentView === tab.key
                    ? isDark ? "rgba(185,123,232,0.1)" : "rgba(22,101,52,0.06)"
                    : "transparent",
                  fontWeight: currentView === tab.key ? 600 : 400,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom gradient border */}
      <div
        className="h-0.5"
        style={{
          background: isDark
            ? "linear-gradient(90deg, #3b1d5e, #b97be8, #3b1d5e)"
            : "linear-gradient(90deg, #166534, #4ade80, #d97706)",
        }}
      />
    </nav>
  );
}
