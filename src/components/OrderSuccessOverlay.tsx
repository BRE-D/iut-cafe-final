import React, { useState, useEffect } from "react";

interface OrderItem {
  itemId: string;
  itemName: string;
  emoji: string;
  quantity: number;
  price: number;
}

interface Props {
  orderId: string;
  items: OrderItem[];
  totalPrice: number;
  verse: any; // kept for API compatibility, not displayed here (shown in MenuPage)
  onDismiss: () => void;
}

export default function OrderSuccessOverlay({ orderId, items, totalPrice, onDismiss }: Props) {
  const [dismissIn, setDismissIn] = useState(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setDismissIn((p) => {
        if (p <= 1) { onDismiss(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4 overflow-y-auto py-8"
      style={{
        background: "var(--bg-primary)",
        zIndex: 9999,
        animation: "scale-in 0.4s ease",
      }}
    >
      <div className="text-center max-w-md w-full">
        {/* Animated icon */}
        <div className="text-6xl mb-4" style={{ animation: "float 3s ease-in-out infinite" }}>☽</div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--iut-green)", fontFamily: "Poppins, sans-serif" }}>
          Your Iftar is on its way! 🤲
        </h2>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Order #{orderId} confirmed
        </p>

        {/* Order items */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {items.map((item, i) => (
            <span key={i} className="text-sm px-3 py-1 rounded-full"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
              {item.emoji} {item.itemName} ×{item.quantity}
            </span>
          ))}
        </div>

        <p className="text-lg font-bold mb-5" style={{ color: "var(--iut-green)" }}>
          Total: ৳{totalPrice}
        </p>

        <div className="h-px mx-auto w-16 mb-5" style={{ background: "var(--iut-green)", opacity: 0.4 }} />

        {/* Du'a — always shown, no verse card (that lives on the menu page) */}
        <div
          className="rounded-xl p-5 mb-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", animation: "fadeIn 0.6s ease" }}
        >
          <p className="text-xl leading-loose mb-3"
            style={{ fontFamily: "Amiri, serif", color: "var(--iut-green)", direction: "rtl", lineHeight: 2 }}>
            اللَّهُمَّ لَكَ صُمْتُ وَبِكَ آمَنْتُ وَعَلَيْكَ تَوَكَّلْتُ وَعَلَى رِزْقِكَ أَفْطَرْتُ
          </p>
          <div className="h-px my-3" style={{ background: "var(--border-color)" }} />
          <p className="italic text-sm" style={{ color: "var(--text-secondary)" }}>
            "O Allah, for You I fasted, in You I believed, upon You I relied,
            and with Your provision I break my fast."
          </p>
          <p className="text-xs mt-2 text-right" style={{ color: "var(--accent-gold)" }}>
            — Du'a at Iftar
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="text-xs px-4 py-2 rounded-lg mb-2 transition-all hover:opacity-80"
          style={{ background: "var(--iut-green)", color: "#fff", fontFamily: "Poppins, sans-serif" }}
        >
          Track My Order
        </button>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Auto-dismissing in {dismissIn}s...</p>
      </div>
    </div>
  );
}
