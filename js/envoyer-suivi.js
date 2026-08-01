/**
 * Outil interne — génère un e-mail de suivi La Poste Suisse
 */
(function () {
  "use strict";

  const form = document.getElementById("tracking-form");
  const statusEl = document.getElementById("admin-status");
  const preview = document.getElementById("preview-text");
  const copyBtn = document.getElementById("copy-btn");

  function postTrackingUrl(code) {
    return `https://www.post.ch/swisspost-tracking?formattedParcelCodes=${encodeURIComponent(code.trim())}`;
  }

  function buildMessage() {
    const email = document.getElementById("client-email").value.trim();
    const name = document.getElementById("client-name").value.trim();
    const tracking = document.getElementById("tracking-number").value.trim();
    const product = document.getElementById("product-name").value.trim();
    const link = postTrackingUrl(tracking);

    const subject = `AutoDiag Suisse — Votre colis est expédié (${tracking})`;
    const body = [
      `Bonjour ${name},`,
      ``,
      `Merci pour votre commande chez AutoDiag Suisse.`,
      ``,
      `Votre ${product} a été expédié via La Poste Suisse.`,
      ``,
      `Numéro de suivi : ${tracking}`,
      `Suivre le colis : ${link}`,
      ``,
      `Le suivi peut mettre quelques heures à apparaître sur le site de La Poste.`,
      ``,
      `Cordialement,`,
      `L'équipe AutoDiag Suisse`,
      `contact@autodiagsuisse.ch`,
    ].join("\n");

    return { email, subject, body, link, tracking };
  }

  function refreshPreview() {
    if (!preview) return;
    try {
      const { subject, body } = buildMessage();
      preview.textContent = `Objet : ${subject}\n\n${body}`;
    } catch {
      preview.textContent = "";
    }
  }

  form?.addEventListener("input", refreshPreview);

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const { email, subject, body } = buildMessage();
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    if (statusEl) {
      statusEl.textContent = "Client e-mail ouvert. Vérifiez le message puis envoyez.";
    }
  });

  copyBtn?.addEventListener("click", async () => {
    const { subject, body } = buildMessage();
    const text = `Objet : ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      if (statusEl) statusEl.textContent = "Message copié dans le presse-papiers.";
    } catch {
      if (statusEl) statusEl.textContent = "Impossible de copier automatiquement — sélectionnez l’aperçu.";
    }
  });

  refreshPreview();
})();
