/**
 * Page confirmation — vide le panier après paiement réussi
 */
(function () {
  "use strict";

  function init() {
    if (window.AutoDiagCart) {
      AutoDiagCart.clear();
      AutoDiagCart.updateBadge();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
