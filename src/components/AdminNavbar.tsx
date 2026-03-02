import React from "react";

interface AdminNavbarProps {
  isAuthenticated: boolean;
  adminName: string | null;
  onLogout: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const adminTabs = [
  { key: "dashboard", label: "📊 Dashboard" },
  { key: "orders", label: "🍱 Orders" },
  { key: "stock", label: "📦 Stock Management" },
  { key: "services", label: "🖥 Services" },
  { key: "chaos", label: "💥 Chaos Lab" },
];

function IUTLogo({ size = 40, isDark = false }: { size?: number; isDark?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        d="M50 4 L90 20 L90 55 Q90 80 50 96 Q10 80 10 55 L10 20 Z"
        fill={isDark ? "#1a3d2b" : "#ffffff"}
        stroke={isDark ? "#4ade80" : "#166534"}
        strokeWidth="3"
      />
      <circle cx="50" cy="52" r="28"
        fill="none"
        stroke={isDark ? "#4ade80" : "#166534"}
        strokeWidth="2.5"
        strokeDasharray="5 3"
      />
      <path d="M34 44 Q50 40 50 44 L50 62 Q34 60 34 62 Z"
        fill={isDark ? "#4ade80" : "#166534"} opacity="0.85" />
      <path d="M66 44 Q50 40 50 44 L50 62 Q66 60 66 62 Z"
        fill={isDark ? "#4ade80" : "#166534"} opacity="0.85" />
      <line x1="50" y1="44" x2="50" y2="62"
        stroke={isDark ? "#1a3d2b" : "#ffffff"} strokeWidth="1.5" />
      <circle cx="50" cy="74" r="3"
        fill={isDark ? "#4ade80" : "#166534"} />
      <ellipse cx="50" cy="74" rx="8" ry="3"
        fill="none" stroke={isDark ? "#4ade80" : "#166534"} strokeWidth="1.2" />
      <ellipse cx="50" cy="74" rx="8" ry="3"
        fill="none" stroke={isDark ? "#4ade80" : "#166534"} strokeWidth="1.2"
        transform="rotate(60 50 74)" />
      <ellipse cx="50" cy="74" rx="8" ry="3"
        fill="none" stroke={isDark ? "#4ade80" : "#166534"} strokeWidth="1.2"
        transform="rotate(120 50 74)" />
      <path d="M50 10 A8 8 0 1 1 50 26 A5 5 0 1 0 50 10 Z"
        fill={isDark ? "#fbbf24" : "#d97706"} />
      <text x="50" y="38" textAnchor="middle"
        fill={isDark ? "#4ade80" : "#166534"}
        fontSize="10" fontWeight="bold" fontFamily="Poppins, sans-serif" letterSpacing="1.5">
        IUT
      </text>
      <path d="M22 85 Q50 90 78 85 L75 92 Q50 97 25 92 Z"
        fill={isDark ? "#4ade80" : "#166534"} />
    </svg>
  );
}

export default function AdminNavbar({
  isAuthenticated,
  adminName,
  onLogout,
  currentView,
  onViewChange,
  isDark,
  onToggleTheme,
}: AdminNavbarProps) {
  return (
    <nav
      className="sticky top-0 z-50 transition-colors duration-300"
      style={{
        background: "var(--navbar-bg)",
        borderBottom: "1px solid var(--border-color)",
        boxShadow: isDark
          ? "0 2px 12px rgba(251,191,36,0.10)"
          : "0 2px 12px rgba(217,119,6,0.10)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">

          {/* Logo */}
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
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: "rgba(251,191,36,0.15)", color: "var(--accent-gold)", fontFamily: "Poppins, sans-serif" }}
              >
                ⚙️ ADMIN PORTAL
              </span>
            </div>
          </div>

          {/* Right: theme + auth */}
          <div className="flex items-center gap-2">
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
                  style={{ color: "var(--accent-gold)" }}
                >
                  ⚙️ {adminName}
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
            ) : null}
          </div>
        </div>

      </div>

      <div
        className="h-0.5"
        style={{
          background: "linear-gradient(90deg, #92400e, #fbbf24, #d97706)",
        }}
      />
    </nav>
  );
}
