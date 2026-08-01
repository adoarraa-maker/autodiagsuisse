/**
 * AutoDiag Suisse — page produit (galerie + ajout panier)
 */
(function () {
  "use strict";

  const mainImage = document.getElementById("main-image");
  const thumbs = document.querySelectorAll(".thumb");
  const qtyInput = document.getElementById("qty");
  const qtyMinus = document.getElementById("qty-minus");
  const qtyPlus = document.getElementById("qty-plus");
  const addBtn = document.getElementById("add-to-cart");
  const toast = document.getElementById("toast");

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

  function initGallery() {
    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const src = thumb.getAttribute("data-src");
        if (!src || !mainImage) return;

        mainImage.classList.add("is-switching");
        setTimeout(() => {
          mainImage.src = src;
          mainImage.classList.remove("is-switching");
        }, 160);

        thumbs.forEach((t) => {
          const active = t === thumb;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
      });
    });
  }

  function initQty() {
    qtyMinus?.addEventListener("click", () => {
      qtyInput.value = clampQty(Number(qtyInput.value) - 1);
    });
    qtyPlus?.addEventListener("click", () => {
      qtyInput.value = clampQty(Number(qtyInput.value) + 1);
    });
    qtyInput?.addEventListener("change", () => {
      qtyInput.value = clampQty(qtyInput.value);
    });
  }

  function initAddToCart() {
    addBtn?.addEventListener("click", () => {
      if (!window.AutoDiagCart) return;

      const qty = clampQty(qtyInput?.value);
      const product = {
        id: addBtn.dataset.id,
        name: addBtn.dataset.name,
        price: addBtn.dataset.price,
        image: addBtn.dataset.image,
      };

      AutoDiagCart.add(product, qty);
      AutoDiagCart.updateBadge();

      const label = addBtn.querySelector("[data-i18n='addToCart']");
      const dict = AutoDiagI18n?.dicts?.[AutoDiagI18n.getLang()] || {};
      addBtn.classList.add("added");
      if (label) label.textContent = dict.added || "Ajouté !";
      showToast(`${qty} × LAUNCH CRP123E — ${dict.toast || "ajouté au panier"}`);

      setTimeout(() => {
        window.location.href = "panier.html";
      }, 700);
    });
  }

  function init() {
    initGallery();
    initQty();
    initAddToCart();
    AutoDiagCart?.updateBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
