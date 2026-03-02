const request = require("supertest");
const app = require("../index");

let server;

beforeAll((done) => {
  // The app already listens on 3001 from require, so we close it and re-listen on a random port
  // Actually, we need to handle this differently. Let's stop the default listener.
  // Since the module calls app.listen, we need to handle the server reference.
  // For testing, we'll use supertest which handles this automatically.
  done();
});

afterAll((done) => {
  done();
});

describe("Test Suite 1 — Stock Deduction Logic", () => {
  test("should deduct stock successfully with correct version", async () => {
    // First get current version
    const check = await request(app).get("/check/burger");
    const version = check.body.version;

    const res = await request(app)
      .post("/deduct")
      .send({ itemId: "burger", quantity: 1, version });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.remaining).toBeDefined();
    expect(res.body.version).toBe(version + 1);
  });

  test("should return 409 when version mismatch (optimistic lock conflict)", async () => {
    const res = await request(app)
      .post("/deduct")
      .send({ itemId: "burger", quantity: 1, version: 9999 });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("Conflict");
  });

  test("should return 400 when insufficient stock", async () => {
    const check = await request(app).get("/check/biryani");
    const res = await request(app)
      .post("/deduct")
      .send({ itemId: "biryani", quantity: 99999, version: check.body.version });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Insufficient stock");
  });

  test("should return 404 when item does not exist", async () => {
    const res = await request(app)
      .post("/deduct")
      .send({ itemId: "nonexistent", quantity: 1, version: 0 });

    expect(res.status).toBe(404);
  });

  test("should increment version after successful deduction", async () => {
    const check1 = await request(app).get("/check/water");
    const v1 = check1.body.version;

    await request(app)
      .post("/deduct")
      .send({ itemId: "water", quantity: 1, version: v1 });

    const check2 = await request(app).get("/check/water");
    expect(check2.body.version).toBe(v1 + 1);
  });

  test("should prevent over-selling (concurrent deductions reduce qty to minimum 0)", async () => {
    // Refill to known quantity
    const check = await request(app).get("/check/juice");

    // Try to deduct more than available
    const res = await request(app)
      .post("/deduct")
      .send({ itemId: "juice", quantity: check.body.available + 1, version: check.body.version });

    expect(res.status).toBe(400);
  });
});

describe("Test Suite 2 — Order Validation", () => {
  test("should save order record successfully via POST /orders", async () => {
    const res = await request(app)
      .post("/orders")
      .send({
        orderId: "ORD-TEST01",
        studentId: "240042132",
        itemId: "burger",
        quantity: 1,
        price: 80,
        status: "Pending",
        timestamp: new Date().toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("should retrieve orders by studentId", async () => {
    const res = await request(app).get("/orders/240042132");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].studentId).toBe("240042132");
  });

  test("should return empty array for student with no orders", async () => {
    const res = await request(app).get("/orders/nonexistent-student");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test("should update order status via PATCH /orders/:orderId", async () => {
    const res = await request(app)
      .patch("/orders/ORD-TEST01")
      .send({ status: "Ready" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("Ready");
  });
});

describe("Test Suite 3 — Menu", () => {
  test("should return all 6 menu items", async () => {
    const res = await request(app).get("/menu");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(6);
  });

  test("should return correct item on GET /check/:itemId", async () => {
    const res = await request(app).get("/check/pizza");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("pizza");
    expect(res.body.price).toBe(120);
  });

  test("should return 404 for non-existent item", async () => {
    const res = await request(app).get("/check/sushi");
    expect(res.status).toBe(404);
  });
});
