import { drizzle } from "drizzle-orm/d1";
import { isNotNull } from "drizzle-orm";
import type { APIContext } from "astro";
import {
  type SonicJSFilter,
  type ApiConfig,
  schema,
  tableSchemas,
} from "@/db/routes";
import { getRecordByTableAndId } from "@/services/data";

export const hasUser = async (ctx: APIContext) => {
  const db = drizzle(ctx.locals.runtime.env.DB, schema);
  const data = await db.query.users.findMany({
    with: {
      keys: {
        where(fields) {
          return isNotNull(fields.hashed_password);
        },
      },
    },
  });
  const result = data.filter((user) => user.keys?.length > 0);

  return result.length > 0;
};
export async function getApiAccessControlResult(
  operationAccessControl:
    | boolean
    | ((...args: unknown[]) => boolean | Promise<boolean>),
  filterAccessControl:
    | boolean
    | ((...args: unknown[]) => boolean | Promise<boolean>)
    | SonicJSFilter
    | ((...args: unknown[]) => SonicJSFilter | Promise<SonicJSFilter>),
  itemAccessControl:
    | boolean
    | ((...args: unknown[]) => boolean | Promise<boolean>),
  ctx: APIContext,
  ...args: unknown[]
) {
  let authorized: boolean | SonicJSFilter = await getAccessControlResult(
    operationAccessControl,
    ctx,
    args[0],
    args[2],
  );
  if (authorized) {
    authorized = await getItemAccessControlResult(
      itemAccessControl,
      ctx,
      args[0] as string,
      args[1] as keyof typeof tableSchemas,
      args[2],
    );
  }
  if (authorized) {
    authorized = await getAccessControlResult(
      filterAccessControl,
      ctx,
      args[0],
      args[2],
    );
  }

  return authorized;
}

async function getAccessControlResult(
  accessControl:
    | boolean
    | ((...args: unknown[]) => boolean | Promise<boolean>)
    | SonicJSFilter
    | ((...args: unknown[]) => SonicJSFilter | Promise<SonicJSFilter>)
    | OperationCreate
    | OperationRead
    | OperationUpdate
    | OperationDelete
    | FilterRead
    | FilterUpdate
    | FilterDelete,
  ctx: APIContext,
  ...args: unknown[]
) {
  let authorized: boolean | SonicJSFilter = true;
  if (typeof accessControl !== "function") {
    authorized = accessControl;
  } else {
    // @ts-expect-error - args is unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acResult = accessControl(ctx, ...(args as any[]));
    if (acResult instanceof Promise) {
      authorized = await acResult;
    } else {
      authorized = acResult;
    }
  }
  return authorized;
}
type OperationCreate = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["operation"]>["create"]
>;

type OperationRead = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["operation"]>["read"]
>;
type OperationUpdate = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["operation"]>["update"]
>;
type OperationDelete = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["operation"]>["delete"]
>;

type FilterRead = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["filter"]>["read"]
>;

type FilterUpdate = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["filter"]>["update"]
>;

type FilterDelete = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["filter"]>["delete"]
>;

type ItemRead = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["item"]>["read"]
>;

type ItemUpdate = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["item"]>["update"]
>;

type ItemDelete = NonNullable<
  NonNullable<NonNullable<ApiConfig["access"]>["item"]>["delete"]
>;
type AccessFields = NonNullable<ApiConfig["access"]>["fields"];
export async function getOperationCreateResult(
  create: OperationCreate,
  ctx: APIContext,
  data: unknown,
) {
  return !!(await getAccessControlResult(create, ctx, data));
}

export async function getOperationReadResult(
  read: OperationRead,
  ctx: APIContext,
  id: string,
) {
  return !!(await getAccessControlResult(read, ctx, id));
}

export async function getOperationUpdateResult(
  update: OperationUpdate,
  ctx: APIContext,
  id: string,
  data: unknown,
) {
  return !!(await getAccessControlResult(update, ctx, id, data));
}

export async function getOperationDeleteResult(
  del: OperationDelete,
  ctx: APIContext,
  id: string,
) {
  return !!(await getAccessControlResult(del, ctx, id));
}

export async function getFilterReadResult(
  read: FilterRead,
  ctx: APIContext,
  id: string,
) {
  return await getAccessControlResult(read, ctx, id);
}

export async function getFilterUpdateResult(
  update: FilterUpdate,
  ctx: APIContext,
  id: string,
  data: unknown,
) {
  return await getAccessControlResult(update, ctx, id, data);
}

export async function getFilterDeleteResult(
  del: FilterDelete,
  ctx: APIContext,
  id: string,
) {
  return await getAccessControlResult(del, ctx, id);
}

export async function getItemAccessControlResult(
  itemAccessControl:
    | boolean
    | ((...args: unknown[]) => boolean | Promise<boolean>),
  ctx: APIContext,
  id?: string,
  table?: keyof typeof tableSchemas,
  data?: unknown,
) {
  let authorized = true;
  if (typeof itemAccessControl === "boolean") {
    authorized = itemAccessControl;
  } else if (id && table && typeof itemAccessControl === "function") {
    const doc = await getRecordByTableAndId(ctx, table, id);

    if (data) {
      authorized = !!(await getAccessControlResult(
        itemAccessControl,
        ctx,
        id,
        data,
        doc,
      ));
    } else {
      authorized = !!(await getAccessControlResult(
        itemAccessControl,
        ctx,
        id,
        doc,
      ));
    }
  }
  return authorized;
}

export async function getItemReadResult(
  read: ItemRead,
  ctx: APIContext,
  docs: unknown,
) {
  let authorized = true;
  if (typeof read === "boolean") {
    authorized = read;
  } else if (typeof read === "function") {
    const docsArray = Array.isArray(docs) ? docs : [docs];
    for (const doc of docsArray) {
      if (authorized) {
        authorized = !!(await getAccessControlResult(read, ctx, doc.id, doc));
      }
    }
  }
  return authorized;
}

export async function getItemUpdateResult(
  update: ItemUpdate,
  ctx: APIContext,
  id: string,
  data: unknown,
  table: keyof typeof tableSchemas,
) {
  let authorized: boolean | SonicJSFilter = true;
  if (typeof update !== "function") {
    authorized = update;
  } else {
    const doc = await getRecordByTableAndId(ctx, table, id);

    authorized = await getAccessControlResult(update, ctx, id, data, doc);
  }
  return authorized;
}

export async function getItemDeleteResult(
  del: ItemDelete,
  ctx: APIContext,
  id: string,
  table: keyof typeof tableSchemas,
) {
  let authorized: boolean | SonicJSFilter = true;
  if (typeof del !== "function") {
    authorized = del;
  } else {
    const doc = await getRecordByTableAndId(ctx, table, id);

    authorized = await getAccessControlResult(del, ctx, id, doc);
  }
  return authorized;
}
export async function filterCreateFieldAccess<D = unknown>(
  fields: AccessFields,
  ctx: APIContext,
  data: D,
): Promise<D> {
  let result: D = data;
  if (fields) {
    if (typeof data === "object" && data) {
      const newResult = {} as D;
      for (const key of Object.keys(data)) {
        const value = data[key as keyof D];
        const access = fields[key]?.create;
        let authorized = true;
        if (typeof access === "boolean") {
          authorized = access;
        } else if (typeof access === "function") {
          const accessResult = access(ctx, data);
          if (typeof accessResult === "boolean") {
            authorized = accessResult;
          } else {
            authorized = await accessResult;
          }
        }
        if (authorized) {
          newResult[key as keyof D] = value;
        }
      }
      result = newResult;
    } else {
      throw new Error("Data must be an object");
    }
  }
  return result;
}

export async function filterReadFieldAccess<
  D extends Record<string, unknown> | Record<string, unknown>[],
>(fields: AccessFields, ctx: APIContext, doc: D): Promise<D> {
  let result: D = doc;
  if (fields) {
    if (Array.isArray(doc)) {
      const promises = doc.map((d) => {
        return filterReadFieldAccess(fields, ctx, d as Record<string, unknown>);
      });
      const fieldResults = (await Promise.allSettled(
        promises,
      )) as PromiseSettledResult<D>[];
      result = fieldResults.reduce<unknown[]>((acc, r) => {
        if (r.status === "fulfilled") {
          acc.push(r.value);
        } else {
          console.error(r.reason);
        }
        return acc;
      }, []) as D;
    } else if (doc && typeof doc === "object") {
      const newResult = {} as Record<string, unknown>;
      for (const key of Object.keys(doc)) {
        const value = doc[key as keyof D];
        const access = fields[key]?.read;
        let authorized = true;
        if (typeof access === "boolean") {
          authorized = access;
        } else if (typeof access === "function") {
          const accessResult = access(ctx, value, doc);
          if (typeof accessResult === "boolean") {
            authorized = accessResult;
          } else {
            authorized = await accessResult;
          }
        }
        newResult[key] = authorized ? value : null;
      }
      result = newResult as D;
    } else {
      console.error("How is doc not an array or object???");
    }
  }
  return result;
}

export async function filterUpdateFieldAccess<D = unknown>(
  fields: AccessFields,
  ctx: APIContext,
  id: string,
  data: D,
): Promise<D> {
  let result: D = data;
  if (fields) {
    if (data && typeof data === "object") {
      const newResult = {} as D;
      for (const key of Object.keys(data)) {
        const value = data[key as keyof D];
        const access = fields[key]?.update;
        let authorized = true;
        if (typeof access === "boolean") {
          authorized = access;
        } else if (typeof access === "function") {
          const accessResult = access(ctx, id, data);
          if (typeof accessResult === "boolean") {
            authorized = accessResult;
          } else {
            authorized = await accessResult;
          }
        }

        if (authorized) {
          newResult[key as keyof D] = value;
        }
      }
      result = newResult;
    } else {
      throw new Error("Data must be an object");
    }
  }
  return result;
}
