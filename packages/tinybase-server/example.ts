// This is an example file showing how to use the schema builder
import { createStore } from "tinybase";
import { text, number, boolean, createSchema, applySchema } from "./schema";

// Define enum for user role (for type safety)
type UserRole = "admin" | "user" | "guest";

// Define schema using Drizzle-like syntax
const usersSchema = {
  id: number(),
  firstName: text("first-name"), // Example of custom column ID
  lastName: text("last-name"),
  email: text(),
  role: text().$type<UserRole>().default("user"),
  active: boolean().default(true),
  createdAt: text().default(() => new Date().toISOString()),
  updatedAt: text().default(() => new Date().toISOString()),
};

// Convert to TinyBase schema
const tinybaseSchema = createSchema("users", usersSchema);
console.log(
  "Generated TinyBase Schema:",
  JSON.stringify(tinybaseSchema, null, 2)
);

// Example of using the schema with a TinyBase store
const store = createStore();

// Apply schema to store
applySchema(store, "users", usersSchema);

// Now we can add data that conforms to the schema
store.setRow("users", "1", {
  id: 1,
  "first-name": "John",
  "last-name": "Doe",
  email: "john@example.com",
  role: "admin",
  // active, createdAt, and updatedAt will use default values
});

// Log the resulting data
console.log("User data:", store.getRow("users", "1"));
