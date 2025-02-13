import { tableSchemas } from "@/db/routes";

import { and, eq } from "drizzle-orm";
import {
  orderByClauseBuilder,
  prepareD1Data,
  whereClauseBuilder,
} from "@/services/data-helpers";
import { uuid } from "@/services/utils";
import { drizzle } from "drizzle-orm/d1";
import type { APIContext } from "astro";

export type Data = { length?: number } & Record<string, unknown>;
export type DataFnResponse = Promise<{
  data: Data | Data[];
  source: string;
  total: number;
  contentType?: string;
}>;

export async function getRecordByTableAndId(
  context: APIContext,
  table: keyof typeof tableSchemas,
  id: string,
  orderBy?: Record<string, "asc" | "desc">,
) {
  const d1 = context.locals.runtime.env.DB;
  const db = drizzle(d1);
  const d1Table = tableSchemas[table].table;
  const orderBySql = orderByClauseBuilder(table, orderBy);
  const result = await db
    .select()
    .from(d1Table)
    .where(eq(d1Table.id, id))
    .orderBy(...orderBySql)
    .limit(1);
  return { code: 200, data: result };
}

export async function getRecordsByTableAndParams(
  context: APIContext,
  table: keyof typeof tableSchemas,
  params?: Record<string, unknown>,
  orderBy?: Record<string, "asc" | "desc">,
  pagination?: {
    limit?: number;
    offset?: number;
  },
  cacheKey?: string,
) {
  const d1 = context.locals.runtime.env.DB;
  const kv = context.locals.runtime.env.KV;
  if (kv && cacheKey) {
    const finalCacheKey = cacheKey;
    const cached = await kv.get(finalCacheKey);
    if (cached) {
      return { code: 200, data: JSON.parse(cached) };
    }
  }
  const db = drizzle(d1);
  const d1Table = tableSchemas[table].table;
  const conditions = whereClauseBuilder(table, params);
  const orderBySql = orderByClauseBuilder(table, orderBy);
  const query = db
    .select()
    .from(d1Table)
    .where(and(...conditions))
    .orderBy(...orderBySql);

  if (pagination?.limit) {
    query.limit(pagination.limit);
  }
  if (pagination?.offset) {
    query.offset(pagination.offset);
  }

  const result = await query;
  if (kv && cacheKey) {
    await kv.put(cacheKey, JSON.stringify(result));
  }

  return { code: 200, data: result };
}

export async function insertRecordByTable(
  context: APIContext,
  table: keyof typeof tableSchemas,
  record: Record<string, unknown>,
) {
  const d1 = context.locals.runtime.env.DB;
  const logger = context.locals.logger;
  const db = drizzle(d1);
  const d1Table = tableSchemas[table].table;
  const content = prepareD1Data(record, table);
  const id = uuid();
  content.id = content.id || id;
  try {
    const result = await db.insert(d1Table).values(content).returning().get();
    return { code: 201, data: result };
  } catch (error) {
    logger.error(error, `error inserting record into ${table}`);
    return { code: 500, error };
  }
}

export async function updateRecordByTableAndId(
  context: APIContext,
  table: keyof typeof tableSchemas,
  id: string,
  record: Record<string, unknown>,
) {
  const d1 = context.locals.runtime.env.DB;
  const logger = context.locals.logger;
  const db = drizzle(d1);

  const d1Table = tableSchemas[table].table;
  const content = prepareD1Data(record, table);
  try {
    const result = await db
      .update(d1Table)
      .set(content)
      .where(eq(d1Table.id, id))
      .returning()
      .get();
    return { code: 200, data: result };
  } catch (error) {
    logger.error(error, `error updating record in ${table} with id ${id}`);
    return { code: 500, error };
  }
}

export async function updateRecordByTableAndParams(
  context: APIContext,
  table: keyof typeof tableSchemas,
  params: Record<string, unknown>,
  record: Record<string, unknown>,
) {
  const d1 = context.locals.runtime.env.DB;
  const logger = context.locals.logger;
  const db = drizzle(d1);
  const tableSchema = tableSchemas[table].table;

  if (!tableSchema) {
    logger.error(`Table schema not found for table: ${String(table)}`);
    throw new Error(`Table schema not found for table: ${String(table)}`);
  }

  try {
    const conditions = whereClauseBuilder(table, params, logger);

    const updateQuery = db.update(tableSchema).set(record);

    if (conditions.length > 0) {
      updateQuery.where(and(...conditions));
    }

    const updatedRecords = await updateQuery.returning().execute();

    if (logger) {
      logger.debug(
        `Updated records in table '${String(table)}' with params:`,
        params,
        "updated data:",
        record,
        "updated records count:",
        updatedRecords.length,
      );
    }

    return { code: 200, data: updatedRecords };
  } catch (error) {
    logger?.error(`Error updating record in table '${String(table)}':`, error);
    return { code: 500, error };
  }
}

export async function deleteRecordByTableAndId(
  context: APIContext,
  table: keyof typeof tableSchemas,
  id: string,
) {
  const d1 = context.locals.runtime.env.DB;
  const logger = context.locals.logger;
  const db = drizzle(d1);
  const d1Table = tableSchemas[table].table;
  try {
    await db.delete(d1Table).where(eq(d1Table.id, id));
  } catch (error) {
    logger.error(error, `error deleting record in ${table} with id ${id}`);
  }
}
