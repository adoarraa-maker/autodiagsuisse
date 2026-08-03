# Confirmation de commande & suivi de colis

## 1. Page de confirmation Stripe → `success.html`

Après un paiement réussi, Stripe doit rediriger le client vers votre page de confirmation.

### Configuration (Payment Link)

1. Ouvrez [Stripe Dashboard → Payment Links](https://dashboard.stripe.com/payment-links)
2. Éditez le lien du Scanner LAUNCH CRP123E
3. Section **After payment** / **Confirmation page**
4. Choisissez **Don’t show confirmation page** (ou équivalent) et définissez l’URL de redirection :

```text
https://VOTRE-DOMAINE/success.html
```

Exemples selon l’hébergement :

| Hébergement | URL de succès |
|---|---|
| GitHub Pages | `https://adoarraa-maker.github.io/autodiagsuisse/success.html` |
| Domaine custom | `https://autodiagsuisse.ch/success.html` |

La page affiche le message :

> Merci pour votre commande ! Vous recevrez un e-mail avec votre numéro de suivi de colis dès que votre commande sera expédiée.

Le panier local est automatiquement vidé à l’arrivée sur `success.html`.

---

## 2. Envoyer le n° de suivi La Poste Suisse

### Option A — Manuelle (recommandée pour démarrer)

1. Ouvrez `admin/envoyer-suivi.html` dans le navigateur
2. Saisissez e-mail client, prénom, n° de suivi Poste
3. Cliquez **Ouvrir l’e-mail (mailto)** ou **Copier le message**
4. Envoyez depuis votre boîte `contact@autodiagsuisse.ch`

Modèle HTML prêt à coller dans un outil d’e-mail marketing :

- `emails/suivi-colis.html`

Lien de suivi Poste généré :

```text
https://www.post.ch/swisspost-tracking?formattedParcelCodes=NUMERO_SUIVI
```

### Option B — Semi-automatique (Stripe + e-mail)

Quand vous êtes prêts à automatiser :

1. Créez un webhook Stripe sur l’événement `checkout.session.completed`
2. Enregistrez e-mail / nom client (Stripe Customer) dans un tableur ou CRM
3. À l’expédition, utilisez `admin/envoyer-suivi.html` ou un outil type :
   - [Resend](https://resend.com)
   - [Brevo](https://www.brevo.com)
   - [Postmark](https://postmarkapp.com)
4. Envoyez le contenu de `emails/suivi-colis.html` en remplaçant `{{PRENOM}}`, `{{NUMERO_SUIVI}}`, `{{LIEN_SUIVI}}`, `{{PRODUIT}}`

### Option C — Webhook Netlify (implémenté)

Le webhook Stripe + e-mail dropshipping est prêt dans ce dépôt :

- Endpoint : `/api/stripe-webhook` (Netlify Function)
- Guide complet : [`docs/WEBHOOK-DROPSHIPPING.md`](./WEBHOOK-DROPSHIPPING.md)

Flux : paiement réussi → extraction adresse/produit → e-mail structuré (vous + fournisseur) via Resend.

---

## 3. Checklist opérationnelle

- [ ] URL `success.html` configurée sur le Payment Link Stripe (mode Live)
- [ ] Tester un paiement test / live et vérifier la redirection
- [ ] À chaque expédition : saisir le n° Poste dans `admin/envoyer-suivi.html`
- [ ] Vérifier que le lien Poste ouvre bien le suivi
