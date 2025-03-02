// This is an example file showing how to use the schema builder
import { createMergeableStore, createStore } from "tinybase";
import { createRelationships } from "tinybase/relationships";
import { text, number, boolean, createSchema, applySchemas } from "./schema";

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

// Define a posts schema
const postsSchema = {
  id: number(),
  userId: number(), // Foreign key to users.id
  title: text(),
  content: text(),
  published: boolean().default(false),
  createdAt: text().default(() => new Date().toISOString()),
  updatedAt: text().default(() => new Date().toISOString()),
};

// Define a comments schema
const commentsSchema = {
  id: number(),
  postId: number(), // Foreign key to posts.id
  userId: number(), // Foreign key to users.id
  content: text(),
  createdAt: text().default(() => new Date().toISOString()),
};

// Define a products schema
const productsSchema = {
  id: number(),
  name: text(),
  category: text(),
  price: number(),
  color: text(),
};

export const schemaExample = () => {
  // Convert to TinyBase schema
  const tinybaseSchema = createSchema("users", usersSchema);
  console.log(
    "Generated TinyBase Schema:",
    JSON.stringify(tinybaseSchema, null, 2)
  );
  const store = createMergeableStore();
  applySchemas(store, { users: usersSchema });

  store.setRow("users", "1", {
    id: 1,
    "first-name": "John",
    "last-name": "Doe",
    email: "john@example.com",
    role: "admin",
    // active, createdAt, and updatedAt will use default values
  });
  console.log("User data:", store.getRow("users", "1"));
  return store;
};

export const relationshipExample = () => {
  // Create store and relationships
  const store = createMergeableStore();
  const relationships = createRelationships(store);

  // Apply schemas
  applySchemas(store, {
    users: usersSchema,
    posts: postsSchema,
    comments: commentsSchema,
  });

  relationships.setRelationshipDefinition(
    "user_posts",
    "posts",
    "users",
    "userId"
  );

  relationships.setRelationshipDefinition(
    "post_comments",
    "comments",
    "posts",
    "postId"
  );

  relationships.setRelationshipDefinition(
    "user_comments",
    "comments",
    "users",
    "userId"
  );

  // Add some data
  store.setRow("users", "1", {
    id: 1,
    "first-name": "John",
    "last-name": "Doe",
    email: "john@example.com",
    role: "admin",
  });

  store.setRow("posts", "1", {
    id: 1,
    userId: 1,
    title: "First Post",
    content: "This is my first post!",
    published: true,
  });

  store.setRow("posts", "2", {
    id: 2,
    userId: 1,
    title: "Second Post",
    content: "This is my second post!",
    published: false,
  });

  store.setRow("comments", "1", {
    id: 1,
    postId: 1,
    userId: 1,
    content: "Great post!",
  });

  console.log("schema", store.getSchemaJson());
  console.log("store", JSON.stringify(store.getContent(), null, 2));
  relationships.forEachRelationship((relationship) => {
    console.log("relationship", relationship);
  });

  console.log("User:", store.getRow("users", "1"));

  // Get all posts by user 1
  const userPosts = relationships.getLocalRowIds("user_posts", "1");
  console.log("User's posts:", userPosts);
  userPosts.forEach((postId) => {
    console.log(`Post ${postId}:`, store.getRow("posts", postId));
  });

  // Get all comments on post 1
  const postComments = relationships.getLocalRowIds("post_comments", "1");
  console.log("Post's comments:", postComments);
  postComments.forEach((commentId) => {
    console.log(`Comment ${commentId}:`, store.getRow("comments", commentId));
  });

  return { store, relationships };
};

// Example using the combined function
export const combinedExample = () => {
  const store = createMergeableStore();
  const relationships = createRelationships(store);

  relationships.setRelationshipDefinition(
    "user_posts",
    "posts",
    "users",
    "userId"
  );

  // Add data
  store.setRow("users", "1", {
    id: 1,
    "first-name": "John",
    "last-name": "Doe",
    email: "john@example.com",
  });

  store.setRow("posts", "1", {
    id: 1,
    userId: 1,
    title: "First Post",
    content: "This is my first post!",
  });

  // Use the relationship
  const userPosts = relationships.getLocalRowIds("user_posts", "1");
  console.log("User's posts:", userPosts);

  return { store, relationships };
};

// Example using advanced relationship definition with custom function
export const advancedRelationshipExample = () => {
  const store = createMergeableStore();
  const relationships = createRelationships(store);

  // Apply schemas
  applySchemas(store, {
    products: productsSchema,
    users: usersSchema,
  });

  // Add some product data
  store.setTable("products", {
    "1": {
      id: 1,
      name: "T-Shirt",
      category: "clothing",
      price: 19.99,
      color: "blue",
    },
    "2": {
      id: 2,
      name: "Jeans",
      category: "clothing",
      price: 49.99,
      color: "blue",
    },
    "3": {
      id: 3,
      name: "Hat",
      category: "accessories",
      price: 14.99,
      color: "red",
    },
    "4": {
      id: 4,
      name: "Sunglasses",
      category: "accessories",
      price: 24.99,
      color: "black",
    },
  });

  // Add user data with favorite product categories and colors
  store.setTable("users", {
    "1": {
      id: 1,
      "first-name": "John",
      "last-name": "Doe",
      email: "john@example.com",
      favoriteCategory: "clothing",
      favoriteColor: "blue",
    },
    "2": {
      id: 2,
      "first-name": "Jane",
      "last-name": "Smith",
      email: "jane@example.com",
      favoriteCategory: "accessories",
      favoriteColor: "red",
    },
  });

  relationships.setRelationshipDefinition(
    "user_favorite_products",
    "products",
    "users",
    "favoriteCategory"
  );

  // Get all products matching user 1's preferences (clothing + blue)
  const user1FavoriteProducts = relationships.getLocalRowIds(
    "user_favorite_products",
    "1"
  );
  console.log("User 1's favorite products:", user1FavoriteProducts);
  user1FavoriteProducts.forEach((productId) => {
    console.log(`Product ${productId}:`, store.getRow("products", productId));
  });

  // Get all products matching user 2's preferences (accessories + red)
  const user2FavoriteProducts = relationships.getLocalRowIds(
    "user_favorite_products",
    "2"
  );
  console.log("User 2's favorite products:", user2FavoriteProducts);
  user2FavoriteProducts.forEach((productId) => {
    console.log(`Product ${productId}:`, store.getRow("products", productId));
  });

  return { store, relationships };
};
