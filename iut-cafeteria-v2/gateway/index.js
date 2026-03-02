const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

const STOCK_URL = process.env.STOCK_SERVICE_URL || "http://stock-service:3001";
const IDENTITY_URL = process.env.IDENTITY_SERVICE_URL || "http://identity-provider:3002";
const NOTIFICATION_URL = process.env.NOTIFICATION_HUB_URL || "http://notification-hub:3005";

// In-memory structures
const cache = {};
const kitchenQueue = [];
const idempotencyStore = {};
const metrics = { totalOrders: 0, failedOrders: 0, responseTimes: [] };

// Cleanup expired idempotency keys every minute
setInterval(() => {
  const now = Date.now();
  for (const key in idempotencyStore) {
    if (now - idempotencyStore[key].createdAt > 10 * 60 * 1000) {
      delete idempotencyStore[key];
    }
  }
}, 60000);

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const latency = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${latency}ms`);
    metrics.responseTimes.push(latency);
    if (metrics.responseTimes.length > 100) {
      metrics.responseTimes.shift();
    }
  });
  next();
});

// JWT middleware
function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Valid token required." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.student = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized. Valid token required." });
  }
}

// Cache helpers
function getFromCache(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.cachedAt < 5000) {
    return entry;
  }
  return null;
}

function setCache(key, data) {
  cache[key] = { ...data, cachedAt: Date.now() };
}

function invalidateCache(key) {
  delete cache[key];
}

// Kitchen status updater
async function updateKitchenStatus(orderId, status) {
  const entry = kitchenQueue.find((o) => o.orderId === orderId);
  if (entry) {
    entry.status = status;
  }
  try {
    await axios.patch(`${STOCK_URL}/orders/${orderId}`, { status });
  } catch (err) {
    console.warn(`[WARN] Failed to update order status in stock-service: ${err.message}`);
  }
  try {
    const studentId = entry ? entry.studentId : null;
    await axios.post(`${NOTIFICATION_URL}/notify`, {
      orderId,
      studentId,
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[WARN] Notification hub unreachable. Graceful degradation. ${err.message}`);
  }
}

// --- ROUTES ---

// Auth proxy
app.post("/auth/login", async (req, res) => {
  try {
    const response = await axios.post(`${IDENTITY_URL}/login`, req.body);
    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(503).json({ error: "Identity service unavailable" });
    }
  }
});


// Admin login proxy
app.post("/auth/admin-login", async (req, res) => {
  try {
    const response = await axios.post(`${IDENTITY_URL}/admin-login`, req.body);
    res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(503).json({ error: "Identity service unavailable" });
    }
  }
});

// Menu proxy (public)
app.get("/stock/menu", async (req, res) => {
  const cached = getFromCache("menu");
  if (cached) {
    return res.json(cached.data);
  }
  try {
    const response = await axios.get(`${STOCK_URL}/menu`);
    setCache("menu", { data: response.data });
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ error: "Stock service unavailable" });
  }
});

// Stock check proxy (public)
app.get("/stock/check/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const cached = getFromCache(itemId);
  if (cached) {
    return res.json({ ...cached, fromCache: true });
  }
  try {
    const response = await axios.get(`${STOCK_URL}/check/${itemId}`);
    setCache(itemId, response.data);
    res.json(response.data);
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(503).json({ error: "Stock service unavailable" });
    }
  }
});

// Order (protected)
app.post("/order", validateToken, async (req, res) => {
  const idempotencyKey = req.headers["x-idempotency-key"];

  // Check idempotency
  if (idempotencyKey && idempotencyStore[idempotencyKey]) {
    return res.json(idempotencyStore[idempotencyKey].response);
  }

  const { itemId, quantity } = req.body;

  // Validate body
  if (!itemId || !quantity || quantity < 1) {
    return res.status(400).json({ error: "itemId and quantity (>= 1) are required." });
  }

  // Cache shield
  const cached = getFromCache(itemId);
  if (cached && cached.qty === 0) {
    console.log(`🛡 Cache shield activated for ${itemId}`);
    metrics.failedOrders++;
    return res.status(400).json({ error: "Out of stock (cached). Request blocked." });
  }

  try {
    // Fetch fresh stock
    const stockRes = await axios.get(`${STOCK_URL}/check/${itemId}`);
    const stockData = stockRes.data;

    if (stockData.available < quantity) {
      metrics.failedOrders++;
      return res.status(400).json({ error: "Insufficient stock" });
    }

    // Deduct stock with optimistic locking
    let deductRes;
    try {
      deductRes = await axios.post(`${STOCK_URL}/deduct`, {
        itemId,
        quantity,
        version: stockData.version,
      });
    } catch (deductErr) {
      if (deductErr.response && deductErr.response.status === 409) {
        metrics.failedOrders++;
        return res.status(409).json({ error: "Stock conflict. Please retry." });
      }
      metrics.failedOrders++;
      return res.status(503).json({ error: "Stock service unavailable" });
    }

    // Invalidate cache
    invalidateCache(itemId);
    invalidateCache("menu");

    // Generate order ID
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const orderId = `ORD-${randomPart}`;

    const orderRecord = {
      orderId,
      studentId: req.student.id,
      itemId,
      quantity,
      price: stockData.price * quantity,
      status: "Pending",
      timestamp: new Date().toISOString(),
    };

    // Save order to stock-service
    try {
      await axios.post(`${STOCK_URL}/orders`, orderRecord);
    } catch (err) {
      console.warn(`[WARN] Failed to save order to stock-service: ${err.message}`);
    }

    // Push to kitchen queue
    kitchenQueue.push({ ...orderRecord });

    // Async kitchen progression (fire and forget)
    setTimeout(() => updateKitchenStatus(orderId, "Stock Verified"), 2000);
    setTimeout(() => updateKitchenStatus(orderId, "In Kitchen"), 6000);
    setTimeout(() => updateKitchenStatus(orderId, "Ready"), 14000);

    const responsePayload = {
      orderId,
      status: "Pending",
      estimatedTime: "3-7 minutes",
      itemId,
      quantity,
      price: stockData.price * quantity,
    };

    // Store idempotency
    if (idempotencyKey) {
      idempotencyStore[idempotencyKey] = {
        response: responsePayload,
        createdAt: Date.now(),
      };
    }

    metrics.totalOrders++;
    res.json(responsePayload);
  } catch (err) {
    metrics.failedOrders++;
    res.status(503).json({ error: "Stock service unavailable" });
  }
});

// Orders by student (protected)
app.get("/orders/:studentId", validateToken, async (req, res) => {
  try {
    const response = await axios.get(`${STOCK_URL}/orders/${req.params.studentId}`);
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ error: "Stock service unavailable" });
  }
});

// Kitchen queue (admin, no auth)
app.get("/kitchen/queue", (req, res) => {
  res.json(kitchenQueue);
});

// Health check
app.get("/health", async (req, res) => {
  const checks = await Promise.allSettled([
    axios.get(`${STOCK_URL}/health`),
    axios.get(`${IDENTITY_URL}/health`),
    axios.get(`${NOTIFICATION_URL}/health`),
  ]);

  const dependencies = {
    stock: checks[0].status === "fulfilled" ? "up" : "down",
    identity: checks[1].status === "fulfilled" ? "up" : "down",
    notification: checks[2].status === "fulfilled" ? "up" : "down",
  };

  const allHealthy = Object.values(dependencies).every((v) => v === "up");

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "healthy" : "degraded",
    service: "gateway",
    dependencies,
    uptime: process.uptime(),
  });
});

// Metrics
app.get("/metrics", (req, res) => {
  const avg =
    metrics.responseTimes.length > 0
      ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
      : 0;
  res.json({
    totalOrders: metrics.totalOrders,
    failedOrders: metrics.failedOrders,
    avgResponseLatency: Math.round(avg * 100) / 100,
    cacheSize: Object.keys(cache).length,
    queueLength: kitchenQueue.length,
  });
});

app.listen(PORT, () => {
  console.log(`[Gateway] running on port ${PORT}`);
});
