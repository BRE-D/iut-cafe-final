import React, { useState, useEffect, useCallback } from "react";

interface LoginPageProps {
  initialMode?: "student" | "admin";
  onLogin: (studentId: string, password: string) => Promise<{ success: boolean; error?: string; status?: number }>;
  onAdminLogin: (adminId: string, password: string) => Promise<{ success: boolean; error?: string; status?: number }>;
}

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

export default function LoginPage({ onLogin, onAdminLogin, initialMode = "student" }: LoginPageProps) {
  const [mode, setMode] = useState<"student" | "admin">(initialMode);

  // Reactive dark mode — observes the "dark" class on <html> so the logo
  // switches instantly with zero delay when the theme is toggled elsewhere
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Student state
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");

  // Admin state
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockSeconds, setLockSeconds] = useState(0);

  // Reset on mode switch
  useEffect(() => {
    setError("");
    setStudentId("");
    setPassword("");
    setAdminId("");
    setAdminPassword("");
    setFailCount(0);
    setLockUntil(null);
  }, [mode]);

  useEffect(() => {
    if (!lockUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remaining <= 0) { setLockUntil(null); setLockSeconds(0); setFailCount(0); }
      else setLockSeconds(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const handleStudentSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!studentId.trim() || !password.trim()) { setError("Please enter both Student ID and Password"); return; }
    if (lockUntil && Date.now() < lockUntil) return;
    setLoading(true);
    const result = await onLogin(studentId.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Login failed");
      if (result.status === 401) {
        const newCount = failCount + 1;
        setFailCount(newCount);
        if (newCount >= 3) setLockUntil(Date.now() + 60000);
      }
    }
  }, [studentId, password, onLogin, failCount, lockUntil]);

  const handleAdminSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!adminId.trim() || !adminPassword.trim()) { setError("Please enter both Admin ID and Password"); return; }
    if (lockUntil && Date.now() < lockUntil) return;
    setLoading(true);
    const result = await onAdminLogin(adminId.trim(), adminPassword);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Admin login failed");
      if (result.status === 401) {
        const newCount = failCount + 1;
        setFailCount(newCount);
        if (newCount >= 3) setLockUntil(Date.now() + 60000);
      }
    }
  }, [adminId, adminPassword, onAdminLogin, failCount, lockUntil]);

  const isLocked = lockUntil !== null && Date.now() < lockUntil;

  const inputStyle = {
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-color)",
    fontFamily: "Poppins, sans-serif",
  } as const;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: "var(--bg-primary)",
        backgroundImage: `radial-gradient(circle, var(--border-color) 1px, transparent 1px),
                          radial-gradient(circle, var(--border-color) 1px, transparent 1px)`,
        backgroundSize: "50px 50px, 30px 30px",
        backgroundPosition: "0 0, 15px 15px",
      }}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl p-8"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 8px 32px rgba(22,101,52,0.12)",
          animation: "fadeIn 0.5s ease",
        }}
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3" style={{ animation: "float 3s ease-in-out infinite" }}>
            <IUTLogo size={72} isDark={isDark} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--iut-green)", fontFamily: "Poppins, sans-serif" }}>
            IUT Cafeteria
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            CSE Department · Islamic University of Technology
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Fueling Engineers Since 1981
          </p>
          <div className="h-px my-4 mx-auto w-20" style={{ background: "var(--iut-green)", opacity: 0.4 }} />
        </div>

        {/* Mode Toggle */}
        <div
          className="flex rounded-xl mb-6 p-1"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
        >
          <button
            onClick={() => setMode("student")}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all"
            style={{
              background: mode === "student" ? "var(--iut-green)" : "transparent",
              color: mode === "student" ? "#fff" : "var(--text-secondary)",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            🎓 Student Login
          </button>
          <button
            onClick={() => setMode("admin")}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all"
            style={{
              background: mode === "admin" ? "var(--accent-gold)" : "transparent",
              color: mode === "admin" ? "#000" : "var(--text-secondary)",
              fontFamily: "Poppins, sans-serif",
            }}
          >
            ⚙️ Admin Login
          </button>
        </div>

        {/* Student Form */}
        {mode === "student" && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: "var(--text-secondary)", fontFamily: "Poppins, sans-serif" }}>
                Student Portal · <span style={{ color: "var(--iut-green)" }}>localhost:5173</span>
              </p>
            </div>
            <input
              type="text"
              placeholder="Student ID  e.g. 240042132"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--iut-green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--iut-green)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
            />

            {isLocked && (
              <p className="text-xs text-center" style={{ color: "var(--danger)" }}>
                ⚠ Too many attempts. Try again in {lockSeconds}s
              </p>
            )}
            {error && !isLocked && (
              <p className="text-xs text-center" style={{ color: "var(--danger)" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full h-12 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={{
                background: loading || isLocked ? "var(--border-color)" : "var(--iut-green)",
                color: loading || isLocked ? "var(--text-muted)" : "#fff",
                cursor: loading || isLocked ? "not-allowed" : "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    style={{ animation: "spin-slow 1s linear infinite" }} />
                  Logging in...
                </>
              ) : isLocked ? `Locked (${lockSeconds}s)` : "Login as Student"}
            </button>

            <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
              Demo: ID <span style={{ color: "var(--iut-green)", fontWeight: 600 }}>240042132</span> · Password{" "}
              <span style={{ color: "var(--iut-green)", fontWeight: 600 }}>password123</span>
              <br />
              <span className="mt-1 block">or any ID with password <span style={{ color: "var(--accent-teal)", fontWeight: 600 }}>devsprint</span></span>
            </p>
          </form>
        )}

        {/* Admin Form */}
        {mode === "admin" && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <p className="text-xs mb-2 font-medium" style={{ color: "var(--text-secondary)", fontFamily: "Poppins, sans-serif" }}>
                Admin Portal · <span style={{ color: "var(--accent-gold)" }}>localhost:5173/admin</span>
              </p>
            </div>
            <input
              type="text"
              placeholder="Admin ID  e.g. admin"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent-gold)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
            />
            <input
              type="password"
              placeholder="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent-gold)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
            />

            {isLocked && (
              <p className="text-xs text-center" style={{ color: "var(--danger)" }}>
                ⚠ Too many attempts. Try again in {lockSeconds}s
              </p>
            )}
            {error && !isLocked && (
              <p className="text-xs text-center" style={{ color: "var(--danger)" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full h-12 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={{
                background: loading || isLocked ? "var(--border-color)" : "var(--accent-gold)",
                color: loading || isLocked ? "var(--text-muted)" : "#000",
                cursor: loading || isLocked ? "not-allowed" : "pointer",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    style={{ animation: "spin-slow 1s linear infinite" }} />
                  Authenticating...
                </>
              ) : isLocked ? `Locked (${lockSeconds}s)` : "Login as Admin"}
            </button>

            <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
              Demo Admin: ID <span style={{ color: "var(--accent-gold)", fontWeight: 600 }}>admin</span> · Password{" "}
              <span style={{ color: "var(--accent-gold)", fontWeight: 600 }}>admin123</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
