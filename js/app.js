/**
 * AutoDiag Suisse — galeries produit, zoom et ajout panier
 */
(function () {
  "use strict";

  const toast = document.getElementById("toast");
  const lightbox = document.getElementById("image-lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const PRODUCT_CATALOG = [
    {
      id: "launch-crp123e-v3-elite",
      name: "Scanner de Diagnostic Auto Professionnel LAUNCH CRP123E V3.0 Elite",
      price: "139.90",
      image: "images/hoto1.png",
    },
    {
      id: "launch-creader-cr300",
      name: "Scanner de Diagnostic Auto Multimarque - Launch Creader CR300",
      price: "39.00",
      image: "Autodiasuisse1.png",
    },
  ];
  let lightboxZoom = 1;

  function clampQty(n) {
    return Math.min(99, Math.max(1, Number(n) || 1));
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function setLightboxZoom(zoom) {
    lightboxZoom = Math.min(3, Math.max(1, zoom));
    if (lightboxImage) lightboxImage.style.transform = `scale(${lightboxZoom})`;
  }

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImage || !src) return;
    lightboxImage.src = src;
    lightboxImage.alt = alt || "Image produit agrandie";
    setLightboxZoom(1);
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    lightbox.querySelector("[data-lightbox-close]")?.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
  }

  function initGallery(gallery) {
    const mainImage = gallery.querySelector("[data-gallery-main], #main-image");
    const thumbs = gallery.querySelectorAll(".thumb");
    if (!mainImage) return;

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const src = thumb.getAttribute("data-src");
        if (!src) return;

        mainImage.classList.add("is-switching");
        setTimeout(() => {
          mainImage.src = src;
          mainImage.classList.remove("is-switching");
        }, 160);

        thumbs.forEach((item) => {
          const active = item === thumb;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
        });
      });
    });

    mainImage.addEventListener("click", () => {
      openLightbox(mainImage.currentSrc || mainImage.src, mainImage.alt);
    });
  }

  function initQty(card) {
    const qtyInput = card.querySelector("[data-qty], #qty");
    const qtyMinus = card.querySelector("[data-qty-minus], #qty-minus");
    const qtyPlus = card.querySelector("[data-qty-plus], #qty-plus");

    qtyMinus?.addEventListener("click", () => {
      qtyInput.value = clampQty(Number(qtyInput.value) - 1);
    });
    qtyPlus?.addEventListener("click", () => {
      qtyInput.value = clampQty(Number(qtyInput.value) + 1);
    });
    qtyInput?.addEventListener("change", () => {
      qtyInput.value = clampQty(qtyInput.value);
    });
    qtyInput?.addEventListener("input", () => {
      if (qtyInput.value === "") return;
      qtyInput.value = clampQty(qtyInput.value);
    });

    return qtyInput;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function productUrl(id) {
    return id === "launch-creader-cr300" ? "#launch-creader-cr300" : "#";
  }

  function initCartDrawer() {
    const drawer = document.getElementById("cart-drawer");
    const drawerItems = document.getElementById("cart-drawer-items");
    const drawerEmpty = document.getElementById("cart-drawer-empty");
    const drawerTotal = document.getElementById("cart-drawer-total");
    const recommendations = document.getElementById("cart-recommendations");
    const recommendationItems = document.getElementById("cart-recommendation-items");
    const cartBtn = document.getElementById("cart-btn");

    if (
      !drawer ||
      !drawerItems ||
      !drawerEmpty ||
      !drawerTotal ||
      !recommendations ||
      !recommendationItems
    ) {
      return null;
    }

    function render() {
      const items = AutoDiagCart?.getItems?.() || [];
      drawerEmpty.hidden = items.length > 0;
      drawerItems.hidden = items.length === 0;
      drawerItems.innerHTML = items
        .map((item) => {
          const qty = clampQty(item.qty);
          const lineTotal = Number(item.price) * qty;
          return `
            <li class="cart-drawer-item" data-id="${escapeHtml(item.id)}">
              <div class="cart-drawer-item-info">
                <a class="cart-drawer-item-name" href="${productUrl(item.id)}">${escapeHtml(item.name)}</a>
                <div>${AutoDiagCart.formatPrice(lineTotal)}</div>
                <div class="cart-drawer-item-actions">
                  <button type="button" data-cart-action="decrease" aria-label="Diminuer la quantité">−</button>
                  <span aria-label="Quantité">${qty}</span>
                  <button type="button" data-cart-action="increase" aria-label="Augmenter la quantité">+</button>
                  <button type="button" class="cart-drawer-remove" data-cart-action="remove">Retirer</button>
                </div>
              </div>
            </li>
          `;
        })
        .join("");
      drawerTotal.textContent = AutoDiagCart?.formatPrice?.(AutoDiagCart.getSubtotal()) || "0.00 CHF";

      const itemIds = new Set(items.map((item) => item.id));
      const suggestedProducts = PRODUCT_CATALOG.filter(
        (product) => !itemIds.has(product.id)
      );
      recommendations.hidden = suggestedProducts.length === 0;
      recommendationItems.innerHTML = suggestedProducts
        .map(
          (product) => `
            <article class="cart-recommendation">
              <div>
                <a class="cart-recommendation-name" href="${productUrl(product.id)}">${escapeHtml(product.name)}</a>
                <span class="cart-recommendation-price">${AutoDiagCart.formatPrice(product.price)}</span>
              </div>
              <button type="button" data-suggested-product="${escapeHtml(product.id)}">Ajouter</button>
            </article>
          `
        )
        .join("");
    }

    function open() {
      render();
      drawer.hidden = false;
      drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      drawer.querySelector("[data-cart-close]")?.focus();
    }

    function close() {
      drawer.hidden = true;
      drawer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      cartBtn?.focus();
    }

    cartBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      open();
    });
    drawer.querySelector("[data-cart-close]")?.addEventListener("click", close);
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer) close();

      const suggestionBtn = event.target.closest("[data-suggested-product]");
      if (suggestionBtn && window.AutoDiagCart) {
        const product = PRODUCT_CATALOG.find(
          (entry) => entry.id === suggestionBtn.dataset.suggestedProduct
        );
        if (!product) return;
        AutoDiagCart.add(product, 1);
        AutoDiagCart.updateBadge();
        render();
        showToast(`1 × ${product.name} ajouté au panier`);
        return;
      }

      const actionBtn = event.target.closest("[data-cart-action]");
      const row = event.target.closest("[data-id]");
      if (!actionBtn || !row || !window.AutoDiagCart) return;
      const id = row.getAttribute("data-id");
      const item = AutoDiagCart.getItems().find((entry) => entry.id === id);
      if (!item) return;

      if (actionBtn.dataset.cartAction === "remove") AutoDiagCart.remove(id);
      if (actionBtn.dataset.cartAction === "increase") AutoDiagCart.setQty(id, Number(item.qty) + 1);
      if (actionBtn.dataset.cartAction === "decrease") AutoDiagCart.setQty(id, Number(item.qty) - 1);
      render();
    });
    document.addEventListener("autodiag:cart-updated", render);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !drawer.hidden) close();
    });

    return { open };
  }

  function initAddToCart(drawer) {
    document.addEventListener("click", (event) => {
      const addBtn = event.target.closest("[data-add-to-cart], .add-to-cart");
      if (!addBtn || !window.AutoDiagCart) return;

      const card = addBtn.closest("[data-product-card], .product");
      const qty = clampQty(card?.querySelector("[data-qty], #qty")?.value);
      const product = {
        id: addBtn.dataset.id,
        name: addBtn.dataset.name,
        price: addBtn.dataset.price,
        image: addBtn.dataset.image,
      };
      if (!product.id || !product.name || !product.price) return;

      const productLabel = addBtn.dataset.model || product.name;
      AutoDiagCart.add(product, qty);
      AutoDiagCart.updateBadge();

      const label = addBtn.querySelector("[data-i18n='addToCart']");
      const dict = AutoDiagI18n?.dicts?.[AutoDiagI18n.getLang()] || {};
      addBtn.classList.add("added");
      if (label) label.textContent = dict.added || "Ajouté !";
      showToast(`${qty} × ${productLabel} — ${dict.toast || "ajouté au panier"}`);

      if (drawer) {
        setTimeout(drawer.open, 250);
      } else {
        setTimeout(() => {
          window.location.href = "panier.html";
        }, 700);
      }
    });
  }

  function initLightbox() {
    if (!lightbox) return;

    lightbox.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
    lightbox.querySelector("[data-lightbox-zoom-in]")?.addEventListener("click", () => setLightboxZoom(lightboxZoom + 0.25));
    lightbox.querySelector("[data-lightbox-zoom-out]")?.addEventListener("click", () => setLightboxZoom(lightboxZoom - 0.25));
    lightbox.querySelector("[data-lightbox-zoom-reset]")?.addEventListener("click", () => setLightboxZoom(1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    lightbox.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        setLightboxZoom(lightboxZoom + (event.deltaY < 0 ? 0.2 : -0.2));
      },
      { passive: false }
    );
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
    });
  }

  function init() {
    const galleries = document.querySelectorAll("[data-gallery]");
    (galleries.length ? galleries : document.querySelectorAll(".gallery")).forEach(initGallery);

    const cards = document.querySelectorAll("[data-product-card]");
    (cards.length ? cards : document.querySelectorAll(".product")).forEach((card) => {
      initQty(card);
    });

    initLightbox();
    initAddToCart(initCartDrawer());
    AutoDiagCart?.updateBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
