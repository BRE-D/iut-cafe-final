import { useState, useCallback } from "react";
import { clearSessionOrders } from "@/lib/api";

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || import.meta.env.VITE_API_URL || "";

// Hardcoded mock students — used when backend is unreachable
const MOCK_STUDENTS = [
  { studentId: "240042132", password: "password123", name: "Demo Student" },
];

// Hardcoded mock admins
const MOCK_ADMINS = [
  { adminId: "admin", password: "admin123", name: "Cafeteria Admin" },
  { adminId: "manager", password: "manager123", name: "Cafe Manager" },
];

function getMockAuth(studentId: string, password: string) {
  const exact = MOCK_STUDENTS.find(
    (s) => s.studentId === studentId && s.password === password
  );
  if (exact) return { token: `mock-jwt-${studentId}`, studentName: exact.name };
  if (password === "devsprint") return { token: `mock-jwt-${studentId}`, studentName: `Engineer ${studentId.slice(0, 3)}` };
  return null;
}

function getMockAdminAuth(adminId: string, password: string) {
  const exact = MOCK_ADMINS.find(
    (a) => a.adminId === adminId && a.password === password
  );
  if (exact) return { token: `mock-admin-jwt-${adminId}`, adminName: exact.name };
  return null;
}

interface AuthState {
  token: string | null;
  studentId: string | null;
  studentName: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    studentId: null,
    studentName: null,
    isAuthenticated: false,
    isAdmin: false,
  });

  const login = useCallback(async (studentId: string, password: string) => {
    const hasRealBackend = !!GATEWAY_URL && GATEWAY_URL !== "/api";
    if (hasRealBackend) {
      try {
        const res = await fetch(`${GATEWAY_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, password }),
        });
        if (res.ok) {
          const data = await res.json();
          setAuth({ token: data.token, studentId, studentName: data.studentName, isAuthenticated: true, isAdmin: false });
          return { success: true };
        }
        if (res.status === 429) return { success: false, error: "Too many attempts. Try again in 60s.", status: 429 };
        if (res.status === 401) {
          const mock = getMockAuth(studentId, password);
          if (mock) {
            setAuth({ token: mock.token, studentId, studentName: mock.studentName, isAuthenticated: true, isAdmin: false });
            return { success: true };
          }
          return { success: false, error: "Invalid credentials", status: 401 };
        }
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || "Login failed", status: res.status };
      } catch {
        // Network error — fall through to mock
      }
    }

    const mock = getMockAuth(studentId, password);
    if (mock) {
      setAuth({ token: mock.token, studentId, studentName: mock.studentName, isAuthenticated: true, isAdmin: false });
      return { success: true };
    }
    return { success: false, error: "Invalid credentials", status: 401 };
  }, []);

  const adminLogin = useCallback(async (adminId: string, password: string) => {
    const hasRealBackend = !!GATEWAY_URL && GATEWAY_URL !== "/api";
    if (hasRealBackend) {
      try {
        const res = await fetch(`${GATEWAY_URL}/auth/admin-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId, password }),
        });
        if (res.ok) {
          const data = await res.json();
          setAuth({ token: data.token, studentId: adminId, studentName: data.adminName || adminId, isAuthenticated: true, isAdmin: true });
          return { success: true };
        }
      } catch {
        // Fall through to mock
      }
    }

    const mock = getMockAdminAuth(adminId, password);
    if (mock) {
      setAuth({ token: mock.token, studentId: adminId, studentName: mock.adminName, isAuthenticated: true, isAdmin: true });
      return { success: true };
    }
    return { success: false, error: "Invalid admin credentials", status: 401 };
  }, []);

  const logout = useCallback(() => {
    // Clear this account's session orders so a different login starts fresh
    setAuth((prev) => {
      if (prev.studentId && !prev.isAdmin) clearSessionOrders(prev.studentId);
      return { token: null, studentId: null, studentName: null, isAuthenticated: false, isAdmin: false };
    });
  }, []);

  return { ...auth, login, adminLogin, logout };
}
