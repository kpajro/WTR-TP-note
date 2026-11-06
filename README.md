# Suivi de commandes avec SSE

Boutique en ligne avec suivi des commandes en temps réel.

lien github : https://github.com/kpajro/WTR-TP-note

## Lancement

Seul Docker est nécessaire :

```bash
docker compose up --build -d
```

Le projet répond sur http://localhost:3000

- `http://localhost:3000/` : boutique (produits, création, expédition et annulation de commandes)
- `http://localhost:3000/suivi.html?id=1` : page de suivi de la commande 1

Pour arrêter : `docker compose down`.

## Statuts d'une commande

preparing → shipped → delivered

- Une commande avance d'un statut à la fois, sans retour en arrière.
- Seule une commande preparing peut passer à cancelled ; son stock est rendu au produit.
- 20 secondes après shipped, la commande passe seule à delivered.

## API REST

Toutes les erreurs renvoient un JSON de la forme { "error": "message" }.

### `GET /users`

- 200 -> Liste des utilisateurs

### `GET /products`

- 200 -> Liste des produits avec leur stock

### `GET /orders`

- 200 -> Liste des commandes, annulées comprises

### `GET /orders/:id`

Une commande.

- 200 -> Commande trouvée
- 404 -> Commande introuvable

### `POST /orders`

Crée une commande au statut preparing et diminue le stock du produit.

Corps :

```json
{ "userId": 1, "productId": 2, "quantity": 3 }
```

- 201 -> Commande créée, renvoyée dans la réponse
- 400 -> Champ manquant ou qui n'est pas un entier positif
- 404 -> Client ou produit introuvable
- 409 -> Stock insuffisant

### `PATCH /orders/:id/status`

Fait avancer la commande au statut suivant.

Corps :

```json
{ "status": "shipped" }
```

- 200 -> Statut modifié, commande renvoyée
- 400 -> status absent ou différent de shipped / delivered
- 404 -> Commande introuvable
- 409 -> Ce n'est pas le statut suivant (saut, retour en arrière, commande annulée)

### `POST /orders/:id/cancel`

Annule une commande en préparation et rend son stock. La commande est conservée avec le statut cancelled.

- 200 -> Commande annulée, renvoyée dans la réponse
- 404 -> Commande introuvable
- 409 -> Commande déjà expédiée, livrée ou annulée

## Exemples

```bash
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"userId":1,"productId":1,"quantity":2}'
curl -X PATCH http://localhost:3000/orders/1/status -H "Content-Type: application/json" -d '{"status":"shipped"}'
curl -X POST http://localhost:3000/orders/1/cancel
curl -N http://localhost:3000/orders/1/events
```
