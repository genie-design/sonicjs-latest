import { createStore } from "tinybase";
import { text, number, boolean, createSchema } from "./schema-def";
// Type definitions for better type safety
type UserRole = "admin" | "user";
type PostStatus = "draft" | "published" | "archived";
// Define table schemas using object literals
const tables = {
  users: {
    id: number(),
    firstName: text(),
    lastName: text(),
    email: text(),
    role: text().$type<UserRole>().default("user"),
    active: boolean().default(true),
    createdAt: text().default(() => new Date().toISOString()),
    updatedAt: text().default(() => new Date().toISOString()),
  },
  posts: {
    id: number(),
    title: text(),
    content: text(),
    authorId: number(),
    published: boolean().default(false),
    createdAt: text().default(() => new Date().toISOString()),
    updatedAt: text().default(() => new Date().toISOString()),
    status: text().$type<PostStatus>().default("draft"),
  },
};

// Create TinyBase store with the schema
const store = createStore().setTablesSchema(createSchema(tables));

// Example usage with type safety
store.setRow("users", "1", {
  id: 1,
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "admin",
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

store.setRow("posts", "1", {
  id: 1,
  title: "Hello World",
  content: "This is my first post!",
  authorId: 1,
  published: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: "published" as PostStatus,
});
