/**
 * AutoDiag Suisse — panier partagé (localStorage)
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "autodiag_cart";

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent("autodiag:cart-updated"));
  }

  function totalQty(items) {
    return items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  function subtotal(items) {
    return items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
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
        items.push({
          id: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.image,
          qty: amount,
        });
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
