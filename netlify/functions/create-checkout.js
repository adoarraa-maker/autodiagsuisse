/**
 * Crée une session Stripe Checkout à partir du panier.
 * Les prix sont validés côté serveur (catalogue) — jamais ceux du client.
 *
 * POST /api/create-checkout
 * Body JSON: { items: [{ id, qty }], locale?: "fr"|"de"|"it"|"en" }
 *
 * L’argent arrive sur le compte Stripe lié à STRIPE_SECRET_KEY.
 * TWINT / Apple Pay / cartes = méthodes activées dans le Dashboard Stripe
 * (ne pas forcer payment_method_types ici).
 */

const Stripe = require("stripe");

/** Catalogue autorisé — source de vérité des prix (centimes) */
const CATALOG = {
  "launch-crp123e-v3-elite": {
    name: "Scanner de Diagnostic Auto Professionnel LAUNCH CRP123E V3.0 Elite",
    unitAmount: 13990,
    currency: "chf",
    imagePath: "/images/hoto1.png",
  },
  "launch-creader-cr300": {
    name: "Scanner de Diagnostic Auto Multimarque - Launch Creader CR300",
    unitAmount: 3900,
    currency: "chf",
    imagePath: "/Autodiasuisse1.png",
  },
};

const LOCALES = new Set(["fr", "de", "it", "en", "auto"]);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(payload),
  };
}

function getSiteUrl(event) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, "");
  }
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host =
    event.headers["x-forwarded-host"] ||
    event.headers.host ||
    "localhost:8888";
  return `${proto}://${host}`;
}

function parseBody(event) {
  if (!event.body) return null;
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return json(500, {
      error: "STRIPE_SECRET_KEY manquant",
      code: "missing_stripe_key",
    });
  }

  const body = parseBody(event);
  if (!body || !Array.isArray(body.items) || !body.items.length) {
    return json(400, { error: "Panier invalide ou vide" });
  }

  const siteUrl = getSiteUrl(event);
  const lineItems = [];
  const productIds = [];

  for (const raw of body.items) {
    const id = typeof raw.id === "string" ? raw.id : "";
    const product = CATALOG[id];
    if (!product) {
      return json(400, { error: `Produit inconnu: ${id || "?"}` });
    }

    const qty = Math.min(99, Math.max(1, Number(raw.qty) || 1));

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: product.currency,
        unit_amount: product.unitAmount,
        product_data: {
          name: product.name,
          images: [`${siteUrl}${product.imagePath}`],
        },
      },
    });
    productIds.push(id);
  }

  if (!lineItems.length) {
    return json(400, { error: "Aucun article valide" });
  }

  const locale =
    typeof body.locale === "string" && LOCALES.has(body.locale)
      ? body.locale
      : "fr";

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // shipping_options est OBLIGATOIRE dès que shipping_address_collection est actif
    // (sinon Stripe refuse la session → clients bloqués au checkout).
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/panier.html`,
      locale: locale === "auto" ? "auto" : locale,
      shipping_address_collection: {
        allowed_countries: ["CH", "LI", "DE", "FR", "IT", "AT"],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "chf" },
            display_name: "Livraison gratuite",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 1 },
              maximum: { unit: "business_day", value: 3 },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      billing_address_collection: "required",
      // Ne pas fixer payment_method_types → le Dashboard Stripe décide
      // (carte, TWINT, Apple Pay, etc. selon ce que vous avez activé).
      metadata: {
        source: "autodiag-suisse",
        product_ids: productIds.join(",").slice(0, 500),
      },
    });

    if (!session.url) {
      return json(500, { error: "Session Stripe sans URL" });
    }

    return json(200, { url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("create-checkout error:", err);
    return json(500, {
      error: err.message || "Impossible de créer la session de paiement",
      code: err.code || "stripe_error",
    });
  }
};
