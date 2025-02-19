import { asc, Column, desc, eq } from "drizzle-orm";
import { tableSchemas } from "../db/routes";

export function prepareD1Data(
  data: Record<string, unknown>,
  tbl: keyof typeof tableSchemas,
) {
  const table = (data.table as keyof typeof tableSchemas) || tbl;
  const schema = getRepoFromTable(table);
  const now = new Date().getTime();
  data.createdOn = now;
  data.updatedOn = now;
  delete data.table;

  if (!schema.id) {
    delete data.id;
  }
  return data;
}

export function getSchemaFromTable(tableName: keyof typeof tableSchemas) {
  return tableSchemas[tableName]?.definition;
}

export function getRepoFromTable(tableName: keyof typeof tableSchemas) {
  return tableSchemas[tableName]?.table;
}

export function whereClauseBuilder(
  tbl: keyof typeof tableSchemas,
  params?: Record<string, unknown>,
  logger?: Logger,
) {
  const table = tableSchemas[tbl].table;
  const conditions = Object.entries(params ?? {})
    .map(([key, value]) => {
      const column = table[key as keyof typeof table];
      if (!column) {
        logger?.warn(
          `Column '${key}' not found in table schema '${String(table)}'. Ignoring in WHERE clause.`,
        );
        return undefined;
      }
      return eq(column as Column, value);
    })
    .filter((condition) => condition !== undefined);

  return conditions;
}

export function orderByClauseBuilder(
  tbl: keyof typeof tableSchemas,
  columns?: Record<string, "asc" | "desc">,
  logger?: Logger,
) {
  const table = tableSchemas[tbl].table;
  const orderBy = Object.entries(columns ?? { id: "asc" })
    .map(([key, value]) => {
      const column = table[key as keyof typeof table];
      if (!column) {
        if (key !== "id") {
          logger?.warn(
            `Column '${key}' not found in table schema '${String(table)}'. Ignoring in sort clause.`,
          );
        }
        return undefined;
      }
      if (value === "asc") {
        return asc(column as Column);
      } else {
        return desc(column as Column);
      }
    })
    .filter((condition) => condition !== undefined);
  return orderBy;
}

export function processCondition(condition: string) {
  switch (condition) {
    case "$eq":
      return "=";
      break;

    default:
      break;
  }
}
