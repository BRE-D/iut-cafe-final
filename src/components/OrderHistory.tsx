import React, { useState, useEffect, useCallback } from "react";
import { fetchOrders, subscribeToOrders } from "@/lib/api";
import type { OrderRecord } from "@/lib/api";

export default function OrderHistory({ token, studentId }: { token: string; studentId: string }) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshOrders = useCallback(async () => {
    try {
      const data = await fetchOrders(studentId, token);
      setOrders(data);
    } catch (e: any) {
      setError(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [studentId, token]);

  useEffect(() => {
    refreshOrders();
    return subscribeToOrders(refreshOrders);
  }, [refreshOrders]);

  const statusColor = (s: string) => {
    if (s === "Fulfilled") return "var(--iut-green)";
    if (s === "Ready") return "var(--success)";
    if (s === "In Kitchen") return "var(--accent-teal)";
    if (s === "Stock Verified") return "var(--iut-green)";
    return "var(--warning)";
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" style={{ animation: "fadeIn 0.5s ease" }}>
      <h2 className="text-xl font-bold mb-6" style={{ color: "var(--iut-green)", fontFamily: "Poppins, sans-serif" }}>
        📋 Order History
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", animation: "shimmer 2s infinite" }} />
          ))}
        </div>
      ) : error ? (
        <p style={{ color: "var(--danger)" }}>⚠ {error}</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-3">🍽</p>
          <p className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>No orders yet.</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Go grab some Iftar food!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.orderId}
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)", fontFamily: "Poppins" }}>
                    #{o.orderId}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {new Date(o.timestamp).toLocaleString("en-BD", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: `${statusColor(o.status)}22`, color: statusColor(o.status), border: `1px solid ${statusColor(o.status)}44` }}
                >
                  {o.status}
                </span>
              </div>

              {/* Items */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {o.items.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
                  >
                    {item.emoji} {item.itemName} ×{item.quantity}
                  </span>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <span className="text-sm font-bold" style={{ color: "var(--iut-green)" }}>
                  Total: ৳{o.totalPrice}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
