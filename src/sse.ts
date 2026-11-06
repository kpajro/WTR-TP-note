import { Request, Response } from "express";
import { Order, Product } from "./types";

type Client = {
  res: Response;
  orderId?: number;
};

const clients = new Set<Client>();

export function subscribe(req: Request, res: Response, orderId?: number): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  const client: Client = { res, orderId };
  clients.add(client);
  console.log(`Abonne ajoute, total : ${clients.size}`);
  req.on("close", () => {
    clients.delete(client);
    console.log(`Abonne retire, total : ${clients.size}`);
  });
}

function write(res: Response, event: string, data: Order | Product): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function sendOrder(event: string, order: Order): void {
  for (const client of clients) {
    if (client.orderId === undefined || client.orderId === order.id) {
      write(client.res, event, order);
    }
  }
}

export function sendStock(product: Product): void {
  for (const client of clients) {
    if (client.orderId === undefined) {
      write(client.res, "stock-updated", product);
    }
  }
}
