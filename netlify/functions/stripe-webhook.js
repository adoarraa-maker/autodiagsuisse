/**
 * Webhook Stripe — checkout.session.completed
 *
 * Endpoint public (après déploiement Netlify) :
 *   https://VOTRE-SITE.netlify.app/api/stripe-webhook
 *
 * Configurez cet URL dans Stripe Dashboard → Developers → Webhooks
 * Événement à cocher : checkout.session.completed
 */

const Stripe = require("stripe");
const { extractOrder } = require("./_lib/order");
const { sendOrderEmails, forwardToSupplierApi } = require("./_lib/email");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * Netlify Functions (Node) — body peut être base64 si isBase64Encoded.
 * Stripe exige le corps brut (raw) pour vérifier la signature.
 */
function getRawBody(event) {
  if (!event.body) return "";
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, "base64").toString("utf8");
  }
  return event.body;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: "Method Not Allowed",
    };
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    console.error("STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET manquant");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configuration serveur incomplete" }),
    };
  }

  const signature =
    event.headers["stripe-signature"] || event.headers["Stripe-Signature"];

  if (!signature) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Signature Stripe manquante" }),
    };
  }

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      getRawBody(event),
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Signature webhook invalide:", err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
    };
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, ignored: stripeEvent.type }),
    };
  }

  /** @type {import('stripe').Stripe.Checkout.Session} */
  const session = stripeEvent.data.object;

  // Ne traiter que les paiements effectivement payés
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    console.log("Session non payée, ignorée:", session.id, session.payment_status);
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, skipped: "unpaid" }),
    };
  }

  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
    });

    const order = extractOrder(session, lineItems.data);
    console.log("Commande extraite:", order.sessionId, order.customer.email);

    const emailResults = await sendOrderEmails(order);
    const apiResult = await forwardToSupplierApi(order);

    return {
      statusCode: 200,
      body: JSON.stringify({
        received: true,
        orderId: order.sessionId,
        emails: emailResults,
        supplierApi: apiResult,
      }),
    };
  } catch (err) {
    console.error("Erreur traitement commande:", err);
    // 500 → Stripe retentera le webhook (important pour ne pas perdre une commande)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Erreur traitement commande",
      }),
    };
  }
};
