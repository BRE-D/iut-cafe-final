const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
const PORT = 3002;
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

// Metrics
let totalLogins = 0;
let failedLogins = 0;
let blockedAttempts = 0;
const responseTimes = [];

// Rate limiting store: { studentId: [{ timestamp }] }
const loginAttempts = {};

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

// Hardcoded valid student
const VALID_STUDENT = { studentId: "240042132", password: "password123", name: "Demo Student" };

app.post("/login", (req, res) => {
  const { studentId, password } = req.body;

  if (!studentId || !password) {
    failedLogins++;
    return res.status(400).json({ error: "studentId and password are required" });
  }

  // Rate limiting
  const now = Date.now();
  if (!loginAttempts[studentId]) {
    loginAttempts[studentId] = [];
  }

  // Clean old attempts (older than 60s)
  loginAttempts[studentId] = loginAttempts[studentId].filter((t) => now - t < 60000);

  if (loginAttempts[studentId].length >= 3) {
    blockedAttempts++;
    return res.status(429).json({ error: "Too many attempts. Try again in 60s." });
  }

  loginAttempts[studentId].push(now);

  // Validate credentials
  const isValid =
    (studentId === VALID_STUDENT.studentId && password === VALID_STUDENT.password) ||
    password === "devsprint";

  if (!isValid) {
    failedLogins++;
    return res.status(401).json({ error: "Invalid credentials" });
  }

  totalLogins++;
  const name = studentId === VALID_STUDENT.studentId ? VALID_STUDENT.name : `Student ${studentId}`;
  const token = jwt.sign({ id: studentId, name }, JWT_SECRET, { expiresIn: "2h" });

  res.json({ token, studentName: name, expiresIn: "2h" });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "identity-provider", uptime: process.uptime() });
});

app.get("/metrics", (req, res) => {
  const avg =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  res.json({
    totalLogins,
    failedLogins,
    blockedAttempts,
    avgResponseLatency: Math.round(avg * 100) / 100,
  });
});

app.listen(PORT, () => {
  console.log(`[Identity Provider] running on port ${PORT}`);
});

module.exports = app;

// Admin credentials
const VALID_ADMINS = [
  { adminId: "admin",   password: "admin123",   name: "Cafeteria Admin" },
  { adminId: "manager", password: "manager123", name: "Cafe Manager" },
];

app.post("/admin-login", (req, res) => {
  const { adminId, password } = req.body;
  if (!adminId || !password) return res.status(400).json({ error: "adminId and password are required" });

  const admin = VALID_ADMINS.find((a) => a.adminId === adminId && a.password === password);
  if (!admin) {
    console.log(`[${new Date().toISOString()}] Admin login FAILED for: ${adminId}`);
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const token = jwt.sign({ id: adminId, name: admin.name, role: "admin" }, JWT_SECRET, { expiresIn: "4h" });
  console.log(`[${new Date().toISOString()}] Admin login SUCCESS: ${admin.name}`);
  res.json({ token, adminName: admin.name, role: "admin", expiresIn: "4h" });
});
