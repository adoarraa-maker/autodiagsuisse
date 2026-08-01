/**
 * AutoDiag Suisse — boutique
 * Galerie, panier, sélecteur de langues
 */

(function () {
  "use strict";

  const PRODUCT = {
    id: "launch-crp123e-v3-elite",
    price: 169.9,
    currency: "CHF",
  };

  const i18n = {
    fr: {
      banner: "🚗 Spécialiste du Diagnostic Automobile en Suisse | Livraison Express | Garantie 2 ans",
      brandTag: "Diagnostic Pro",
      langLabel: "Langue",
      cart: "Panier",
      badge: "Best-seller",
      home: "Accueil",
      category: "Scanners OBD2",
      productShort: "CRP123E V3.0",
      title: "Scanner de Diagnostic Auto Professionnel LAUNCH CRP123E V3.0 Elite",
      reviews: "128 avis",
      stock: "En stock — expédition sous 24h",
      taxNote: "TVA incluse · Livraison CH",
      feature1: "<strong>Compatible toutes marques</strong> — Universal OBD2",
      feature2: "<strong>4 systèmes</strong> : Moteur, ABS, Airbag (SRS), Transmission",
      feature3: "<strong>Écran tactile 5\" Android</strong> — mises à jour gratuites à vie via Wi-Fi",
      feature4: "<strong>Réinitialisation des voyants</strong> : Vidange, Freins, SAS, Throttle",
      qty: "Quantité",
      addToCart: "Ajouter au panier",
      added: "Ajouté !",
      securePay: "Paiement sécurisé",
      trust1Title: "Livraison Express",
      trust1Text: "Suisse & Liechtenstein",
      trust2Title: "Garantie 2 ans",
      trust2Text: "SAV francophone",
      trust3Title: "Updates à vie",
      trust3Text: "Via Wi-Fi gratuit",
      footer: "Spécialiste du diagnostic automobile professionnel",
      toast: "ajouté(s) au panier",
    },
    de: {
      banner: "🚗 Spezialist für Kfz-Diagnose in der Schweiz | Expressversand | 2 Jahre Garantie",
      brandTag: "Profi-Diagnose",
      langLabel: "Sprache",
      cart: "Warenkorb",
      badge: "Bestseller",
      home: "Startseite",
      category: "OBD2-Scanner",
      productShort: "CRP123E V3.0",
      title: "Professioneller Kfz-Diagnosescanner LAUNCH CRP123E V3.0 Elite",
      reviews: "128 Bewertungen",
      stock: "Auf Lager — Versand innerhalb 24 Std.",
      taxNote: "MwSt. inkl. · Versand CH",
      feature1: "<strong>Kompatibel mit allen Marken</strong> — Universal OBD2",
      feature2: "<strong>4 Systeme</strong>: Motor, ABS, Airbag (SRS), Getriebe",
      feature3: "<strong>5\" Android-Touchscreen</strong> — lebenslange kostenlose Updates via WLAN",
      feature4: "<strong>Service-Resets</strong>: Öl, Bremsen, SAS, Drosselklappe",
      qty: "Menge",
      addToCart: "In den Warenkorb",
      added: "Hinzugefügt!",
      securePay: "Sichere Zahlung",
      trust1Title: "Expressversand",
      trust1Text: "Schweiz & Liechtenstein",
      trust2Title: "2 Jahre Garantie",
      trust2Text: "Deutschsprachiger Support",
      trust3Title: "Lebenslange Updates",
      trust3Text: "Kostenlos via WLAN",
      footer: "Spezialist für professionelle Kfz-Diagnose",
      toast: "zum Warenkorb hinzugefügt",
    },
    it: {
      banner: "🚗 Specialista della Diagnostica Auto in Svizzera | Spedizione Express | Garanzia 2 anni",
      brandTag: "Diagnostica Pro",
      langLabel: "Lingua",
      cart: "Carrello",
      badge: "Best-seller",
      home: "Home",
      category: "Scanner OBD2",
      productShort: "CRP123E V3.0",
      title: "Scanner Diagnostico Auto Professionale LAUNCH CRP123E V3.0 Elite",
      reviews: "128 recensioni",
      stock: "Disponibile — spedizione entro 24h",
      taxNote: "IVA inclusa · Spedizione CH",
      feature1: "<strong>Compatibile con tutte le marche</strong> — Universal OBD2",
      feature2: "<strong>4 sistemi</strong>: Motore, ABS, Airbag (SRS), Trasmissione",
      feature3: "<strong>Touchscreen 5\" Android</strong> — aggiornamenti gratuiti a vita via Wi-Fi",
      feature4: "<strong>Reset spie</strong>: Olio, Freni, SAS, Farfalla",
      qty: "Quantità",
      addToCart: "Aggiungi al carrello",
      added: "Aggiunto!",
      securePay: "Pagamento sicuro",
      trust1Title: "Spedizione Express",
      trust1Text: "Svizzera & Liechtenstein",
      trust2Title: "Garanzia 2 anni",
      trust2Text: "Assistenza in italiano",
      trust3Title: "Update a vita",
      trust3Text: "Gratis via Wi-Fi",
      footer: "Specialista della diagnostica auto professionale",
      toast: "aggiunto/i al carrello",
    },
    en: {
      banner: "🚗 Automotive Diagnostic Specialist in Switzerland | Express Delivery | 2-Year Warranty",
      brandTag: "Pro Diagnostics",
      langLabel: "Language",
      cart: "Cart",
      badge: "Best-seller",
      home: "Home",
      category: "OBD2 Scanners",
      productShort: "CRP123E V3.0",
      title: "Professional Auto Diagnostic Scanner LAUNCH CRP123E V3.0 Elite",
      reviews: "128 reviews",
      stock: "In stock — ships within 24h",
      taxNote: "VAT included · CH delivery",
      feature1: "<strong>Compatible with all brands</strong> — Universal OBD2",
      feature2: "<strong>4 systems</strong>: Engine, ABS, Airbag (SRS), Transmission",
      feature3: "<strong>5\" Android touchscreen</strong> — free lifetime updates via Wi-Fi",
      feature4: "<strong>Service light resets</strong>: Oil, Brakes, SAS, Throttle",
      qty: "Quantity",
      addToCart: "Add to cart",
      added: "Added!",
      securePay: "Secure payment",
      trust1Title: "Express Delivery",
      trust1Text: "Switzerland & Liechtenstein",
      trust2Title: "2-Year Warranty",
      trust2Text: "Local support",
      trust3Title: "Lifetime updates",
      trust3Text: "Free via Wi-Fi",
      footer: "Professional automotive diagnostic specialist",
      toast: "added to cart",
    },
  };

  /* —— State —— */
  let cartQty = Number(localStorage.getItem("ads_cart_qty") || 0);
  let lang = localStorage.getItem("ads_lang") || "fr";

  /* —— DOM —— */
  const mainImage = document.getElementById("main-image");
  const thumbs = document.querySelectorAll(".thumb");
  const langSelect = document.getElementById("lang-select");
  const cartCount = document.getElementById("cart-count");
  const qtyInput = document.getElementById("qty");
  const qtyMinus = document.getElementById("qty-minus");
  const qtyPlus = document.getElementById("qty-plus");
  const addBtn = document.getElementById("add-to-cart");
  const toast = document.getElementById("toast");

  /* —— i18n —— */
  function applyLang(code) {
    const dict = i18n[code] || i18n.fr;
    lang = code;
    document.documentElement.lang = code;
    localStorage.setItem("ads_lang", code);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] != null) {
        el.innerHTML = dict[key];
      }
    });

    if (langSelect) langSelect.value = code;
  }

  /* —— Gallery —— */
  function initGallery() {
    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const src = thumb.getAttribute("data-src");
        if (!src || !mainImage) return;

        mainImage.classList.add("is-switching");
        setTimeout(() => {
          mainImage.src = src;
          mainImage.classList.remove("is-switching");
        }, 180);

        thumbs.forEach((t) => {
          t.classList.toggle("is-active", t === thumb);
          t.setAttribute("aria-selected", t === thumb ? "true" : "false");
        });
      });
    });
  }

  /* —— Quantity —— */
  function clampQty(n) {
    return Math.min(99, Math.max(1, Number(n) || 1));
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

  /* —— Cart —— */
  function updateCartUI() {
    if (!cartCount) return;
    cartCount.textContent = String(cartQty);
    cartCount.setAttribute("data-count", String(cartQty));
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function initCart() {
    updateCartUI();

    addBtn?.addEventListener("click", () => {
      const qty = clampQty(qtyInput?.value);
      cartQty += qty;
      localStorage.setItem("ads_cart_qty", String(cartQty));
      updateCartUI();

      const dict = i18n[lang] || i18n.fr;
      const label = addBtn.querySelector("[data-i18n='addToCart']") || addBtn;
      const prev = label.innerHTML;
      addBtn.classList.add("added");
      label.textContent = dict.added;
      showToast(`${qty} × LAUNCH CRP123E V3.0 Elite — ${dict.toast}`);

      setTimeout(() => {
        addBtn.classList.remove("added");
        label.innerHTML = dict.addToCart;
      }, 1600);
    });
  }

  /* —— Boot —— */
  function init() {
    applyLang(i18n[lang] ? lang : "fr");
    initGallery();
    initQty();
    initCart();

    langSelect?.addEventListener("change", (e) => {
      applyLang(e.target.value);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
