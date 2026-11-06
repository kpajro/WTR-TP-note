import { JsonDB, Config } from "node-json-db";
import { Data } from "./types";

const db = new JsonDB(new Config("data/db", true, true, "/"));

const startdatabase: Data = {
  users: [
    { id: 1, name: "Alice Martin", username: "alice", email: "alice@mail.com" },
    { id: 2, name: "Bob Durand", username: "bob", email: "bob@mail.com" }
  ],
  products: [
    { id: 1, name: "Clavier", stock: 10 },
    { id: 2, name: "Souris", stock: 5 },
    { id: 3, name: "Ecran", stock: 3 }
  ],
  orders: []
};

export async function load(): Promise<Data> {
  if (!(await db.exists("/users"))) {
    await db.push("/", startdatabase);
  }
  return db.getObject<Data>("/");
}

export async function save(data: Data): Promise<void> {
  await db.push("/", data);
}
