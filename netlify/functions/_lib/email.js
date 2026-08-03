/**
 * Envoi d'e-mails de commande via Resend.
 * https://resend.com/docs
 */

const { Resend } = require("resend");
const {
  buildOrderEmailHtml,
  buildOrderEmailText,
  formatAddressBlock,
} = require("./order");

/**
 * @param {ReturnType<import('./order').extractOrder>} order
 */
async function sendOrderEmails(order) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const notifyTo = process.env.ORDER_NOTIFY_EMAIL;
  const supplierTo = process.env.SUPPLIER_EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY manquant");
  }
  if (!from) {
    throw new Error("EMAIL_FROM manquant (ex: commandes@votredomaine.ch)");
  }
  if (!notifyTo && !supplierTo) {
    throw new Error(
      "Configurez ORDER_NOTIFY_EMAIL et/ou SUPPLIER_EMAIL"
    );
  }

  const resend = new Resend(apiKey);
  const subject = `[Commande] ${order.customer.name} — ${
    order.products[0]?.name || "AutoDiag Suisse"
  }`;
  const text = buildOrderEmailText(order);
  const html = buildOrderEmailHtml(order);

  const recipients = [...new Set([notifyTo, supplierTo].filter(Boolean))];
  const results = [];

  for (const to of recipients) {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
      reply_to: order.customer.email || undefined,
    });

    if (error) {
      throw new Error(
        `Resend error (${to}): ${error.message || JSON.stringify(error)}`
      );
    }
    results.push({ to, id: data?.id });
  }

  // Optionnel : e-mail client de confirmation simple
  if (
    process.env.SEND_CUSTOMER_CONFIRMATION === "true" &&
    order.customer.email
  ) {
    const customerSubject = "Confirmation de votre commande — AutoDiag Suisse";
    const customerText = [
      `Bonjour ${order.customer.name},`,
      "",
      "Merci pour votre commande chez AutoDiag Suisse.",
      "Nous avons bien reçu votre paiement. Votre colis sera préparé sous peu.",
      "",
      "Produit(s) :",
      ...order.products.map(
        (p) => `• ${p.name} × ${p.quantity}`
      ),
      order.total != null
        ? `\nTotal : ${order.total} ${order.currency}`
        : "",
      "",
      "Vous recevrez un e-mail avec le numéro de suivi La Poste dès l'expédition.",
      "",
      "AutoDiag Suisse",
      "contact@autodiagsuisse.ch",
    ].join("\n");

    const { error } = await resend.emails.send({
      from,
      to: order.customer.email,
      subject: customerSubject,
      text: customerText,
    });

    if (error) {
      console.error("E-mail client non envoyé:", error);
    } else {
      results.push({ to: order.customer.email, type: "customer" });
    }
  }

  console.log("Adresse livrée:", formatAddressBlock(order));
  return results;
}

/**
 * Hook extensible : POST JSON vers une API fournisseur (si SUPPLIER_API_URL défini).
 * @param {ReturnType<import('./order').extractOrder>} order
 */
async function forwardToSupplierApi(order) {
  const url = process.env.SUPPLIER_API_URL;
  if (!url) return null;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (process.env.SUPPLIER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.SUPPLIER_API_KEY}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: "autodiag-suisse",
      order,
      address_block: formatAddressBlock(order),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `API fournisseur HTTP ${res.status}: ${body.slice(0, 500)}`
    );
  }

  return { status: res.status };
}

module.exports = {
  sendOrderEmails,
  forwardToSupplierApi,
};
