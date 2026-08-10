/**
 * AutoDiag Suisse — page panier + checkout Stripe
 *
 * Flux :
 * 1) POST /api/create-checkout (quantité réelle + adresse collectée par Stripe)
 * 2) Si l’API est indisponible → fallback Payment Link (même compte marchand)
 * 3) Après paiement → webhook → e-mail avec adresse à ORDER_NOTIFY_EMAIL
 */
(function () {
  "use strict";

  /** Payment Link du CRP123E (compte Stripe marchand) — secours si l’API échoue */
  const STRIPE_PAYMENT_LINK =
    "https://buy.stripe.com/8x2fZh3OwcsU5wK60w2kw00";

  const emptyEl = document.getElementById("cart-empty");
  const contentEl = document.getElementById("cart-content");
  const listEl = document.getElementById("cart-items");
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");
  const toast = document.getElementById("toast");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeImageSrc(src) {
    const value = String(src || "").trim();
    if (/^images\/[A-Za-z0-9._%-]+$/i.test(value)) return value;
    return "images/hoto1.png";
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 3600);
  }

  function setCheckoutLoading(loading) {
    if (!checkoutBtn) return;
    checkoutBtn.disabled = loading;
    checkoutBtn.setAttribute("aria-busy", loading ? "true" : "false");
    const dict = AutoDiagI18n?.dicts?.[AutoDiagI18n.getLang()] || {};
    checkoutBtn.textContent = loading
      ? dict.checkoutLoading || "Redirection…"
      : dict.checkout || AutoDiagI18n?.t("checkout") || "Passer commande";
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
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    emptyEl.hidden = true;
    contentEl.hidden = false;
    if (checkoutBtn) checkoutBtn.disabled = false;

    const removeLabel = AutoDiagI18n?.t("remove") || "Retirer";

    listEl.innerHTML = items
      .map((item) => {
        const line = (Number(item.price) || 0) * (Number(item.qty) || 0);
        const id = escapeHtml(item.id);
        const name = escapeHtml(item.name);
        const image = escapeHtml(safeImageSrc(item.image));
        const qty = Math.min(99, Math.max(1, Number(item.qty) || 1));
        return `
          <li class="cart-item" data-id="${id}">
            <div class="cart-item-product">
              <a href="index.html">
                <img src="${image}" alt="" width="96" height="96" loading="lazy" decoding="async">
              </a>
              <div class="cart-item-info">
                <a href="index.html" class="cart-item-name">${name}</a>
                <button type="button" class="cart-item-remove" data-action="remove">${escapeHtml(removeLabel)}</button>
              </div>
            </div>
            <div class="cart-item-price">${Cart.formatPrice(item.price)}</div>
            <div class="cart-item-qty">
              <div class="qty-control compact">
                <button type="button" data-action="dec" aria-label="-">−</button>
                <input type="number" value="${qty}" min="1" max="99" data-action="qty" aria-label="Quantité" inputmode="numeric">
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

      const action = btn.getAttribute("data-action");
      if (action === "qty") return;

      const id = row.getAttribute("data-id");
      const item = AutoDiagCart.getItems().find((entry) => entry.id === id);
      if (!item) return;

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

  function goToPaymentLink() {
    try {
      sessionStorage.setItem("autodiag_checkout_pending", "1");
    } catch {
      /* ignore */
    }
    window.location.href = STRIPE_PAYMENT_LINK;
  }

  async function startCheckout() {
    const Cart = window.AutoDiagCart;
    if (!Cart) return;

    const items = Cart.getItems();
    if (!items.length) {
      showToast(AutoDiagI18n?.t("cartEmpty") || "Votre panier est vide.");
      return;
    }

    setCheckoutLoading(true);

    try {
      sessionStorage.setItem("autodiag_checkout_pending", "1");
    } catch {
      /* ignore */
    }

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          locale: AutoDiagI18n?.getLang?.() || "fr",
          items: items.map((item) => ({
            id: item.id,
            qty: item.qty,
          })),
        }),
      });

      // API absente (ex. hébergement sans Netlify Functions) → Payment Link
      if (res.status === 404 || res.status === 405) {
        console.warn(
          "create-checkout indisponible — fallback Payment Link Stripe"
        );
        goToPaymentLink();
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.url) {
        console.warn("create-checkout a échoué — fallback Payment Link", data);
        goToPaymentLink();
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      // Réseau / CORS / site statique seul → ne jamais bloquer l’achat
      console.error("Checkout API error, fallback Payment Link:", err);
      goToPaymentLink();
    }
  }

  function init() {
    bindList();
    render();

    document.addEventListener("autodiag:lang-changed", () => {
      const busy = checkoutBtn?.getAttribute("aria-busy") === "true";
      render();
      if (busy) setCheckoutLoading(true);
    });

    checkoutBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (checkoutBtn.disabled) return;
      startCheckout();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
