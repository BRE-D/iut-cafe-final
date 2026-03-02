import React, { useState, useEffect } from "react";

interface OrderItem {
  itemId: string;
  itemName: string;
  emoji: string;
  quantity: number;
  price: number;
}

interface OrderTrackerProps {
  orderId: string;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  history: { status: string; timestamp: string }[];
  onOrderAgain: () => void;
}

const stages = [
  { key: "Pending", icon: "⏳", label: "Order Received", sublabel: "Your order is confirmed" },
  { key: "Stock Verified", icon: "✅", label: "Stock Verified", sublabel: "Items reserved for you" },
  { key: "In Kitchen", icon: "👨‍🍳", label: "In Kitchen", sublabel: "Chef is preparing your meal" },
  { key: "Ready", icon: "🎉", label: "Ready for Pickup", sublabel: "Collect at Counter 3" },
  { key: "Fulfilled", icon: "🍱", label: "Picked Up", sublabel: "Enjoy your Iftar!" },
];

function getStageIndex(status: string) {
  const idx = stages.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export default function OrderTracker({ orderId, items, totalPrice, status, history, onOrderAgain }: OrderTrackerProps) {
  const activeIdx = getStageIndex(status);
  const [showOrderAgain, setShowOrderAgain] = useState(false);

  useEffect(() => {
    if (status === "Ready") {
      const t = setTimeout(() => setShowOrderAgain(true), 2000);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" style={{ animation: "fadeIn 0.5s ease" }}>
      {/* Header */}
      <h2 className="text-xl font-bold mb-1" style={{ color: "var(--iut-green)", fontFamily: "Poppins, sans-serif" }}>
        Tracking Order #{orderId}
      </h2>

      {/* Items summary */}
      <div className="flex flex-wrap gap-2 mb-6 mt-3">
        {items.map((item) => (
          <span
            key={item.itemId}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
          >
            {item.emoji} {item.itemName} × {item.quantity}
            <span style={{ color: "var(--text-muted)" }}> · ৳{item.price}</span>
          </span>
        ))}
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: "var(--iut-green)", color: "#fff" }}
        >
          Total: ৳{totalPrice}
        </span>
      </div>

      {/* Desktop stepper */}
      <div className="hidden md:flex items-start justify-between relative mb-8">
        {stages.map((stage, i) => {
          const isCompleted = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div key={stage.key} className="flex flex-col items-center text-center flex-1 relative">
              {i > 0 && (
                <div className="absolute top-5 -left-1/2 w-full h-0.5 transition-all duration-700"
                  style={{ background: i <= activeIdx ? "var(--iut-green)" : "var(--border-color)" }} />
              )}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg relative z-10 transition-all duration-500"
                style={{
                  background: isCompleted ? "var(--iut-green)" : isActive ? "transparent" : "var(--bg-card)",
                  border: isActive ? "2px solid var(--iut-green)" : isCompleted ? "2px solid var(--iut-green)" : "2px solid var(--border-color)",
                  animation: isActive ? "pulse-green 2s infinite" : "none",
                  color: isCompleted ? "#fff" : "inherit",
                }}
              >
                {isCompleted ? "✓" : stage.icon}
              </div>
              <p className="text-xs font-semibold mt-2"
                style={{ color: isCompleted ? "var(--iut-green)" : isActive ? "var(--iut-green)" : "var(--text-secondary)" }}>
                {stage.label}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{stage.sublabel}</p>
              {history.find((h) => h.status === stage.key) && (
                <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {new Date(history.find((h) => h.status === stage.key)!.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile stepper */}
      <div className="md:hidden space-y-4 mb-8">
        {stages.map((stage, i) => {
          const isCompleted = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <div key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500"
                  style={{
                    background: isCompleted ? "var(--iut-green)" : isActive ? "transparent" : "var(--bg-card)",
                    border: isActive ? "2px solid var(--iut-green)" : isCompleted ? "2px solid var(--iut-green)" : "2px solid var(--border-color)",
                    animation: isActive ? "pulse-green 2s infinite" : "none",
                    color: isCompleted ? "#fff" : "inherit",
                  }}
                >
                  {isCompleted ? "✓" : stage.icon}
                </div>
                {i < stages.length - 1 && (
                  <div className="w-0.5 h-6 mt-1 transition-all duration-700"
                    style={{ background: i < activeIdx ? "var(--iut-green)" : "var(--border-color)" }} />
                )}
              </div>
              <div className="pt-1">
                <p className="text-sm font-semibold"
                  style={{ color: isCompleted || isActive ? "var(--iut-green)" : "var(--text-secondary)" }}>
                  {stage.label}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stage.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ready banner */}
      {status === "Ready" && (
        <div className="w-full rounded-xl p-4 text-center mb-6 font-bold"
          style={{ background: "var(--iut-green)", color: "#fff", animation: "fadeIn 0.5s ease" }}>
          🎉 Your Iftar meal is ready! Please collect at Counter 3 🕌
        </div>
      )}

      {/* Confetti */}
      {status === "Ready" && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="absolute w-2 h-2 rounded-full"
              style={{
                background: ["#22c55e", "#4ade80", "#86efac", "#fbbf24", "#f59e0b"][i % 5],
                left: `${(i * 3.3) % 100}%`,
                top: `-${(i % 20)}px`,
                animation: `confetti-fall ${2 + (i % 3)}s linear ${(i % 10) * 0.2}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      {showOrderAgain && (
        <div className="text-center mt-4" style={{ animation: "fadeIn 0.5s ease" }}>
          <button
            onClick={onOrderAgain}
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: "var(--iut-green)", color: "#fff" }}
          >
            🛒 Order Again
          </button>
        </div>
      )}
    </div>
  );
}
