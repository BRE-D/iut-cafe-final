import { calculateStockDeduction } from "./order-validator";
const API_BASE = import.meta.env.VITE_API_URL || "/api";


export interface MenuItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  qty: number;
  category: string;
  version: number;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface LoginResponse {
  token: string;
  studentName: string;
  expiresIn: string;
}

export interface OrderResponse {
  orderId: string;
  status: string;
  estimatedTime: string;
  itemId: string;
  quantity: number;
  price: number;
}

export interface OrderRecord {
  orderId: string;
  studentId: string;
  items: { itemId: string; itemName: string; emoji: string; quantity: number; price: number }[];
  totalPrice: number;
  status: string;
  timestamp: string;
}

// ── Shared stock store ────────────────────────────────────────────────────────
// Persisted in sessionStorage so admin and student tabs in the same browser
// session see the same data. Module-level memory acts as a fast cache on top.

export interface StockItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  qty: number;
  category: string;
}

const STORAGE_KEY = "iut_cafe_stock";

const DEFAULT_STOCK: StockItem[] = [
  { id: "box1", name: "Box 1 – Beef Biryani Set", emoji: "🍱", price: 120, qty: 50, category: "Iftar Box" },
  { id: "box2", name: "Box 2 – Murg Polao Set", emoji: "🍱", price: 130, qty: 50, category: "Iftar Box" },
  { id: "box3", name: "Box 3 – Beef Biryani & Halim", emoji: "🍱", price: 125, qty: 50, category: "Iftar Box" },
  { id: "box4", name: "Box 4 – Murg Polao & Halim", emoji: "🍱", price: 130, qty: 50, category: "Iftar Box" },
  { id: "box5", name: "Box 5 – Beef Biryani & Chola", emoji: "🍱", price: 125, qty: 50, category: "Iftar Box" },
  { id: "box6", name: "Box 6 – Chicken Biryani Set", emoji: "🍱", price: 140, qty: 50, category: "Iftar Box" },
  { id: "box7", name: "Box 7 – Mutton Biryani Set", emoji: "🍱", price: 150, qty: 50, category: "Iftar Box" },
];

/** Load stock from sessionStorage, falling back to defaults.
 *  If stored data doesn't match current box IDs (e.g. after menu update), reset. */
function loadStock(): StockItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as StockItem[];
      // Validate: check that first default item exists in stored data
      const firstId = DEFAULT_STOCK[0]?.id;
      if (firstId && stored.some((s) => s.id === firstId)) {
        return stored;
      }
      // Stored data is stale (old menu) — clear and reset
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* ignore parse errors */ }
  return DEFAULT_STOCK.map((s) => ({ ...s }));
}

/** Persist current stock to sessionStorage */
function saveStock(stock: StockItem[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
  } catch { /* ignore quota errors */ }
}

// In-memory cache — always in sync with sessionStorage
let sharedStock: StockItem[] = loadStock();

// Listeners notified on any stock mutation
type StockListener = () => void;
const stockListeners: StockListener[] = [];

function notifyStockListeners() {
  stockListeners.forEach((fn) => fn());
}

// Cross-tab sync: when another tab writes to sessionStorage we reload
// Note: sessionStorage is per-tab in most browsers, but we fire a storage
// event manually via a BroadcastChannel so both tabs stay in sync.
const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("iut_cafe_stock") : null;
if (bc) {
  bc.onmessage = () => {
    sharedStock = loadStock();
    notifyStockListeners();
  };
}

function persistAndNotify() {
  saveStock(sharedStock);
  if (bc) bc.postMessage("updated"); // tell other tabs
  notifyStockListeners();
}

export function getSharedStock(): StockItem[] {
  return sharedStock;
}

export function updateStockItem(id: string, updates: Partial<Pick<StockItem, "qty" | "price">>) {
  const item = sharedStock.find((s) => s.id === id);
  if (item) {
    if (updates.qty !== undefined) item.qty = updates.qty;
    if (updates.price !== undefined) item.price = updates.price;
    persistAndNotify();
  }
}

export function addStockItem(item: StockItem) {
  if (!sharedStock.find((s) => s.id === item.id)) {
    sharedStock.push({ ...item });
    persistAndNotify();
  }
}

export function restockAll(amount: number) {
  sharedStock.forEach((s) => { s.qty += amount; });
  persistAndNotify();
}

export function subscribeToStock(listener: StockListener): () => void {
  stockListeners.push(listener);
  return () => {
    const idx = stockListeners.indexOf(listener);
    if (idx !== -1) stockListeners.splice(idx, 1);
  };
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Component (ingredient) stock ──────────────────────────────────────────────
// Each iftar box is assembled from named ingredients ("components").
// Admins can set each component's qty; when it hits 0 the boxes that
// use it are flagged as unavailable on the menu page.

export interface ComponentItem {
  id: string;
  name: string;
  emoji: string;
  qty: number;
}

const COMPONENT_STORAGE_KEY = "iut_cafe_components";

const DEFAULT_COMPONENTS: ComponentItem[] = [
  { id: "beef_biryani", name: "Beef Biryani", emoji: "🍖", qty: 100 },
  { id: "murg_polao", name: "Murg Polao", emoji: "🍚", qty: 100 },
  { id: "beef_halim", name: "Beef Halim", emoji: "🥣", qty: 100 },
  { id: "chicken_biryani", name: "Chicken Biryani", emoji: "🍗", qty: 100 },
  { id: "mutton_biryani", name: "Mutton Biryani", emoji: "🍖", qty: 100 },
  { id: "payesh", name: "Payesh", emoji: "🍮", qty: 100 },
  { id: "chicken_fry", name: "Chicken Fry", emoji: "🍗", qty: 100 },
  { id: "samosa", name: "Samosa", emoji: "🥟", qty: 100 },
  { id: "chola", name: "Chola", emoji: "🫘", qty: 100 },
  { id: "beef_kebab", name: "Beef Kebab", emoji: "🥩", qty: 100 },
  { id: "dates", name: "Dates (3 pcs)", emoji: "🌴", qty: 200 },
  { id: "banana", name: "Banana", emoji: "🍌", qty: 200 },
  { id: "orange", name: "Orange", emoji: "🍊", qty: 100 },
  { id: "apple", name: "Apple", emoji: "🍎", qty: 100 },
  { id: "watermelon_banana", name: "Watermelon / Banana", emoji: "🍉", qty: 100 },
  { id: "muri", name: "Muri", emoji: "🌾", qty: 300 },
  { id: "laban", name: "Laban", emoji: "🥛", qty: 100 },
  { id: "smc_electrolyte", name: "SMC Electrolyte Drink", emoji: "🥤", qty: 100 },
  { id: "drinko", name: "Drinko (Lychee/Mango)", emoji: "🧃", qty: 100 },
];

// Which component IDs each box requires
export const BOX_COMPONENTS: Record<string, string[]> = {
  box1: ["beef_biryani", "payesh", "chicken_fry", "dates", "banana", "muri", "smc_electrolyte"],
  box2: ["murg_polao", "beef_halim", "samosa", "dates", "orange", "muri", "drinko"],
  box3: ["beef_biryani", "beef_halim", "chola", "dates", "banana", "muri", "laban"],
  box4: ["murg_polao", "beef_halim", "samosa", "dates", "apple", "muri", "drinko"],
  box5: ["beef_biryani", "samosa", "chola", "dates", "banana", "muri", "smc_electrolyte"],
  box6: ["chicken_biryani", "beef_halim", "beef_kebab", "dates", "watermelon_banana", "muri", "smc_electrolyte"],
  box7: ["mutton_biryani", "beef_halim", "chola", "dates", "banana", "muri", "laban"],
};

function loadComponents(): ComponentItem[] {
  try {
    const raw = sessionStorage.getItem(COMPONENT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ComponentItem[];
  } catch { /* ignore */ }
  return DEFAULT_COMPONENTS.map((c) => ({ ...c }));
}

function saveComponents(comps: ComponentItem[]) {
  try { sessionStorage.setItem(COMPONENT_STORAGE_KEY, JSON.stringify(comps)); } catch { /* ignore */ }
}

let sharedComponents: ComponentItem[] = loadComponents();
type ComponentListener = () => void;
const componentListeners: ComponentListener[] = [];

function notifyComponentListeners() {
  componentListeners.forEach((fn) => fn());
}

const bcComp = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("iut_cafe_components") : null;
if (bcComp) {
  bcComp.onmessage = () => {
    sharedComponents = loadComponents();
    notifyComponentListeners();
  };
}

function persistAndNotifyComponents() {
  saveComponents(sharedComponents);
  if (bcComp) bcComp.postMessage("updated");
  notifyComponentListeners();
}

export function getComponents(): ComponentItem[] {
  return sharedComponents;
}

export function updateComponent(id: string, qty: number) {
  const comp = sharedComponents.find((c) => c.id === id);
  if (comp) {
    comp.qty = Math.max(0, qty);
    persistAndNotifyComponents();
  }
}

export function restockAllComponents(amount: number) {
  sharedComponents.forEach((c) => { c.qty += amount; });
  persistAndNotifyComponents();
}

export function subscribeToComponents(listener: ComponentListener): () => void {
  componentListeners.push(listener);
  return () => {
    const idx = componentListeners.indexOf(listener);
    if (idx !== -1) componentListeners.splice(idx, 1);
  };
}

/**
 * Returns the list of box IDs that are currently unavailable because
 * one or more of their required components is out of stock (qty === 0).
 * Also returns which component names caused the unavailability.
 */
export function getUnavailableBoxes(): { boxId: string; missingComponents: string[] }[] {
  const result: { boxId: string; missingComponents: string[] }[] = [];
  for (const [boxId, compIds] of Object.entries(BOX_COMPONENTS)) {
    const missing = compIds
      .map((cid) => sharedComponents.find((c) => c.id === cid))
      .filter((c): c is ComponentItem => !!c && c.qty === 0)
      .map((c) => c.name);
    if (missing.length > 0) result.push({ boxId, missingComponents: missing });
  }
  return result;
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Order session store — persisted in sessionStorage and synced via BroadcastChannel ──
const ORDERS_STORAGE_KEY = "iut_cafe_session_orders";

function loadSessionOrders(): Record<string, OrderRecord[]> {
  try {
    const raw = sessionStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, OrderRecord[]>;
  } catch { /* ignore */ }
  return {};
}

function saveSessionOrders(orders: Record<string, OrderRecord[]>) {
  try { sessionStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders)); } catch { /* ignore */ }
}

let sessionOrders: Record<string, OrderRecord[]> = loadSessionOrders();
const bcOrders = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("iut_cafe_session_orders") : null;
type OrderListener = () => void;
const orderListeners: OrderListener[] = [];

function notifyOrderListeners() {
  orderListeners.forEach((fn) => fn());
}

if (bcOrders) {
  bcOrders.onmessage = () => {
    sessionOrders = loadSessionOrders();
    notifyOrderListeners();
  };
}

export function subscribeToOrders(listener: OrderListener): () => void {
  orderListeners.push(listener);
  return () => {
    const idx = orderListeners.indexOf(listener);
    if (idx !== -1) orderListeners.splice(idx, 1);
  };
}

export function getSessionOrders(studentId: string): OrderRecord[] {
  return sessionOrders[studentId] ?? [];
}

export function addSessionOrder(order: OrderRecord) {
  const id = order.studentId;
  if (!sessionOrders[id]) sessionOrders[id] = [];
  sessionOrders[id].unshift(order);
  saveSessionOrders(sessionOrders);
  if (bcOrders) bcOrders.postMessage("updated");
  notifyOrderListeners();
}

export function clearSessionOrders(studentId: string) {
  delete sessionOrders[studentId];
  saveSessionOrders(sessionOrders);
  if (bcOrders) bcOrders.postMessage("updated");
  notifyOrderListeners();
}

// Deducting stock mutates sharedStock and notifies all listeners + other tabs
export function deductSessionQty(itemId: string, qty: number) {
  sharedStock = calculateStockDeduction(sharedStock, itemId, qty);
  persistAndNotify();
}


export function getSessionQty(itemId: string): number | undefined {
  return sharedStock.find((s) => s.id === itemId)?.qty;
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Admin order queue ─────────────────────────────────────────────────────────
// All incoming orders are pushed here so the admin "Orders" tab can show them
// and mark them as fulfilled. Fulfilled orders increment the shared counter.

export type AdminOrderStatus = "Pending" | "Ready" | "Fulfilled";

export interface AdminOrder {
  orderId: string;
  studentId: string;
  items: OrderRecord["items"];
  totalPrice: number;
  timestamp: string;
  status: AdminOrderStatus;
}

const ADMIN_ORDERS_KEY = "iut_cafe_admin_orders";

function loadAdminOrders(): AdminOrder[] {
  try {
    const raw = sessionStorage.getItem(ADMIN_ORDERS_KEY);
    if (raw) return JSON.parse(raw) as AdminOrder[];
  } catch { /* ignore */ }
  return [];
}

function saveAdminOrders(orders: AdminOrder[]) {
  try { sessionStorage.setItem(ADMIN_ORDERS_KEY, JSON.stringify(orders)); } catch { /* ignore */ }
}

let adminOrderQueue: AdminOrder[] = loadAdminOrders();
type AdminOrderListener = () => void;
const adminOrderListeners: AdminOrderListener[] = [];

function notifyAdminOrderListeners() {
  adminOrderListeners.forEach((fn) => fn());
}

const bcAdmin = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("iut_cafe_admin_orders") : null;
if (bcAdmin) {
  bcAdmin.onmessage = () => {
    adminOrderQueue = loadAdminOrders();
    notifyAdminOrderListeners();
  };
}

function persistAndNotifyAdmin() {
  saveAdminOrders(adminOrderQueue);
  if (bcAdmin) bcAdmin.postMessage("updated");
  notifyAdminOrderListeners();
}

export function getAdminOrders(): AdminOrder[] {
  return adminOrderQueue;
}

export function pushAdminOrder(order: OrderRecord) {
  adminOrderQueue.unshift({
    orderId: order.orderId,
    studentId: order.studentId,
    items: order.items,
    totalPrice: order.totalPrice,
    timestamp: order.timestamp,
    status: "Pending",
  });
  persistAndNotifyAdmin();
}

export function setAdminOrderStatus(orderId: string, status: AdminOrderStatus) {
  const o = adminOrderQueue.find((o) => o.orderId === orderId);
  if (o) {
    o.status = status;

    // Also update student's session order status
    const studentOrders = sessionOrders[o.studentId];
    if (studentOrders) {
      const studentOrder = studentOrders.find(so => so.orderId === orderId);
      if (studentOrder) {
        studentOrder.status = status;
        saveSessionOrders(sessionOrders);
        if (bcOrders) bcOrders.postMessage("updated");
        notifyOrderListeners();
      }
    }

    persistAndNotifyAdmin();
  }
}

export function subscribeToAdminOrders(listener: AdminOrderListener): () => void {
  adminOrderListeners.push(listener);
  return () => {
    const idx = adminOrderListeners.indexOf(listener);
    if (idx !== -1) adminOrderListeners.splice(idx, 1);
  };
}
// ─────────────────────────────────────────────────────────────────────────────


const MOCK_STUDENTS = [
  { studentId: "240042132", password: "password123", name: "Demo Student" },
];

function isMockMode(): boolean {
  return API_BASE === "/api" || API_BASE === "";
}

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function tryFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function login(studentId: string, password: string): Promise<LoginResponse> {
  if (!isMockMode()) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, password }),
      });
      if (res.ok) return res.json();
      if (res.status === 429) throw new Error("Too many attempts. Try again in 60s.");
      if (res.status === 401) throw new Error("Invalid credentials");
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Login failed");
    } catch (err: any) {
      if (err.message !== "Failed to fetch" && !err.message.includes("NetworkError")) throw err;
    }
  }
  const exact = MOCK_STUDENTS.find((s) => s.studentId === studentId && s.password === password);
  if (exact) return { token: `mock-jwt-${studentId}`, studentName: exact.name, expiresIn: "2h" };
  if (password === "devsprint") return { token: `mock-jwt-${studentId}`, studentName: `Engineer ${studentId.slice(0, 3)}`, expiresIn: "2h" };
  throw new Error("Invalid credentials");
}

// ── Menu — always reads from sharedStock (sessionStorage-backed) ──────────────
export async function fetchMenu(): Promise<MenuItem[]> {
  if (!isMockMode()) {
    const data = await tryFetch<MenuItem[]>(`${API_BASE}/stock/menu`);
    if (data) {
      // Merge backend items into sharedStock, preserving any admin edits
      data.forEach((item) => {
        if (!sharedStock.find((s) => s.id === item.id)) {
          sharedStock.push({ ...item });
        }
      });
      saveStock(sharedStock);
      return sharedStock.map((s) => ({ ...s, version: 0 }));
    }
  }
  // Always return a fresh snapshot of sharedStock (reflects admin edits)
  sharedStock = loadStock(); // re-read from sessionStorage in case another tab updated it
  return sharedStock.map((s) => ({ ...s, version: 0 }));
}

// ── Concurrent order limiter ─────────────────────────────────────────────────
// Track how many orders are currently being processed across the app.
// If more than 10 simultaneous order submissions hit at once, reject with a
// friendly "try again later" message.
const MAX_CONCURRENT_ORDERS = 10;
let activeOrderCount = 0;

export function getActiveOrderCount() { return activeOrderCount; }

// ── Place order ───────────────────────────────────────────────────────────────
export async function placeOrder(
  itemId: string,
  quantity: number,
  token?: string
): Promise<OrderResponse> {
  // Reject if too many concurrent orders are in-flight
  if (activeOrderCount >= MAX_CONCURRENT_ORDERS) {
    throw new Error("System is busy — too many orders at once. Please try again in a moment.");
  }
  activeOrderCount++;
  try {
    return await _doPlaceOrder(itemId, quantity, token);
  } finally {
    activeOrderCount--;
  }
}

async function _doPlaceOrder(
  itemId: string,
  quantity: number,
  token?: string
): Promise<OrderResponse> {
  const idempotencyKey = `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (!isMockMode()) {
    try {
      const res = await fetch(`${API_BASE}/order`, {
        method: "POST",
        headers: { ...getHeaders(token), "X-Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ itemId, quantity }),
      });
      if (res.ok) return res.json();
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Order failed");
    } catch (err: any) {
      if (!err.message.includes("fetch")) throw err;
    }
  }
  const item = sharedStock.find((m) => m.id === itemId);
  const orderId = "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    orderId,
    status: "Pending",
    estimatedTime: "3-7 minutes",
    itemId,
    quantity,
    price: (item?.price ?? 0) * quantity,
  };
}

// ── Fetch orders ──────────────────────────────────────────────────────────────
export async function fetchOrders(studentId: string, token?: string): Promise<OrderRecord[]> {
  if (!isMockMode()) {
    const data = await tryFetch<OrderRecord[]>(`${API_BASE}/orders/${studentId}`, {
      headers: getHeaders(token),
    });
    if (data) return data;
  }
  return getSessionOrders(studentId);
}

// ── SSE helper ───────────────────────────────────────────────────────────────
export function createSSEConnection(studentId: string, onMessage: (data: any) => void): EventSource {
  const sseBase = import.meta.env.VITE_SSE_URL || "/events";
  const es = new EventSource(`${sseBase}/${studentId}`);
  es.onmessage = (event) => {
    try { onMessage(JSON.parse(event.data)); } catch { /* ignore */ }
  };
  return es;
}
