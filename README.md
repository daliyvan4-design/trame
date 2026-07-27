# Trame

Générateur de QR codes personnalisés pour les commerçants et créateurs d'Abidjan.
2 000 F le code, payés par Mobile Money, fichiers PNG et SVG livrés dans la foulée.

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplis AUTH_SECRET (npx auth secret)
npm run dev
```

L'application tourne sur http://localhost:3000 sans aucune clé externe : la connexion
Google affiche un message d'attente et le paiement passe par un pilote de démonstration
qui suit le même cycle (attente, puis confirmation) sans débit réel.

## Tests

```bash
npm test
```

Deux familles de tests :

- `tests/encode.test.ts` : encodage des 11 types, validation des champs, normalisation
  des numéros ivoiriens, calcul des statistiques, bascule `--on-accent`.
- `tests/scannable.test.ts` : le SVG réellement produit est rastérisé puis relu par un
  décodeur indépendant (`jsqr`), comme le ferait un téléphone. Chaque forme de module,
  chaque forme d'yeux, le logo central et le cadre sont vérifiés.

## Comment c'est fait

### L'accent suit la couleur du code

`lib/qr/style.ts` calcule la luminance relative de la couleur choisie et expose
`--accent`, `--on-accent` (blanc ou encre) et `--halo` en variables CSS. Toutes les pages
posent ces variables sur un conteneur qui englobe aussi l'en-tête, si bien qu'un changement
de couleur repeint l'interface entière, y compris la page de détail d'un code enregistré.

### La recomposition en spirale

`lib/qr/render.tsx` donne à chaque module un `animation-delay` calculé à partir de sa
distance au centre **et** de son angle, ce qui fait balayer le code en tournant plutôt que
de le faire grandir uniformément. L'ensemble dure environ 450 ms. Le composant est remonté
via une `key` dérivée de la signature de style, donc la recomposition se déclenche à chaque
changement de style et jamais à la frappe dans un champ. Tout est neutralisé par la règle
`prefers-reduced-motion` de `app/globals.css`.

### Les fichiers livrés

Une copie non animée du QR est montée hors écran ; les téléchargements sérialisent ce
nœud exact. Le SVG part tel quel, le PNG est rastérisé sur canvas en 2048 px de large.
Ce que l'aperçu montre est donc littéralement ce que la personne reçoit.

### Le comptage des scans

Les types en ligne (lien, WhatsApp, paiement) encodent une URL courte `/r/{id}`
(`app/r/[id]/route.ts`) : la route note l'horodatage et la commune déduite de l'IP par
l'infrastructure, puis redirige. L'écriture passe par `after()` pour ne jamais retarder
l'ouverture du lien. Les types hors ligne (Wi-Fi, contact, SMS, appel, lieu, événement,
texte) encodent la donnée brute, fonctionnent sans réseau, et sont signalés comme étant
sans statistiques, dans le générateur comme dans « Mes codes ».

### Le paiement

`lib/payments/provider.ts` expose `initPayment` et `checkPayment`. Avec
`GENIUSPAY_API_KEY` et `GENIUSPAY_API_SECRET`, l'agrégateur GeniusPay est appelé pour
de vrai (Wave, Orange Money, MTN Money) ; sans elles, le pilote de démonstration prend
le relais. La référence de transaction est toujours émise par l'agrégateur, jamais
inventée par Trame, et l'identifiant du futur code voyage dans le champ `metadata`.

Le fichier n'est jamais livré sur la seule parole du client : `app/api/codes/route.ts`
revérifie l'état de la transaction côté serveur avant d'enregistrer le code, et répond
402 tant que le paiement n'est pas confirmé. Le webhook
(`app/api/paiement/notification/route.ts`) vérifie la signature HMAC-SHA256 et refuse
les horodatages de plus de cinq minutes, puis redemande malgré tout l'état réel de la
transaction : un corps de requête n'est pas une preuve de paiement.

## Passer en production

1. **Connexion Google** : renseigne `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET`, et ajoute
   `https://ton-domaine/api/auth/callback/google` aux URI de redirection autorisées.
2. **Paiement** : renseigne `GENIUSPAY_API_KEY`, `GENIUSPAY_API_SECRET` et
   `GENIUSPAY_WEBHOOK_SECRET` depuis https://pay.genius.ci, puis déclare
   `https://ton-domaine/api/paiement/notification` comme URL de webhook. Commence avec
   les clés `pk_sandbox_` et `sk_sandbox_` pour tester sans débit réel.
3. **Domaine** : pose `APP_URL=https://trame.ci` pour que les liens courts encodés dans
   les QR pointent au bon endroit. Cette valeur est figée dans chaque code au moment de
   l'achat, donc elle doit être correcte avant la première vente. Les codes déjà vendus
   continuent de fonctionner tant que l'ancien domaine sert l'application.

## Base de données

Neon Postgres, provisionné via le Marketplace Vercel (`vercel integration add neon`).
Les variables `DATABASE_URL` et compagnie sont injectées automatiquement dans le projet.

Deux tables, `codes` et `scans`, créées à la première requête par `ensureSchema()` dans
`lib/db/store.ts` : il n'y a pas d'étape de migration à lancer à la main, ni à oublier
avant la première vente. La suppression d'un code emporte ses scans en cascade.

Pour inspecter la base en local :

```bash
vercel env pull .env.local --yes
```
