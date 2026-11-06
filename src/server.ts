import express from "express";
import { load, save } from "./db";
import { subscribe, sendOrder, sendStock } from "./sse";
import { Order, Status } from "./types";

type OrderInput = {
  userId?: unknown;
  productId?: unknown;
  quantity?: unknown;
};

type StatusInput = {
  status?: unknown;
};

const flow: Status[] = ["preparing", "shipped", "delivered"];

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

async function main(): Promise<void> {
  const data = await load();
  const app = express();

  app.use(express.json());
  app.use(express.static("public"));

  function findOrder(id: string): Order | undefined {
    return data.orders.find((order) => order.id === Number(id));
  }

  async function setStatus(order: Order, status: Status): Promise<void> {
    order.status = status;
    await save(data);
    sendOrder("order-status", order);
    if (status === "shipped") {
      setTimeout(() => deliver(order), 20000);
    }
  }

  async function deliver(order: Order): Promise<void> {
    if (order.status === "shipped") {
      await setStatus(order, "delivered");
    }
  }

  for (const order of data.orders) {
    if (order.status === "shipped") {
      setTimeout(() => deliver(order), 20000);
    }
  }

  app.get("/users", (req, res) => {
    res.json(data.users);
  });

  app.get("/products", (req, res) => {
    res.json(data.products);
  });

  app.get("/orders", (req, res) => {
    res.json(data.orders);
  });

  app.get("/orders/:id", (req, res) => {
    const order = findOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }
    res.json(order);
  });

  app.post("/orders", async (req, res) => {
    const { userId, productId, quantity }: OrderInput = req.body ?? {};
    if (!isPositiveInt(userId) || !isPositiveInt(productId) || !isPositiveInt(quantity)) {
      res.status(400).json({ error: "userId, productId et quantity doivent etre des entiers positifs" });
      return;
    }
    const user = data.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: "Client introuvable" });
      return;
    }
    const product = data.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: "Produit introuvable" });
      return;
    }
    if (product.stock < quantity) {
      res.status(409).json({ error: "Stock insuffisant" });
      return;
    }
    product.stock -= quantity;
    const order: Order = {
      id: data.orders.length + 1,
      userId,
      productId,
      quantity,
      status: "preparing",
      createdAt: new Date().toISOString()
    };
    data.orders.push(order);
    await save(data);
    sendOrder("order-created", order);
    sendStock(product);
    res.status(201).json(order);
  });

  app.patch("/orders/:id/status", async (req, res) => {
    const order = findOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }
    const { status }: StatusInput = req.body ?? {};
    if (status !== "shipped" && status !== "delivered") {
      res.status(400).json({ error: "status doit valoir shipped ou delivered" });
      return;
    }
    if (flow.indexOf(order.status) + 1 !== flow.indexOf(status)) {
      res.status(409).json({ error: `Passage de ${order.status} a ${status} impossible` });
      return;
    }
    await setStatus(order, status);
    res.json(order);
  });

  app.post("/orders/:id/cancel", async (req, res) => {
    const order = findOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }
    if (order.status !== "preparing") {
      res.status(409).json({ error: "Seule une commande en preparation peut etre annulee" });
      return;
    }
    order.status = "cancelled";
    const product = data.products.find((p) => p.id === order.productId);
    if (product) {
      product.stock += order.quantity;
    }
    await save(data);
    sendOrder("order-cancelled", order);
    if (product) {
      sendStock(product);
    }
    res.json(order);
  });

  app.get("/events", (req, res) => {
    subscribe(req, res);
  });

  app.get("/orders/:id/events", (req, res) => {
    const order = findOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Commande introuvable" });
      return;
    }
    subscribe(req, res, order.id);
  });

  app.listen(3000, () => {
    console.log("Serveur sur http://localhost:3000");
  });
}

main();
