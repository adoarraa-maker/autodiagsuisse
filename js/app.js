/**
 * AutoDiag Suisse — galeries produit, zoom et ajout panier
 */
(function () {
  "use strict";

  const toast = document.getElementById("toast");
  const lightbox = document.getElementById("image-lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
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

  function initAddToCart(card, qtyInput) {
    const addBtn = card.querySelector("[data-add-to-cart], #add-to-cart");
    addBtn?.addEventListener("click", () => {
      if (!window.AutoDiagCart) return;

      const qty = clampQty(qtyInput?.value);
      const product = {
        id: addBtn.dataset.id,
        name: addBtn.dataset.name,
        price: addBtn.dataset.price,
        image: addBtn.dataset.image,
      };
      const productLabel = addBtn.dataset.model || product.name;

      AutoDiagCart.add(product, qty);
      AutoDiagCart.updateBadge();

      const label = addBtn.querySelector("[data-i18n='addToCart']");
      const dict = AutoDiagI18n?.dicts?.[AutoDiagI18n.getLang()] || {};
      addBtn.classList.add("added");
      if (label) label.textContent = dict.added || "Ajouté !";
      showToast(`${qty} × ${productLabel} — ${dict.toast || "ajouté au panier"}`);

      setTimeout(() => {
        window.location.href = "panier.html";
      }, 700);
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
      initAddToCart(card, initQty(card));
    });

    initLightbox();
    AutoDiagCart?.updateBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
