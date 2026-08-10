/**
 * Webhook Stripe — checkout.session.completed
 *
 * Après paiement (Checkout Session OU Payment Link) :
 * 1) extrait adresse + produits
 * 2) envoie l’e-mail de commande (Resend) vers ORDER_NOTIFY_EMAIL
 *
 * Endpoint : https://VOTRE-SITE/api/stripe-webhook
 * Événement Stripe : checkout.session.completed
 */

const Stripe = require("stripe");
const { extractOrder } = require("./_lib/order");
const { sendOrderEmails, forwardToSupplierApi } = require("./_lib/email");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

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
  const sessionRef = stripeEvent.data.object;

  if (
    sessionRef.payment_status !== "paid" &&
    sessionRef.payment_status !== "no_payment_required"
  ) {
    console.log(
      "Session non payée, ignorée:",
      sessionRef.id,
      sessionRef.payment_status
    );
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, skipped: "unpaid" }),
    };
  }

  try {
    // Recharger la session complète : le payload webhook peut omettre
    // shipping_details / customer_details selon la version d’API.
    const session = await stripe.checkout.sessions.retrieve(sessionRef.id, {
      expand: ["line_items", "customer", "payment_intent"],
    });

    const lineItems =
      session.line_items?.data ||
      (
        await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
        })
      ).data;

    const order = extractOrder(session, lineItems);
    console.log("Commande extraite:", order.sessionId, order.customer.email);
    console.log("Adresse:", order.shipping.line1, order.shipping.city);

    if (!order.shipping.line1 && !order.shipping.city) {
      console.warn(
        "Adresse de livraison vide — vérifier shipping sur Checkout / Payment Link"
      );
    }

    const emailResults = await sendOrderEmails(order);

    let apiResult = null;
    let apiError = null;
    try {
      apiResult = await forwardToSupplierApi(order);
    } catch (apiErr) {
      apiError = apiErr.message || String(apiErr);
      console.error(
        "API fournisseur échouée (e-mails déjà envoyés):",
        apiError
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        received: true,
        orderId: order.sessionId,
        emails: emailResults,
        supplierApi: apiResult,
        supplierApiError: apiError,
        hasShippingAddress: Boolean(
          order.shipping.line1 || order.shipping.city
        ),
      }),
    };
  } catch (err) {
    console.error("Erreur traitement commande:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Erreur traitement commande",
      }),
    };
  }
};
