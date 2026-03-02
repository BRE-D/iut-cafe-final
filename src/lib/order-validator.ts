export interface StockItem {
    id: string;
    name: string;
    qty: number;
}

export interface ComponentItem {
    id: string;
    name: string;
    qty: number;
}

export const BOX_COMPONENTS: Record<string, string[]> = {
    box1: ["beef_biryani", "payesh", "chicken_fry", "dates", "banana", "muri", "smc_electrolyte"],
    box2: ["murg_polao", "beef_halim", "samosa", "dates", "orange", "muri", "drinko"],
    box3: ["beef_biryani", "beef_halim", "chola", "dates", "banana", "muri", "laban"],
    box4: ["murg_polao", "beef_halim", "samosa", "dates", "apple", "muri", "drinko"],
    box5: ["beef_biryani", "samosa", "chola", "dates", "banana", "muri", "smc_electrolyte"],
    box6: ["chicken_biryani", "beef_halim", "beef_kebab", "dates", "watermelon_banana", "muri", "smc_electrolyte"],
    box7: ["mutton_biryani", "beef_halim", "chola", "dates", "banana", "muri", "laban"],
};

/**
 * Checks if a box is available based on component stock.
 */
export function isBoxAvailable(boxId: string, components: ComponentItem[]): { available: boolean; missing?: string } {
    const required = BOX_COMPONENTS[boxId];
    if (!required) return { available: true };

    for (const compId of required) {
        const comp = components.find(c => c.id === compId);
        if (!comp || comp.qty <= 0) {
            return { available: false, missing: comp?.name || compId };
        }
    }

    return { available: true };
}

/**
 * Validates an order.
 * Returns null if valid, or an error message if invalid.
 */
export function validateOrder(
    cart: Record<string, number>,
    stock: StockItem[],
    components: ComponentItem[]
): string | null {
    const entries = Object.entries(cart).filter(([, q]) => q > 0);
    if (entries.length === 0) return "Cart is empty";

    for (const [id, qty] of entries) {
        if (qty <= 0) return "Quantity must be positive";

        // 1. Check box-level stock
        const item = stock.find((s) => s.id === id);
        if (!item) return `Item ${id} not found in stock`;
        if (item.qty < qty) return `Insufficient stock for ${item.name} (Available: ${item.qty})`;

        // 2. Check component-level stock
        const availability = isBoxAvailable(id, components);
        if (!availability.available) {
            return `Item ${item.name} is unavailable because ${availability.missing} is out of stock`;
        }
    }

    return null;
}

/**
 * Deducts stock from the provided stock array.
 * Returns a new array with updated quantities.
 */
export function calculateStockDeduction<T extends { id: string; qty: number }>(
    stock: T[],
    itemId: string,
    quantity: number
): T[] {
    return stock.map(item =>
        item.id === itemId
            ? { ...item, qty: Math.max(0, item.qty - quantity) }
            : item
    );
}

