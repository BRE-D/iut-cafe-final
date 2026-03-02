import { getSharedStock, updateStockItem, addStockItem, restockAll as restockAllApi, subscribeToStock, type StockItem, getComponents, updateComponent, restockAllComponents, subscribeToComponents, getUnavailableBoxes, BOX_COMPONENTS, type ComponentItem, getAdminOrders, setAdminOrderStatus, subscribeToAdminOrders, type AdminOrder } from "@/lib/api";
import React, { useState, useEffect, useCallback, useRef } from "react";

interface ServiceInfo {
  name: string;
  port: number;
  url: string | null;
  emoji: string;
  status: "HEALTHY" | "DOWN";
  description: string;
}

const initialServices: ServiceInfo[] = [
  { name: "Identity Provider", port: 3002, url: "http://localhost:3002/health", emoji: "🔐", status: "HEALTHY", description: "JWT auth & rate limiting" },
  { name: "Order Gateway", port: 3000, url: "http://localhost:3000/health", emoji: "🚪", status: "HEALTHY", description: "API gateway & routing" },
  { name: "Stock Service", port: 3001, url: "http://localhost:3001/health", emoji: "📦", status: "HEALTHY", description: "Inventory & menu mgmt" },
  { name: "Kitchen Queue", port: 3003, url: null, emoji: "👨‍🍳", status: "HEALTHY", description: "Order processing queue" },
  { name: "Notification Hub", port: 3005, url: "http://localhost:3005/health", emoji: "🔔", status: "HEALTHY", description: "SSE push notifications" },
  { name: "Order History", port: 3004, url: null, emoji: "📋", status: "HEALTHY", description: "Order persistence layer" },
];

interface Toast {
  id: string;
  message: string;
  type: "kill" | "revive" | "stock" | "info";
}

interface AdminDashboardProps {
  onViewChange?: (view: string) => void;
  currentTab?: string;
}

export default function AdminDashboard({ onViewChange, currentTab }: AdminDashboardProps) {
  // activeTab is controlled by parent via currentTab; falls back to "dashboard"
  const activeTab = currentTab || "dashboard";
  const setActiveTab = (tab: string) => { onViewChange?.(tab); };
  const [services, setServices] = useState<ServiceInfo[]>(initialServices);
  const [totalOrders, setTotalOrders] = useState(0);
  const [failedOrders, setFailedOrders] = useState(0);
  const [avgLatency, setAvgLatency] = useState(185);
  const [cacheHitRate, setCacheHitRate] = useState(86);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [killedServices, setKilledServices] = useState<Set<string>>(new Set());
  const intervalsRef = useRef<number[]>([]);

  // Stock management state — backed by shared store so MenuPage sees changes live
  const [stock, setStock] = useState<StockItem[]>(() => [...getSharedStock()]);

  // Keep local state in sync if something else (e.g. orders) updates shared stock
  useEffect(() => {
    const unsub = subscribeToStock(() => setStock([...getSharedStock()]));
    return unsub;
  }, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [newItem, setNewItem] = useState({ name: "", emoji: "🍱", price: 0, qty: 0, category: "Main" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [stockSubTab, setStockSubTab] = useState<"boxes" | "components">("boxes");

  // Component stock state
  const [components, setComponents] = useState<ComponentItem[]>(() => [...getComponents()]);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [editCompQty, setEditCompQty] = useState<number>(0);
  const [unavailableBoxes, setUnavailableBoxes] = useState(() => getUnavailableBoxes());

  useEffect(() => {
    const unsub = subscribeToComponents(() => {
      setComponents([...getComponents()]);
      setUnavailableBoxes(getUnavailableBoxes());
    });
    return unsub;
  }, []);

  const saveCompEdit = (id: string) => {
    updateComponent(id, editCompQty);
    setEditingCompId(null);
    addToast(`🧪 Component stock updated`, "stock");
    setBackendLogs((prev) => [
      { time: new Date().toISOString(), service: "Stock Service", msg: `PUT /components/${id} — qty:${editCompQty} 200 8ms`, level: "INFO" },
      ...prev,
    ]);
  };

  const restockAllComps = () => {
    restockAllComponents(50);
    addToast("🧪 All components restocked by +50", "stock");
  };

  // Backend logs state
  const [backendLogs, setBackendLogs] = useState<{ time: string; service: string; msg: string; level: string }[]>([
    { time: new Date().toISOString(), service: "Identity Provider", msg: "Service started on port 3002", level: "INFO" },
    { time: new Date().toISOString(), service: "Stock Service", msg: "Inventory loaded: 6 items", level: "INFO" },
    { time: new Date().toISOString(), service: "Order Gateway", msg: "Gateway ready on port 3000", level: "INFO" },
    { time: new Date().toISOString(), service: "Notification Hub", msg: "SSE hub listening on port 3005", level: "INFO" },
  ]);

  // Simulate live metrics (latency + cache only; orders/fails driven by real events)
  useEffect(() => {
    const i3 = setInterval(() => setAvgLatency(120 + Math.floor(Math.random() * 220)), 5000);
    const i4 = setInterval(() => setCacheHitRate(78 + Math.floor(Math.random() * 16)), 7000);

    // Simulate backend logs
    const services = ["Identity Provider", "Stock Service", "Order Gateway", "Notification Hub"];
    const msgs = [
      ["POST /login 200 14ms", "INFO"],
      ["POST /login 401 8ms", "WARN"],
      ["GET /menu 200 5ms", "INFO"],
      ["POST /deduct 200 22ms", "INFO"],
      ["GET /health 200 1ms", "INFO"],
      ["POST /order 200 45ms", "INFO"],
      ["SSE client connected: 240042132", "INFO"],
      ["Rate limit triggered for 240042132", "WARN"],
      ["JWT token validated successfully", "INFO"],
      ["Cache hit: menu (expires in 55s)", "INFO"],
      ["GET /events/240042132 200 2ms", "INFO"],
      ["Stock deduction conflict detected, retrying...", "WARN"],
    ];
    const i5 = setInterval(() => {
      const svc = services[Math.floor(Math.random() * services.length)];
      const [msg, level] = msgs[Math.floor(Math.random() * msgs.length)];
      setBackendLogs((prev) => [
        { time: new Date().toISOString(), service: svc, msg, level },
        ...prev.slice(0, 49),
      ]);
    }, 2500);

    intervalsRef.current = [i3, i4, i5] as unknown as number[];
    return () => intervalsRef.current.forEach(clearInterval);
  }, []);

  // Poll health for services with urls
  useEffect(() => {
    const poll = async () => {
      const updated = await Promise.all(
        services.map(async (s) => {
          if (killedServices.has(s.name)) return { ...s, status: "DOWN" as const };
          if (!s.url) return s;
          try {
            const res = await fetch(s.url, { signal: AbortSignal.timeout(2000) });
            return { ...s, status: res.ok ? ("HEALTHY" as const) : ("DOWN" as const) };
          } catch {
            return { ...s, status: "DOWN" as const };
          }
        })
      );
      setServices(updated);
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [killedServices]);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const handleKill = useCallback((name: string) => {
    setKilledServices((prev) => new Set([...prev, name]));
    setServices((prev) => prev.map((s) => (s.name === name ? { ...s, status: "DOWN" as const } : s)));
    addToast(`💀 ${name} terminated. Observing cascade effects...`, "kill");
    if (name === "Order Gateway") setAvgLatency(1200);
    setBackendLogs((prev) => [
      { time: new Date().toISOString(), service: name, msg: "PROCESS KILLED — service offline", level: "ERROR" },
      ...prev,
    ]);
  }, [addToast]);

  const handleRevive = useCallback((name: string) => {
    setKilledServices((prev) => { const n = new Set(prev); n.delete(name); return n; });
    setServices((prev) => prev.map((s) => (s.name === name ? { ...s, status: "HEALTHY" as const } : s)));
    addToast(`💚 ${name} restored. System recovering...`, "revive");
    if (name === "Order Gateway") setAvgLatency(185);
    setBackendLogs((prev) => [
      { time: new Date().toISOString(), service: name, msg: "Service restarted and healthy", level: "INFO" },
      ...prev,
    ]);
  }, [addToast]);

  // Stock management handlers
  const startEdit = (item: StockItem) => {
    setEditingId(item.id);
    setEditQty(item.qty);
    setEditPrice(item.price);
  };

  const saveEdit = (id: string) => {
    updateStockItem(id, { qty: editQty, price: editPrice });
    // setStock will be called by the subscription listener above
    setEditingId(null);
    addToast(`📦 Stock updated for item`, "stock");
    const item = stock.find((s) => s.id === id);
    setBackendLogs((prev) => [
      { time: new Date().toISOString(), service: "Stock Service", msg: `PUT /stock/${id} — qty:${editQty} price:${editPrice} 200 12ms`, level: "INFO" },
      ...prev,
    ]);
  };

  const restockAll = () => {
    restockAllApi(50);
    addToast("📦 All items restocked by +50 units", "stock");
    setBackendLogs((prev) => [
      { time: new Date().toISOString(), service: "Stock Service", msg: "Bulk restock: all items +50 units", level: "INFO" },
      ...prev,
    ]);
  };

  const addNewItem = () => {
    if (!newItem.name.trim()) return;
    const id = newItem.name.toLowerCase().replace(/\s+/g, "_");
    addStockItem({ ...newItem, id });
    setShowAddForm(false);
    setNewItem({ name: "", emoji: "🍱", price: 0, qty: 0, category: "Main" });
    addToast(`✅ New item "${newItem.name}" added to menu`, "stock");
    setBackendLogs((prev) => [
      { time: new Date().toISOString(), service: "Stock Service", msg: `POST /stock — added item: ${newItem.name}`, level: "INFO" },
      ...prev,
    ]);
  };

  // Admin order queue state
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>(() => [...getAdminOrders()]);

  useEffect(() => {
    const unsub = subscribeToAdminOrders(() => setAdminOrders([...getAdminOrders()]));
    return unsub;
  }, []);

  const handleFulfillOrder = useCallback((orderId: string) => {
    setAdminOrderStatus(orderId, "Fulfilled");
    setTotalOrders((p) => p + 1);
    addToast(`✅ Order ${orderId.slice(-6)} fulfilled`, "info");
    setBackendLogs((prev) => [
      { time: new Date().toISOString(), service: "Order History", msg: `Order ${orderId} — FULFILLED by admin`, level: "INFO" },
      ...prev,
    ]);
  }, [addToast]);

  const handleMarkReady = useCallback((orderId: string) => {
    setAdminOrderStatus(orderId, "Ready");
    addToast(`🛑 Order ${orderId.slice(-6)} marked Ready for pickup`, "stock");
  }, [addToast]);

  const showLatencyAlert = avgLatency > 1000;

  const toastColors: Record<Toast["type"], string> = {
    kill: "var(--danger)",
    revive: "var(--success)",
    stock: "var(--accent-gold)",
    info: "var(--accent-teal)",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6" style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-lg p-3 text-sm"
            style={{
              background: "var(--bg-card)",
              borderLeft: `3px solid ${toastColors[t.type]}`,
              color: "var(--text-primary)",
              animation: "slideInRight 0.3s ease",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Latency Alert */}
      {showLatencyAlert && (
        <div
          className="rounded-xl p-4 text-center text-sm font-semibold"
          style={{ background: "rgba(239,68,68,0.2)", color: "var(--danger)", border: "1px solid var(--danger)", animation: "shimmer 1s infinite" }}
        >
          ⚠ HIGH LATENCY ALERT — Gateway response time exceeded 1s threshold
        </div>
      )}

      {/* Tab Navigation (internal for dashboard sections) */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "dashboard", label: "📊 Dashboard" },
          { key: "orders", label: "🍱 Orders" },
          { key: "stock", label: "📦 Stock Management" },
          { key: "services", label: "🖥 Services" },
          { key: "logs", label: "📜 Backend Logs" },
          { key: "chaos", label: "💥 Chaos Lab" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
            style={{
              background: activeTab === tab.key ? "var(--accent-gold)" : "var(--bg-card)",
              color: activeTab === tab.key ? "#000" : "var(--text-secondary)",
              border: `1px solid ${activeTab === tab.key ? "var(--accent-gold)" : "var(--border-color)"}`,
              fontFamily: "Poppins, sans-serif",
              fontWeight: activeTab === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard Overview ── */}
      {activeTab === "dashboard" && (
        <>
          <section>
            <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>
              📊 Live System Metrics
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Orders", value: totalOrders, trend: "↑" },
                { label: "Failed Orders", value: failedOrders, trend: "→" },
                { label: "Avg Latency", value: `${avgLatency}ms`, trend: avgLatency > 300 ? "↑" : "↓" },
                { label: "Cache Hit Rate", value: `${cacheHitRate}%`, trend: "↑" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl p-4 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--gold-border)" }}>
                  <p className="text-2xl font-bold" style={{ color: "var(--accent-gold)", fontFamily: "Poppins, sans-serif" }}>
                    {m.value}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    {m.label} <span className="ml-1">{m.trend}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Quick status */}
          <section>
            <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>
              🖥 Quick Service Status
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map((s) => (
                <div
                  key={s.name}
                  className="rounded-xl p-4"
                  style={{ background: "var(--bg-card)", border: `1px solid ${s.status === "HEALTHY" ? "var(--gold-border)" : "var(--danger)"}` }}
                >
                  <div className="text-2xl text-center mb-1">{s.emoji}</div>
                  <p className="text-sm font-semibold text-center" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>
                    {s.name}
                  </p>
                  <p className="text-[10px] text-center mb-2" style={{ color: "var(--text-muted)" }}>{s.description}</p>
                  <p className="text-[10px] text-center mb-2" style={{ color: "var(--text-secondary)" }}>Port {s.port}</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: s.status === "HEALTHY" ? "var(--success)" : "var(--danger)", animation: "shimmer 2s infinite" }}
                    />
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: s.status === "HEALTHY" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        color: s.status === "HEALTHY" ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── Orders ── */}
      {activeTab === "orders" && (
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>
              🍱 Student Orders
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: "rgba(34,197,94,0.15)", color: "var(--success)" }}>
                ● LIVE
              </span>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {adminOrders.filter(o => o.status !== "Fulfilled").length} pending
              </span>
            </div>
          </div>

          {adminOrders.length === 0 ? (
            <div className="rounded-xl p-10 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
              <p className="text-4xl mb-3">🍱</p>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No orders yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Orders placed by students will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {adminOrders.map((order) => {
                const isFulfilled = order.status === "Fulfilled";
                const isReady = order.status === "Ready";
                return (
                  <div
                    key={order.orderId}
                    className="rounded-xl p-4"
                    style={{
                      background: isFulfilled ? "rgba(34,197,94,0.04)" : "var(--bg-card)",
                      border: `1px solid ${isFulfilled ? "var(--success)" : isReady ? "var(--accent-gold)" : "var(--gold-border)"}`,
                      opacity: isFulfilled ? 0.7 : 1,
                      transition: "all 0.3s ease",
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "var(--bg-primary)", color: "var(--accent-gold)", fontFamily: "monospace" }}>
                            {order.orderId}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                            👤 {order.studentId}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {new Date(order.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                          {order.items.map(i => `${i.quantity}× ${i.itemName}`).join(" + ")} — ৳{order.totalPrice}
                        </p>
                      </div>

                      {/* Status badge + action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{
                          background: isFulfilled ? "rgba(34,197,94,0.15)" : isReady ? "rgba(251,191,36,0.15)" : "rgba(185,123,232,0.15)",
                          color: isFulfilled ? "var(--success)" : isReady ? "var(--accent-gold)" : "var(--text-secondary)",
                        }}>
                          {isFulfilled ? "✅ FULFILLED" : isReady ? "🛑 READY" : "⏳ PENDING"}
                        </span>

                        {!isFulfilled && !isReady && (
                          <button
                            onClick={() => handleMarkReady(order.orderId)}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                            style={{ background: "var(--accent-gold)", color: "#000" }}
                          >
                            🛑 Mark Ready
                          </button>
                        )}

                        {isReady && (
                          <button
                            onClick={() => handleFulfillOrder(order.orderId)}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                            style={{ background: "var(--success)", color: "#000" }}
                          >
                            ✅ Confirm Pickup
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items list */}
                    <div className="flex flex-wrap gap-1.5">
                      {order.items.map((item, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 rounded-full" style={{
                          background: "var(--bg-primary)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-color)",
                        }}>
                          {item.emoji} {item.quantity}× {item.itemName} — ৳{item.price}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Stock Management ── */}
      {activeTab === "stock" && (
        <section>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>
              📦 Stock Management
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setStockSubTab("boxes")}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  background: stockSubTab === "boxes" ? "var(--accent-gold)" : "var(--bg-card)",
                  color: stockSubTab === "boxes" ? "#000" : "var(--text-secondary)",
                  border: `1px solid ${stockSubTab === "boxes" ? "var(--accent-gold)" : "var(--border-color)"}`,
                }}
              >
                📦 Boxes
              </button>
              <button
                onClick={() => setStockSubTab("components")}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  background: stockSubTab === "components" ? "var(--accent-gold)" : "var(--bg-card)",
                  color: stockSubTab === "components" ? "#000" : "var(--text-secondary)",
                  border: `1px solid ${stockSubTab === "components" ? "var(--accent-gold)" : "var(--border-color)"}`,
                }}
              >
                🧪 Components
              </button>
            </div>
          </div>

          {/* Out-of-stock component alert banner */}
          {unavailableBoxes.length > 0 && (
            <div
              className="rounded-xl p-3 mb-4 text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--danger)", color: "var(--danger)" }}
            >
              <p className="font-semibold mb-1">⚠️ Boxes unavailable due to out-of-stock components:</p>
              {unavailableBoxes.map(({ boxId, missingComponents }) => (
                <p key={boxId} className="text-xs mt-0.5">
                  <span className="font-bold">{boxId.replace("box", "Box ")}</span> — missing: {missingComponents.join(", ")}
                </p>
              ))}
            </div>
          )}

          {/* ── Boxes sub-tab ── */}
          {stockSubTab === "boxes" && (
            <>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Box stock quantities &amp; prices</span>
                <div className="flex gap-2">
                  <button
                    onClick={restockAll}
                    className="text-xs px-3 py-2 rounded-lg font-semibold transition-all hover:opacity-80"
                    style={{ background: "var(--iut-green)", color: "#fff", fontFamily: "Poppins, sans-serif" }}
                  >
                    🔄 Restock All (+50)
                  </button>
                  <button
                    onClick={() => setShowAddForm((v) => !v)}
                    className="text-xs px-3 py-2 rounded-lg font-semibold transition-all hover:opacity-80"
                    style={{ background: "var(--accent-gold)", color: "#000", fontFamily: "Poppins, sans-serif" }}
                  >
                    ➕ Add New Item
                  </button>
                </div>
              </div>

              {/* Add New Item Form */}
              {showAddForm && (
                <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--accent-gold)" }}>
                  <h4 className="text-sm font-bold" style={{ color: "var(--accent-gold)", fontFamily: "Poppins, sans-serif" }}>➕ Add New Menu Item</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Item name" value={newItem.name}
                      onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                      className="px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }} />
                    <input type="text" placeholder="Emoji e.g. 🍱" value={newItem.emoji}
                      onChange={(e) => setNewItem((p) => ({ ...p, emoji: e.target.value }))}
                      className="px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }} />
                    <input type="number" placeholder="Price (BDT)" value={newItem.price || ""}
                      onChange={(e) => setNewItem((p) => ({ ...p, price: Number(e.target.value) }))}
                      className="px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }} />
                    <input type="number" placeholder="Initial Qty" value={newItem.qty || ""}
                      onChange={(e) => setNewItem((p) => ({ ...p, qty: Number(e.target.value) }))}
                      className="px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }} />
                    <select value={newItem.category}
                      onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                      className="px-3 py-2 rounded-lg text-sm outline-none col-span-2"
                      style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}>
                      <option value="Main">Main</option>
                      <option value="Drinks">Drinks</option>
                      <option value="Snacks">Snacks</option>
                      <option value="Desserts">Desserts</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addNewItem} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--iut-green)", color: "#fff" }}>✅ Add Item</button>
                    <button onClick={() => setShowAddForm(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Stock Table */}
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)" }}>
                      {["Item", "Category", "Price (BDT)", "Qty", "Status", "Actions"].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold"
                          style={{ color: "var(--text-secondary)", fontFamily: "Poppins, sans-serif" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((item) => (
                      <tr key={item.id} style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-color)" }}>
                        <td className="px-3 py-3"><span className="mr-2">{item.emoji}</span><span style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>{item.name}</span></td>
                        <td className="px-3 py-3"><span className="text-xs px-2 py-1 rounded" style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}>{item.category}</span></td>
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <input type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))}
                              className="w-20 px-2 py-1 rounded text-xs outline-none"
                              style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--accent-gold)" }} />
                          ) : <span style={{ color: "var(--text-primary)" }}>৳{item.price}</span>}
                        </td>
                        <td className="px-3 py-3">
                          {editingId === item.id ? (
                            <input type="number" value={editQty} onChange={(e) => setEditQty(Number(e.target.value))}
                              className="w-20 px-2 py-1 rounded text-xs outline-none"
                              style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--accent-gold)" }} />
                          ) : <span style={{ color: item.qty < 10 ? "var(--danger)" : "var(--text-primary)", fontWeight: item.qty < 10 ? 700 : 400 }}>{item.qty} {item.qty < 10 && "⚠"}</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                            background: item.qty === 0 ? "rgba(239,68,68,0.15)" : item.qty < 10 ? "rgba(251,191,36,0.15)" : "rgba(34,197,94,0.15)",
                            color: item.qty === 0 ? "var(--danger)" : item.qty < 10 ? "var(--accent-gold)" : "var(--success)",
                          }}>{item.qty === 0 ? "OUT OF STOCK" : item.qty < 10 ? "LOW STOCK" : "IN STOCK"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            {editingId === item.id ? (
                              <>
                                <button onClick={() => saveEdit(item.id)} className="text-xs px-2 py-1 rounded font-semibold" style={{ background: "var(--iut-green)", color: "#fff" }}>Save</button>
                                <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 rounded" style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>Cancel</button>
                              </>
                            ) : (
                              <button onClick={() => startEdit(item)} className="text-xs px-2 py-1 rounded font-semibold" style={{ background: "var(--accent-gold)", color: "#000" }}>✏️ Edit</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Components sub-tab ── */}
          {stockSubTab === "components" && (
            <>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Individual ingredient stock — controls which boxes are available</span>
                <button
                  onClick={restockAllComps}
                  className="text-xs px-3 py-2 rounded-lg font-semibold transition-all hover:opacity-80"
                  style={{ background: "var(--iut-green)", color: "#fff", fontFamily: "Poppins, sans-serif" }}
                >
                  🔄 Restock All (+50)
                </button>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border-color)" }}>
                      {["Ingredient", "Qty", "Status", "Affected Boxes", "Actions"].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold"
                          style={{ color: "var(--text-secondary)", fontFamily: "Poppins, sans-serif" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((comp) => {
                      // Which boxes would be unavailable if this component is at 0
                      const affectedBoxIds = Object.entries(BOX_COMPONENTS)
                        .filter(([, cids]) => cids.includes(comp.id))
                        .map(([boxId]) => boxId.replace("box", "Box "));
                      const isOut = comp.qty === 0;
                      return (
                        <tr key={comp.id} style={{
                          background: isOut ? "rgba(239,68,68,0.04)" : "var(--bg-primary)",
                          borderBottom: "1px solid var(--border-color)",
                        }}>
                          <td className="px-3 py-3">
                            <span className="mr-2">{comp.emoji}</span>
                            <span style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>{comp.name}</span>
                          </td>
                          <td className="px-3 py-3">
                            {editingCompId === comp.id ? (
                              <input
                                type="number"
                                value={editCompQty}
                                onChange={(e) => setEditCompQty(Number(e.target.value))}
                                className="w-20 px-2 py-1 rounded text-xs outline-none"
                                style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--accent-gold)" }}
                              />
                            ) : (
                              <span style={{ color: comp.qty < 10 ? "var(--danger)" : "var(--text-primary)", fontWeight: comp.qty < 10 ? 700 : 400 }}>
                                {comp.qty} {comp.qty < 10 && "⚠"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                              background: isOut ? "rgba(239,68,68,0.15)" : comp.qty < 20 ? "rgba(251,191,36,0.15)" : "rgba(34,197,94,0.15)",
                              color: isOut ? "var(--danger)" : comp.qty < 20 ? "var(--accent-gold)" : "var(--success)",
                            }}>{isOut ? "OUT OF STOCK" : comp.qty < 20 ? "LOW STOCK" : "IN STOCK"}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {affectedBoxIds.map((b) => (
                                <span key={b} className="text-[10px] px-1.5 py-0.5 rounded" style={{
                                  background: isOut ? "rgba(239,68,68,0.12)" : "var(--bg-card)",
                                  color: isOut ? "var(--danger)" : "var(--text-muted)",
                                  border: `1px solid ${isOut ? "rgba(239,68,68,0.3)" : "var(--border-color)"}`,
                                }}>{b}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1">
                              {editingCompId === comp.id ? (
                                <>
                                  <button onClick={() => saveCompEdit(comp.id)} className="text-xs px-2 py-1 rounded font-semibold" style={{ background: "var(--iut-green)", color: "#fff" }}>Save</button>
                                  <button onClick={() => setEditingCompId(null)} className="text-xs px-2 py-1 rounded" style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>Cancel</button>
                                </>
                              ) : (
                                <button
                                  onClick={() => { setEditingCompId(comp.id); setEditCompQty(comp.qty); }}
                                  className="text-xs px-2 py-1 rounded font-semibold"
                                  style={{ background: "var(--accent-gold)", color: "#000" }}
                                >✏️ Edit</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Services ── */}
      {activeTab === "services" && (
        <section>
          <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>
            🖥 Service Health Monitor
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {services.map((s) => (
              <div
                key={s.name}
                className="rounded-xl p-4 flex items-center justify-between flex-wrap gap-3"
                style={{ background: "var(--bg-card)", border: `1px solid ${s.status === "HEALTHY" ? "var(--gold-border)" : "var(--danger)"}` }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{s.emoji}</span>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>{s.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      Port {s.port} · {s.url || "internal service"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: s.status === "HEALTHY" ? "var(--success)" : "var(--danger)", animation: "shimmer 2s infinite" }}
                    />
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: s.status === "HEALTHY" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        color: s.status === "HEALTHY" ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Backend Logs ── */}
      {activeTab === "logs" && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>
              📜 Backend Logs (Live Stream)
            </h3>
            <span
              className="text-xs px-2 py-1 rounded-full font-semibold"
              style={{ background: "rgba(34,197,94,0.15)", color: "var(--success)" }}
            >
              ● LIVE
            </span>
          </div>
          <div
            className="rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-[500px] space-y-1"
            style={{ background: "#0d1117", border: "1px solid var(--border-color)" }}
          >
            {backendLogs.map((log, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span style={{ color: "#6e7681", minWidth: "200px" }}>{new Date(log.time).toLocaleTimeString()}</span>
                <span
                  style={{
                    color: log.level === "ERROR" ? "#ff7b72" : log.level === "WARN" ? "#ffa657" : "#79c0ff",
                    minWidth: "80px",
                    fontWeight: 700,
                  }}
                >
                  [{log.level}]
                </span>
                <span style={{ color: "#56d364", minWidth: "160px" }}>[{log.service}]</span>
                <span style={{ color: "#e6edf3" }}>{log.msg}</span>
              </div>
            ))}
            {backendLogs.length === 0 && (
              <p style={{ color: "#6e7681" }}>No logs yet. Start backend services to see live logs here.</p>
            )}
          </div>
        </section>
      )}

      {/* ── Chaos Lab ── */}
      {activeTab === "chaos" && (
        <section>
          <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>
            💥 Chaos Engineering Lab
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            Simulate service failures to test system resilience and observe cascade effects
          </p>
          <div className="space-y-2">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-xl px-4 py-3 flex-wrap gap-3"
                style={{ background: "var(--bg-card)", border: `1px solid ${killedServices.has(s.name) ? "var(--danger)" : "var(--gold-border)"}` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{s.emoji}</span>
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)", fontFamily: "Poppins, sans-serif" }}>
                      {s.name}
                    </span>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Port {s.port}</p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      background: s.status === "HEALTHY" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: s.status === "HEALTHY" ? "var(--success)" : "var(--danger)",
                    }}
                  >
                    {s.status}
                  </span>
                </div>
                {killedServices.has(s.name) ? (
                  <button
                    onClick={() => handleRevive(s.name)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                    style={{ background: "var(--success)", color: "#000" }}
                  >
                    💚 REVIVE SERVICE
                  </button>
                ) : (
                  <button
                    onClick={() => handleKill(s.name)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
                    style={{ background: "var(--danger)", color: "#fff" }}
                  >
                    💀 KILL SERVICE
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
