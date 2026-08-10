/**
 * Page confirmation — vide le panier après un checkout initié
 * (Checkout Session avec session_id, ou retour Payment Link).
 */
(function () {
  "use strict";

  function init() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const paid = params.get("paid");

    let pending = false;
    try {
      pending = sessionStorage.getItem("autodiag_checkout_pending") === "1";
      if (pending) sessionStorage.removeItem("autodiag_checkout_pending");
    } catch {
      /* ignore */
    }

    const fromStripe = /stripe\.com/i.test(document.referrer || "");
    const confirmed =
      pending ||
      fromStripe ||
      (sessionId && /^cs_/.test(sessionId)) ||
      paid === "1" ||
      paid === "true";

    if (!confirmed) return;

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
