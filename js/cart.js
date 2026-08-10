/**
 * AutoDiag Suisse — panier partagé (localStorage)
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "autodiag_cart";
  const LEGACY_IMAGE_MAP = {
    "images/hoto%26.png": "images/hoto1.png",
    "images/hoto&.png": "images/hoto1.png",
  };

  function normalizeImage(image) {
    const raw = String(image || "").trim();
    if (LEGACY_IMAGE_MAP[raw]) return LEGACY_IMAGE_MAP[raw];
    if (/^images\/[A-Za-z0-9._%-]+$/i.test(raw)) return raw;
    return "images/hoto1.png";
  }

  function sanitizeItem(item) {
    if (!item || typeof item !== "object") return null;
    const id = String(item.id || "").trim();
    if (!id) return null;

    return {
      id,
      name: String(item.name || "Produit").slice(0, 200),
      price: Math.max(0, Number(item.price) || 0),
      image: normalizeImage(item.image),
      qty: Math.min(99, Math.max(1, Number(item.qty) || 1)),
    };
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data)) return [];
      return data.map(sanitizeItem).filter(Boolean);
    } catch {
      return [];
    }
  }

  function write(items) {
    const clean = items.map(sanitizeItem).filter(Boolean);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    document.dispatchEvent(new CustomEvent("autodiag:cart-updated"));
  }

  function totalQty(items) {
    return items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  function subtotal(items) {
    return items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );
  }

  const Cart = {
    getItems() {
      return read();
    },

    getCount() {
      return totalQty(read());
    },

    getSubtotal() {
      return subtotal(read());
    },

    add(product, qty) {
      const amount = Math.min(99, Math.max(1, Number(qty) || 1));
      const items = read();
      const existing = items.find((item) => item.id === product.id);

      if (existing) {
        existing.qty = Math.min(99, (Number(existing.qty) || 0) + amount);
      } else {
        const next = sanitizeItem({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          qty: amount,
        });
        if (!next) return items;
        items.push(next);
      }

      write(items);
      return items;
    },

    setQty(id, qty) {
      const items = read();
      const item = items.find((entry) => entry.id === id);
      if (!item) return items;

      const next = Math.min(99, Math.max(0, Number(qty) || 0));
      if (next <= 0) {
        write(items.filter((entry) => entry.id !== id));
      } else {
        item.qty = next;
        write(items);
      }
      return read();
    },

    remove(id) {
      write(read().filter((item) => item.id !== id));
      return read();
    },

    clear() {
      write([]);
    },

    formatPrice(value) {
      return `${Number(value).toFixed(2)} CHF`;
    },

    updateBadge() {
      const count = Cart.getCount();
      document.querySelectorAll("#cart-count, .cart-count").forEach((el) => {
        el.textContent = String(count);
        el.setAttribute("data-count", String(count));
      });
    },
  };

  document.addEventListener("autodiag:cart-updated", () => Cart.updateBadge());
  document.addEventListener("DOMContentLoaded", () => Cart.updateBadge());

  global.AutoDiagCart = Cart;
})(window);
