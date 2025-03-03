import * as users from "./schema/users";
import * as posts from "./schema/posts";
import * as comments from "./schema/comments";
import * as categories from "./schema/categories";
import * as categoriesToPosts from "./schema/categoriesToPosts";
import * as userKeys from "./schema/userKeys";
import * as userSessions from "./schema/userSessions";

// import { AppContext } from '../server';
import { isAdminOrEditor } from "./config-helpers";
import type { APIContext as AppContext } from "astro";
import type { SQLiteColumnBuilderBase } from "drizzle-orm/sqlite-core";

export type SonicJSConfig = {
  apiConfig: ApiConfig[];
  adminAccessControl: (ctx: AppContext) => boolean;
};
export type SonicJSFilter = Record<string, unknown>;
export interface ApiConfig {
  table: string;
  definition: Record<string, SQLiteColumnBuilderBase>;
  route: string;
  name: string;
  icon: string;
  // Access control if auth is enabled
  // ctx: HonoContext, contains all the information about the request
  // id: the id of the document the operation is being performed on, could be undefined if reading multiple rows
  // data: the data passed to the operation
  // doc: the document being requested/updated/deleted
  // Get the user: ctx?.locals?.user
  // Get the session: ctx.get("session")
  // By default, operations are always allowed.
  // false will result in a 403 UNAUTHORIZED response.
  access?: {
    // Each operation that can be performed has access control.
    // Operations can be a boolean or a function (async or not) that returns a boolean.
    operation?: {
      // Determines if creating a new document in the table is allowed.
      create?:
        | boolean
        | ((ctx?: AppContext, data?: unknown) => boolean | Promise<boolean>);
      // Determines if reading a document from the table is allowed.
      read?:
        | boolean
        | ((ctx?: AppContext, id?: string) => boolean | Promise<boolean>);
      // Determines if updating a document in the table is allowed.
      update?:
        | boolean
        | ((
            ctx?: AppContext,
            id?: string,
            data?: unknown,
          ) => boolean | Promise<boolean>);
      // Determines if deleting a document from the table is allowed.
      delete?:
        | boolean
        | ((ctx: AppContext, id: string) => boolean | Promise<boolean>);
    };
    // Defines the access control for filtering documents in the table based on certain conditions.
    // If a filter is returned the filter will be added to the operation.
    // Perhaps the read will return no/different data and the update/delete will not be performed.
    // Can also return a pboolean in which case it acts the same as operation
    filter?: {
      read?:
        | SonicJSFilter
        | ((
            ctx?: AppContext,
            id?: string,
          ) => SonicJSFilter | Promise<SonicJSFilter>)
        | boolean
        | ((ctx: AppContext, id: string) => boolean | Promise<boolean>);
      update?:
        | SonicJSFilter
        | ((
            ctx?: AppContext,
            id?: string,
            data?: unknown,
          ) => SonicJSFilter | Promise<SonicJSFilter>)
        | boolean
        | ((
            ctx?: AppContext,
            id?: string,
            data?: unknown,
          ) => boolean | Promise<boolean>);
      delete?:
        | SonicJSFilter
        | ((
            ctx?: AppContext,
            id?: string,
          ) => SonicJSFilter | Promise<SonicJSFilter>)
        | boolean
        | ((ctx?: AppContext, id?: string) => boolean | Promise<boolean>);
    };
    // More powerful but also less performant access control because the doc being requested/updated/deleted is read passed in.
    // This allows more complex access control based on the document the action is being performed on.
    item?: {
      read?:
        | boolean
        | ((
            ctx?: AppContext,
            id?: string,
            doc?: unknown,
          ) => boolean | Promise<boolean>);
      update?:
        | boolean
        | ((
            ctx?: AppContext,
            id?: string,
            data?: unknown,
            doc?: unknown,
          ) => boolean | Promise<boolean>);
      delete?:
        | boolean
        | ((
            ctx?: AppContext,
            id?: string,
            doc?: unknown,
          ) => boolean | Promise<boolean>);
    };
    // Defines the access control for each field in the table.
    // Read – applied when the field is selected through unknown operation
    // * true - The field will be returned in the response
    // * false - The field will be null in the response
    // Create - applied when creating a new document
    // * true - The field will be passed on to the create operation
    // * false - The field will be discarded and omitted from the create operation
    // Update - applied when updating a document
    // * true - The field will be passed on to the update operation
    // * false - The field will be discarded and omitted from the update operation
    fields?: {
      [field: string]: {
        // Returns a boolean which allows or denies the ability to set a field's value when creating a new document. If false is returned, unknown passed values will be discarded.
        create?:
          | boolean
          | ((ctx?: AppContext, data?: unknown) => boolean | Promise<boolean>);
        //Returns a boolean which allows or denies the ability to read a field's value. If false, the entire property is omitted from the resulting document.
        read?:
          | boolean
          | ((
              ctx?: AppContext,
              value?: unknown,
              doc?: unknown,
            ) => boolean | Promise<boolean>);
        // Returns a boolean which allows or denies the ability to update a field's value. If false is returned, unknown passed values will be discarded.
        // If false is returned and you attempt to update the field's value, the operation will not throw an error however the field will be omitted from the update operation and the value will remain unchanged.
        update?:
          | boolean
          | ((
              ctx?: AppContext,
              id?: string,
              data?: unknown,
            ) => boolean | Promise<boolean>);
      };
    };
  };
  hooks?: {
    resolveInput?: {
      create?: (ctx: AppContext, data: unknown) => unknown | Promise<unknown>;
      update?: (
        ctx: AppContext,
        id: string,
        data: unknown,
      ) => unknown | Promise<unknown>;
    };
    beforeOperation?: (
      ctx: AppContext,
      operation: "create" | "read" | "update" | "delete",
      id?: string | null,
      data?: unknown,
    ) => void | Promise<void>;
    afterOperation?: (
      ctx: AppContext,
      operation: "create" | "read" | "update" | "delete",
      id?: string | null,
      data?: unknown,
      result?: { data?: unknown } & Record<string, unknown>,
    ) => void | Promise<void>;
  };
  fields?: {
    [field: string]:
      | {
          type: "id" | "string[]";
        }
      | {
          type: "textField";
        }
      | {
          type: "textArea";
        }
      | {
          type: "auto" | "string[]";
        }
      | {
          type: "file" | "file[]";
          bucket: (ctx: AppContext) => R2Bucket;
          path?: string | ((ctx: AppContext) => string);
        }
      | {
          type: "password";
        }
      | {
          type: "ckeditor";
        }
      | {
          type: "quill";
        }
      | {
          type: "datetime";
        };
  };
}

export const apiConfig: ApiConfig[] = [];

export const tableSchemas = {
  users,
  posts,
  comments,
  categories,
  categoriesToPosts,
  userKeys,
  userSessions,
};

export const schema = {
  schema: {
    users: users.table,
    usersRelations: users.relation,
    userKeys: userKeys.table,
    userKeysRelations: userKeys.relation,
    userSessions: userSessions.table,
    userSessionsRelations: userSessions.relation,
    posts: posts.table,
    postsRelations: posts.relation,
    comments: comments.table,
    commentsRelations: comments.relation,
    categories: categories.table,
    categoriesToPosts: categoriesToPosts.table,
    categoriesToPostsRelations: categoriesToPosts.relation,
  },
};

for (const key of Object.keys(tableSchemas)) {
  const table = tableSchemas[key as keyof typeof tableSchemas];
  if ("route" in table && table.route) {
    apiConfig.push({
      table: table.tableName,
      definition: "definition" in table ? table.definition : {},
      route: table.route,
      access: table.access,
      hooks: "hooks" in table ? table.hooks : undefined,
      fields: "fields" in table ? table.fields : undefined,
      name: "name" in table ? table.name : "",
      icon: "icon" in table ? table.icon : "",
    });
  }
}

export const config: SonicJSConfig = {
  apiConfig: apiConfig,
  adminAccessControl: isAdminOrEditor,
};

export const sonicJsConfig: SonicJSConfig = {
  apiConfig: apiConfig,
  adminAccessControl: isAdminOrEditor,
};
