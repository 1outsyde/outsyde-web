// lib/cart.ts
// Outsyde shared cart store — multi-vendor ready, no backend/secrets.
// Persists to localStorage so the cart survives refreshes and page changes.
//
// WHERE THIS GOES:  outsyde-web/lib/cart.ts   (create a "lib" folder at the project root)

export type CartItem = {
  id: string;          // unique product id
  name: string;        // shopper-facing name
  price: number;       // BASE price in dollars (e.g. 10.00)
  qty: number;
  vendor: string;      // display name, e.g. "Lotus House Blends"
  vendorId: string;    // stable id for grouping + Stripe destination later, e.g. "lotus"
  image?: string;
};

const KEY = "outsyde_cart_v1";
const EVENT = "outsyde-cart-changed";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT));
}

export function getCart(): CartItem[] {
  return read();
}

export function addToCart(item: Omit<CartItem, "qty"> & { qty?: number }) {
  const items = read();
  const existing = items.find((i) => i.id === item.id);
  if (existing) {
    existing.qty += item.qty || 1;
  } else {
    items.push({ ...item, qty: item.qty || 1 });
  }
  write(items);
}

export function setQty(id: string, qty: number) {
  let items = read();
  if (qty <= 0) {
    items = items.filter((i) => i.id !== id);
  } else {
    items = items.map((i) => (i.id === id ? { ...i, qty } : i));
  }
  write(items);
}

export function removeFromCart(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function clearCart() {
  write([]);
}

// Subscribe to any cart change (same tab + other tabs). Returns an unsubscribe fn.
export function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}