import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { OrderRecord } from "@/lib/api";

interface AuthState {
  token: string | null;
  studentId: string | null;
  studentName: string | null;
}

interface Notification {
  id: string;
  orderId: string;
  status: string;
  timestamp: string;
  read: boolean;
}

interface CafeteriaContextType {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  logout: () => void;
  isLoggedIn: boolean;
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "read">) => void;
  markAllRead: () => void;
  unreadCount: number;
}

const CafeteriaContext = createContext<CafeteriaContextType | null>(null);

export function CafeteriaProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(() => {
    const token = localStorage.getItem("cafeteria_token");
    const studentId = localStorage.getItem("cafeteria_studentId");
    const studentName = localStorage.getItem("cafeteria_studentName");
    return { token, studentId, studentName };
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const setAuth = useCallback((a: AuthState) => {
    setAuthState(a);
    if (a.token) {
      localStorage.setItem("cafeteria_token", a.token);
      localStorage.setItem("cafeteria_studentId", a.studentId || "");
      localStorage.setItem("cafeteria_studentName", a.studentName || "");
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cafeteria_token");
    localStorage.removeItem("cafeteria_studentId");
    localStorage.removeItem("cafeteria_studentName");
    setAuthState({ token: null, studentId: null, studentName: null });
    setNotifications([]);
  }, []);

  const addNotification = useCallback((n: Omit<Notification, "id" | "read">) => {
    setNotifications((prev) => [
      { ...n, id: `${Date.now()}-${Math.random()}`, read: false },
      ...prev,
    ]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <CafeteriaContext.Provider
      value={{
        auth,
        setAuth,
        logout,
        isLoggedIn: !!auth.token,
        notifications,
        addNotification,
        markAllRead,
        unreadCount,
      }}
    >
      {children}
    </CafeteriaContext.Provider>
  );
}

export function useCafeteria() {
  const ctx = useContext(CafeteriaContext);
  if (!ctx) throw new Error("useCafeteria must be used within CafeteriaProvider");
  return ctx;
}
