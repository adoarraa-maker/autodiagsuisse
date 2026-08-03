/**
 * Extraction et formatage d'une commande depuis une Checkout Session Stripe.
 */

/**
 * @param {import('stripe').Stripe.Checkout.Session} session
 * @param {import('stripe').Stripe.LineItem[]} lineItems
 */
function extractOrder(session, lineItems = []) {
  const customer = session.customer_details || {};
  const shipping =
    session.shipping_details ||
    session.collected_information?.shipping_details ||
    null;
  const address = shipping?.address || customer.address || {};

  const name = shipping?.name || customer.name || "Client";
  const email = customer.email || session.customer_email || "";
  const phone = customer.phone || shipping?.phone || "";

  const products = lineItems.map((item) => ({
    name: item.description || item.price?.nickname || "Produit",
    quantity: item.quantity || 1,
    amount:
      typeof item.amount_total === "number"
        ? (item.amount_total / 100).toFixed(2)
        : null,
    currency: (item.currency || session.currency || "chf").toUpperCase(),
  }));

  const total =
    typeof session.amount_total === "number"
      ? (session.amount_total / 100).toFixed(2)
      : null;
  const currency = (session.currency || "chf").toUpperCase();

  return {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    createdAt: session.created
      ? new Date(session.created * 1000).toISOString()
      : new Date().toISOString(),
    customer: { name, email, phone },
    shipping: {
      name,
      line1: address.line1 || "",
      line2: address.line2 || "",
      postalCode: address.postal_code || "",
      city: address.city || "",
      state: address.state || "",
      country: address.country || "CH",
    },
    products,
    total,
    currency,
    paymentIntent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || "",
  };
}

/**
 * Bloc adresse prêt à copier-coller (colissimo / fournisseur / étiquette).
 * @param {ReturnType<typeof extractOrder>} order
 */
function formatAddressBlock(order) {
  const { shipping, customer } = order;
  const lines = [
    shipping.name,
    shipping.line1,
    shipping.line2,
    `${shipping.postalCode} ${shipping.city}`.trim(),
    shipping.state,
    shipping.country,
    customer.phone ? `Tél: ${customer.phone}` : "",
    customer.email ? `E-mail: ${customer.email}` : "",
  ].filter((line) => line && String(line).trim());

  return lines.join("\n");
}

/**
 * @param {ReturnType<typeof extractOrder>} order
 */
function formatProductsText(order) {
  if (!order.products.length) {
    return "Produit non détaillé (vérifier dans Stripe Dashboard)";
  }

  return order.products
    .map((p) => {
      const price =
        p.amount != null ? ` — ${p.amount} ${p.currency}` : "";
      return `• ${p.name} × ${p.quantity}${price}`;
    })
    .join("\n");
}

/**
 * Corps texte brut de l'e-mail commande (fournisseur + vous).
 * @param {ReturnType<typeof extractOrder>} order
 */
function buildOrderEmailText(order) {
  const addressBlock = formatAddressBlock(order);
  const products = formatProductsText(order);
  const totalLine =
    order.total != null
      ? `${order.total} ${order.currency}`
      : "voir Stripe";

  return [
    "══════════════════════════════════════",
    "  NOUVELLE COMMANDE — AutoDiag Suisse",
    "══════════════════════════════════════",
    "",
    "—— ADRESSE DE LIVRAISON (copier-coller) ——",
    addressBlock,
    "————————————————————————————————————",
    "",
    "PRODUIT(S) :",
    products,
    "",
    `TOTAL PAYÉ : ${totalLine}`,
    `STATUT PAIEMENT : ${order.paymentStatus}`,
    "",
    "RÉFÉRENCES STRIPE :",
    `Session : ${order.sessionId}`,
    order.paymentIntent ? `PaymentIntent : ${order.paymentIntent}` : "",
    `Date : ${order.createdAt}`,
    "",
    "JSON (API fournisseur / automatisation) :",
    JSON.stringify(order, null, 2),
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

/**
 * Version HTML simple du même e-mail.
 * @param {ReturnType<typeof extractOrder>} order
 */
function buildOrderEmailHtml(order) {
  const addressBlock = formatAddressBlock(order)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  const products = formatProductsText(order)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  const totalLine =
    order.total != null
      ? `${order.total} ${order.currency}`
      : "voir Stripe";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Commande AutoDiag Suisse</title></head>
<body style="font-family:Segoe UI,Arial,sans-serif;color:#1a1a1a;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;margin:0 0 8px;">Nouvelle commande — AutoDiag Suisse</h1>
  <p style="margin:0 0 20px;color:#555;">Paiement Stripe confirmé (${order.paymentStatus})</p>

  <h2 style="font-size:15px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.04em;">Adresse de livraison (copier-coller)</h2>
  <pre style="background:#f4f4f4;border:1px solid #ddd;padding:16px;font-size:14px;white-space:pre-wrap;border-radius:6px;">${addressBlock}</pre>

  <h2 style="font-size:15px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.04em;">Produit(s)</h2>
  <p style="margin:0;">${products}</p>

  <p style="margin:20px 0 0;"><strong>Total payé :</strong> ${totalLine}</p>
  <p style="margin:4px 0 0;font-size:13px;color:#666;">
    Session : ${order.sessionId}<br>
    ${order.paymentIntent ? `PaymentIntent : ${order.paymentIntent}<br>` : ""}
    Date : ${order.createdAt}
  </p>
</body>
</html>`;
}

module.exports = {
  extractOrder,
  formatAddressBlock,
  formatProductsText,
  buildOrderEmailText,
  buildOrderEmailHtml,
};
