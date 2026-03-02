import React, { useState, useCallback, useEffect } from "react";
import QuranVerseCard from "./QuranVerseCard";
import IftarTicker from "./IftarTicker";
import { placeOrder, addSessionOrder, pushAdminOrder, deductSessionQty, subscribeToStock, getSharedStock, subscribeToComponents, getUnavailableBoxes, getComponents } from "@/lib/api";
import { validateOrder } from "@/lib/order-validator";

import type { OrderRecord } from "@/lib/api";

// ── Iftar Box definitions ─────────────────────────────────────────────────────
interface IftarBox {
  id: string;
  name: string;
  price: number;
  qty: number;
  contents: { item: string; emoji: string }[];
}

const IFTAR_BOXES: IftarBox[] = [
  {
    id: "box1", name: "Box 1", price: 120, qty: 50,
    contents: [
      { item: "Beef Biryani", emoji: "🍖" },
      { item: "Payesh", emoji: "🍮" },
      { item: "Chicken Fry", emoji: "🍗" },
      { item: "Dates (3 pcs)", emoji: "🌴" },
      { item: "Banana", emoji: "🍌" },
      { item: "Muri", emoji: "🌾" },
      { item: "SMC Electrolyte Drink", emoji: "🥤" },
    ],
  },
  {
    id: "box2", name: "Box 2", price: 130, qty: 50,
    contents: [
      { item: "Murg Polao", emoji: "🍚" },
      { item: "Beef Halim", emoji: "🥣" },
      { item: "Samosa", emoji: "🥟" },
      { item: "Dates (3 pcs)", emoji: "🌴" },
      { item: "Orange", emoji: "🍊" },
      { item: "Muri", emoji: "🌾" },
      { item: "Drinko (Lychee / Mango)", emoji: "🧃" },
    ],
  },
  {
    id: "box3", name: "Box 3", price: 125, qty: 50,
    contents: [
      { item: "Beef Biryani", emoji: "🍖" },
      { item: "Beef Halim", emoji: "🥣" },
      { item: "Chola", emoji: "🫘" },
      { item: "Dates (3 pcs)", emoji: "🌴" },
      { item: "Banana", emoji: "🍌" },
      { item: "Muri", emoji: "🌾" },
      { item: "Laban", emoji: "🥛" },
    ],
  },
  {
    id: "box4", name: "Box 4", price: 130, qty: 50,
    contents: [
      { item: "Murg Polao", emoji: "🍚" },
      { item: "Beef Halim", emoji: "🥣" },
      { item: "Samosa", emoji: "🥟" },
      { item: "Dates (3 pcs)", emoji: "🌴" },
      { item: "Apple", emoji: "🍎" },
      { item: "Muri", emoji: "🌾" },
      { item: "Drinko (Lychee)", emoji: "🧃" },
    ],
  },
  {
    id: "box5", name: "Box 5", price: 125, qty: 50,
    contents: [
      { item: "Beef Biryani", emoji: "🍖" },
      { item: "Samosa", emoji: "🥟" },
      { item: "Chola", emoji: "🫘" },
      { item: "Dates (3 pcs)", emoji: "🌴" },
      { item: "Banana", emoji: "🍌" },
      { item: "Muri", emoji: "🌾" },
      { item: "SMC Electrolyte (Orange / Lemon)", emoji: "🥤" },
    ],
  },
  {
    id: "box6", name: "Box 6", price: 140, qty: 50,
    contents: [
      { item: "Chicken Biryani", emoji: "🍗" },
      { item: "Beef Halim", emoji: "🥣" },
      { item: "Beef Kebab", emoji: "🥩" },
      { item: "Dates (3 pcs)", emoji: "🌴" },
      { item: "Watermelon / Banana", emoji: "🍉" },
      { item: "Muri", emoji: "🌾" },
      { item: "SMC Electrolyte (Lemon)", emoji: "🥤" },
    ],
  },
  {
    id: "box7", name: "Box 7", price: 150, qty: 50,
    contents: [
      { item: "Mutton Biryani", emoji: "🍖" },
      { item: "Beef Halim", emoji: "🥣" },
      { item: "Chola", emoji: "🫘" },
      { item: "Dates (3 pcs)", emoji: "🌴" },
      { item: "Banana", emoji: "🍌" },
      { item: "Muri", emoji: "🌾" },
      { item: "Laban", emoji: "🥛" },
    ],
  },
];

interface MenuPageProps {
  token: string;
  studentId: string;
  onOrderConfirmed: (order: OrderRecord) => void;
  verse: any;
  verseLoading: boolean;
  times: Record<string, string>;
  timesLoading: boolean;
}

export default function MenuPage({
  token, studentId, onOrderConfirmed,
  verse, verseLoading, times, timesLoading,
}: MenuPageProps) {
  // Stock quantities
  const [stockQty, setStockQty] = useState<Record<string, number>>(() => {
    const s = getSharedStock();
    const map: Record<string, number> = {};
    IFTAR_BOXES.forEach((b) => {
      const found = s.find((x) => x.id === b.id);
      map[b.id] = found?.qty ?? b.qty;
    });
    return map;
  });

  useEffect(() => {
    const unsub = subscribeToStock(() => {
      const s = getSharedStock();
      setStockQty((prev) => {
        const next = { ...prev };
        IFTAR_BOXES.forEach((b) => {
          const found = s.find((x) => x.id === b.id);
          if (found) next[b.id] = found.qty;
        });
        return next;
      });
    });
    return unsub;
  }, []);

  // Track which boxes are blocked by component out-of-stock
  const [compBlockedBoxes, setCompBlockedBoxes] = useState<Record<string, string[]>>(() => {
    const blocked: Record<string, string[]> = {};
    getUnavailableBoxes().forEach(({ boxId, missingComponents }) => {
      blocked[boxId] = missingComponents;
    });
    return blocked;
  });

  useEffect(() => {
    const unsub = subscribeToComponents(() => {
      const blocked: Record<string, string[]> = {};
      getUnavailableBoxes().forEach(({ boxId, missingComponents }) => {
        blocked[boxId] = missingComponents;
      });
      setCompBlockedBoxes(blocked);
    });
    return unsub;
  }, []);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState(false);
  const [orderError, setOrderError] = useState("");

  // ── Single-open accordion state lifted here ───────────────────────────────
  // Only one box dropdown is open at a time; null = all closed
  const [openBoxId, setOpenBoxId] = useState<string | null>(null);

  const toggleOpen = useCallback((id: string) => {
    setOpenBoxId((prev) => (prev === id ? null : id));
  }, []);

  const cartTotal = IFTAR_BOXES.reduce((sum, b) => sum + (cart[b.id] ?? 0) * b.price, 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const addToCart = (id: string) => {
    const inCart = cart[id] ?? 0;
    if (inCart >= (stockQty[id] ?? 0)) return;
    setCart((p) => ({ ...p, [id]: inCart + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart((p) => {
      const n = { ...p };
      if ((n[id] ?? 0) <= 1) delete n[id];
      else n[id]--;
      return n;
    });
  };

  const clearCart = () => setCart({});

  const handleConfirmOrder = useCallback(async () => {
    const entries = Object.entries(cart).filter(([, q]) => q > 0);
    if (entries.length === 0) return;

    // Validate order integrity before proceeding
    const stock = getSharedStock();
    const components = getComponents();
    const error = validateOrder(cart, stock, components);
    if (error) {
      setOrderError(error);
      return;
    }

    setConfirming(true);
    setOrderError("");
    try {
      const responses = await Promise.all(
        entries.map(([id, qty]) => placeOrder(id, qty, token))
      );
      const masterId = responses[0].orderId;
      const orderRecord: OrderRecord = {
        orderId: masterId,
        studentId,
        items: entries.map(([id, qty]) => {
          const box = IFTAR_BOXES.find((b) => b.id === id)!;
          return { itemId: id, itemName: box.name, emoji: "🍱", quantity: qty, price: box.price * qty };
        }),
        totalPrice: cartTotal,
        status: "Pending",
        timestamp: new Date().toISOString(),
      };
      addSessionOrder(orderRecord);
      pushAdminOrder(orderRecord);  // push to admin queue
      entries.forEach(([id, qty]) => deductSessionQty(id, qty));
      setStockQty((p) => {
        const n = { ...p };
        entries.forEach(([id, qty]) => { n[id] = Math.max(0, (n[id] ?? 0) - qty); });
        return n;
      });
      clearCart();
      onOrderConfirmed(orderRecord);
    } catch (e: any) {
      setOrderError(e.message || "Order failed");
    } finally {
      setConfirming(false);
    }
  }, [cart, token, studentId, cartTotal, onOrderConfirmed]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-40">
      <QuranVerseCard verse={verse} loading={verseLoading} />
      <IftarTicker times={times} loading={timesLoading} />

      <h2
        className="text-xl"
        style={{ color: "var(--iut-green)", fontFamily: "Poppins, sans-serif", fontWeight: 600 }}
      >
        🍽 Today's Iftar Menu
      </h2>

      {orderError && (
        <div className="rounded-lg p-3 text-sm"
          style={{ background: "rgba(220,38,38,0.08)", color: "var(--danger)", border: "1px solid rgba(220,38,38,0.2)" }}>
          ⚠ {orderError}
        </div>
      )}

      {/* ── One box per row, full width ─────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {IFTAR_BOXES.map((box) => {
          const qty = stockQty[box.id] ?? box.qty;
          const inCart = cart[box.id] ?? 0;
          const available = qty - inCart;
          const blockedBy = compBlockedBoxes[box.id]; // string[] of missing component names or undefined
          const effectivelyOutOfStock = qty === 0 || (blockedBy && blockedBy.length > 0);
          return (
            <BoxRow
              key={box.id}
              box={box}
              qty={effectivelyOutOfStock ? 0 : qty}
              inCart={inCart}
              available={effectivelyOutOfStock ? 0 : available}
              isOpen={openBoxId === box.id}
              onToggle={() => toggleOpen(box.id)}
              onAdd={() => addToCart(box.id)}
              onRemove={() => removeFromCart(box.id)}
              componentBlockedBy={blockedBy}
            />
          );
        })}
      </div>

      {/* ── Sticky Cart Bar ─────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3"
          style={{
            background: "var(--navbar-bg)",
            borderTop: "2px solid var(--iut-green)",
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div className="max-w-2xl mx-auto">
            {/* Cart chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => {
                const box = IFTAR_BOXES.find((b) => b.id === id)!;
                return (
                  <div key={id}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                  >
                    <span style={{ color: "var(--iut-green)", fontWeight: 600 }}>{box.name}</span>
                    <button onClick={() => removeFromCart(id)}
                      className="w-4 h-4 rounded-full flex items-center justify-center font-bold ml-0.5"
                      style={{ background: "var(--danger)", color: "#fff", fontSize: "10px" }}>−</button>
                    <span className="font-semibold" style={{ color: "var(--iut-green)", minWidth: "12px", textAlign: "center" }}>{qty}</span>
                    <button onClick={() => addToCart(id)}
                      className="w-4 h-4 rounded-full flex items-center justify-center font-bold"
                      style={{ background: "var(--iut-green)", color: "#fff", fontSize: "10px" }}>+</button>
                    <span style={{ color: "var(--text-muted)" }}>৳{box.price * qty}</span>
                    <button onClick={() => setCart((p) => { const n = { ...p }; delete n[id]; return n; })}
                      className="opacity-40 hover:opacity-100 ml-0.5"
                      style={{ color: "var(--danger)", fontSize: "11px" }}>✕</button>
                  </div>
                );
              })}
            </div>
            {/* Total + confirm */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {cartCount} box{cartCount !== 1 ? "es" : ""}
                </span>
                <span className="text-lg" style={{ color: "var(--iut-green)", fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                  ৳{cartTotal}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={clearCart}
                  className="px-3 py-2 rounded-lg text-xs"
                  style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border-color)", fontWeight: 500 }}>
                  Clear
                </button>
                <button onClick={handleConfirmOrder} disabled={confirming}
                  className="px-4 py-2 rounded-lg text-xs flex items-center gap-1.5"
                  style={{ background: "var(--iut-green)", color: "#fff", fontFamily: "Poppins, sans-serif", fontWeight: 600 }}>
                  {confirming ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full inline-block"
                        style={{ animation: "spin-slow 1s linear infinite" }} />
                      Placing...
                    </>
                  ) : <>✓ Confirm · ৳{cartTotal}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Box Row — one full-width row per box ──────────────────────────────────────
function BoxRow({
  box, qty, inCart, available, isOpen, onToggle, onAdd, onRemove, componentBlockedBy,
}: {
  box: IftarBox;
  qty: number;
  inCart: number;
  available: number;
  isOpen: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onRemove: () => void;
  componentBlockedBy?: string[];
}) {
  const isOutOfStock = qty === 0;
  const isCompBlocked = componentBlockedBy && componentBlockedBy.length > 0;
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      className="rounded-xl overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--bg-card)",
        border: `1.5px solid ${inCart > 0 ? "var(--iut-green)" : hovered ? "var(--accent-gold)" : "var(--border-color)"}`,
        boxShadow: hovered
          ? "0 6px 24px rgba(0,0,0,0.18), 0 0 0 2px color-mix(in srgb, var(--accent-gold) 20%, transparent)"
          : inCart > 0 ? "0 0 0 3px rgba(22,101,52,0.08)" : "none",
        transform: hovered ? "translateY(-2px) scale(1.005)" : "translateY(0) scale(1)",
        transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.22s ease, border-color 0.18s ease",
      }}
    >
      {/* ── Main row — always visible ─────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* Box name + price */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              style={{
                color: "var(--iut-green)",
                fontFamily: "Poppins, sans-serif",
                fontWeight: 600,
                fontSize: "15px",
              }}
            >
              {box.name}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "var(--iut-green-pastel)", color: "var(--iut-green)", fontWeight: 500 }}
            >
              ৳{box.price}
            </span>
            {/* stock indicator */}
            {isOutOfStock && isCompBlocked ? (
              <span className="text-xs" style={{ color: "var(--danger)", fontWeight: 500 }}>
                Unavailable — {componentBlockedBy![0]} out of stock
              </span>
            ) : isOutOfStock ? (
              <span className="text-xs" style={{ color: "var(--danger)", fontWeight: 500 }}>Sold Out</span>
            ) : available <= 5 ? (
              <span className="text-xs" style={{ color: "var(--warning)", fontWeight: 500 }}>{available} left</span>
            ) : null}
          </div>
          {/* First item as teaser */}
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
            {box.contents.map((c) => c.item).join(" · ")}
          </p>
        </div>

        {/* Contents toggle */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all shrink-0"
          style={{
            background: isOpen ? "var(--iut-green)" : "var(--bg-primary)",
            color: isOpen ? "#fff" : "var(--text-muted)",
            border: "1px solid var(--border-color)",
            fontWeight: 500,
          }}
        >
          {isOpen ? "▲ Hide" : "▼ View"}
        </button>

        {/* Add / qty control */}
        <div className="shrink-0" style={{ minWidth: "88px" }}>
          {isOutOfStock ? (
            <div className="text-center text-xs py-1.5 rounded-lg"
              style={{ background: "var(--border-color)", color: "var(--text-muted)", fontWeight: 500 }}>
              Sold Out
            </div>
          ) : inCart === 0 ? (
            <button
              onClick={onAdd}
              className="w-full py-1.5 rounded-lg text-xs transition-all hover:opacity-90 active:scale-95"
              style={{ background: "var(--iut-green)", color: "#fff", fontWeight: 600 }}
            >
              + Add
            </button>
          ) : (
            <div
              className="flex items-center justify-between rounded-lg overflow-hidden"
              style={{ border: "1.5px solid var(--iut-green)", height: "30px" }}
            >
              <button
                onClick={onRemove}
                className="flex-1 h-full text-sm font-semibold hover:opacity-80 active:scale-95 transition-all"
                style={{ background: "var(--bg-primary)", color: "var(--iut-green)" }}
              >−</button>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--iut-green)", minWidth: "24px", textAlign: "center" }}
              >
                {inCart}
              </span>
              <button
                onClick={onAdd}
                disabled={available <= 0}
                className="flex-1 h-full text-sm font-semibold hover:opacity-80 active:scale-95 transition-all disabled:opacity-40"
                style={{ background: available > 0 ? "var(--iut-green)" : "var(--border-color)", color: "#fff" }}
              >+</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Expanded contents — only this box, no others ──── */}
      {isOpen && (
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
            {box.contents.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 text-sm"
                style={{
                  background: i % 2 === 0 ? "var(--bg-primary)" : "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontWeight: 400,
                  borderRight: "1px solid var(--border-color)",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <span style={{ fontSize: "16px", lineHeight: 1 }}>{c.emoji}</span>
                <span>{c.item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
