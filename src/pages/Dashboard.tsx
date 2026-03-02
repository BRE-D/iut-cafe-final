import { useState, useEffect, useCallback } from "react";
import { useCafeteria } from "@/contexts/CafeteriaContext";
import { fetchMenu, placeOrder, fetchOrders, createSSEConnection } from "@/lib/api";
import type { MenuItem, OrderRecord } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  ShoppingCart,
  Bell,
  Plus,
  Minus,
  ChefHat,
  Clock,
  CheckCircle2,
  Package,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  Pending: { icon: <Clock className="w-4 h-4" />, color: "bg-warning/15 text-warning border-warning/30" },
  "Stock Verified": { icon: <Package className="w-4 h-4" />, color: "bg-primary/15 text-primary border-primary/30" },
  "In Kitchen": { icon: <ChefHat className="w-4 h-4" />, color: "bg-accent/15 text-accent border-accent/30" },
  Ready: { icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-success/15 text-success border-success/30" },
};

export default function Dashboard() {
  const { auth, logout, addNotification, notifications, markAllRead, unreadCount } = useCafeteria();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [menuData, orderData] = await Promise.allSettled([
        fetchMenu(),
        auth.studentId ? fetchOrders(auth.studentId) : Promise.resolve([]),
      ]);
      if (menuData.status === "fulfilled") setMenu(menuData.value);
      if (orderData.status === "fulfilled") setOrders(orderData.value);
    } catch {
      // graceful degradation - show empty state
    } finally {
      setLoading(false);
    }
  }, [auth.studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // SSE connection
  useEffect(() => {
    if (!auth.studentId) return;
    const es = createSSEConnection(auth.studentId, (data) => {
      if (data.type === "orderUpdate") {
        addNotification({
          orderId: data.orderId,
          status: data.status,
          timestamp: data.timestamp || new Date().toISOString(),
        });
        // Update local orders
        setOrders((prev) =>
          prev.map((o) => (o.orderId === data.orderId ? { ...o, status: data.status } : o))
        );
        toast.success(`Order ${data.orderId}: ${data.status}`);
      }
    });
    return () => es.close();
  }, [auth.studentId, addNotification]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce((total, [id, qty]) => {
    const item = menu.find((m) => m.id === id);
    return total + (item ? item.price * qty : 0);
  }, 0);

  const updateCart = (itemId: string, delta: number) => {
    setCart((prev) => {
      const newQty = (prev[itemId] || 0) + delta;
      if (newQty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const handleOrder = async () => {
    if (Object.keys(cart).length === 0) return;
    setOrdering(true);
    try {
      for (const [itemId, quantity] of Object.entries(cart)) {
        const res = await placeOrder(itemId, quantity);
        toast.success(`Order ${res.orderId} placed!`);
      }
      setCart({});
      // Refresh
      if (auth.studentId) {
        const orderData = await fetchOrders(auth.studentId);
        setOrders(orderData);
      }
      setActiveTab("orders");
    } catch (err: any) {
      toast.error(err.message || "Order failed");
    } finally {
      setOrdering(false);
    }
  };

  const categories = [...new Set(menu.map((m) => m.category))];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">IUT Cafeteria</h1>
              <p className="text-xs text-muted-foreground">{auth.studentName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-xl"
                onClick={() => { setShowNotifs(!showNotifs); markAllRead(); }}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {showNotifs && (
                <div className="absolute right-0 top-12 w-72 glass rounded-xl shadow-2xl p-3 space-y-2 max-h-64 overflow-y-auto animate-fade-in z-50">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No notifications</p>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div key={n.id} className="text-xs p-2 rounded-lg bg-muted/50">
                        <span className="font-mono font-semibold">{n.orderId}</span>
                        <span className="ml-2">{n.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <Button variant="ghost" size="icon" className="rounded-xl" onClick={logout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "menu" ? "default" : "secondary"}
            className="rounded-xl"
            onClick={() => setActiveTab("menu")}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Menu
          </Button>
          <Button
            variant={activeTab === "orders" ? "default" : "secondary"}
            className="rounded-xl"
            onClick={() => setActiveTab("orders")}
          >
            <Clock className="w-4 h-4 mr-2" />
            My Orders
            {orders.length > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-full text-xs">
                {orders.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === "menu" ? (
          /* Menu */
          <div className="space-y-8 animate-fade-in">
            {categories.map((cat) => (
              <div key={cat}>
                <h2 className="text-lg font-bold mb-3 text-foreground">{cat}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {menu
                    .filter((m) => m.category === cat)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="glass rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-lg"
                      >
                        <span className="text-4xl">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">{item.name}</h3>
                          <p className="text-primary font-bold">৳{item.price}</p>
                          <p className={`text-xs ${item.qty <= 5 ? "text-destructive" : "text-muted-foreground"}`}>
                            {item.qty === 0 ? "Sold out" : `${item.qty} left`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {(cart[item.id] || 0) > 0 && (
                            <>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => updateCart(item.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-6 text-center font-bold text-sm">
                                {cart[item.id]}
                              </span>
                            </>
                          )}
                          <Button
                            size="icon"
                            className="h-8 w-8 rounded-lg gradient-primary text-primary-foreground"
                            onClick={() => updateCart(item.id, 1)}
                            disabled={item.qty === 0}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Orders */
          <div className="space-y-3 animate-fade-in">
            {orders.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No orders yet</p>
              </div>
            ) : (
              [...orders].reverse().map((order) => {
                const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG["Pending"];
                return (
                  <div key={order.orderId} className="glass rounded-2xl p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-bold">{order.orderId}</span>
                        <Badge variant="outline" className={`text-xs rounded-full ${sc.color}`}>
                          {sc.icon}
                          <span className="ml-1">{order.status}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {order.itemId} × {order.quantity} — ৳{order.price}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
          <div className="container mx-auto max-w-lg">
            <Button
              className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground text-base font-bold shadow-2xl hover:opacity-90 transition-opacity"
              onClick={handleOrder}
              disabled={ordering}
            >
              {ordering ? (
                <span className="animate-pulse-soft">Placing order...</span>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Order {cartCount} item{cartCount > 1 ? "s" : ""} — ৳{cartTotal}
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
