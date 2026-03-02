const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3005;

// In-memory SSE clients
const clients = {};

// Metrics
let totalNotificationsSent = 0;
let totalConnectionsEver = 0;

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const latency = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${latency}ms`);
  });
  next();
});

// SSE endpoint
app.get("/events/:studentId", (req, res) => {
  const { studentId } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Register client
  if (!clients[studentId]) {
    clients[studentId] = [];
  }
  clients[studentId].push(res);
  totalConnectionsEver++;

  // Send initial event
  res.write(`data: ${JSON.stringify({ type: "connected", message: "Connected to notification stream" })}\n\n`);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    if (clients[studentId]) {
      clients[studentId] = clients[studentId].filter((c) => c !== res);
      if (clients[studentId].length === 0) {
        delete clients[studentId];
      }
    }
  });
});

// Notify endpoint
app.post("/notify", (req, res) => {
  const { orderId, studentId, status, itemId, timestamp } = req.body;

  const payload = JSON.stringify({
    type: "orderUpdate",
    orderId,
    status,
    itemId,
    timestamp: timestamp || new Date().toISOString(),
  });

  const studentClients = clients[studentId] || [];

  if (studentClients.length === 0) {
    console.warn(`[WARN] No active SSE connections for student ${studentId}`);
  }

  studentClients.forEach((client) => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (err) {
      console.warn(`[WARN] Failed to send SSE to client: ${err.message}`);
    }
  });

  totalNotificationsSent++;

  res.json({ delivered: true, connectionsFound: studentClients.length });
});

// Health
app.get("/health", (req, res) => {
  let activeConnections = 0;
  for (const studentId in clients) {
    activeConnections += clients[studentId].length;
  }
  res.json({
    status: "healthy",
    service: "notification-hub",
    activeConnections,
    uptime: process.uptime(),
  });
});

// Metrics
app.get("/metrics", (req, res) => {
  let activeConnections = 0;
  for (const studentId in clients) {
    activeConnections += clients[studentId].length;
  }
  res.json({
    activeConnections,
    totalNotificationsSent,
    totalConnectionsEver,
  });
});

app.listen(PORT, () => {
  console.log(`[Notification Hub] running on port ${PORT}`);
});

module.exports = app;
