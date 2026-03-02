import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuranVerse } from "@/hooks/useQuranVerse";
import { useIftarTimes } from "@/hooks/useIftarTimes";
import { useOrderSSE } from "@/hooks/useOrderSSE";
import Navbar from "@/components/Navbar";
import AdminNavbar from "@/components/AdminNavbar";
import CafeteriaLogin from "@/components/CafeteriaLogin";
import MenuPage from "@/components/MenuPage";
import OrderTracker from "@/components/OrderTracker";
import OrderSuccessOverlay from "@/components/OrderSuccessOverlay";
import AdminDashboard from "@/components/AdminDashboard";
import OrderHistory from "@/components/OrderHistory";
import type { OrderRecord } from "@/lib/api";

function isAdminRoute() {
  return window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
}

function App() {
  const auth = useAuth();
  const { verse, loading: verseLoading, fetchNewVerse } = useQuranVerse();
  const { times, loading: timesLoading, countdown } = useIftarTimes();

  // Track current route reactively so we can update it without a full reload
  const [onAdminRoute, setOnAdminRoute] = useState(isAdminRoute);
  // Initial view depends on which portal we're on
  const [currentView, setCurrentView] = useState<string>(() => isAdminRoute() ? "dashboard" : "menu");
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayVerse, setOverlayVerse] = useState<any>(null);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("iut-theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("iut-theme", isDark ? "dark" : "light");
  }, [isDark]);
  const toggleTheme = useCallback(() => setIsDark((d) => !d), []);
  // ──────────────────────────────────────────────────────────────────────────

  // If admin logs in from student page → push /admin into URL and flip route state
  // No full page reload, no lost auth state
  useEffect(() => {
    if (auth.isAuthenticated && auth.isAdmin && !onAdminRoute) {
      window.history.pushState({}, "", "/admin");
      setOnAdminRoute(true);
      setCurrentView("dashboard"); // ensure admin sees dashboard immediately
    }
  }, [auth.isAuthenticated, auth.isAdmin, onAdminRoute]);

  // If student logs in from admin page → push / into URL and flip route state
  useEffect(() => {
    if (auth.isAuthenticated && !auth.isAdmin && onAdminRoute) {
      window.history.pushState({}, "", "/");
      setOnAdminRoute(false);
      setCurrentView("menu");
    }
  }, [auth.isAuthenticated, auth.isAdmin, onAdminRoute]);

  // Handle browser back/forward
  useEffect(() => {
    const onPop = () => setOnAdminRoute(isAdminRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const { status: orderStatus, history: orderHistory } = useOrderSSE({
    studentId: auth.studentId,
    orderId: activeOrder?.orderId || null,
    enabled: !!activeOrder,
  });

  const handleOrderConfirmed = useCallback((order: OrderRecord) => {
    fetchNewVerse();
    setActiveOrder(order);
    setOverlayVerse(verse);
    setShowOverlay(true);
  }, [fetchNewVerse, verse]);

  const handleOverlayDismiss = useCallback(() => {
    setShowOverlay(false);
    setCurrentView("tracker");
  }, []);

  const handleViewChange = useCallback((view: string) => {
    setCurrentView(view);
  }, []);

  // ── Admin portal ───────────────────────────────────────────────────────────
  if (onAdminRoute) {
    return (
      <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--bg-primary)" }}>
        <AdminNavbar
          isAuthenticated={auth.isAuthenticated && auth.isAdmin}
          adminName={auth.studentName}
          onLogout={auth.logout}
          currentView={currentView}
          onViewChange={handleViewChange}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        {(!auth.isAuthenticated || !auth.isAdmin) && (
          <CafeteriaLogin
            onLogin={auth.login}
            onAdminLogin={auth.adminLogin}
            initialMode="admin"
          />
        )}

        {auth.isAuthenticated && auth.isAdmin && (
          <AdminDashboard currentTab={currentView} onViewChange={handleViewChange} />
        )}
      </div>
    );
  }

  // ── Student portal ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: "var(--bg-primary)" }}>
      <Navbar
        isAuthenticated={auth.isAuthenticated && !auth.isAdmin}
        studentName={auth.studentName}
        onLogout={auth.logout}
        countdown={countdown}
        countdownLoading={timesLoading}
        currentView={currentView}
        onViewChange={handleViewChange}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {!auth.isAuthenticated && (
        <CafeteriaLogin
          onLogin={auth.login}
          onAdminLogin={auth.adminLogin}
          initialMode="student"
        />
      )}

      {auth.isAuthenticated && !auth.isAdmin && currentView === "menu" && (
        <MenuPage
          token={auth.token!}
          studentId={auth.studentId!}
          onOrderConfirmed={handleOrderConfirmed}
          verse={verse}
          verseLoading={verseLoading}
          times={times}
          timesLoading={timesLoading}
        />
      )}

      {auth.isAuthenticated && !auth.isAdmin && currentView === "tracker" && activeOrder && (
        <OrderTracker
          orderId={activeOrder.orderId}
          items={activeOrder.items}
          totalPrice={activeOrder.totalPrice}
          status={orderStatus}
          history={orderHistory}
          onOrderAgain={() => setCurrentView("menu")}
        />
      )}

      {auth.isAuthenticated && !auth.isAdmin && currentView === "history" && (
        <OrderHistory token={auth.token!} studentId={auth.studentId!} />
      )}

      {showOverlay && activeOrder && (
        <OrderSuccessOverlay
          orderId={activeOrder.orderId}
          items={activeOrder.items}
          totalPrice={activeOrder.totalPrice}
          verse={overlayVerse}
          onDismiss={handleOverlayDismiss}
        />
      )}
    </div>
  );
}

export default App;
