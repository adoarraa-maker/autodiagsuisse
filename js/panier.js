/**
 * AutoDiag Suisse — page panier + checkout Stripe
 *
 * Flux :
 * 1) POST /api/create-checkout (quantité réelle + adresse collectée par Stripe)
 * 2) Si l’API est indisponible → fallback Payment Link du produit concerné
 * 3) Après paiement → webhook → e-mail avec adresse à ORDER_NOTIFY_EMAIL
 */
try {
  if (localStorage.getItem("ads_purged_v5") !== "1") {
    localStorage.clear();
    localStorage.setItem("ads_purged_v5", "1");
  }
} catch (e) {}

(function () {
  "use strict";

  /** Payment Links Stripe — utilisés dès qu’un seul produit est dans le panier. */
  const STRIPE_PAYMENT_LINKS = {
    "launch-crp123e-v3-elite": "https://buy.stripe.com/fZu14o2sxcju0FNef1cAo0h",
    "launch-creader-cr300": "https://buy.stripe.com/aFa14o4AF6Zabkr3AncAo0g",
  };
  const PRODUCT_CATALOG = [
    {
      id: "launch-crp123e-v3-elite",
      name: "Scanner de Diagnostic Auto Professionnel LAUNCH CRP123E V3.0 Elite",
      price: 139.9,
      image: "images/crp123e-v3-1.png",
    },
    {
      id: "launch-creader-cr300",
      name: "Scanner de Diagnostic Auto Multimarque - Launch Creader CR300",
      price: 39,
      image: "Autodiasuisse1.png",
    },
  ];

  const emptyEl = document.getElementById("cart-empty");
  const contentEl = document.getElementById("cart-content");
  const listEl = document.getElementById("cart-items");
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");
  const checkoutBtnSticky = document.getElementById("checkout-btn-sticky");
  const stickyCheckoutEl = document.getElementById("cart-sticky-checkout");
  const stickyTotalEl = document.getElementById("cart-sticky-total");
  const toast = document.getElementById("toast");
  const crossSellEl = document.getElementById("cart-cross-sell");
  const crossSellItemsEl = document.getElementById("cart-cross-sell-items");
  const checkoutButtons = [checkoutBtn, checkoutBtnSticky].filter(Boolean);

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
    if (/^(?:images\/)?[A-Za-z0-9._%-]+$/i.test(value)) return value;
    return "images/crp123e-v3-1.png";
  }

  function productUrl(id) {
    return id === "launch-creader-cr300" ? "cr300.html" : "index.html";
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 3600);
  }

  function checkoutLabel(loading) {
    const dict = AutoDiagI18n?.dicts?.[AutoDiagI18n.getLang()] || {};
    return loading
      ? dict.checkoutLoading || "Redirection…"
      : dict.checkout || AutoDiagI18n?.t("checkout") || "Valider la commande / Payer";
  }

  function setCheckoutLoading(loading) {
    const label = checkoutLabel(loading);
    checkoutButtons.forEach((btn) => {
      btn.disabled = loading;
      btn.setAttribute("aria-busy", loading ? "true" : "false");
      btn.textContent = label;
    });
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
      if (stickyCheckoutEl) stickyCheckoutEl.hidden = true;
      checkoutButtons.forEach((btn) => {
        btn.disabled = true;
      });
      return;
    }

    emptyEl.hidden = true;
    contentEl.hidden = false;
    if (stickyCheckoutEl) stickyCheckoutEl.hidden = false;
    checkoutButtons.forEach((btn) => {
      btn.disabled = false;
    });

    const removeLabel = AutoDiagI18n?.t("remove") || "Retirer";

    listEl.innerHTML = items
      .map((item) => {
        const id = escapeHtml(item.id);
        const name = escapeHtml(item.name);
        const url = productUrl(item.id);
        const qty = Math.min(99, Math.max(1, Number(item.qty) || 1));
        return `
          <li class="cart-item" data-id="${id}">
            <div class="cart-item-product">
              <div class="cart-item-info">
                <a href="${url}" class="cart-item-name">${name}</a>
                <span class="cart-item-inline-price">${Cart.formatPrice(item.price)}</span>
              </div>
            </div>
            <div class="cart-item-qty">
              <div class="qty-control compact">
                <button type="button" data-action="dec" aria-label="-">−</button>
                <input type="number" value="${qty}" min="1" max="99" data-action="qty" aria-label="Quantité" inputmode="numeric">
                <button type="button" data-action="inc" aria-label="+">+</button>
              </div>
              <button type="button" class="cart-item-remove" data-action="remove">${escapeHtml(removeLabel)}</button>
            </div>
          </li>
        `;
      })
      .join("");

    const sum = Cart.getSubtotal();
    const formatted = Cart.formatPrice(sum);
    subtotalEl.textContent = formatted;
    totalEl.textContent = formatted;
    if (stickyTotalEl) stickyTotalEl.textContent = formatted;

    if (crossSellEl && crossSellItemsEl) {
      crossSellEl.hidden = PRODUCT_CATALOG.length === 0;
      crossSellItemsEl.innerHTML = PRODUCT_CATALOG
        .map(
          (product) => `
            <article class="cart-cross-sell-card">
              <div class="cart-cross-sell-card-info">
                <a href="${productUrl(product.id)}">${escapeHtml(product.name)}</a>
                <strong>${Cart.formatPrice(product.price)}</strong>
                <button type="button" data-cross-sell-id="${escapeHtml(product.id)}">Ajouter au panier</button>
              </div>
            </article>
          `
        )
        .join("");
    }
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

  function bindCrossSell() {
    crossSellItemsEl?.addEventListener("click", (e) => {
      const button = e.target.closest("[data-cross-sell-id]");
      if (!button || !window.AutoDiagCart) return;

      const product = PRODUCT_CATALOG.find(
        (entry) => entry.id === button.dataset.crossSellId
      );
      if (!product) return;

      AutoDiagCart.add(product, 1);
      render();
      showToast(`1 × ${product.name} ajouté au panier`);
    });
  }

  function goToPaymentLink(url) {
    try {
      sessionStorage.setItem("autodiag_checkout_pending", "1");
    } catch {
      /* ignore */
    }
    window.location.href = url;
  }

  function paymentLinkFor(items) {
    if (items.length !== 1) return "";
    return STRIPE_PAYMENT_LINKS[items[0].id] || "";
  }

  function handleCheckoutFailure(items, detail) {
    const paymentLink = paymentLinkFor(items);
    if (paymentLink) {
      console.warn("create-checkout a échoué — fallback Payment Link", detail);
      goToPaymentLink(paymentLink);
      return;
    }

    try {
      sessionStorage.removeItem("autodiag_checkout_pending");
    } catch {
      /* ignore */
    }
    setCheckoutLoading(false);
    showToast(
      AutoDiagI18n?.t("checkoutError") ||
        "Impossible de démarrer le paiement. Réessayez."
    );
  }

  async function startCheckout() {
    const Cart = window.AutoDiagCart;
    if (!Cart) return;

    const items = Cart.getItems();
    if (!items.length) {
      showToast(AutoDiagI18n?.t("cartEmpty") || "Votre panier est vide.");
      return;
    }

    const paymentLink = paymentLinkFor(items);
    if (paymentLink) {
      setCheckoutLoading(true);
      goToPaymentLink(paymentLink);
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
        handleCheckoutFailure(items, "API indisponible");
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.url) {
        handleCheckoutFailure(items, data);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout API error:", err);
      handleCheckoutFailure(items, err);
    }
  }

  function init() {
    bindList();
    bindCrossSell();
    render();

    document.addEventListener("autodiag:lang-changed", () => {
      const busy = checkoutButtons.some(
        (btn) => btn.getAttribute("aria-busy") === "true"
      );
      render();
      if (busy) setCheckoutLoading(true);
    });

    checkoutButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (btn.disabled) return;
        startCheckout();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
