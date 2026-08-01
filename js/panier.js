/**
 * AutoDiag Suisse — page panier
 */
(function () {
  "use strict";

  const emptyEl = document.getElementById("cart-empty");
  const contentEl = document.getElementById("cart-content");
  const listEl = document.getElementById("cart-items");
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");
  const toast = document.getElementById("toast");

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function render() {
    const Cart = window.AutoDiagCart;
    if (!Cart || !listEl) return;

    const items = Cart.getItems();
    Cart.updateBadge();

    if (!items.length) {
      emptyEl.hidden = false;
      contentEl.hidden = true;
      listEl.innerHTML = "";
      return;
    }

    emptyEl.hidden = true;
    contentEl.hidden = false;

    const removeLabel = AutoDiagI18n?.t("remove") || "Retirer";

    listEl.innerHTML = items
      .map((item) => {
        const line = (Number(item.price) || 0) * (Number(item.qty) || 0);
        return `
          <li class="cart-item" data-id="${item.id}">
            <div class="cart-item-product">
              <a href="index.html">
                <img src="${item.image}" alt="" width="96" height="96">
              </a>
              <div class="cart-item-info">
                <a href="index.html" class="cart-item-name">${item.name}</a>
                <button type="button" class="cart-item-remove" data-action="remove">${removeLabel}</button>
              </div>
            </div>
            <div class="cart-item-price">${Cart.formatPrice(item.price)}</div>
            <div class="cart-item-qty">
              <div class="qty-control compact">
                <button type="button" data-action="dec" aria-label="-">−</button>
                <input type="number" value="${item.qty}" min="1" max="99" data-action="qty" aria-label="Quantité">
                <button type="button" data-action="inc" aria-label="+">+</button>
              </div>
            </div>
            <div class="cart-item-total">${Cart.formatPrice(line)}</div>
          </li>
        `;
      })
      .join("");

    const sum = Cart.getSubtotal();
    subtotalEl.textContent = Cart.formatPrice(sum);
    totalEl.textContent = Cart.formatPrice(sum);
  }

  function bindList() {
    listEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      const row = e.target.closest(".cart-item");
      if (!btn || !row) return;

      const id = row.getAttribute("data-id");
      const item = AutoDiagCart.getItems().find((entry) => entry.id === id);
      if (!item) return;

      const action = btn.getAttribute("data-action");
      if (action === "remove") {
        AutoDiagCart.remove(id);
        render();
      } else if (action === "dec") {
        AutoDiagCart.setQty(id, Number(item.qty) - 1);
        render();
      } else if (action === "inc") {
        AutoDiagCart.setQty(id, Number(item.qty) + 1);
        render();
      }
    });

    listEl?.addEventListener("change", (e) => {
      const input = e.target.closest('input[data-action="qty"]');
      const row = e.target.closest(".cart-item");
      if (!input || !row) return;
      AutoDiagCart.setQty(row.getAttribute("data-id"), input.value);
      render();
    });
  }

  function init() {
    bindList();
    render();

    document.addEventListener("autodiag:lang-changed", render);

    // Checkout is an <a> to Stripe — ensure empty cart cannot proceed
    checkoutBtn?.addEventListener("click", (e) => {
      if (!AutoDiagCart.getItems().length) {
        e.preventDefault();
        showToast(AutoDiagI18n?.t("cartEmpty") || "Votre panier est vide.");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
