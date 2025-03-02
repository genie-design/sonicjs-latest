import { MergeableStore } from "tinybase/mergeable-store";
import { text, number, boolean, createSchema } from "./schema";

type UserRole = "admin" | "user" | "guest";
export const sonicSchema = () => {
  return createSchema("sonicSchemas", {
    id: number(),
    schemaId: text(),
    schemaName: text(),
    tinybaseSchema: text(),
  });
};
export const defaultSonicSchemas = () => {
  const usersSchema = {
    id: number(),
    firstName: text("first-name"),
    lastName: text("last-name"),
    email: text(),
    role: text().$type<UserRole>().default("user"),
    active: boolean().default(true),
    createdAt: text().default(() => new Date().toISOString()),
    updatedAt: text().default(() => new Date().toISOString()),
  };
  const tabletopGamesSchema = {
    id: number(),
    name: text(),
    description: text(),
    createdAt: text().default(() => new Date().toISOString()),
    updatedAt: text().default(() => new Date().toISOString()),
  };
  const users = createSchema("users", usersSchema);
  const tabletopGames = createSchema("tabletopGames", tabletopGamesSchema);
  return {
    users,
    tabletopGames,
  };
};
