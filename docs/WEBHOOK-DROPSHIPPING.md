# Webhook Stripe → Dropshipping (Netlify + Resend)

Après un paiement réussi sur votre Payment Link Stripe, Netlify reçoit l’événement `checkout.session.completed`, extrait l’adresse / le produit, et envoie un **e-mail structuré** (bloc adresse prêt à copier-coller) à vous et/ou à votre fournisseur.

## Architecture

```text
Client paie (buy.stripe.com/…)
        │
        ▼
Stripe Checkout  ──webhook──►  Netlify Function
                               /api/stripe-webhook
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              E-mail (vous)     E-mail (fournisseur)   API fournisseur
              ORDER_NOTIFY_*    SUPPLIER_EMAIL         (optionnel)
                    via Resend
```

Fichiers ajoutés :

| Fichier | Rôle |
|---|---|
| `netlify/functions/stripe-webhook.js` | Endpoint webhook Stripe |
| `netlify/functions/_lib/order.js` | Extraction + format adresse / e-mail |
| `netlify/functions/_lib/email.js` | Envoi Resend (+ API fournisseur optionnelle) |
| `netlify.toml` | Publish site + redirect `/api/*` |
| `.env.example` | Liste des secrets à configurer |

---

## Étape 1 — Prérequis Payment Link Stripe

Dans [Stripe → Payment Links](https://dashboard.stripe.com/payment-links), ouvrez le lien du Scanner LAUNCH :

1. **After payment** → redirection vers `https://VOTRE-DOMAINE/success.html`
2. **Customer information** → cochez **Phone number** (recommandé)
3. **Shipping address** → **On** / Collect shipping address (indispensable pour le dropshipping)
4. Pays autorisés : au minimum **Switzerland** (et EU si besoin)

Sans adresse de livraison collectée, le webhook ne pourra pas transmettre une adresse exploitable.

---

## Étape 2 — Compte Resend (e-mails)

1. Créez un compte sur [resend.com](https://resend.com)
2. Ajoutez et vérifiez votre domaine `autodiagsuisse.ch` (DNS)
3. Créez une **API Key** (`re_…`)
4. Notez l’expéditeur, ex. : `AutoDiag Suisse <commandes@autodiagsuisse.ch>`

> En phase de test, Resend autorise souvent `onboarding@resend.dev` comme expéditeur vers **votre** adresse uniquement.

---

## Étape 3 — Déployer sur Netlify

### A. Via l’interface Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → Import from Git (ce dépôt)
2. Build settings :
   - **Build command** : laisser vide (ou `npm install` si Netlify ne l’exécute pas)
   - **Publish directory** : `.`
   - **Functions directory** : `netlify/functions` (déjà dans `netlify.toml`)
3. Deploy

### B. Via CLI (local)

```bash
npm install
npx netlify login
npx netlify init
npx netlify deploy --prod
```

URL de la fonction après déploiement :

```text
https://VOTRE-SITE.netlify.app/api/stripe-webhook
```

(Si vous avez un domaine custom : `https://autodiagsuisse.ch/api/stripe-webhook`)

---

## Étape 4 — Variables d’environnement Netlify

**Site settings → Environment variables → Add a variable** (ou `npx netlify env:set …`) :

| Variable | Exemple | Obligatoire |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` | Oui |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` (après étape 5) | Oui |
| `RESEND_API_KEY` | `re_…` | Oui |
| `EMAIL_FROM` | `AutoDiag Suisse <commandes@…>` | Oui |
| `ORDER_NOTIFY_EMAIL` | `contact@autodiagsuisse.ch` | Oui* |
| `SUPPLIER_EMAIL` | e-mail fournisseur | Non* |
| `SEND_CUSTOMER_CONFIRMATION` | `true` / `false` | Non |
| `SUPPLIER_API_URL` | URL API dropshipping | Non |
| `SUPPLIER_API_KEY` | Bearer token | Non |

\* Au moins `ORDER_NOTIFY_EMAIL` **ou** `SUPPLIER_EMAIL` doit être défini.

Puis **Redeploy** le site pour prendre en compte les variables.

---

## Étape 5 — Webhook Stripe

1. [Stripe → Developers → Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. **Endpoint URL** :

```text
https://VOTRE-SITE.netlify.app/api/stripe-webhook
```

3. Événements : cochez uniquement **`checkout.session.completed`**
4. Créez l’endpoint → copiez le **Signing secret** (`whsec_…`)
5. Collez-le dans Netlify comme `STRIPE_WEBHOOK_SECRET` → Redeploy

### Mode Test puis Live

- Testez d’abord avec les clés `sk_test_` + webhook en mode Test
- Ensuite créez un **second** endpoint (ou basculez) en mode Live avec `sk_live_`

---

## Étape 6 — Tester

### Option A — Stripe CLI (recommandé en local)

```bash
npm install
npx netlify dev
# Dans un autre terminal :
stripe listen --forward-to localhost:8888/api/stripe-webhook
stripe trigger checkout.session.completed
```

Le `whsec_…` affiché par `stripe listen` doit être dans votre `.env` local.

### Option B — Paiement test réel

1. Activez un Payment Link en **mode Test**
2. Payez avec la carte test `4242 4242 4242 4242`
3. Vérifiez :
   - redirection vers `success.html`
   - e-mail reçu avec le bloc adresse
   - logs Netlify Functions → `stripe-webhook` → status 200
   - Stripe Webhooks → delivery **Succeeded**

---

## Contenu de l’e-mail envoyé

L’e-mail contient :

1. **Bloc adresse** prêt à coller dans le portail fournisseur  
2. Produit(s) + quantité + total CHF  
3. Références Stripe (`session`, `payment_intent`)  
4. **JSON complet** en bas (pour automatiser / parser plus tard)

Exemple de bloc adresse :

```text
Jean Dupont
Rue du Stand 12
1204 Genève
CH
Tél: +41 79 000 00 00
E-mail: jean@example.com
```

---

## API fournisseur (optionnel)

Si votre fournisseur expose une API, renseignez :

```env
SUPPLIER_API_URL=https://api.fournisseur.com/orders
SUPPLIER_API_KEY=votre_cle
```

Le webhook enverra un `POST` JSON :

```json
{
  "source": "autodiag-suisse",
  "order": { "customer": {}, "shipping": {}, "products": [], "total": "139.90" },
  "address_block": "Jean Dupont\n…"
}
```

Adaptez les champs dans `netlify/functions/_lib/email.js` → `forwardToSupplierApi` selon leur documentation.

---

## Checklist

- [ ] Payment Link collecte l’**adresse de livraison** + téléphone
- [ ] Site déployé sur Netlify (`netlify.toml` présent)
- [ ] Variables d’environnement renseignées
- [ ] Webhook Stripe → `/api/stripe-webhook` + événement `checkout.session.completed`
- [ ] Test paiement `4242…` → e-mail reçu
- [ ] Passage en clés **Live** + webhook Live
- [ ] (Optionnel) `SUPPLIER_EMAIL` / API fournisseur

---

## Dépannage

| Symptôme | Cause probable |
|---|---|
| `Webhook Error: No signatures found` | Mauvaise URL ou body altéré |
| `Webhook Error: … signature` | `STRIPE_WEBHOOK_SECRET` incorrect (test vs live) |
| E-mail non reçu | Domaine Resend non vérifié / mauvais `EMAIL_FROM` |
| Adresse vide | Shipping address non activée sur le Payment Link |
| 500 dans les logs | Voir Function log Netlify (clé Resend, destinataire manquant…) |

Logs : **Netlify → Site → Functions → stripe-webhook → Logs**  
Stripe : **Developers → Webhooks → [endpoint] → Attempts**
