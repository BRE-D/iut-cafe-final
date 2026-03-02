import { describe, it, expect } from "vitest";
import { validateOrder, calculateStockDeduction, isBoxAvailable, type StockItem, type ComponentItem } from "./order-validator";

describe("Order Validator Logic", () => {
    const mockStock: StockItem[] = [
        { id: "box1", name: "Box 1", qty: 10 },
        { id: "box2", name: "Box 2", qty: 5 },
    ];

    const mockComponents: ComponentItem[] = [
        { id: "beef_biryani", name: "Beef Biryani", qty: 100 },
        { id: "payesh", name: "Payesh", qty: 100 },
        { id: "chicken_fry", name: "Chicken Fry", qty: 0 },
        { id: "dates", name: "Dates", qty: 10 },
        { id: "banana", name: "Banana", qty: 10 },
        { id: "muri", name: "Muri", qty: 10 },
        { id: "smc_electrolyte", name: "SMC", qty: 10 },
        { id: "murg_polao", name: "Murg Polao", qty: 50 },
        { id: "beef_halim", name: "Beef Halim", qty: 50 },
        { id: "samosa", name: "Samosa", qty: 50 },
        { id: "orange", name: "Orange", qty: 50 },
        { id: "drinko", name: "Drinko", qty: 50 },
        { id: "apple", name: "Apple", qty: 50 },
    ];

    describe("isBoxAvailable", () => {
        it("should return false if a required component is out of stock", () => {
            // Box 1 requires chicken_fry (qty: 0)
            const result = isBoxAvailable("box1", mockComponents);
            expect(result.available).toBe(false);
            expect(result.missing).toBe("Chicken Fry");
        });

        it("should return true if all required components are in stock", () => {
            // Box 2 requires murg_polao, beef_halim, samosa, dates, orange, muri, drinko
            const result = isBoxAvailable("box2", mockComponents);
            expect(result.available).toBe(true);
        });
    });

    describe("validateOrder", () => {
        it("should return error if cart is empty", () => {
            const error = validateOrder({}, mockStock, mockComponents);
            expect(error).toBe("Cart is empty");
        });

        it("should return error if stock is insufficient", () => {
            const cart = { box2: 10 }; // Only 5 in stock
            const error = validateOrder(cart, mockStock, mockComponents);
            expect(error).toContain("Insufficient stock for Box 2");
        });

        it("should return error if component is missing", () => {
            const cart = { box1: 1 }; // Box 1 mission chicken_fry
            const error = validateOrder(cart, mockStock, mockComponents);
            expect(error).toContain("unavailable because Chicken Fry is out of stock");
        });

        it("should return null if everything is valid", () => {
            const cart = { box2: 1 };
            const error = validateOrder(cart, mockStock, mockComponents);
            expect(error).toBeNull();
        });
    });

    describe("calculateStockDeduction", () => {
        it("should correctly reduce quantity", () => {
            const result = calculateStockDeduction(mockStock, "box1", 3);
            const box1 = result.find(i => i.id === "box1");
            expect(box1?.qty).toBe(7);
        });

        it("should not reduce below zero", () => {
            const result = calculateStockDeduction(mockStock, "box2", 10);
            const box2 = result.find(i => i.id === "box2");
            expect(box2?.qty).toBe(0);
        });
    });
});
