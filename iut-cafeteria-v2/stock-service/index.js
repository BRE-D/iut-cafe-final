const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3001;

// In-memory inventory with optimistic locking
const inventory = {
  burger:  { name: "Beef Burger",      emoji: "🍔", price: 80,  qty: 50,  version: 0, category: "Main" },
  pizza:   { name: "Pizza Slice",      emoji: "🍕", price: 120, qty: 20,  version: 0, category: "Main" },
  rice:    { name: "Plain Rice",       emoji: "🍚", price: 60,  qty: 100, version: 0, category: "Main" },
  biryani: { name: "Chicken Biryani",  emoji: "🍖", price: 150, qty: 3,   version: 0, category: "Main" },
  water:   { name: "Water Bottle",     emoji: "💧", price: 20,  qty: 200, version: 0, category: "Drinks" },
  juice:   { name: "Fruit Juice",      emoji: "🧃", price: 40,  qty: 80,  version: 0, category: "Drinks" },
};

// In-memory order history
const orderHistory = [];

// Metrics
let totalDeductions = 0;
let failedDeductions = 0;
let conflictCount = 0;
const responseTimes = [];

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const latency = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${latency}ms`);
    responseTimes.push(latency);
    if (responseTimes.length > 100) responseTimes.shift();
  });
  next();
});

// GET /menu
app.get("/menu", (req, res) => {
  const menu = Object.entries(inventory).map(([id, item]) => ({
    id,
    name: item.name,
    emoji: item.emoji,
    price: item.price,
    qty: item.qty,
    category: item.category,
    version: item.version,
  }));
  res.json(menu);
});

// GET /check/:itemId
app.get("/check/:itemId", (req, res) => {
  const item = inventory[req.params.itemId];
  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }
  res.json({
    id: req.params.itemId,
    available: item.qty,
    price: item.price,
    version: item.version,
  });
});

// POST /deduct
app.post("/deduct", (req, res) => {
  const { itemId, quantity, version } = req.body;
  const item = inventory[itemId];

  if (!item) {
    failedDeductions++;
    return res.status(404).json({ error: "Item not found" });
  }

  if (item.version !== version) {
    conflictCount++;
    failedDeductions++;
    return res.status(409).json({ error: "Conflict. Stock was updated. Retry." });
  }

  if (item.qty < quantity) {
    failedDeductions++;
    return res.status(400).json({ error: "Insufficient stock" });
  }

  item.qty -= quantity;
  item.version++;
  totalDeductions++;

  res.json({ success: true, remaining: item.qty, version: item.version });
});

// POST /refill/:itemId
app.post("/refill/:itemId", (req, res) => {
  const item = inventory[req.params.itemId];
  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }
  const { quantity } = req.body;
  item.qty += quantity;
  item.version++;
  res.json({ id: req.params.itemId, ...item });
});

// POST /orders
app.post("/orders", (req, res) => {
  const order = req.body;
  orderHistory.push(order);
  res.json({ success: true });
});

// GET /orders/all (must be before /:studentId to avoid conflict)
app.get("/orders/all", (req, res) => {
  res.json(orderHistory);
});

// GET /orders/:studentId
app.get("/orders/:studentId", (req, res) => {
  const orders = orderHistory.filter((o) => o.studentId === req.params.studentId);
  res.json(orders);
});

// PATCH /orders/:orderId
app.patch("/orders/:orderId", (req, res) => {
  const order = orderHistory.find((o) => o.orderId === req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  order.status = req.body.status;
  res.json(order);
});

// Health
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "stock-service", uptime: process.uptime() });
});

// Metrics
app.get("/metrics", (req, res) => {
  const avg =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  const inventorySnapshot = {};
  for (const [id, item] of Object.entries(inventory)) {
    inventorySnapshot[id] = item.qty;
  }
  res.json({
    totalDeductions,
    failedDeductions,
    conflictCount,
    avgResponseLatency: Math.round(avg * 100) / 100,
    inventorySnapshot,
  });
});

app.listen(PORT, () => {
  console.log(`[Stock Service] running on port ${PORT}`);
});

module.exports = app;
