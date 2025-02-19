import { tableSchemas } from "@/db/routes";
import superjson from "superjson";

import { and, eq } from "drizzle-orm";
import {
  orderByClauseBuilder,
  prepareD1Data,
  whereClauseBuilder,
} from "@/services/data-helpers";
import { uuid } from "@/services/utils";
import { drizzle } from "drizzle-orm/d1";
import type { APIContext } from "astro";
import type { Logger } from "pino";

export type Data = { length?: number } & Record<string, unknown>;
export type DataFnResponse = Promise<{
  data: Data | Data[];
  source: string;
  total: number;
  contentType?: string;
}>;

async function getDataFromKV(kv: KVNamespace, cacheKey: string) {
  const cached = await kv.get(cacheKey);
  if (cached) {
    return superjson.parse(cached);
  }
  return null;
}

async function saveDataToKV(kv: KVNamespace, cacheKey: string, data: unknown) {
  const serialized = superjson.stringify(data);
  await kv.put(cacheKey, serialized);
  return data;
}

async function getDataFromD1(
  cacheKey: string,
  context: APIContext,
  table: keyof typeof tableSchemas,
  params?: Record<string, unknown>,
  orderBy?: Record<string, "asc" | "desc">,
  pagination?: {
    limit?: number;
    offset?: number;
  },
) {
  const d1 = context.locals.runtime.env.DB;
  const kv = context.locals.runtime.env.KV;
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

  // Save to KV if available
  if (kv) {
    await saveDataToKV(kv, cacheKey, result);
  }

  return result;
}

function generateCacheKey(
  table: string,
  params?: Record<string, unknown>,
  orderBy?: Record<string, "asc" | "desc">,
  pagination?: {
    limit?: number;
    offset?: number;
  },
) {
  const key = {
    table,
    params: params || {},
    orderBy: orderBy || {},
    pagination: pagination || {},
  };
  return `sonic:data:${table}:list:${JSON.stringify(key)}`;
}

async function getRecordByIdFromD1(
  context: APIContext,
  table: keyof typeof tableSchemas,
  id: string,
  cacheKey: string,
) {
  const d1 = context.locals.runtime.env.DB;
  const kv = context.locals.runtime.env.KV;
  const db = drizzle(d1);
  const d1Table = tableSchemas[table].table;
  const result = await db
    .select()
    .from(d1Table)
    .where(eq(d1Table.id, id))
    .limit(1);

  // Save to KV if available
  if (kv) {
    await saveDataToKV(kv, cacheKey, result);
  }

  return result;
}

function generateRecordCacheKey(table: string, id: string) {
  return `sonic:data:${table}:record:${id}`;
}

export async function getRecordByTableAndId(
  context: APIContext,
  table: keyof typeof tableSchemas,
  id: string,
) {
  const kv = context.locals.runtime.env.KV;
  const cacheKey = generateRecordCacheKey(table, id);

  if (kv) {
    // Try to get data from KV first
    const cachedData = await getDataFromKV(kv, cacheKey);
    if (cachedData) {
      return { code: 200, data: cachedData };
    }
  }

  // If no cached data, fetch from D1
  const result = await getRecordByIdFromD1(context, table, id, cacheKey);
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
) {
  const kv = context.locals.runtime.env.KV;

  // Generate cache key if not provided
  const cacheKey = generateCacheKey(table, params, orderBy, pagination);

  if (kv) {
    // Try to get data from KV first
    const cachedData = await getDataFromKV(kv, cacheKey);
    if (cachedData) {
      return { code: 200, data: cachedData };
    }
  }

  // If no cached data, fetch from D1
  const result = await getDataFromD1(
    cacheKey,
    context,
    table,
    params,
    orderBy,
    pagination,
  );
  return { code: 200, data: result };
}

async function clearTableListCache(
  kv: KVNamespace,
  table: string,
  logger?: Logger,
) {
  try {
    const prefix = `sonic:data:${table}:list`;
    const keys = await kv.list({ prefix });
    const deletePromises = keys.keys.map((key) => kv.delete(key.name));
    await Promise.all(deletePromises);
    logger?.debug(
      `Cleared KV list cache for table ${table}, deleted ${keys.keys.length} entries`,
    );
  } catch (error) {
    logger?.error(`Error clearing KV list cache for table ${table}:`, error);
  }
}

async function clearRecordCache(
  kv: KVNamespace,
  table: string,
  id: string,
  logger?: Logger,
) {
  try {
    const cacheKey = generateRecordCacheKey(table, id);
    await kv.delete(cacheKey);
    logger?.debug(`Cleared KV record cache for table ${table}, id ${id}`);
  } catch (error) {
    logger?.error(
      `Error clearing KV record cache for table ${table}, id ${id}:`,
      error,
    );
  }
}

export async function insertRecordByTable(
  context: APIContext,
  table: keyof typeof tableSchemas,
  record: Record<string, unknown>,
) {
  const d1 = context.locals.runtime.env.DB;
  const kv = context.locals.runtime.env.KV;
  const logger = context.locals.logger;
  const db = drizzle(d1);
  const d1Table = tableSchemas[table].table;
  const content = prepareD1Data(record, table);
  const id = uuid();
  content.id = content.id || id;
  try {
    const result = await db.insert(d1Table).values(content).returning().get();
    // Only clear list cache since this is a new record
    if (kv) {
      await clearTableListCache(kv, table, logger);
    }
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
  const kv = context.locals.runtime.env.KV;
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
    // Clear both list cache and specific record cache
    if (kv) {
      await Promise.all([
        clearTableListCache(kv, table, logger),
        clearRecordCache(kv, table, id, logger),
      ]);
    }
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
  const kv = context.locals.runtime.env.KV;
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

    // Clear all list cache and specific record cache
    // First get all affected record IDs
    if (kv) {
      const recordIds = updatedRecords.map((record) => record.id);
      // Clear list cache and all affected record caches
      await Promise.all([
        clearTableListCache(kv, table, logger),
        ...recordIds.map((id) => clearRecordCache(kv, table, id, logger)),
      ]);
    }

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
  const kv = context.locals.runtime.env.KV;
  const logger = context.locals.logger;
  const db = drizzle(d1);
  const d1Table = tableSchemas[table].table;
  try {
    await db.delete(d1Table).where(eq(d1Table.id, id));
    // Clear both list cache and specific record cache
    if (kv) {
      await Promise.all([
        clearTableListCache(kv, table, logger),
        clearRecordCache(kv, table, id, logger),
      ]);
    }
  } catch (error) {
    logger.error(error, `error deleting record in ${table} with id ${id}`);
  }
}
